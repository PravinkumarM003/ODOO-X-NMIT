import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, History, PackageCheck, AlertCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function YarnItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"]);
  const { id } = await params;

  let detail: any = null;
    try {
    const [detailRes] = await Promise.all([
      apiClient.get<any>(`/yarn/${id}`),
    ]);
    detail = detailRes;
      } catch {}

  if (!detail || !detail.item) {
    notFound();
  }

  const yarn = {
    ...detail.item,
    lots: (detail.lots || []).map((l: any) => ({
      id: l.lotId,
      lotCode: l.lotCode,
      supplier: { name: l.supplierName || "Direct Supplier" },
      qtyReceivedKg: l.qtyReceivedKg,
      unitCostPerKg: l.unitCostPerKg,
      receivedAt: new Date(l.receivedAt),
    })),
    stockMovements: (detail.movements || []).map((m: any) => ({
      id: m.id,
      type: m.type,
      qtyKg: m.qtyKg,
      reason: m.reason,
      createdBy: m.createdBy,
      createdAt: new Date(m.createdAt),
      lot: m.lotCode ? { lotCode: m.lotCode } : null,
      order: m.orderNo ? { orderNo: m.orderNo } : null,
    })),
  };

  const stockSummary = detail.stock;
  const remainingByLotId = new Map(
    (detail.lots || []).map((l: any) => [l.lotId, l.remainingKg])
  );

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Link href="/yarn" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Yarn Store
          </Link>
          <span>/</span>
          <span className="font-mono-id text-[var(--text-primary)] font-bold">{yarn.code}</span>
        </div>

        {/* Header Summary */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono-id text-lg font-bold text-[var(--primary)]">{yarn.code}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  stockSummary.health === "OK"
                    ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                    : stockSummary.health === "LOW"
                    ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                    : "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                }`}
              >
                {stockSummary.health} Stock Health
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
              {yarn.yarnType} · Count: {yarn.count} · Colour: {yarn.colour}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-[var(--border)]">
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">On-Hand</span>
              <p className="text-base font-bold font-mono-id text-[var(--text-primary)]">
                {stockSummary.onHandKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Reserved</span>
              <p className="text-base font-bold font-mono-id text-[var(--info)]">
                {stockSummary.reservedKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Available</span>
              <p
                className={`text-base font-bold font-mono-id ${
                  stockSummary.availableKg <= 0
                    ? "text-[var(--critical)]"
                    : stockSummary.availableKg < yarn.reorderThresholdKg
                    ? "text-[var(--warning)]"
                    : "text-[var(--success)]"
                }`}
              >
                {stockSummary.availableKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
          </div>
        </div>

        {/* Lots Table */}
        <div className="premium-card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-[var(--primary)]" />
              Received Lots & Remaining Balances (FIFO Tracking)
            </h2>
            <span className="text-xs text-[var(--text-secondary)]">{yarn.lots.length} lot(s) received</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Lot Code</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Received Date</th>
                  <th className="py-2.5 px-4 text-right">Qty Received (kg)</th>
                  <th className="py-2.5 px-4 text-right">Remaining (kg)</th>
                  <th className="py-2.5 px-4 text-right">Unit Cost</th>
                  <th className="py-2.5 px-4">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {yarn.lots.map((lot: any) => {
                  const rem = remainingByLotId.get(lot.id) ?? lot.qtyReceivedKg;
                  return (
                    <tr key={lot.id} className="hover:bg-[var(--sidebar-secondary)]">
                      <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                        {lot.lotCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{lot.supplier.name}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {formatDate(lot.receivedAt)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id text-[var(--text-primary)]">
                        {lot.qtyReceivedKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                        <span className={rem <= 0 ? "text-[var(--text-secondary)] line-through" : "text-[var(--success)]"}>
                          {rem.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id text-[var(--text-primary)]">
                        ₹{lot.unitCostPerKg.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{lot.receivedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Immutable Stock Movement Ledger */}
        <div className="premium-card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[var(--primary)]" />
              Immutable Stock Movement Ledger (BR-02)
            </h2>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono-id">
              {yarn.stockMovements.length} total events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Movement Type</th>
                  <th className="py-2.5 px-4">Lot Code</th>
                  <th className="py-2.5 px-4">Linked Order</th>
                  <th className="py-2.5 px-4 text-right">Quantity (kg)</th>
                  <th className="py-2.5 px-4">Reason / Narration</th>
                  <th className="py-2.5 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {yarn.stockMovements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-[var(--sidebar-secondary)]">
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono-id">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === "RECEIPT"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : m.type === "RESERVE"
                            ? "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                            : m.type === "RELEASE"
                            ? "bg-purple-100 text-purple-700"
                            : m.type === "CONSUME"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : "bg-gray-100 text-[var(--text-secondary)]"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono-id text-[var(--primary)]">
                      {m.lot?.lotCode || "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono-id text-[var(--text-primary)]">
                      {m.order?.orderNo ? (
                        <Link href={`/orders/${m.orderId}`} className="hover:underline text-[var(--primary)]">
                          {m.order.orderNo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                      {m.type === "ADJUST" && m.qtyKg > 0 ? `+${m.qtyKg}` : m.qtyKg}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)] max-w-xs truncate">{m.reason}</td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">{m.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
