import { requireSession } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  FileText,
  Cpu,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function BuyerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    redirect("/overview");
  }

  const { id } = await params;

  let detail: any = null;
  try {
    detail = await apiClient.get<any>(`/buyer/orders/${id}`);
  } catch {
    notFound();
  }

  if (!detail || !detail.order) {
    notFound();
  }

  const { order, progress, workOrders = [], dispatches = [], invoices = [] } = detail;

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <Link href="/buyer/orders" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to My Orders
          </Link>
          <span className="font-mono-id text-[var(--text-primary)] font-bold">{order.orderNo}</span>
        </div>

        {/* Order Header Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono-id text-[var(--primary)]">{order.orderNo}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[rgba(0,240,255,0.1)] text-[var(--primary)]">
                  {order.buyerStatus}
                </span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                {order.fabricName} · Colour: {order.colour}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[var(--text-secondary)] block">Order Quantity</span>
              <span className="font-mono-id text-lg font-bold text-[var(--text-primary)]">
                {Number(order.qtyMetres || 0).toLocaleString()} Metres
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Order Date:</span>
              <p className="font-mono-id text-[var(--text-primary)]">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Agreed Delivery Deadline:</span>
              <p className="font-mono-id font-bold text-[var(--text-primary)]">{formatDate(order.deadline)}</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Estimated Completion:</span>
              <p className="font-mono-id font-bold text-[var(--primary)]">
                {order.estimatedCompletion}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Progress Indicators (BR-25 in Buyer Portal) */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            Order Progress & Readiness (BR-25)
          </h2>

          {/* Progress bar showing Production Progress ONLY (Section 6 & 7.10) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[var(--text-primary)]">Production Progress</span>
              <span className="font-mono-id font-bold text-[var(--primary)]">{progress.productionProgressPercent}%</span>
            </div>
            <div className="w-full bg-[#E5EAE8] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--primary)] h-full rounded-full transition-all"
                style={{ width: `${progress.productionProgressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* QC and Dispatch lines beneath it */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-[var(--border)]">
            <div className="p-3 bg-[var(--sidebar-secondary)] rounded border border-[var(--border)]">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase block">QC Readiness</span>
              <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                {progress.qcReadinessText}
              </p>
              <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
                {progress.passedRollsCount} rolls passed inspection · {progress.awaitingCheckCount} rolls awaiting check
              </span>
            </div>

            <div className="p-3 bg-[var(--sidebar-secondary)] rounded border border-[var(--border)]">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase block">Dispatch Completion</span>
              <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                {progress.dispatchSummaryText}
              </p>
            </div>
          </div>
        </div>

        {/* Manufacturing Stages Tracker */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[var(--primary)]" />
            Mill Processing Stages
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {[
              { id: "SPINNING", label: "1. Yarn Spinning" },
              { id: "WEAVING", label: "2. Loom Weaving" },
              { id: "DYEING", label: "3. Vat Dyeing" },
              { id: "QC", label: "4. Quality Inspection" },
            ].map((stg) => {
              const wo = workOrders.find((w: any) => w.stage === stg.id);
              const isQC = stg.id === "QC";
              const isCurrent =
                (stg.id === "SPINNING" && order.currentStage === "SPINNING") ||
                (stg.id === "WEAVING" && order.currentStage === "WEAVING") ||
                (stg.id === "DYEING" && order.currentStage === "DYEING") ||
                (isQC && order.status === "IN_QC");

              const isCompleted =
                (!isQC && wo?.status === "COMPLETED") ||
                (isQC && (order.status === "READY_TO_SHIP" || order.status === "PARTIALLY_DISPATCHED" || order.status === "COMPLETED"));

              return (
                <div
                  key={stg.id}
                  className={`p-3 rounded-lg border ${
                    isCompleted
                      ? "bg-green-50 border-green-200"
                      : isCurrent
                      ? "bg-[var(--sidebar-secondary)] border-blue-300 ring-2 ring-blue-100"
                      : "bg-[var(--sidebar-secondary)] border-[var(--border)]"
                  }`}
                >
                  <span className="font-bold text-[var(--text-primary)] block">{stg.label}</span>
                  <span
                    className={`mt-1 inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      isCompleted
                        ? "text-[var(--success)]"
                        : isCurrent
                        ? "text-[var(--primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {isCompleted ? "Completed" : isCurrent ? "Active Stage" : "Scheduled"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consignments & Invoices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dispatch consignments */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[var(--primary)]" />
              Shipping Consignments ({dispatches.length})
            </h2>
            {dispatches.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-3 text-center">No shipments dispatched yet.</p>
            ) : (
              <div className="space-y-2">
                {dispatches.map((d: any) => (
                  <div key={d.id} className="p-3 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded text-xs">
                    <div className="flex items-center justify-between font-mono-id font-bold text-[var(--primary)]">
                      <span>{d.dispatchNo}</span>
                      <span className="text-[var(--text-secondary)]">{formatDate(d.dispatchedAt)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-primary)]">
                      Truck: <strong>{d.truckNo}</strong> · Driver: {d.driverName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                      Delivered: {d.rollCount} rolls ({d.totalMetres} m)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices & Payment status */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[var(--primary)]" />
              Commercial Invoices ({invoices.length})
            </h2>
            {invoices.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-3 text-center">No invoices issued yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded text-xs">
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
                    <div className="mt-1 text-[11px] font-mono-id text-[var(--text-primary)]">
                      Amount: ₹{Number(inv.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
