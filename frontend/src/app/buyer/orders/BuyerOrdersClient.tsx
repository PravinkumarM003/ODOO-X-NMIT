"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  Truck,
  X,
  Package,
} from "lucide-react";
import { requestBuyerOrderAction } from "@/app/actions/buyerPortalActions";

interface BuyerOrderData {
  id: string;
  orderNo: string;
  fabricName: string;
  colour: string;
  qtyMetres: number;
  deadline: string;
  buyerStatusText: string;
  internalStatus: string;
  productionProgressPercent: number;
  qcReadinessText: string;
  dispatchSummaryText: string;
}

interface FabricOption {
  id: string;
  name: string;
  defaultPricePerMetre: number;
}

interface BuyerOrdersClientProps {
  orders: BuyerOrderData[];
  fabricTypes: FabricOption[];
  buyerName: string;
}

export default function BuyerOrdersClient({
  orders,
  fabricTypes,
  buyerName,
}: BuyerOrdersClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) =>
    o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.fabricName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.colour.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await requestBuyerOrderAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setRequestModalOpen(false);
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
            My Fabric Orders
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Live manufacturing status and delivery tracking for <strong>{buyerName}</strong>.
          </p>
        </div>

        <button
          onClick={() => setRequestModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#176B63] hover:bg-[#11564F] rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Request New Order (BR-24)
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between bg-white p-3 border border-[#DCE3E1] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#617078]" />
          <input
            type="text"
            placeholder="Search order no, fabric, colour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#F4F6F5] border border-[#DCE3E1] rounded-md pl-9 pr-3 py-1.5 text-[#202B32] focus:outline-none focus:border-[#176B63] focus:bg-white"
          />
        </div>
        <span className="text-xs text-[#617078] font-mono-id">
          {filteredOrders.length} order(s)
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F6F5] border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order No</th>
                <th className="py-3 px-4">Fabric & Colour</th>
                <th className="py-3 px-4 text-right">Quantity (m)</th>
                <th className="py-3 px-4">Manufacturing Progress</th>
                <th className="py-3 px-4">Live Status</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-[#F9FAFA]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                    <Link href={`/buyer/orders/${o.id}`} className="hover:underline flex items-center gap-1">
                      {o.orderNo}
                      <ExternalLink className="w-3 h-3 text-[#617078]" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[#202B32]">
                    <div className="font-semibold">{o.fabricName}</div>
                    <div className="text-[11px] text-[#617078]">{o.colour}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                    {o.qtyMetres.toLocaleString()} m
                  </td>
                  <td className="py-3 px-4 min-w-[160px]">
                    <div className="flex items-center justify-between text-[11px] font-mono-id mb-1">
                      <span className="text-[#617078]">Production:</span>
                      <span className="font-bold text-[#202B32]">{o.productionProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-[#176B63] h-full rounded-full transition-all"
                        style={{ width: `${o.productionProgressPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[#617078]">{o.dispatchSummaryText}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        o.internalStatus === "COMPLETED"
                          ? "bg-green-100 text-[#277653]"
                          : o.internalStatus === "READY_TO_SHIP"
                          ? "bg-emerald-100 text-[#176B63]"
                          : o.internalStatus === "PARTIALLY_DISPATCHED"
                          ? "bg-amber-100 text-[#A86F1F]"
                          : o.internalStatus === "IN_QC"
                          ? "bg-blue-100 text-[#54758A]"
                          : o.internalStatus === "NEW"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-[#EBF3F1] text-[#176B63]"
                      }`}
                    >
                      {o.buyerStatusText}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono-id text-[#617078]">
                    {new Date(o.deadline).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/buyer/orders/${o.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded"
                    >
                      Track Order →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Order Modal (BR-24) */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              Request Fabric Manufacturing Order
            </h3>
            <p className="text-[#617078] mb-4">
              Your request will be submitted to the Everest Textile Mills office for schedule review and confirmation.
            </p>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Fabric Type *
                </label>
                <select
                  name="fabricTypeId"
                  required
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="">Select Fabric Type</option>
                  {fabricTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} (Catalog Ref Rate: ₹{ft.defaultPricePerMetre}/m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Colour / Shade *
                  </label>
                  <input
                    type="text"
                    name="colour"
                    required
                    placeholder="e.g. Navy Blue"
                    className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
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
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Requested Delivery Deadline *
                </label>
                <input
                  type="date"
                  name="deadline"
                  required
                  defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]}
                  className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Order Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
