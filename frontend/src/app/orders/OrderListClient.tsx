"use client";

import React, { useState } from "react";
import Link from "next/link";
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
}

export default function OrderListClient({
  orders,
  buyers,
  fabricTypes,
  userRole,
}: OrderListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.fabricName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.colour.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "NEEDS_REVIEW") return o.status === "NEW";
    if (statusFilter === "AWAITING_YARN") return o.status === "AWAITING_YARN";
    if (statusFilter === "IN_PRODUCTION") return o.status === "IN_PRODUCTION" || o.status === "CONFIRMED";
    if (statusFilter === "IN_QC") return o.status === "IN_QC";
    if (statusFilter === "READY_TO_SHIP") return o.status === "READY_TO_SHIP";
    if (statusFilter === "COMPLETED") return o.status === "COMPLETED" || o.status === "PARTIALLY_DISPATCHED";
    return o.status === statusFilter;
  });

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
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#176B63]" />
            Orders Registry & Tracking
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            End-to-end order tracking across production stages, QC readiness, and dispatches.
          </p>
        </div>
        {userRole !== "FLOOR" && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#176B63] hover:bg-[#11564F] rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Order (Office Entry)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DCE3E1] pb-2 text-xs">
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
                ? "bg-[#172D38] text-white shadow-xs"
                : "text-[#617078] hover:text-[#202B32] hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between bg-white p-3 border border-[#DCE3E1] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#617078]" />
          <input
            type="text"
            placeholder="Search order no, buyer, fabric, colour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#F4F6F5] border border-[#DCE3E1] rounded-md pl-9 pr-3 py-1.5 text-[#202B32] focus:outline-none focus:border-[#176B63] focus:bg-white"
          />
        </div>
        <span className="text-xs text-[#617078] font-mono-id">
          {filteredOrders.length} matching order(s)
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F6F5] border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order No</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4">Fabric & Colour</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Production Progress</th>
                <th className="py-3 px-4">QC Readiness</th>
                <th className="py-3 px-4">Dispatch Completion</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Risk & Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F9FAFA] transition-colors">
                  <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                    <Link href={`/orders/${o.id}`} className="hover:underline flex items-center gap-1">
                      {o.orderNo}
                      <ExternalLink className="w-3 h-3 text-[#617078]" />
                    </Link>
                    {o.submittedByBuyer && (
                      <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-bold uppercase mt-0.5">
                        Buyer Submitted
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#202B32]">{o.buyerName}</td>
                  <td className="py-3 px-4 text-[#202B32]">
                    <div>{o.fabricName}</div>
                    <div className="text-[11px] text-[#617078]">{o.colour}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                    {o.qtyMetres.toLocaleString("en-IN")} m
                  </td>

                  {/* 1. Production Progress (BR-25) */}
                  <td className="py-3 px-4 min-w-[120px]">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-mono-id">
                      <span className="text-[#617078]">Production:</span>
                      <span className="font-bold text-[#202B32]">{o.progress?.productionProgressPercent ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#176B63] h-full rounded-full transition-all"
                        style={{ width: `${o.progress?.productionProgressPercent ?? 0}%` }}
                      ></div>
                    </div>
                  </td>

                  {/* 2. QC Readiness (BR-25) */}
                  <td className="py-3 px-4 min-w-[130px]">
                    <div className="text-[11px] font-semibold text-[#202B32]">
                      {o.progress && o.progress.qcReadiness ? o.progress.qcReadiness.statusText : "Pending"}
                    </div>
                    {o.progress?.qcReadiness?.qcResolvedPercent !== null && o.progress?.qcReadiness?.qcResolvedPercent !== undefined && (
                      <div className="text-[10px] text-[#617078] mt-0.5 font-mono-id">
                        {o.progress?.qcReadiness?.passedCount ?? 0} pass / {o.progress?.qcReadiness?.reworkCount ?? 0} rwk / {o.progress?.qcReadiness?.rejectedCount ?? 0} rej
                      </div>
                    )}
                  </td>

                  {/* 3. Dispatch Completion (BR-25) */}
                  <td className="py-3 px-4 min-w-[130px]">
                    <div className="text-[11px] font-semibold text-[#202B32]">
                      {o.progress && o.progress.dispatchCompletion ? o.progress.dispatchCompletion.summaryText : `0% dispatched`}
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#277653] h-full rounded-full transition-all"
                        style={{ width: `${o.progress?.dispatchCompletion?.dispatchPercent ?? 0}%` }}
                      ></div>
                    </div>
                    {o.progress?.dispatchCompletion?.shortfallNote && (
                      <div className="text-[10px] text-[#B44545] font-semibold mt-0.5">
                        {o.progress?.dispatchCompletion?.shortfallNote}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-[#617078] font-mono-id">
                    {new Date(o.deadline).toLocaleDateString()}
                  </td>

                  {/* Risk Badge with Reason & Order Status */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {/* Status */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-center ${
                          o.status === "COMPLETED"
                            ? "bg-green-100 text-[#277653]"
                            : o.status === "READY_TO_SHIP"
                            ? "bg-emerald-100 text-[#176B63]"
                            : o.status === "PARTIALLY_DISPATCHED"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : o.status === "IN_QC"
                            ? "bg-blue-100 text-[#54758A]"
                            : o.status === "IN_PRODUCTION"
                            ? "bg-blue-100 text-[#176B63]"
                            : o.status === "AWAITING_YARN"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : o.status === "NEW"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-[#617078]"
                        }`}
                      >
                        {o.status.replace("_", " ")}
                      </span>

                      {/* Risk Badge with Reason (BR-23) */}
                      {o.risk.risk !== "ON_TRACK" && (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            o.risk.risk === "OVERDUE"
                              ? "bg-red-50 text-[#B44545]"
                              : "bg-amber-50 text-[#A86F1F]"
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
                      className="px-2.5 py-1 text-xs font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded transition-colors"
                    >
                      View Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal with Live Yarn Check Panel (BR-04, BR-05) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E1]">
              <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#176B63]" />
                Create New Order (Office Direct)
              </h3>
              <button onClick={() => setCreateModalOpen(false)}>
                <X className="w-4 h-4 text-[#617078]" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Buyer *
                </label>
                <select
                  name="buyerId"
                  required
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
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
                <label className="block font-semibold text-[#202B32] mb-1">
                  Fabric Type *
                </label>
                <select
                  name="fabricTypeId"
                  required
                  value={selectedFabricId}
                  onChange={(e) => handleFabricOrQtyChange(e.target.value, enteredQty)}
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
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
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Colour *
                  </label>
                  <input
                    type="text"
                    name="colour"
                    required
                    placeholder="e.g. Navy Blue"
                    className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
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
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
                  />
                </div>
              </div>

              {/* LIVE YARN CHECK PANEL (BR-04) */}
              {yarnCheckResult && (
                <div
                  className={`p-3 rounded-md border text-xs ${
                    yarnCheckResult.isEnough
                      ? "bg-[#EBF3F1] border-[#C5DDD7] text-[#176B63]"
                      : "bg-amber-50 border-amber-300 text-[#A86F1F]"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>Live Yarn Stock Check ({yarnCheckResult.yarnCode}):</span>
                    <span>{yarnCheckResult.message}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono-id text-[11px] text-[#202B32] mt-1 pt-1 border-t border-black/10">
                    <div>Required: <strong>{yarnCheckResult.yarnRequiredKg} kg</strong></div>
                    <div>Available: <strong>{yarnCheckResult.availableKg} kg</strong></div>
                    <div>Shortage: <strong>{yarnCheckResult.shortageKg} kg</strong></div>
                  </div>
                  <p className="text-[10px] mt-1 text-[#617078]">
                    {yarnCheckResult.isEnough
                      ? "Order will be CONFIRMED immediately and yarn reserved."
                      : "Order will enter AWAITING_YARN status until sufficient yarn arrives at the gate."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Delivery Deadline *
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    required
                    defaultValue={new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0]}
                    className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Price per Metre (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="pricePerMetre"
                    placeholder="Defaults from fabric"
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] focus:outline-none focus:border-[#176B63]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078] hover:bg-[#F4F6F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
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
