import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrderProgress } from "@/services/progressService";
import { calculateOrderRisk } from "@/services/financeService";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  FileText,
  Package,
  Layers,
  Cpu,
  Calendar,
} from "lucide-react";
import { getBuyerStatusWording } from "../page";

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

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: true,
      fabricType: true,
      workOrders: {
        orderBy: { stage: "asc" },
      },
      rolls: {
        include: { dispatchLine: true },
      },
      dispatches: {
        include: { lines: true },
        orderBy: { dispatchedAt: "desc" },
      },
      invoices: {
        include: { payments: true },
        orderBy: { issuedAt: "desc" },
      },
    },
  });

  // Security guard: Ensure this order belongs to the logged-in buyer!
  if (!order || order.buyerId !== session.buyerId) {
    notFound();
  }

  const progress = await getOrderProgress(order.id);
  const risk = await calculateOrderRisk(order);
  const buyerStatus = getBuyerStatusWording(order.status, order.currentStage);

  // Compute estimated readiness text (label it "Estimate" per Section 7.10)
  const stageEstimates: Record<string, number> = { SPINNING: 2, WEAVING: 3, DYEING: 2 };
  let estimatedDays = 1; // QC
  for (const wo of order.workOrders) {
    if (wo.status !== "COMPLETED") {
      estimatedDays += stageEstimates[wo.stage] || 2;
    }
  }
  const estReadyDate = new Date(Date.now() + estimatedDays * 86400000);

  const passedRollsCount = order.rolls.filter((r) => r.qcStatus === "PASSED").length;
  const awaitingCheckCount = order.rolls.filter((r) => r.qcStatus === "PENDING" || r.qcStatus === "REWORK").length;

  return (
    <AppShell user={session} notifications={[]}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between text-xs text-[#617078]">
          <Link href="/buyer/orders" className="hover:text-[#176B63] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to My Orders
          </Link>
          <span className="font-mono-id text-[#202B32] font-bold">{order.orderNo}</span>
        </div>

        {/* Order Header Card */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3E1]">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono-id text-[#176B63]">{order.orderNo}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#EBF3F1] text-[#176B63]">
                  {buyerStatus}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#202B32] mt-1">
                {order.fabricType.name} · Colour: {order.colour}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#617078] block">Order Quantity</span>
              <span className="font-mono-id text-lg font-bold text-[#202B32]">
                {order.qtyMetres.toLocaleString()} Metres
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div>
              <span className="text-[#617078] font-medium block">Order Date:</span>
              <p className="font-mono-id text-[#202B32]">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Agreed Delivery Deadline:</span>
              <p className="font-mono-id font-bold text-[#202B32]">{new Date(order.deadline).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Estimated Completion:</span>
              <p className="font-mono-id font-bold text-[#176B63]">
                {order.status === "COMPLETED"
                  ? "Delivered"
                  : `~${estReadyDate.toLocaleDateString()} (Estimate)`}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Progress Indicators (BR-25 in Buyer Portal) */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#176B63]" />
            Order Progress & Readiness (BR-25)
          </h2>

          {/* Progress bar showing Production Progress ONLY (Section 6 & 7.10) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-[#202B32]">Production Progress</span>
              <span className="font-mono-id font-bold text-[#176B63]">{progress.productionProgressPercent}%</span>
            </div>
            <div className="w-full bg-[#E5EAE8] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#176B63] h-full rounded-full transition-all"
                style={{ width: `${progress.productionProgressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* QC and Dispatch lines beneath it */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-[#DCE3E1]">
            <div className="p-3 bg-[#F9FAFA] rounded border border-[#DCE3E1]">
              <span className="text-[11px] font-bold text-[#617078] uppercase block">QC Readiness</span>
              <p className="text-xs font-semibold text-[#202B32] mt-0.5">
                {progress.qcReadiness.statusText}
              </p>
              <span className="text-[11px] text-[#617078] mt-1 block">
                {passedRollsCount} rolls passed inspection · {awaitingCheckCount} rolls awaiting check
              </span>
            </div>

            <div className="p-3 bg-[#F9FAFA] rounded border border-[#DCE3E1]">
              <span className="text-[11px] font-bold text-[#617078] uppercase block">Dispatch Completion</span>
              <p className="text-xs font-semibold text-[#202B32] mt-0.5">
                {progress.dispatchCompletion.summaryText}
              </p>
              {progress.dispatchCompletion.shortfallNote && (
                <span className="text-[11px] text-[#B44545] font-semibold mt-1 block">
                  {progress.dispatchCompletion.shortfallNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Manufacturing Stages Tracker */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#176B63]" />
            Mill Processing Stages
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {[
              { id: "SPINNING", label: "1. Yarn Spinning" },
              { id: "WEAVING", label: "2. Loom Weaving" },
              { id: "DYEING", label: "3. Vat Dyeing" },
              { id: "QC", label: "4. Quality Inspection" },
            ].map((stg) => {
              const wo = order.workOrders.find((w) => w.stage === stg.id);
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
                      ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100"
                      : "bg-[#F9FAFA] border-[#DCE3E1]"
                  }`}
                >
                  <span className="font-bold text-[#202B32] block">{stg.label}</span>
                  <span
                    className={`mt-1 inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      isCompleted
                        ? "text-[#277653]"
                        : isCurrent
                        ? "text-[#176B63]"
                        : "text-[#617078]"
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
          <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#176B63]" />
              Shipping Consignments ({order.dispatches.length})
            </h2>
            {order.dispatches.length === 0 ? (
              <p className="text-xs text-[#617078] py-3 text-center">No shipments dispatched yet.</p>
            ) : (
              <div className="space-y-2">
                {order.dispatches.map((d) => (
                  <div key={d.id} className="p-3 bg-[#F9FAFA] border border-[#DCE3E1] rounded text-xs">
                    <div className="flex items-center justify-between font-mono-id font-bold text-[#176B63]">
                      <span>{d.dispatchNo}</span>
                      <span className="text-[#617078]">{new Date(d.dispatchedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#202B32]">
                      Truck: <strong>{d.truckNo}</strong> · Driver: {d.driverName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#617078]">
                      Delivered: {d.lines.length} rolls ({d.lines.reduce((a, l) => a + l.lengthMetres, 0)} m)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices & Payment status */}
          <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#176B63]" />
              Commercial Invoices ({order.invoices.length})
            </h2>
            {order.invoices.length === 0 ? (
              <p className="text-xs text-[#617078] py-3 text-center">No invoices issued yet.</p>
            ) : (
              <div className="space-y-2">
                {order.invoices.map((inv) => (
                  <div key={inv.id} className="p-3 bg-[#F9FAFA] border border-[#DCE3E1] rounded text-xs">
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
                    <div className="mt-1 text-[11px] font-mono-id text-[#202B32]">
                      Amount: ₹{inv.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
