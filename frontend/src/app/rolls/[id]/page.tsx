import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
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
import PrintButton from "@/components/common/PrintButton";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function RollPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"]);
  const { id } = await params;

  let roll: any = null;
    try {
    const [rollRes] = await Promise.all([
      apiClient.get<any>(`/rolls/${id}`),
    ]);
    roll = rollRes;
      } catch {}

  if (!roll) {
    notFound();
  }

  const latestQC = roll.qcRecords[0];

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation & Print Controls */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] print:hidden">
          <Link href="/rolls" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Rolls Registry
          </Link>
          <PrintButton />
        </div>

        {/* Passport Card (Printable) */}
        <div className="bg-[var(--surface)] border-2 border-[#172D38] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header with Factory Wordmark and QR Area */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-7 bg-[var(--primary)] rounded-xs"></span>
                <span className="text-2xl font-black tracking-tight text-[#172D38]">TEXFLOW</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--sidebar)] text-[var(--text-primary)] font-bold uppercase">
                  Passport
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-semibold mt-1">
                Everest Textile Mills · Quality Assurance Division
              </p>
              <div className="mt-3 flex items-center gap-3">
                <h1 className="text-3xl font-black font-mono-id text-[var(--primary)]">{roll.rollNo}</h1>
                <span
                  className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                    roll.qcStatus === "PASSED"
                      ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                      : roll.qcStatus === "REWORK"
                      ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                      : roll.qcStatus === "REJECTED"
                      ? "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                      : "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                  }`}
                >
                  QC: {roll.qcStatus}
                </span>
              </div>
            </div>

            {/* QR Area (Section 7.7) */}
            <div className="flex flex-col items-center bg-[var(--background)] border border-[var(--border)] p-3 rounded-lg text-center flex-shrink-0">
              <div className="w-20 h-20 bg-[var(--surface)] border border-[var(--border)] rounded flex items-center justify-center text-[#172D38] shadow-inner">
                <QrCode className="w-14 h-14 opacity-80" />
              </div>
              <span className="text-[10px] font-mono-id text-[var(--text-secondary)] mt-1.5 font-bold">
                {roll.rollNo}
              </span>
              <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
                Digital Passport QR
              </span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Roll Length:</span>
              <p className="font-mono-id text-base font-bold text-[var(--text-primary)]">{roll.lengthMetres} Metres</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Linked Order:</span>
              <Link href={`/orders/${roll.orderId}`} className="font-mono-id text-base font-bold text-[var(--primary)] hover:underline">
                {roll.order?.orderNo || "N/A"}
              </Link>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Target Buyer:</span>
              <p className="text-sm font-bold text-[var(--text-primary)]">{roll.order?.buyer?.name || "N/A"}</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Stock Location:</span>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {roll.stockStatus === "DISPATCHED"
                  ? "Dispatched"
                  : roll.qcStatus === "REJECTED"
                  ? "Quarantined"
                  : "Shelf Bay"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-[var(--border)]">
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Fabric Type & GSM:</span>
              <p className="font-semibold text-[var(--text-primary)]">{roll.order?.fabricType?.name || "N/A"} ({roll.order?.fabricType?.gsm || "N/A"} GSM)</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Colour:</span>
              <p className="font-semibold text-[var(--text-primary)]">{roll.order?.colour || "N/A"}</p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] font-medium block">Registration Date:</span>
              <p className="font-mono-id text-[var(--text-primary)]">{formatDateTime(roll.createdAt)}</p>
            </div>
          </div>

          {/* Machine Provenance */}
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[var(--primary)]" />
              Machine Provenance & Manufacturing Line
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--text-secondary)] block">Weaving Machine (Loom):</span>
                <p className="font-mono-id font-bold text-[var(--text-primary)]">
                  {roll.weavingMachine ? `${roll.weavingMachine.code} (${roll.weavingMachine.type})` : "Unassigned"}
                </p>
              </div>
              <div>
                <span className="text-[var(--text-secondary)] block">Dyeing Machine (Vat):</span>
                <p className="font-mono-id font-bold text-[var(--text-primary)]">
                  {roll.dyeingMachine ? `${roll.dyeingMachine.code} (${roll.dyeingMachine.type})` : "Unassigned"}
                </p>
              </div>
            </div>
          </div>

          {/* Immutable QC History (Section 7.7) */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
              Immutable QC Inspection Trail ({roll.qcRecords.length} Records)
            </h2>

            <div className="space-y-3">
              {roll.qcRecords.map((qc: any, idx: number) => (
                <div
                  key={qc.id}
                  className={`p-3.5 rounded-lg border text-xs ${
                    idx === 0
                      ? "border-[var(--primary)] bg-[rgba(0,240,255,0.1)]/40"
                      : "border-[var(--border)] bg-[var(--surface)] opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-id font-bold text-[var(--primary)]">{qc.qcNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          qc.result === "PASSED"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : qc.result === "REWORK"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                        }`}
                      >
                        {qc.result}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--primary)] text-[var(--text-primary)]">
                          Current Result
                        </span>
                      )}
                    </div>
                    <span className="text-[var(--text-secondary)] font-mono-id text-[11px]">
                      {formatDateTime(qc.createdAt)}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[var(--text-secondary)]">Inspector: </span>
                      <strong className="text-[var(--text-primary)]">{qc.inspectorName || "Quality Inspector"}</strong>
                    </div>
                    {qc.defectType && (
                      <div>
                        <span className="text-[var(--text-secondary)]">Defect: </span>
                        <strong className="text-[var(--critical)]">{qc.defectType} ({qc.severity})</strong>
                      </div>
                    )}
                  </div>

                  {qc.notes && (
                    <div className="mt-1.5 text-[11px] text-[var(--text-secondary)] italic">
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
                  {formatDate(roll.dispatchLine.dispatch.dispatchedAt)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-primary)]">
                Truck: <strong>{roll.dispatchLine.dispatch.truckNo}</strong> · Driver: {roll.dispatchLine.dispatch.driverName}
              </div>
              {roll.dispatchLine.dispatch.invoice && (
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Invoice: <strong>{roll.dispatchLine.dispatch.invoice.invoiceNo}</strong> (Status: {roll.dispatchLine.dispatch.invoice.status})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
