"use client";

import { useRouter } from "next/navigation";

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
import { formatDate } from "@/lib/dateUtils";

interface OrderDetailClientProps {
  order: any;
  progress: any;
  risk: any;
  cost: any | null; // null if not Administrator
  userRole: string;
}

export default function OrderDetailClient({
  order,
  progress,
  risk,
  cost,
  userRole,
}: OrderDetailClientProps) {
  const router = useRouter();
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

  const canReview = (userRole === "ADMINISTRATOR" || userRole === "MANAGER") && order.status === "NEW";
  const canCancel =
    (userRole === "ADMINISTRATOR" || userRole === "MANAGER") &&
    order.status !== "CANCELLED" &&
    order.status !== "COMPLETED" &&
    order.status !== "NEW" &&
    !(order.workOrders || []).some((wo: any) => wo.producedQtyMetres > 0 || wo.status === "IN_PROGRESS");

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
      router.refresh();
      setReviewModalOpen(false);
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
      router.refresh();
      setCancelModalOpen(false);
          }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <Link href="/orders" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Orders
        </Link>
        <span className="font-mono-id text-[var(--text-primary)] font-bold">{order.orderNo}</span>
      </div>

      {/* Header Summary Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono-id text-[var(--primary)]">{order.orderNo}</h1>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                  order.status === "COMPLETED"
                    ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                    : order.status === "READY_TO_SHIP"
                    ? "bg-emerald-100 text-[var(--primary)]"
                    : order.status === "PARTIALLY_DISPATCHED"
                    ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                    : order.status === "IN_QC"
                    ? "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                    : order.status === "IN_PRODUCTION"
                    ? "bg-[rgba(58,141,212,0.15)] text-[var(--primary)]"
                    : order.status === "AWAITING_YARN"
                    ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                    : order.status === "NEW"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-[var(--text-secondary)]"
                }`}
              >
                {order.status.replace("_", " ")}
              </span>

              {risk.risk !== "ON_TRACK" && (
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                    risk.risk === "OVERDUE"
                      ? "bg-red-50 text-[var(--critical)]"
                      : "bg-amber-50 text-[var(--warning)]"
                  }`}
                >
                  {risk.risk === "OVERDUE" ? <AlertCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {risk.reason}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              Buyer: <span className="text-[var(--primary)]">{order.buyer.name}</span> · Fabric: {order.fabricType.name} ({order.colour})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canReview && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 rounded-md shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
              >
                Review Order (Manager Action)
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-[var(--critical)] border border-[rgba(255,77,77,0.3)] hover:bg-red-50 rounded-md shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-[var(--text-secondary)] font-medium">Quantity:</span>
            <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]" suppressHydrationWarning>{order.qtyMetres.toLocaleString("en-IN")} m</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)] font-medium">Rate per Metre:</span>
            <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]">₹{order.pricePerMetre.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)] font-medium">Total Order Value:</span>
            <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]">
              ₹{(order.qtyMetres * order.pricePerMetre).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)] font-medium">Delivery Deadline:</span>
            <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]">
              {formatDate(order.deadline)}
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Banner for Orders with All Rolls Rejected (BR-16) */}
      {order.status === "IN_QC" &&
        (order.rolls || []).length > 0 &&
        (order.rolls || []).every((r: any) => r.qcStatus === "REJECTED") && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-xs text-[var(--critical)] font-semibold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">No dispatch-eligible rolls.</p>
              <p className="mt-1">
                All {(order.rolls || []).length} registered rolls (
                {(order.rolls || []).reduce((a: any, r: any) => a + r.lengthMetres, 0)} m) were rejected during QC examination.
                Rejected quantity: {(order.rolls || []).reduce((a: any, r: any) => a + r.lengthMetres, 0)} m of {order.qtyMetres} m ordered.
                Nothing can be shipped.
              </p>
            </div>
          </div>
        )}

      {/* 3 Progress Indicators (BR-25) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Indicator 1: Production Progress */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              1. Production Progress
            </span>
            <span className="font-mono-id font-bold text-[var(--primary)]">
              {progress?.productionProgressPercent ?? progress?.production ?? 0}%
            </span>
          </div>
          <div className="w-full bg-[#E5EAE8] h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-[var(--primary)] h-full rounded-full transition-all"
              style={{ width: `${progress?.productionProgressPercent ?? progress?.production ?? 0}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Produced: {progress?.totalProducedMetres ?? 0} m of {progress?.totalPlannedMetres ?? 0} m across all stages.
          </p>
        </div>

        {/* Indicator 2: QC Readiness */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              2. QC Readiness
            </span>
            <span className="font-mono-id font-bold text-[var(--info)]">
              {progress?.qcReadiness?.qcResolvedPercent !== null && progress?.qcReadiness?.qcResolvedPercent !== undefined
                ? `${progress.qcReadiness.qcResolvedPercent}%`
                : "Pending"}
            </span>
          </div>
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
            {progress?.qcReadiness?.statusText || "Pending"}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Registered rolls: {progress?.qcReadiness?.registeredRollCount ?? 0} ({progress?.qcReadiness?.registeredRollMetres ?? 0} m)
          </p>
        </div>

        {/* Indicator 3: Dispatch Completion */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              3. Dispatch Completion
            </span>
            <span className="font-mono-id font-bold text-[var(--success)]">
              {progress?.dispatchCompletion?.dispatchPercent ?? progress?.dispatch ?? 0}%
            </span>
          </div>
          <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
            {progress?.dispatchCompletion?.summaryText || `${progress?.dispatch ?? 0}% dispatched`}
          </div>
          {progress?.dispatchCompletion?.shortfallNote ? (
            <p className="text-[11px] text-[var(--critical)] font-semibold">
              {progress.dispatchCompletion.shortfallNote}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--text-secondary)]">
              Dispatched rolls: {(order.rolls || []).filter((r: any) => r.stockStatus === "DISPATCHED").length}
            </p>
          )}
        </div>
      </div>

      {/* Production Stages Pipeline Tracker */}
      <div className="premium-card p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-[var(--primary)]" />
          Production Stage Pipeline (Spinning → Weaving → Dyeing → QC → Ship)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["SPINNING", "WEAVING", "DYEING"].map((stg) => {
            const wo = (order.workOrders || []).find((w: any) => w.stage === stg);
            return (
              <div
                key={stg}
                className={`border rounded-lg p-3.5 text-xs transition-colors ${
                  wo?.status === "COMPLETED"
                    ? "bg-green-50/50 border-green-200"
                    : wo?.status === "IN_PROGRESS"
                    ? "bg-[rgba(58,141,212,0.1)] border-[rgba(58,141,212,0.3)]"
                    : wo?.status === "BLOCKED"
                    ? "bg-red-50/50 border-[rgba(255,77,77,0.3)]"
                    : "bg-[var(--sidebar-secondary)] border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                    {stg}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      wo?.status === "COMPLETED"
                        ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                        : wo?.status === "IN_PROGRESS"
                        ? "bg-[rgba(58,141,212,0.15)] text-[var(--primary)]"
                        : wo?.status === "BLOCKED"
                        ? "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                        : "bg-gray-100 text-[var(--text-secondary)]"
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
      <div className="premium-card overflow-hidden">
        <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
            Registered Rolls ({(order.rolls || []).length})
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Total: {(order.rolls || []).reduce((a: any, r: any) => a + r.lengthMetres, 0)} m
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Roll ID</th>
                <th className="py-2.5 px-4 text-right">Length (m)</th>
                <th className="py-2.5 px-4">Weaving Loom</th>
                <th className="py-2.5 px-4">Dyeing Vat</th>
                <th className="py-2.5 px-4 text-center">QC Status</th>
                <th className="py-2.5 px-4 text-center">Stock Location</th>
                <th className="py-2.5 px-4 text-right">Passport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(order.rolls || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--text-secondary)]">
                    No rolls registered yet for this order.
                  </td>
                </tr>
              ) : (
                (order.rolls || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-[var(--sidebar-secondary)]">
                    <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                      <Link href={`/rolls/${r.id}`} className="hover:underline flex items-center gap-1">
                        {r.rollNo}
                        <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                      {r.lengthMetres} m
                    </td>
                    <td className="py-3 px-4 font-mono-id text-[var(--text-secondary)]">
                      {r.weavingMachine?.code || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono-id text-[var(--text-secondary)]">
                      {r.dyeingMachine?.code || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.qcStatus === "PASSED"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : r.qcStatus === "REWORK"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : r.qcStatus === "REJECTED"
                            ? "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                            : "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
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
                            ? "bg-red-50 text-[var(--critical)]"
                            : "bg-emerald-50 text-[var(--primary)]"
                        }`}
                      >
                        {r.stockStatus === "DISPATCHED" ? "DISPATCHED" : r.qcStatus === "REJECTED" ? "QUARANTINE" : "SHELF BAY"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/rolls/${r.id}`}
                        className="px-2 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded"
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
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-[var(--primary)]" />
            Dispatches ({order.dispatches.length})
          </h2>
          {order.dispatches.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-3 text-center">No dispatches recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {order.dispatches.map((d: any) => (
                <div key={d.id} className="p-3 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded-md text-xs">
                  <div className="flex items-center justify-between font-mono-id font-bold text-[var(--primary)]">
                    <span>{d.dispatchNo}</span>
                    <span className="text-[var(--text-secondary)]">{formatDate(d.dispatchedAt)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-primary)]">
                    Truck: <strong>{d.truckNo}</strong> · Driver: {d.driverName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    Rolls dispatched: {d.lines.length} ({d.lines.reduce((a: any, l: any) => a + l.lengthMetres, 0)} m)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[var(--primary)]" />
            Invoices & Payments ({order.invoices.length})
          </h2>
          {order.invoices.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-3 text-center">No invoices generated yet.</p>
          ) : (
            <div className="space-y-2">
              {order.invoices.map((inv: any) => {
                const totalPaid = inv.payments.reduce((a: any, p: any) => a + p.amount, 0);
                return (
                  <div key={inv.id} className="p-3 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded-md text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-id font-bold text-[var(--primary)]">{inv.invoiceNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : inv.status === "PARTIAL"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono-id" suppressHydrationWarning>
                      <span>Amount: ₹{Number(inv.amount || 0).toLocaleString("en-IN")}</span>
                      <span className="text-[var(--success)]">Paid: ₹{Number(totalPaid || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown (ADMINISTRATOR Role Only - Section 7.3 & BR-22) */}
      {userRole === "ADMINISTRATOR" && cost && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[var(--primary)]" />
              Executive Order Cost Breakdown (Administrator Confidential)
            </h2>
            {cost.isCostIncomplete && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(245,166,35,0.15)] text-[var(--warning)] uppercase">
                Cost Incomplete
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-x divide-[var(--border)]">
            <div className="px-2">
              <span className="text-[var(--text-secondary)] font-medium">Yarn Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]" suppressHydrationWarning>₹{Number(cost.yarnCost || 0).toLocaleString("en-IN")}</p>
              <span className="text-[10px] text-[var(--text-secondary)]">{cost.yarnConsumedKg} kg consumed</span>
            </div>
            <div className="px-2">
              <span className="text-[var(--text-secondary)] font-medium">Labour Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]" suppressHydrationWarning>₹{Number(cost.labourCost || 0).toLocaleString("en-IN")}</p>
              <span className="text-[10px] text-[var(--text-secondary)]">{cost.totalHours} hrs worked</span>
            </div>
            <div className="px-2">
              <span className="text-[var(--text-secondary)] font-medium">Machine Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[var(--text-primary)]" suppressHydrationWarning>₹{Number(cost.machineCost || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="px-2">
              <span className="text-[var(--text-secondary)] font-medium">Total Cost:</span>
              <p className="font-mono-id font-bold text-sm text-[#172D38]" suppressHydrationWarning>₹{Number(cost.totalCost || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="px-2">
              <span className="text-[var(--text-secondary)] font-medium">Order Margin:</span>
              <p className={`font-mono-id font-bold text-sm ${cost.margin >= 0 ? "text-[var(--success)]" : "text-[var(--critical)]"}`} suppressHydrationWarning>
                ₹{Number(cost.margin || 0).toLocaleString("en-IN")}
              </p>
              {cost.costPerGoodMetre && (
                <span className="text-[10px] text-[var(--text-secondary)]">Cost/good metre: ₹{cost.costPerGoodMetre}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for NEW Orders (BR-24) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Review Buyer-Submitted Order
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Submitted by <strong>{order.buyer.name}</strong> for {order.qtyMetres} metres of {order.fabricType.name}.
            </p>

            {reviewError && (
              <div className="p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded mb-3 font-semibold">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Select Review Action:</label>
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
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[var(--critical)]">
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
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Confirmed Price per Metre (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustedPrice}
                    onChange={(e) => setAdjustedPrice(e.target.value)}
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                  />
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Approving will evaluate yarn availability: if available ≥ required, reserves yarn and sets CONFIRMED; otherwise sets AWAITING_YARN.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Internal Cancellation Reason (min 5 chars) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reviewCancelReason}
                    onChange={(e) => setReviewCancelReason(e.target.value)}
                    placeholder="e.g. Buyer credit limit exceeded or fabric spec unsupported"
                    className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-4 py-1.5 text-[var(--text-primary)] font-semibold rounded ${
                    reviewActionType === "APPROVE" ? "bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200" : "bg-[#B44545] hover:bg-red-700"
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
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--critical)] uppercase tracking-wider mb-2">
              Cancel Order ({order.orderNo})
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Cancelling releases any outstanding yarn reservation back into available stock.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded mb-3 font-semibold">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Cancellation Reason (min 5 characters) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Buyer requested project postponement"
                  className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-1.5 bg-[#B44545] hover:bg-red-700 text-[var(--text-primary)] font-semibold rounded"
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
