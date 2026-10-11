"use client";

import { useRouter, useSearchParams } from "next/navigation";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import SortHeader from "@/components/common/SortHeader";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  X,
} from "lucide-react";
import { createOrderAction, checkYarnAvailabilityAction } from "@/app/actions/orderActions";
import { formatDate } from "@/lib/dateUtils";

interface OrderRow {
  id: string;
  orderNo: string;
  buyerName: string;
  fabricName: string;
  colour: string;
  qtyMetres: number;
  deadline: string;
  status: string;
  submittedByBuyer: boolean;
  risk: {
    risk: "OVERDUE" | "AT_RISK" | "ON_TRACK";
    reason: string;
  };
  progress: {
    productionProgressPercent: number;
    qcReadiness: {
      statusText: string;
      qcResolvedPercent: number | null;
      passedCount: number;
      reworkCount: number;
      rejectedCount: number;
      pendingCount: number;
    };
    dispatchCompletion: {
      dispatchPercent: number;
      dispatchedMetres: number;
      orderQtyMetres: number;
      summaryText: string;
      shortfallNote?: string | null;
    };
  };
}

interface BuyerOption {
  id: string;
  name: string;
}

interface FabricTypeOption {
  id: string;
  name: string;
  yarnKgPerMetre: number;
  defaultPricePerMetre: number;
  yarnCode: string;
}

interface OrderListClientProps {
  orders: OrderRow[];
  buyers: BuyerOption[];
  fabricTypes: FabricTypeOption[];
  userRole: string;
  totalRecords?: number;
  currentPage?: number;
}

