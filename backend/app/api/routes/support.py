from datetime import datetime, timezone
from typing import Optional, List, Dict, Set
from fastapi import APIRouter, Depends, Query, HTTPException, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, or_, and_, desc, asc

from app.db.session import get_db, Base, engine
from app.models.entities import SupportConversation, SupportMessage, Order, Buyer, User
from app.core.dependencies import get_current_user, require_role, verify_buyer_ownership
from app.core.security import decode_access_token

router = APIRouter(prefix="/support", tags=["Help & Support WhatsApp-Style Chat"])

# Ensure tables are created
Base.metadata.create_all(bind=engine)


# WebSocket Connection Manager for Real-Time Chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, conversation_id: str, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = set()
        self.active_connections[conversation_id].add(websocket)

    def disconnect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].discard(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_to_conversation(self, conversation_id: str, data: dict):
        if conversation_id in self.active_connections:
            dead_sockets = set()
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(data)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.disconnect(conversation_id, dead)

manager = ConnectionManager()


# --- Pydantic Schemas ---
class CreateConversationRequest(BaseModel):
    subject: str
    orderId: Optional[str] = None
    buyerId: Optional[str] = None
    initialMessage: str

class SendMessageRequest(BaseModel):
    body: str

class UpdateStatusRequest(BaseModel):
    status: str  # OPEN, PENDING, RESOLVED


# --- Endpoints ---

@router.get("/conversations")
def list_conversations(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    sort_by: Optional[str] = Query("lastMessageAt"),
    sort_order: Optional[str] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(SupportConversation)
        .options(
            selectinload(SupportConversation.buyer),
            selectinload(SupportConversation.order),
            selectinload(SupportConversation.createdBy),
            selectinload(SupportConversation.assignedStaff),
        )
    )

    # Role Security
    if current_user.role == "BUYER":
        if not current_user.buyerId:
            return {"items": [], "total": 0, "page": page, "pageSize": page_size}
        query = query.where(SupportConversation.buyerId == current_user.buyerId)
    
    # Status Filtering
    if status_filter and status_filter != "ALL":
        query = query.where(SupportConversation.status == status_filter.upper())

    # Search Filtering (Buyer Name, Order No, Subject)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.outerjoin(Buyer, SupportConversation.buyerId == Buyer.id).outerjoin(Order, SupportConversation.orderId == Order.id).where(
            or_(
                func.lower(SupportConversation.subject).like(search_term),
                func.lower(Buyer.name).like(search_term),
                func.lower(Order.orderNo).like(search_term),
            )
        )

    # Unread Only Filter
    if unread_only:
        if current_user.role == "BUYER":
            query = query.where(
                select(func.count(SupportMessage.id))
                .where(
                    SupportMessage.conversationId == SupportConversation.id,
                    SupportMessage.isReadByBuyer == False
                ).scalar_subquery() > 0
            )
        else:
            query = query.where(
                select(func.count(SupportMessage.id))
                .where(
                    SupportMessage.conversationId == SupportConversation.id,
                    SupportMessage.isReadByStaff == False
                ).scalar_subquery() > 0
            )

    # Sort
    target_col = SupportConversation.createdAt if sort_by == "createdAt" else SupportConversation.lastMessageAt
    direction = sort_order.lower() if sort_order else "desc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()
    query = query.order_by(order_clause, SupportConversation.id.desc())

    total = db.scalar(select(func.count()).select_from(query.with_only_columns(SupportConversation.id).subquery())) or 0
    conversations = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    # Calculate unread counts in bulk
    conv_ids = [c.id for c in conversations]
    unread_map = {}
    if conv_ids:
        if current_user.role == "BUYER":
            unread_rows = db.execute(
                select(SupportMessage.conversationId, func.count(SupportMessage.id))
                .where(
                    SupportMessage.conversationId.in_(conv_ids),
                    SupportMessage.isReadByBuyer == False,
                    SupportMessage.senderRole != "BUYER"
                )
                .group_by(SupportMessage.conversationId)
            ).all()
        else:
            unread_rows = db.execute(
                select(SupportMessage.conversationId, func.count(SupportMessage.id))
                .where(
                    SupportMessage.conversationId.in_(conv_ids),
                    SupportMessage.isReadByStaff == False,
                    SupportMessage.senderRole == "BUYER"
                )
                .group_by(SupportMessage.conversationId)
            ).all()
        unread_map = {cid: cnt for cid, cnt in unread_rows}

    results = []
    for c in conversations:
        results.append({
            "id": c.id,
            "buyerId": c.buyerId,
            "buyerName": c.buyer.name if c.buyer else "Buyer",
            "contactPerson": c.buyer.contactPerson if c.buyer else "",
            "subject": c.subject,
            "status": c.status,
            "orderId": c.orderId,
            "orderNo": c.order.orderNo if c.order else None,
            "lastMessageText": c.lastMessageText or "No messages yet",
            "lastMessageAt": c.lastMessageAt.isoformat() if isinstance(c.lastMessageAt, datetime) else c.lastMessageAt,
            "createdAt": c.createdAt.isoformat() if isinstance(c.createdAt, datetime) else c.createdAt,
            "unreadCount": unread_map.get(c.id, 0),
        })

    return {
        "items": results,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


@router.post("/conversations")
def create_conversation(
    req: CreateConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not req.subject or not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not req.initialMessage or not req.initialMessage.strip():
        raise HTTPException(status_code=400, detail="Initial message cannot be empty")

    buyer_id = None
    if current_user.role == "BUYER":
        if not current_user.buyerId:
            raise HTTPException(status_code=403, detail="User is not linked to a buyer entity")
        buyer_id = current_user.buyerId
    else:
        buyer_id = req.buyerId
        if not buyer_id:
            # Fallback to first buyer or check order
            if req.orderId:
                ord = db.execute(select(Order).where(Order.id == req.orderId)).scalar_one_or_none()
                if ord:
                    buyer_id = ord.buyerId
            if not buyer_id:
                first_buyer = db.execute(select(Buyer)).scalars().first()
                if first_buyer:
                    buyer_id = first_buyer.id
                else:
                    raise HTTPException(status_code=400, detail="A buyer identity is required for the conversation")

    # Validate Order if provided
    if req.orderId:
        ord = db.execute(select(Order).where(Order.id == req.orderId)).scalar_one_or_none()
        if not ord:
            raise HTTPException(status_code=404, detail="Linked order not found")
        if current_user.role == "BUYER" and ord.buyerId != current_user.buyerId:
            raise HTTPException(status_code=403, detail="Order does not belong to your account")

    now = datetime.now(timezone.utc)
    conv = SupportConversation(
        buyerId=buyer_id,
        createdById=current_user.id,
        subject=req.subject.strip(),
        orderId=req.orderId,
        status="OPEN",
        lastMessageText=req.initialMessage.strip()[:100],
        lastMessageAt=now,
        createdAt=now,
        updatedAt=now,
    )
    db.add(conv)
    db.flush()

    msg = SupportMessage(
        conversationId=conv.id,
        senderId=current_user.id,
        senderRole=current_user.role,
        senderName=current_user.name or "User",
        body=req.initialMessage.strip(),
        isReadByBuyer=(current_user.role == "BUYER"),
        isReadByStaff=(current_user.role != "BUYER"),
        createdAt=now,
    )
    db.add(msg)
    db.commit()

    return {
        "success": True,
        "conversationId": conv.id,
        "subject": conv.subject,
        "status": conv.status,
    }


@router.get("/conversations/{id}/messages")
def get_conversation_messages(
    id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.execute(
        select(SupportConversation)
        .options(
            selectinload(SupportConversation.buyer),
            selectinload(SupportConversation.order),
        )
        .where(SupportConversation.id == id)
    ).scalar_one_or_none()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.role == "BUYER" and conv.buyerId != current_user.buyerId:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this conversation")

    # Mark as read for current user
    if current_user.role == "BUYER":
        db.query(SupportMessage).filter(
            SupportMessage.conversationId == id,
            SupportMessage.isReadByBuyer == False
        ).update({"isReadByBuyer": True}, synchronize_session=False)
    else:
        db.query(SupportMessage).filter(
            SupportMessage.conversationId == id,
            SupportMessage.isReadByStaff == False
        ).update({"isReadByStaff": True}, synchronize_session=False)
    db.commit()

    total = db.scalar(select(func.count(SupportMessage.id)).where(SupportMessage.conversationId == id)) or 0
    messages = db.execute(
        select(SupportMessage)
        .where(SupportMessage.conversationId == id)
        .order_by(SupportMessage.createdAt.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    msg_data = []
    for m in messages:
        msg_data.append({
            "id": m.id,
            "conversationId": m.conversationId,
            "senderId": m.senderId,
            "senderRole": m.senderRole,
            "senderName": m.senderName,
            "body": m.body,
            "isReadByBuyer": m.isReadByBuyer,
            "isReadByStaff": m.isReadByStaff,
            "createdAt": m.createdAt.isoformat() if isinstance(m.createdAt, datetime) else m.createdAt,
        })

    return {
        "conversation": {
            "id": conv.id,
            "buyerId": conv.buyerId,
            "buyerName": conv.buyer.name if conv.buyer else "Buyer",
            "contactPerson": conv.buyer.contactPerson if conv.buyer else "",
            "phone": conv.buyer.phone if conv.buyer else "",
            "subject": conv.subject,
            "status": conv.status,
            "orderId": conv.orderId,
            "orderNo": conv.order.orderNo if conv.order else None,
            "orderStatus": conv.order.status if conv.order else None,
            "createdAt": conv.createdAt.isoformat() if isinstance(conv.createdAt, datetime) else conv.createdAt,
        },
        "messages": msg_data,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


@router.post("/conversations/{id}/messages")
def send_message(
    id: str,
    req: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not req.body or not req.body.strip():
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    conv = db.execute(select(SupportConversation).where(SupportConversation.id == id)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.role == "BUYER" and conv.buyerId != current_user.buyerId:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot send messages in another buyer's conversation")

    now = datetime.now(timezone.utc)
    body_clean = req.body.strip()

    msg = SupportMessage(
        conversationId=conv.id,
        senderId=current_user.id,
        senderRole=current_user.role,
        senderName=current_user.name or "User",
        body=body_clean,
        isReadByBuyer=(current_user.role == "BUYER"),
        isReadByStaff=(current_user.role != "BUYER"),
        createdAt=now,
    )

    conv.lastMessageText = body_clean[:100]
    conv.lastMessageAt = now
    conv.updatedAt = now

    # Reopen resolved conversation if buyer replies
    if current_user.role == "BUYER" and conv.status == "RESOLVED":
        conv.status = "OPEN"

    db.add(msg)
    db.commit()

    msg_payload = {
        "type": "NEW_MESSAGE",
        "message": {
            "id": msg.id,
            "conversationId": msg.conversationId,
            "senderId": msg.senderId,
            "senderRole": msg.senderRole,
            "senderName": msg.senderName,
            "body": msg.body,
            "isReadByBuyer": msg.isReadByBuyer,
            "isReadByStaff": msg.isReadByStaff,
            "createdAt": msg.createdAt.isoformat() if isinstance(msg.createdAt, datetime) else msg.createdAt,
        }
    }

    # Broadcast real-time message via WebSocket manager
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.broadcast_to_conversation(conv.id, msg_payload))
    except Exception:
        pass

    return {
        "success": True,
        "message": msg_payload["message"],
    }


@router.patch("/conversations/{id}/status")
def update_conversation_status(
    id: str,
    req: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_statuses = ["OPEN", "PENDING", "RESOLVED"]
    new_status = req.status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    conv = db.execute(select(SupportConversation).where(SupportConversation.id == id)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.role == "BUYER" and conv.buyerId != current_user.buyerId:
        raise HTTPException(status_code=403, detail="Forbidden")

    conv.status = new_status
    conv.updatedAt = datetime.now(timezone.utc)
    db.commit()

    status_payload = {
        "type": "STATUS_CHANGED",
        "conversationId": conv.id,
        "status": conv.status,
    }

    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.broadcast_to_conversation(conv.id, status_payload))
    except Exception:
        pass

    return {
        "success": True,
        "id": conv.id,
        "status": conv.status,
    }


@router.post("/conversations/{id}/read")
def mark_conversation_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.execute(select(SupportConversation).where(SupportConversation.id == id)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.role == "BUYER":
        db.query(SupportMessage).filter(
            SupportMessage.conversationId == id,
            SupportMessage.isReadByBuyer == False
        ).update({"isReadByBuyer": True}, synchronize_session=False)
    else:
        db.query(SupportMessage).filter(
            SupportMessage.conversationId == id,
            SupportMessage.isReadByStaff == False
        ).update({"isReadByStaff": True}, synchronize_session=False)

    db.commit()
    return {"success": True}


# --- WebSocket Endpoint for Live Real-Time Messaging ---
@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await manager.connect(conversation_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep-alive or ping-pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)
    except Exception:
        manager.disconnect(conversation_id, websocket)
