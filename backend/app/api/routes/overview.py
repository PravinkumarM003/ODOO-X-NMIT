from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_role
from app.services.overview_service import get_overview_data

router = APIRouter(prefix="/overview", tags=["Overview Dashboard"])


@router.get("")
def get_overview_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    data = get_overview_data(db)
    return {
        **data,
        "userRole": current_user.role,
    }
