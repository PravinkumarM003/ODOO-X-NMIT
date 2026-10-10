import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, History, PackageCheck, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function YarnItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const { id } = await params;

  let detail: any = null;
  let notifications: any[] = [];

  try {
    const [detailRes, notifRes] = await Promise.all([
      apiClient.get<any>(`/yarn/${id}`),
      apiClient.get<any[]>("/notifications"),
    ]);
    detail = detailRes;
    if (notifRes) notifications = notifRes;
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
    <AppShell user={user} notifications={notifications}>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#617078]">
          <Link href="/yarn" className="hover:text-[#176B63] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Yarn Store
          </Link>
          <span>/</span>
          <span className="font-mono-id text-[#202B32] font-bold">{yarn.code}</span>
        </div>

        {/* Header Summary */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono-id text-lg font-bold text-[#176B63]">{yarn.code}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  stockSummary.health === "OK"
                    ? "bg-green-100 text-[#277653]"
                    : stockSummary.health === "LOW"
                    ? "bg-amber-100 text-[#A86F1F]"
                    : "bg-red-100 text-[#B44545]"
                }`}
              >
                {stockSummary.health} Stock Health
              </span>
            </div>
            <p className="text-sm font-semibold text-[#202B32] mt-0.5">
              {yarn.yarnType} · Count: {yarn.count} · Colour: {yarn.colour}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-[#DCE3E1]">
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[#617078] font-bold">On-Hand</span>
              <p className="text-base font-bold font-mono-id text-[#202B32]">
                {stockSummary.onHandKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[#617078] font-bold">Reserved</span>
              <p className="text-base font-bold font-mono-id text-[#54758A]">
                {stockSummary.reservedKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-[#617078] font-bold">Available</span>
              <p
                className={`text-base font-bold font-mono-id ${
                  stockSummary.availableKg <= 0
                    ? "text-[#B44545]"
                    : stockSummary.availableKg < yarn.reorderThresholdKg
                    ? "text-[#A86F1F]"
                    : "text-[#277653]"
                }`}
              >
                {stockSummary.availableKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })} kg
              </p>
            </div>
          </div>
        </div>

        {/* Lots Table */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-[#176B63]" />
              Received Lots & Remaining Balances (FIFO Tracking)
            </h2>
            <span className="text-xs text-[#617078]">{yarn.lots.length} lot(s) received</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Lot Code</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Received Date</th>
                  <th className="py-2.5 px-4 text-right">Qty Received (kg)</th>
                  <th className="py-2.5 px-4 text-right">Remaining (kg)</th>
                  <th className="py-2.5 px-4 text-right">Unit Cost</th>
                  <th className="py-2.5 px-4">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E1]">
                {yarn.lots.map((lot: any) => {
                  const rem = remainingByLotId.get(lot.id) ?? lot.qtyReceivedKg;
                  return (
                    <tr key={lot.id} className="hover:bg-[#F9FAFA]">
                      <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                        {lot.lotCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#202B32]">{lot.supplier.name}</td>
                      <td className="py-3 px-4 text-[#617078]">
                        {new Date(lot.receivedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id text-[#202B32]">
                        {lot.qtyReceivedKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                        <span className={rem <= 0 ? "text-[#617078] line-through" : "text-[#277653]"}>
                          {rem.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id text-[#202B32]">
                        ₹{lot.unitCostPerKg.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[#617078]">{lot.receivedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Immutable Stock Movement Ledger */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#176B63]" />
              Immutable Stock Movement Ledger (BR-02)
            </h2>
            <span className="text-[11px] text-[#617078] font-mono-id">
              {yarn.stockMovements.length} total events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Movement Type</th>
                  <th className="py-2.5 px-4">Lot Code</th>
                  <th className="py-2.5 px-4">Linked Order</th>
                  <th className="py-2.5 px-4 text-right">Quantity (kg)</th>
                  <th className="py-2.5 px-4">Reason / Narration</th>
                  <th className="py-2.5 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E1]">
                {yarn.stockMovements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-[#F9FAFA]">
                    <td className="py-2.5 px-4 text-[#617078] font-mono-id">
                      {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === "RECEIPT"
                            ? "bg-green-100 text-[#277653]"
                            : m.type === "RESERVE"
                            ? "bg-blue-100 text-[#54758A]"
                            : m.type === "RELEASE"
                            ? "bg-purple-100 text-purple-700"
                            : m.type === "CONSUME"
                            ? "bg-amber-100 text-[#A86F1F]"
                            : "bg-gray-100 text-[#617078]"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono-id text-[#176B63]">
                      {m.lot?.lotCode || "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono-id text-[#202B32]">
                      {m.order?.orderNo ? (
                        <Link href={`/orders/${m.orderId}`} className="hover:underline text-[#176B63]">
                          {m.order.orderNo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-id font-bold text-[#202B32]">
                      {m.type === "ADJUST" && m.qtyKg > 0 ? `+${m.qtyKg}` : m.qtyKg}
                    </td>
                    <td className="py-2.5 px-4 text-[#617078] max-w-xs truncate">{m.reason}</td>
                    <td className="py-2.5 px-4 text-[#617078]">{m.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
