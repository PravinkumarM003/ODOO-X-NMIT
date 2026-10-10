import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Printer,
  QrCode,
  ShieldCheck,
  Truck,
  ExternalLink,
  Layers,
  Cpu,
} from "lucide-react";

export default async function RollPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();
  const { id } = await params;

  // Search by either database ID or rollNo (e.g. ROLL-0005)
  const roll = await prisma.roll.findFirst({
    where: {
      OR: [{ id }, { rollNo: id }],
    },
    include: {
      order: {
        include: {
          buyer: true,
          fabricType: { include: { yarnItem: true } },
          workOrders: {
            include: {
              machine: true,
              productionLogs: { include: { employee: true } },
            },
          },
        },
      },
      weavingMachine: true,
      dyeingMachine: true,
      qcRecords: {
        orderBy: { createdAt: "desc" },
      },
      dispatchLine: {
        include: {
          dispatch: {
            include: { invoice: true },
          },
        },
      },
    },
  });

  if (!roll) {
    notFound();
  }

  const latestQC = roll.qcRecords[0];

  return (
    <AppShell user={user} notifications={notifications}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation & Print Controls */}
        <div className="flex items-center justify-between text-xs text-[#617078] print:hidden">
          <Link href="/rolls" className="hover:text-[#176B63] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Rolls Registry
          </Link>
          <button
            onClick={undefined}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DCE3E1] hover:bg-[#F4F6F5] text-[#202B32] font-semibold rounded shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#176B63]" />
            Print Roll Passport
          </button>
        </div>

        {/* Passport Card (Printable) */}
        <div className="bg-white border-2 border-[#172D38] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header with Factory Wordmark and QR Area */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-[#DCE3E1]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-7 bg-[#176B63] rounded-xs"></span>
                <span className="text-2xl font-black tracking-tight text-[#172D38]">TEXFLOW</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#172D38] text-white font-bold uppercase">
                  Passport
                </span>
              </div>
              <p className="text-xs text-[#617078] font-semibold mt-1">
                Everest Textile Mills · Quality Assurance Division
              </p>
              <div className="mt-3 flex items-center gap-3">
                <h1 className="text-3xl font-black font-mono-id text-[#176B63]">{roll.rollNo}</h1>
                <span
                  className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                    roll.qcStatus === "PASSED"
                      ? "bg-green-100 text-[#277653]"
                      : roll.qcStatus === "REWORK"
                      ? "bg-amber-100 text-[#A86F1F]"
                      : roll.qcStatus === "REJECTED"
                      ? "bg-red-100 text-[#B44545]"
                      : "bg-blue-100 text-[#54758A]"
                  }`}
                >
                  QC: {roll.qcStatus}
                </span>
              </div>
            </div>

            {/* QR Area (Section 7.7) */}
            <div className="flex flex-col items-center bg-[#F4F6F5] border border-[#DCE3E1] p-3 rounded-lg text-center flex-shrink-0">
              <div className="w-20 h-20 bg-white border border-[#DCE3E1] rounded flex items-center justify-center text-[#172D38] shadow-inner">
                <QrCode className="w-14 h-14 opacity-80" />
              </div>
              <span className="text-[10px] font-mono-id text-[#617078] mt-1.5 font-bold">
                {roll.rollNo}
              </span>
              <span className="text-[9px] text-[#8EA0A8] uppercase tracking-wider">
                Digital Passport QR
              </span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#617078] font-medium block">Roll Length:</span>
              <p className="font-mono-id text-base font-bold text-[#202B32]">{roll.lengthMetres} Metres</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Linked Order:</span>
              <Link href={`/orders/${roll.orderId}`} className="font-mono-id text-base font-bold text-[#176B63] hover:underline">
                {roll.order.orderNo}
              </Link>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Target Buyer:</span>
              <p className="text-sm font-bold text-[#202B32]">{roll.order.buyer.name}</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Stock Location:</span>
              <p className="text-sm font-bold text-[#202B32]">
                {roll.stockStatus === "DISPATCHED"
                  ? "Dispatched"
                  : roll.qcStatus === "REJECTED"
                  ? "Quarantined"
                  : "Shelf Bay"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-[#DCE3E1]">
            <div>
              <span className="text-[#617078] font-medium block">Fabric Type & GSM:</span>
              <p className="font-semibold text-[#202B32]">{roll.order.fabricType.name} ({roll.order.fabricType.gsm} GSM)</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Colour:</span>
              <p className="font-semibold text-[#202B32]">{roll.order.colour}</p>
            </div>
            <div>
              <span className="text-[#617078] font-medium block">Registration Date:</span>
              <p className="font-mono-id text-[#202B32]">{new Date(roll.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Machine Provenance */}
          <div className="bg-[#F4F6F5] border border-[#DCE3E1] rounded-lg p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#176B63]" />
              Machine Provenance & Manufacturing Line
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#617078] block">Weaving Machine (Loom):</span>
                <p className="font-mono-id font-bold text-[#202B32]">
                  {roll.weavingMachine ? `${roll.weavingMachine.code} (${roll.weavingMachine.type})` : "Unassigned"}
                </p>
              </div>
              <div>
                <span className="text-[#617078] block">Dyeing Machine (Vat):</span>
                <p className="font-mono-id font-bold text-[#202B32]">
                  {roll.dyeingMachine ? `${roll.dyeingMachine.code} (${roll.dyeingMachine.type})` : "Unassigned"}
                </p>
              </div>
            </div>
          </div>

          {/* Immutable QC History (Section 7.7) */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#176B63]" />
              Immutable QC Inspection Trail ({roll.qcRecords.length} Records)
            </h2>

            <div className="space-y-3">
              {roll.qcRecords.map((qc, idx) => (
                <div
                  key={qc.id}
                  className={`p-3.5 rounded-lg border text-xs ${
                    idx === 0
                      ? "border-[#176B63] bg-[#EBF3F1]/40"
                      : "border-[#DCE3E1] bg-white opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#DCE3E1]/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-id font-bold text-[#176B63]">{qc.qcNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          qc.result === "PASSED"
                            ? "bg-green-100 text-[#277653]"
                            : qc.result === "REWORK"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : "bg-red-100 text-[#B44545]"
                        }`}
                      >
                        {qc.result}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#176B63] text-white">
                          Current Result
                        </span>
                      )}
                    </div>
                    <span className="text-[#617078] font-mono-id text-[11px]">
                      {new Date(qc.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#617078]">Inspector: </span>
                      <strong className="text-[#202B32]">{qc.inspectorName || "Quality Inspector"}</strong>
                    </div>
                    {qc.defectType && (
                      <div>
                        <span className="text-[#617078]">Defect: </span>
                        <strong className="text-[#B44545]">{qc.defectType} ({qc.severity})</strong>
                      </div>
                    )}
                  </div>

                  {qc.notes && (
                    <div className="mt-1.5 text-[11px] text-[#617078] italic">
                      Remarks: "{qc.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dispatch & Invoicing Status */}
          {roll.dispatchLine && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-purple-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-purple-700" />
                  Dispatched in Consignment {roll.dispatchLine.dispatch.dispatchNo}
                </span>
                <span className="font-mono-id">
                  {new Date(roll.dispatchLine.dispatch.dispatchedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-[11px] text-[#202B32]">
                Truck: <strong>{roll.dispatchLine.dispatch.truckNo}</strong> · Driver: {roll.dispatchLine.dispatch.driverName}
              </div>
              {roll.dispatchLine.dispatch.invoice && (
                <div className="text-[11px] text-[#617078]">
                  Invoice: <strong>{roll.dispatchLine.dispatch.invoice.invoiceNo}</strong> (Status: {roll.dispatchLine.dispatch.invoice.status})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
