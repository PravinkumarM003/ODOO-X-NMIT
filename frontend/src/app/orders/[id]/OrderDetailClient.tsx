"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock,
  Cpu,
  Layers,
  Truck,
  DollarSign,
  FileText,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { reviewBuyerOrderAction, cancelOrderAction } from "@/app/actions/orderActions";

interface OrderDetailClientProps {
  order: any;
  progress: any;
  risk: any;
  cost: any | null; // null if not Owner
  userRole: string;
}

export default function OrderDetailClient({
  order,
  progress,
  risk,
  cost,
  userRole,
}: OrderDetailClientProps) {
  // Review Modal state (BR-24)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewActionType, setReviewActionType] = useState<"APPROVE" | "CANCEL">("APPROVE");
  const [adjustedPrice, setAdjustedPrice] = useState(order.pricePerMetre.toString());
  const [reviewCancelReason, setReviewCancelReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Cancellation Modal state (BR-07)
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canReview = (userRole === "OWNER" || userRole === "OFFICE") && order.status === "NEW";
  const canCancel =
    (userRole === "OWNER" || userRole === "OFFICE") &&
    order.status !== "CANCELLED" &&
    order.status !== "COMPLETED" &&
    order.status !== "NEW" &&
    !order.workOrders.some((wo: any) => wo.producedQtyMetres > 0 || wo.status === "IN_PROGRESS");

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError(null);

    const formData = new FormData();
    formData.append("orderId", order.id);
    formData.append("action", reviewActionType);
    if (reviewActionType === "APPROVE") {
      formData.append("adjustedPricePerMetre", adjustedPrice);
    } else {
      formData.append("cancelReason", reviewCancelReason);
    }

    const res = await reviewBuyerOrderAction(formData);
    setReviewLoading(false);

    if (res.error) {
      setReviewError(res.error);
    } else {
      setReviewModalOpen(false);
      window.location.reload();
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelLoading(true);
    setCancelError(null);

    const formData = new FormData();
    formData.append("orderId", order.id);
    formData.append("cancelReason", cancelReason);

    const res = await cancelOrderAction(formData);
    setCancelLoading(false);

    if (res.error) {
      setCancelError(res.error);
    } else {
      setCancelModalOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-[#617078]">
        <Link href="/orders" className="hover:text-[#176B63] flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Orders
        </Link>
        <span className="font-mono-id text-[#202B32] font-bold">{order.orderNo}</span>
      </div>

      {/* Header Summary Card */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DCE3E1]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono-id text-[#176B63]">{order.orderNo}</h1>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                  order.status === "COMPLETED"
                    ? "bg-green-100 text-[#277653]"
                    : order.status === "READY_TO_SHIP"
                    ? "bg-emerald-100 text-[#176B63]"
                    : order.status === "PARTIALLY_DISPATCHED"
                    ? "bg-amber-100 text-[#A86F1F]"
                    : order.status === "IN_QC"
                    ? "bg-blue-100 text-[#54758A]"
                    : order.status === "IN_PRODUCTION"
                    ? "bg-blue-100 text-[#176B63]"
                    : order.status === "AWAITING_YARN"
                    ? "bg-amber-100 text-[#A86F1F]"
                    : order.status === "NEW"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-[#617078]"
                }`}
              >
                {order.status.replace("_", " ")}
              </span>

              {risk.risk !== "ON_TRACK" && (
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                    risk.risk === "OVERDUE"
                      ? "bg-red-50 text-[#B44545]"
                      : "bg-amber-50 text-[#A86F1F]"
                  }`}
                >
                  {risk.risk === "OVERDUE" ? <AlertCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {risk.reason}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-[#202B32] mt-1">
              Buyer: <span className="text-[#176B63]">{order.buyer.name}</span> · Fabric: {order.fabricType.name} ({order.colour})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canReview && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#176B63] hover:bg-[#11564F] rounded-md shadow-xs"
              >
                Review Order (Office Action)
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-[#B44545] border border-red-200 hover:bg-red-50 rounded-md shadow-xs"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-[#617078] font-medium">Quantity:</span>
            <p className="font-mono-id font-bold text-sm text-[#202B32]">{order.qtyMetres.toLocaleString()} m</p>
          </div>
          <div>
            <span className="text-[#617078] font-medium">Rate per Metre:</span>
            <p className="font-mono-id font-bold text-sm text-[#202B32]">₹{order.pricePerMetre.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[#617078] font-medium">Total Order Value:</span>
            <p className="font-mono-id font-bold text-sm text-[#202B32]">
              ₹{(order.qtyMetres * order.pricePerMetre).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[#617078] font-medium">Delivery Deadline:</span>
            <p className="font-mono-id font-bold text-sm text-[#202B32]">
              {new Date(order.deadline).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Banner for Orders with All Rolls Rejected (BR-16) */}
      {order.status === "IN_QC" &&
        order.rolls.length > 0 &&
        order.rolls.every((r: any) => r.qcStatus === "REJECTED") && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-xs text-[#B44545] font-semibold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">No dispatch-eligible rolls.</p>
              <p className="mt-1">
                All {order.rolls.length} registered rolls (
                {order.rolls.reduce((a: any, r: any) => a + r.lengthMetres, 0)} m) were rejected during QC examination.
                Rejected quantity: {order.rolls.reduce((a: any, r: any) => a + r.lengthMetres, 0)} m of {order.qtyMetres} m ordered.
                Nothing can be shipped.
              </p>
            </div>
          </div>
        )}

      {/* 3 Progress Indicators (BR-25) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Indicator 1: Production Progress */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#202B32] uppercase tracking-wider text-[11px]">
              1. Production Progress
            </span>
            <span className="font-mono-id font-bold text-[#176B63]">
              {progress.productionProgressPercent}%
            </span>
          </div>
          <div className="w-full bg-[#E5EAE8] h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-[#176B63] h-full rounded-full transition-all"
              style={{ width: `${progress.productionProgressPercent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-[#617078]">
            Produced: {progress.totalProducedMetres} m of {progress.totalPlannedMetres} m across all stages.
          </p>
        </div>

        {/* Indicator 2: QC Readiness */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#202B32] uppercase tracking-wider text-[11px]">
              2. QC Readiness
            </span>
            <span className="font-mono-id font-bold text-[#54758A]">
              {progress.qcReadiness.qcResolvedPercent !== null
                ? `${progress.qcReadiness.qcResolvedPercent}%`
                : "Pending"}
            </span>
          </div>
          <div className="text-xs font-semibold text-[#202B32] mb-1">
            {progress.qcReadiness.statusText}
          </div>
          <p className="text-[11px] text-[#617078]">
            Registered rolls: {progress.qcReadiness.registeredRollCount} ({progress.qcReadiness.registeredRollMetres} m)
          </p>
        </div>

        {/* Indicator 3: Dispatch Completion */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#202B32] uppercase tracking-wider text-[11px]">
              3. Dispatch Completion
            </span>
            <span className="font-mono-id font-bold text-[#277653]">
              {progress.dispatchCompletion.dispatchPercent}%
            </span>
          </div>
          <div className="text-xs font-semibold text-[#202B32] mb-1">
            {progress.dispatchCompletion.summaryText}
          </div>
          {progress.dispatchCompletion.shortfallNote ? (
            <p className="text-[11px] text-[#B44545] font-semibold">
              {progress.dispatchCompletion.shortfallNote}
            </p>
          ) : (
            <p className="text-[11px] text-[#617078]">
              Dispatched rolls: {order.rolls.filter((r: any) => r.stockStatus === "DISPATCHED").length}
            </p>
          )}
        </div>
      </div>

      {/* Production Stages Pipeline Tracker */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-4 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-[#176B63]" />
          Production Stage Pipeline (Spinning → Weaving → Dyeing → QC → Ship)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["SPINNING", "WEAVING", "DYEING"].map((stg) => {
            const wo = order.workOrders.find((w: any) => w.stage === stg);
            return (
              <div
                key={stg}
                className={`border rounded-lg p-3.5 text-xs transition-colors ${
                  wo?.status === "COMPLETED"
                    ? "bg-green-50/50 border-green-200"
                    : wo?.status === "IN_PROGRESS"
                    ? "bg-blue-50/50 border-blue-200"
                    : wo?.status === "BLOCKED"
                    ? "bg-red-50/50 border-red-200"
                    : "bg-[#F9FAFA] border-[#DCE3E1]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#202B32] uppercase tracking-wider text-[11px]">
                    {stg}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      wo?.status === "COMPLETED"
                        ? "bg-green-100 text-[#277653]"
                        : wo?.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-[#176B63]"
                        : wo?.status === "BLOCKED"
                        ? "bg-red-100 text-[#B44545]"
                        : "bg-gray-100 text-[#617078]"
                    }`}
                  >
                    {wo?.status || "NOT CREATED"}
                  </span>
                </div>

                <div className="space-y-1 font-mono-id text-[11px]">
                  <div>Machine: <strong>{wo?.machine?.code || "Unassigned"}</strong></div>
                  <div>Output: {wo?.producedQtyMetres || 0} / {wo?.plannedQtyMetres || order.qtyMetres} m</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rolls & QC Inspection Table */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#176B63]" />
            Registered Rolls ({order.rolls.length})
          </h2>
          <span className="text-xs text-[#617078]">
            Total: {order.rolls.reduce((a: any, r: any) => a + r.lengthMetres, 0)} m
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Roll ID</th>
                <th className="py-2.5 px-4 text-right">Length (m)</th>
                <th className="py-2.5 px-4">Weaving Loom</th>
                <th className="py-2.5 px-4">Dyeing Vat</th>
                <th className="py-2.5 px-4 text-center">QC Status</th>
                <th className="py-2.5 px-4 text-center">Stock Location</th>
                <th className="py-2.5 px-4 text-right">Passport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {order.rolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#617078]">
                    No rolls registered yet for this order.
                  </td>
                </tr>
              ) : (
                order.rolls.map((r: any) => (
                  <tr key={r.id} className="hover:bg-[#F9FAFA]">
                    <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                      <Link href={`/rolls/${r.id}`} className="hover:underline flex items-center gap-1">
                        {r.rollNo}
                        <ExternalLink className="w-3 h-3 text-[#617078]" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                      {r.lengthMetres} m
                    </td>
                    <td className="py-3 px-4 font-mono-id text-[#617078]">
                      {r.weavingMachine?.code || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono-id text-[#617078]">
                      {r.dyeingMachine?.code || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.qcStatus === "PASSED"
                            ? "bg-green-100 text-[#277653]"
                            : r.qcStatus === "REWORK"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : r.qcStatus === "REJECTED"
                            ? "bg-red-100 text-[#B44545]"
                            : "bg-blue-100 text-[#54758A]"
                        }`}
                      >
                        {r.qcStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.stockStatus === "DISPATCHED"
                            ? "bg-purple-100 text-purple-700"
                            : r.qcStatus === "REJECTED"
                            ? "bg-red-50 text-[#B44545]"
                            : "bg-emerald-50 text-[#176B63]"
                        }`}
                      >
                        {r.stockStatus === "DISPATCHED" ? "DISPATCHED" : r.qcStatus === "REJECTED" ? "QUARANTINE" : "SHELF BAY"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/rolls/${r.id}`}
                        className="px-2 py-1 text-xs font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded"
                      >
                        Passport →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatches & Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dispatches */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[#176B63]" />
            Dispatches ({order.dispatches.length})
          </h2>
          {order.dispatches.length === 0 ? (
            <p className="text-xs text-[#617078] py-3 text-center">No dispatches recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {order.dispatches.map((d: any) => (
                <div key={d.id} className="p-3 bg-[#F9FAFA] border border-[#DCE3E1] rounded-md text-xs">
                  <div className="flex items-center justify-between font-mono-id font-bold text-[#176B63]">
                    <span>{d.dispatchNo}</span>
                    <span className="text-[#617078]">{new Date(d.dispatchedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#202B32]">
                    Truck: <strong>{d.truckNo}</strong> · Driver: {d.driverName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#617078]">
                    Rolls dispatched: {d.lines.length} ({d.lines.reduce((a: any, l: any) => a + l.lengthMetres, 0)} m)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#176B63]" />
            Invoices & Payments ({order.invoices.length})
          </h2>
          {order.invoices.length === 0 ? (
            <p className="text-xs text-[#617078] py-3 text-center">No invoices generated yet.</p>
          ) : (
            <div className="space-y-2">
              {order.invoices.map((inv: any) => {
                const totalPaid = inv.payments.reduce((a: any, p: any) => a + p.amount, 0);
                return (
                  <div key={inv.id} className="p-3 bg-[#F9FAFA] border border-[#DCE3E1] rounded-md text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-id font-bold text-[#176B63]">{inv.invoiceNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-green-100 text-[#277653]"
                            : inv.status === "PARTIAL"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : "bg-red-100 text-[#B44545]"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono-id">
                      <span>Amount: ₹{inv.amount.toLocaleString()}</span>
                      <span className="text-[#277653]">Paid: ₹{totalPaid.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown (OWNER Role Only - Section 7.3 & BR-22) */}
      {userRole === "OWNER" && cost && (
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#176B63]" />
              Executive Order Cost Breakdown (Owner Confidential)
            </h2>
            {cost.isCostIncomplete && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-[#A86F1F] uppercase">
                Cost Incomplete
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-x divide-[#DCE3E1]">
            <div className="px-2">
              <span className="text-[#617078] font-medium">Yarn Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[#202B32]">₹{cost.yarnCost.toLocaleString()}</p>
              <span className="text-[10px] text-[#617078]">{cost.yarnConsumedKg} kg consumed</span>
            </div>
            <div className="px-2">
              <span className="text-[#617078] font-medium">Labour Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[#202B32]">₹{cost.labourCost.toLocaleString()}</p>
              <span className="text-[10px] text-[#617078]">{cost.totalHours} hrs worked</span>
            </div>
            <div className="px-2">
              <span className="text-[#617078] font-medium">Machine Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[#202B32]">₹{cost.machineCost.toLocaleString()}</p>
            </div>
            <div className="px-2">
              <span className="text-[#617078] font-medium">Total Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[#172D38]">₹{cost.totalCost.toLocaleString()}</p>
            </div>
            <div className="px-2">
              <span className="text-[#617078] font-medium">Order Margin:</span>
              <p className={`font-mono-id font-bold text-sm ${cost.margin >= 0 ? "text-[#277653]" : "text-[#B44545]"}`}>
                ₹{cost.margin.toLocaleString()}
              </p>
              {cost.costPerGoodMetre && (
                <span className="text-[10px] text-[#617078]">Cost/good metre: ₹{cost.costPerGoodMetre}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for NEW Orders (BR-24) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              Review Buyer-Submitted Order
            </h3>
            <p className="text-[#617078] mb-4">
              Submitted by <strong>{order.buyer.name}</strong> for {order.qtyMetres} metres of {order.fabricType.name}.
            </p>

            {reviewError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">Select Review Action:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="action"
                      checked={reviewActionType === "APPROVE"}
                      onChange={() => setReviewActionType("APPROVE")}
                    />
                    Approve Order (Allocate/Confirm)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[#B44545]">
                    <input
                      type="radio"
                      name="action"
                      checked={reviewActionType === "CANCEL"}
                      onChange={() => setReviewActionType("CANCEL")}
                    />
                    Cancel Request
                  </label>
                </div>
              </div>

              {reviewActionType === "APPROVE" ? (
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Confirmed Price per Metre (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustedPrice}
                    onChange={(e) => setAdjustedPrice(e.target.value)}
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                  <p className="text-[11px] text-[#617078] mt-1">
                    Approving will evaluate yarn availability: if available ≥ required, reserves yarn and sets CONFIRMED; otherwise sets AWAITING_YARN.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Internal Cancellation Reason (min 5 chars) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reviewCancelReason}
                    onChange={(e) => setReviewCancelReason(e.target.value)}
                    placeholder="e.g. Buyer credit limit exceeded or fabric spec unsupported"
                    className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-4 py-1.5 text-white font-semibold rounded ${
                    reviewActionType === "APPROVE" ? "bg-[#176B63] hover:bg-[#11564F]" : "bg-[#B44545] hover:bg-red-700"
                  }`}
                >
                  {reviewLoading ? "Processing..." : `Confirm ${reviewActionType === "APPROVE" ? "Approval" : "Cancellation"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal (BR-07) */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#B44545] uppercase tracking-wider mb-2">
              Cancel Order ({order.orderNo})
            </h3>
            <p className="text-[#617078] mb-4">
              Cancelling releases any outstanding yarn reservation back into available stock.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Cancellation Reason (min 5 characters) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Buyer requested project postponement"
                  className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-1.5 bg-[#B44545] hover:bg-red-700 text-white font-semibold rounded"
                >
                  {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
