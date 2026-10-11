"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  CheckCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  User as UserIcon,
  Phone,
  Building,
  Filter,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { SessionUser } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import MachineLoader from "@/components/common/MachineLoader";

interface Conversation {
  id: string;
  buyerId: string;
  buyerName: string;
  contactPerson?: string;
  subject: string;
  status: "OPEN" | "PENDING" | "RESOLVED";
  orderId?: string | null;
  orderNo?: string | null;
  lastMessageText: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  body: string;
  isReadByBuyer: boolean;
  isReadByStaff: boolean;
  createdAt: string;
}

interface SupportClientProps {
  user: SessionUser;
  initialConversations: Conversation[];
  initialTotal: number;
  userOrders: any[];
  buyersList: any[];
}

const SUBJECT_OPTIONS = [
  "Order Enquiry",
  "Production Update",
  "Quality Issue",
  "Delivery & Shipment",
  "Payment & Invoicing",
  "General Support",
];

export default function SupportClient({
  user,
  initialConversations = [],
  initialTotal = 0,
  userOrders = [],
  buyersList = [],
}: SupportClientProps) {
  const isBuyer = user.role === "BUYER";

  // State
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [activeConvDetails, setActiveConvDetails] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Composer
  const [messageInput, setMessageInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // New Conversation Modal
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newSubject, setNewSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [newOrderId, setNewOrderId] = useState<string>("");
  const [newBuyerId, setNewBuyerId] = useState<string>(buyersList.length > 0 ? buyersList[0].id : "");
  const [newInitialMsg, setNewInitialMsg] = useState<string>("");
  const [creatingConv, setCreatingConv] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Mobile navigation tab state ('list' | 'chat' | 'details')
  const [mobileView, setMobileView] = useState<"list" | "chat" | "details">("list");

  // WebSocket & Polling
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Fetch Conversations List
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    setConversationsError(null);
    try {
      let url = `/support/conversations?page=1&page_size=50`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (unreadOnly) url += `&unread_only=true`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await apiClient.get<any>(url);
      if (res && res.items) {
        setConversations(res.items);
      } else {
        setConversations([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch conversations:", err);
      setConversationsError(err?.message || "Failed to load support conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [statusFilter, unreadOnly, searchQuery]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load Messages for Selected Conversation
  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get<any>(`/support/conversations/${convId}/messages?page=1&page_size=100`);
      if (res) {
        setActiveConvDetails(res.conversation);
        setMessages(res.messages || []);
        
        // Update local unread count for this conversation
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    } else {
      setActiveConvDetails(null);
      setMessages([]);
    }
  }, [selectedConvId]);

  // Real-Time WebSocket Connection per Selected Conversation
  useEffect(() => {
    if (!selectedConvId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//127.0.0.1:8000/api/v1/support/ws/${selectedConvId}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_MESSAGE" && data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
            fetchConversations();
          } else if (data.type === "STATUS_CHANGED") {
            setActiveConvDetails((prev: any) =>
              prev ? { ...prev, status: data.status } : null
            );
            fetchConversations();
          }
        } catch {}
      };

      ws.onerror = () => {};
    } catch {}

    // Polling fallback every 6 seconds
    const interval = setInterval(() => {
      if (selectedConvId) {
        apiClient.get<any>(`/support/conversations/${selectedConvId}/messages?page=1&page_size=100`)
          .then((res) => {
            if (res && res.messages) {
              setMessages(res.messages);
            }
          })
          .catch(() => {});
      }
    }, 6000);

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearInterval(interval);
    };
  }, [selectedConvId, fetchConversations]);

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !messageInput.trim() || sending) return;

    const textToSend = messageInput.trim();
    setMessageInput("");
    setSending(true);

    try {
      const res = await apiClient.post<any>(`/support/conversations/${selectedConvId}/messages`, {
        body: textToSend,
      });

      if (res && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        fetchConversations();
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setMessageInput(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Create Conversation Handler
  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newInitialMsg.trim()) {
      setCreateError("Initial message cannot be empty");
      return;
    }

    setCreatingConv(true);
    try {
      const res = await apiClient.post<any>("/support/conversations", {
        subject: newSubject,
        orderId: newOrderId || undefined,
        buyerId: isBuyer ? undefined : newBuyerId,
        initialMessage: newInitialMsg.trim(),
      });

      if (res && res.conversationId) {
        setShowNewModal(false);
        setNewInitialMsg("");
        setNewOrderId("");
        fetchConversations();
        setSelectedConvId(res.conversationId);
        setMobileView("chat");
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create conversation");
    } finally {
      setCreatingConv(false);
    }
  };

  // Change Status Handler
  const handleStatusChange = async (newStatus: "OPEN" | "PENDING" | "RESOLVED") => {
    if (!selectedConvId) return;
    try {
      const res = await apiClient.patch<any>(`/support/conversations/${selectedConvId}/status`, {
        status: newStatus,
      });
      if (res && res.status) {
        setActiveConvDetails((prev: any) => (prev ? { ...prev, status: res.status } : null));
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0E4B45] bg-[#E1F5E8] px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            Open
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A3B14] bg-[#FCECE4] px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      default:
        return null;
    }
  };

  const activeConvObj = conversations.find((c) => c.id === selectedConvId) || activeConvDetails;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg shadow-sm">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
            Buyer–Company Messaging Platform
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            WhatsApp-style direct messaging for order enquiries, production updates, QC, and delivery support.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--primary)] text-[var(--text-primary)] rounded-md hover:bg-[#0E4B45] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Support Chat
        </button>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden border border-[var(--border)] rounded-lg bg-[var(--surface)] shadow-md">
        
        {/* LEFT COLUMN: Conversations List (Cols 1-4) */}
        <div
          className={`lg:col-span-4 flex flex-col border-r border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-sm ${
            mobileView === "list" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-[var(--border)] space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search buyer, order, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {["ALL", "OPEN", "PENDING", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors flex-shrink-0 ${
                    statusFilter === st
                      ? "bg-[var(--primary)] text-[var(--text-primary)]"
                      : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                  }`}
                >
                  {st.toLowerCase()}
                </button>
              ))}

              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex-shrink-0 border ${
                  unreadOnly
                    ? "bg-[#E1F5E8] text-[#0E4B45] border-[#0E4B45]"
                    : "bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)]"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                <MachineLoader />
                <p>Loading support conversations...</p>
              </div>
            ) : conversationsError ? (
              <div className="p-6 text-center text-xs text-red-600 bg-red-50/50 m-3 rounded-lg border border-red-200 flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="font-semibold">{conversationsError}</p>
                <button
                  onClick={() => fetchConversations()}
                  className="px-3 py-1 bg-red-600 text-white font-medium rounded text-xs hover:bg-red-700 transition-colors shadow-sm mt-1"
                >
                  Retry Loading
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-[var(--primary)]" />
                <p>No support conversations found.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const initials = (conv.buyerName || "B")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileView("chat");
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-[var(--background)] ${
                      isSelected ? "bg-[var(--background)] border-l-4 border-l-[var(--primary)]" : ""
                    }`}
                  >
                    {/* Buyer Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--text-primary)] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                      {initials}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h2 className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {conv.buyerName}
                        </h2>
                        <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">
                          {formatDateTime(conv.lastMessageAt).split(",")[1] || formatDateTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--primary)] mt-0.5 truncate">
                        <span>{conv.subject}</span>
                        {conv.orderNo && (
                          <span className="text-[10px] font-mono-id px-1 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                            {conv.orderNo}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-1">
                        {conv.lastMessageText}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        {getStatusBadge(conv.status)}
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-[var(--text-primary)] text-[10px] font-bold flex items-center justify-center shadow-sm">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Chat Window & Composer (Cols 5-9) */}
        <div
          className={`lg:col-span-5 flex flex-col bg-[var(--background)] ${
            mobileView === "chat" ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConvId && activeConvObj ? (
            <>
              {/* Chat Header */}
              <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileView("list")}
                    className="lg:hidden text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold pr-2 border-r border-[var(--border)]"
                  >
                    ← Back
                  </button>

                  <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--text-primary)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {(activeConvObj.buyerName || "B")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {activeConvObj.buyerName}
                    </h2>
                    <p className="text-[11px] text-[var(--primary)] font-medium truncate">
                      Subject: {activeConvObj.subject}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isBuyer && (
                    <select
                      value={activeConvObj.status}
                      onChange={(e) =>
                        handleStatusChange(e.target.value as "OPEN" | "PENDING" | "RESOLVED")
                      }
                      className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1 font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                    >
                      <option value="OPEN">Status: OPEN</option>
                      <option value="PENDING">Status: PENDING</option>
                      <option value="RESOLVED">Status: RESOLVED</option>
                    </select>
                  )}

                  <button
                    onClick={() => setMobileView(mobileView === "details" ? "chat" : "details")}
                    className="lg:hidden p-1.5 text-xs text-[var(--text-secondary)] bg-[var(--background)] rounded border border-[var(--border)]"
                  >
                    Context
                  </button>
                </div>
              </div>

              {/* Messages Window */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--background)]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-[var(--text-secondary)]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[var(--primary)]" />
                    Loading conversation history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center p-8 text-xs text-[var(--text-secondary)]">
                    No messages in this chat yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === user.userId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-xl shadow-sm text-xs space-y-1 ${
                            isSelf
                              ? "bg-[var(--primary)] text-[var(--text-primary)] rounded-tr-none"
                              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-none"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1">
                            <span className="font-bold text-[11px] opacity-90">
                              {msg.senderName} ({msg.senderRole})
                            </span>
                            <span className="text-[10px] opacity-75">
                              {formatDateTime(msg.createdAt).split(",")[1] || formatDateTime(msg.createdAt)}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap leading-relaxed text-xs">
                            {msg.body}
                          </p>

                          <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 pt-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-end gap-2"
              >
                <textarea
                  rows={2}
                  placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="px-3.5 py-2.5 bg-[var(--primary)] text-[var(--text-primary)] rounded-lg hover:bg-[#0E4B45] disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-secondary)]">
              <MessageSquare className="w-12 h-12 mb-3 text-[var(--primary)] opacity-40" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                WhatsApp-Style Support Center
              </h2>
              <p className="max-w-xs mt-1">
                Select a buyer conversation from the left menu or click "New Support Chat" to start messaging.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Context & Order Panel (Cols 10-12) */}
        <div
          className={`lg:col-span-3 flex flex-col border-l border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-sm p-4 space-y-4 ${
            mobileView === "details" ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeConvObj ? (
            <>
              <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[var(--primary)]" />
                Context Information
              </h2>

              {/* Buyer Identity Card */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--primary)] font-bold">
                  <UserIcon className="w-4 h-4" />
                  <span>{activeConvObj.buyerName}</span>
                </div>
                {activeConvObj.contactPerson && (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Contact: <strong>{activeConvObj.contactPerson}</strong>
                  </p>
                )}
                {activeConvObj.phone && (
                  <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[var(--primary)]" />
                    <span>{activeConvObj.phone}</span>
                  </p>
                )}
              </div>

              {/* Linked Order Details Card */}
              {activeConvObj.orderNo ? (
                <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Linked Production Order
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-id font-bold text-[var(--primary)] text-sm">
                      {activeConvObj.orderNo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-primary)]">
                      {activeConvObj.orderStatus || "IN_PROGRESS"}
                    </span>
                  </div>

                  <Link
                    href={isBuyer ? `/buyer/orders/${activeConvObj.orderId}` : `/orders/${activeConvObj.orderId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline pt-1"
                  >
                    View Order Specs
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-secondary)] italic">
                  No specific order linked to this conversation.
                </div>
              )}

              {/* Conversation Meta */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Support Ticket Meta
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Subject: <strong className="text-[var(--text-primary)]">{activeConvObj.subject}</strong>
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Opened: <strong className="text-[var(--text-primary)]">{formatDate(activeConvObj.createdAt)}</strong>
                </p>
                <div className="pt-1">
                  {getStatusBadge(activeConvObj.status)}
                </div>
              </div>

              {/* Quick Actions */}
              {!isBuyer && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Staff Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <button
                      onClick={() => handleStatusChange("PENDING")}
                      className="px-2.5 py-1.5 bg-[#FCECE4] text-[#8A3B14] rounded border border-[#8A3B14]/20 hover:bg-[#F9DFD1] transition-colors"
                    >
                      Mark Pending
                    </button>
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="px-2.5 py-1.5 bg-[#E1F5E8] text-[#0E4B45] rounded border border-[#0E4B45]/20 hover:bg-[#C8ECDA] transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[var(--text-secondary)] text-center p-4">
              Select a conversation to inspect contextual details.
            </div>
          )}
        </div>
      </div>

      {/* NEW CONVERSATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
                Start Support Conversation
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500 font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateConversation} className="space-y-3 text-xs">
              {/* Buyer Selector for Staff */}
              {!isBuyer && buyersList.length > 0 && (
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Select Buyer:
                  </label>
                  <select
                    value={newBuyerId}
                    onChange={(e) => setNewBuyerId(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    {buyersList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.contactPerson || "Contact"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Selector */}
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Support Topic / Subject:
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Linked Order */}
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Link Order (Optional):
                </label>
                <select
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">-- No Specific Order --</option>
                  {userOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      Order {ord.orderNo} ({ord.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Message Input */}
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Initial Message:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your enquiry, issue, or request..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] rounded hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingConv}
                  className="px-4 py-1.5 text-xs font-semibold bg-[var(--primary)] text-[var(--text-primary)] rounded hover:bg-[#0E4B45] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingConv ? "Creating..." : "Start Conversation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