export default function OrderListClient({
  orders,
  buyers,
  fabricTypes,
  userRole,
  totalRecords = 0,
  currentPage = 1,
}: OrderListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Live Yarn Check panel state (BR-04)
  const [selectedFabricId, setSelectedFabricId] = useState("");
  const [enteredQty, setEnteredQty] = useState("");
  const [yarnCheckResult, setYarnCheckResult] = useState<any>(null);
  const [checkingYarn, setCheckingYarn] = useState(false);

  const handleFabricOrQtyChange = async (fabId: string, qty: string) => {
    setSelectedFabricId(fabId);
    setEnteredQty(qty);

    const numQty = parseFloat(qty);
    if (fabId && !isNaN(numQty) && numQty > 0) {
      setCheckingYarn(true);
      const res = await checkYarnAvailabilityAction(fabId, numQty);
      setYarnCheckResult(res);
      setCheckingYarn(false);
    } else {
      setYarnCheckResult(null);
    }
  };

  const currentSortBy = searchParams.get("sort_by") || "createdAt";
  const currentSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "desc";

  const updateUrlParams = (search: string, status: string, page: number, sortBy = currentSortBy, sortOrder = currentSortOrder) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      if (sortBy) params.set("sort_by", sortBy);
      if (sortOrder) params.set("sort_order", sortOrder);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const handleSort = (sortKey: string) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (currentSortBy === sortKey) {
      nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
    }
    updateUrlParams(searchTerm, statusFilter, 1, sortKey, nextOrder);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearchTerm(newSearch);
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrlParams(searchTerm, statusFilter, 1);
    }
  };
  
  const handleSearchBlur = () => {
    if (searchTerm !== (searchParams.get("search") || "")) {
      updateUrlParams(searchTerm, statusFilter, 1);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    updateUrlParams(searchTerm, newStatus, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams(searchTerm, statusFilter, newPage);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setCreateError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createOrderAction(formData);

    setLoading(false);
    if (result.error) {
      setCreateError(result.error);
    } else {
      setCreateModalOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[var(--primary)]" />
            Orders Registry & Tracking
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            End-to-end order tracking across production stages, QC readiness, and dispatches.
          </p>
        </div>
        {userRole !== "PRODUCTION_SUPERVISOR" && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Order (Office Entry)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-2 text-xs">
        {[
          { id: "ALL", label: "All Orders" },
          { id: "NEEDS_REVIEW", label: "Needs Review (NEW)" },
          { id: "AWAITING_YARN", label: "Awaiting Yarn" },
          { id: "IN_PRODUCTION", label: "In Production" },
          { id: "IN_QC", label: "In QC" },
          { id: "READY_TO_SHIP", label: "Ready to Ship" },
          { id: "COMPLETED", label: "Delivered / Dispatched" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              statusFilter === tab.id
                ? "bg-[var(--sidebar)] text-[var(--text-primary)] shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search order no, buyer, fabric, colour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-mono-id">
          {totalRecords} matching order(s)
        </span>
      </div>

      {/* Orders Table */}
      <div className={`premium-card overflow-hidden transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[11px]">
                <SortHeader label="Order No" sortKey="orderNo" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Buyer" sortKey="buyer" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Fabric & Colour" sortKey="fabricType" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Quantity" sortKey="qtyMetres" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-right" />
                <th className="py-3 px-4">Production Progress</th>
                <th className="py-3 px-4">QC Readiness</th>
                <th className="py-3 px-4">Dispatch Completion</th>
                <SortHeader label="Deadline" sortKey="deadline" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Risk & Status" sortKey="status" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--sidebar-secondary)] transition-colors">
                  <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                    <Link href={`/orders/${o.id}`} className="hover:underline flex items-center gap-1">
                      {o.orderNo}
                      <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                    </Link>
                    {o.submittedByBuyer && (
                      <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-bold uppercase mt-0.5">
                        Buyer Submitted
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{o.buyerName}</td>
                  <td className="py-3 px-4 text-[var(--text-primary)]">
                    <div>{o.fabricName}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{o.colour}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                    {o.qtyMetres.toLocaleString("en-IN")} m
                  </td>

                  {/* 1. Production Progress (BR-25) */}
                  <td className="py-3 px-4 min-w-[120px]">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-mono-id">
                      <span className="text-[var(--text-secondary)]">Production:</span>
                      <span className="font-bold text-[var(--text-primary)]">{o.progress?.productionProgressPercent ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--primary)] h-full rounded-full transition-all"
                        style={{ width: `${o.progress?.productionProgressPercent ?? 0}%` }}
                      ></div>
                    </div>
                  </td>

                  {/* 2. QC Readiness (BR-25) */}
                  <td className="py-3 px-4 min-w-[130px]">
                    <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {o.progress && o.progress.qcReadiness ? o.progress.qcReadiness.statusText : "Pending"}
                    </div>
                    {o.progress?.qcReadiness?.qcResolvedPercent !== null && o.progress?.qcReadiness?.qcResolvedPercent !== undefined && (
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono-id">
                        {o.progress?.qcReadiness?.passedCount ?? 0} pass / {o.progress?.qcReadiness?.reworkCount ?? 0} rwk / {o.progress?.qcReadiness?.rejectedCount ?? 0} rej
                      </div>
                    )}
                  </td>

                  {/* 3. Dispatch Completion (BR-25) */}
                  <td className="py-3 px-4 min-w-[130px]">
                    <div className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {o.progress && o.progress.dispatchCompletion ? o.progress.dispatchCompletion.summaryText : `0% dispatched`}
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#277653] h-full rounded-full transition-all"
                        style={{ width: `${o.progress?.dispatchCompletion?.dispatchPercent ?? 0}%` }}
                      ></div>
                    </div>
                    {o.progress?.dispatchCompletion?.shortfallNote && (
                      <div className="text-[10px] text-[var(--critical)] font-semibold mt-0.5">
                        {o.progress?.dispatchCompletion?.shortfallNote}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-[var(--text-secondary)] font-mono-id">
                    {formatDate(o.deadline)}
                  </td>

                  {/* Risk Badge with Reason & Order Status */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {/* Status */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-center ${
                          o.status === "COMPLETED"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : o.status === "READY_TO_SHIP"
                            ? "bg-emerald-100 text-[var(--primary)]"
                            : o.status === "PARTIALLY_DISPATCHED"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : o.status === "IN_QC"
                            ? "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                            : o.status === "IN_PRODUCTION"
                            ? "bg-[rgba(58,141,212,0.15)] text-[var(--primary)]"
                            : o.status === "AWAITING_YARN"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : o.status === "NEW"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-[var(--text-secondary)]"
                        }`}
                      >
                        {o.status.replace("_", " ")}
                      </span>

                      {/* Risk Badge with Reason (BR-23) */}
                      {o.risk.risk !== "ON_TRACK" && (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            o.risk.risk === "OVERDUE"
                              ? "bg-red-50 text-[var(--critical)]"
                              : "bg-amber-50 text-[var(--warning)]"
                          }`}
                          title={o.risk.reason}
                        >
                          {o.risk.risk === "OVERDUE" ? (
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[130px]">{o.risk.reason}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/orders/${o.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      View Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !isPending && (
            <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center">
              <ClipboardList className="w-8 h-8 mb-2 opacity-50" />
              <p>No orders found.</p>
            </div>
          )}
        </div>
        <div className="px-4 pb-4">
          <Pagination 
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPageChange={handlePageChange}
            loading={isPending}
          />
        </div>
      </div>

      {/* Create Order Modal with Live Yarn Check Panel (BR-04, BR-05) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[var(--primary)]" />
                Create New Order (Office Direct)
              </h3>
              <button onClick={() => setCreateModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Buyer *
                </label>
                <select
                  name="buyerId"
                  required
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select Buyer</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Fabric Type *
                </label>
                <select
                  name="fabricTypeId"
                  required
                  value={selectedFabricId}
                  onChange={(e) => handleFabricOrQtyChange(e.target.value, enteredQty)}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select Fabric Type</option>
                  {fabricTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} (Requires {ft.yarnKgPerMetre} kg/m of {ft.yarnCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Colour *
                  </label>
                  <input
                    type="text"
                    name="colour"
                    required
                    placeholder="e.g. Navy Blue"
                    className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Quantity (metres) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="qtyMetres"
                    required
                    placeholder="e.g. 500"
                    value={enteredQty}
                    onChange={(e) => handleFabricOrQtyChange(selectedFabricId, e.target.value)}
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* LIVE YARN CHECK PANEL (BR-04) */}
              {yarnCheckResult && (
                <div
                  className={`p-3 rounded-md border text-xs ${
                    yarnCheckResult.isEnough
                      ? "bg-[rgba(0,240,255,0.1)] border-[var(--border-highlight)] text-[var(--primary)]"
                      : "bg-amber-50 border-amber-300 text-[var(--warning)]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>Live Yarn Stock Check ({yarnCheckResult.yarnCode}):</span>
                    <span>{yarnCheckResult.message}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono-id text-[11px] text-[var(--text-primary)] mt-1 pt-1 border-t border-black/10">
                    <div>Required: <strong>{yarnCheckResult.yarnRequiredKg} kg</strong></div>
                    <div>Available: <strong>{yarnCheckResult.availableKg} kg</strong></div>
                    <div>Shortage: <strong>{yarnCheckResult.shortageKg} kg</strong></div>
                  </div>
                  <p className="text-[10px] mt-1 text-[var(--text-secondary)]">
                    {yarnCheckResult.isEnough
                      ? "Order will be CONFIRMED immediately and yarn reserved."
                      : "Order will enter AWAITING_YARN status until sufficient yarn arrives at the gate."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Delivery Deadline *
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    required
                    defaultValue={new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0]}
                    className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Price per Metre (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="pricePerMetre"
                    placeholder="Defaults from fabric"
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Saving Order..." : "Save & Confirm Order (BR-05)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
