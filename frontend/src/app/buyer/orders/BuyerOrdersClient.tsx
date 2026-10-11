"use client";

import { useRouter, useSearchParams } from "next/navigation";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
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
import { formatDate } from "@/lib/dateUtils";

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
  totalRecords?: number;
  currentPage?: number;
}

export default function BuyerOrdersClient({
  orders,
  fabricTypes,
  buyerName,
  totalRecords = 0,
  currentPage = 1,
}: BuyerOrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateUrlParams = (search: string, page: number) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrlParams(searchTerm, 1);
    }
  };
  
  const handleSearchBlur = () => {
    if (searchTerm !== (searchParams.get("search") || "")) {
      updateUrlParams(searchTerm, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams(searchTerm, newPage);
  };

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
      router.refresh();
      setRequestModalOpen(false);
          }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[var(--primary)]" />
            My Fabric Orders
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Live manufacturing status and delivery tracking for <strong>{buyerName}</strong>.
          </p>
        </div>

        <button
          onClick={() => setRequestModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Request New Order (BR-24)
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search order no, fabric, colour..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-mono-id">
          {totalRecords} order(s)
        </span>
      </div>

      {/* Orders Table */}
      <div className={`premium-card overflow-hidden transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order No</th>
                <th className="py-3 px-4">Fabric & Colour</th>
                <th className="py-3 px-4 text-right">Quantity (m)</th>
                <th className="py-3 px-4">Manufacturing Progress</th>
                <th className="py-3 px-4">Live Status</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--sidebar-secondary)]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                    <Link href={`/buyer/orders/${o.id}`} className="hover:underline flex items-center gap-1">
                      {o.orderNo}
                      <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-primary)]">
                    <div className="font-semibold">{o.fabricName}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{o.colour}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                    {o.qtyMetres.toLocaleString()} m
                  </td>
                  <td className="py-3 px-4 min-w-[160px]">
                    <div className="flex items-center justify-between text-[11px] font-mono-id mb-1">
                      <span className="text-[var(--text-secondary)]">Production:</span>
                      <span className="font-bold text-[var(--text-primary)]">{o.productionProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-[var(--primary)] h-full rounded-full transition-all"
                        style={{ width: `${o.productionProgressPercent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{o.dispatchSummaryText}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        o.internalStatus === "COMPLETED"
                          ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                          : o.internalStatus === "READY_TO_SHIP"
                          ? "bg-emerald-100 text-[var(--primary)]"
                          : o.internalStatus === "PARTIALLY_DISPATCHED"
                          ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                          : o.internalStatus === "IN_QC"
                          ? "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                          : o.internalStatus === "NEW"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-[rgba(0,240,255,0.1)] text-[var(--primary)]"
                      }`}
                    >
                      {o.buyerStatusText}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono-id text-[var(--text-secondary)]">
                    {formatDate(o.deadline)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/buyer/orders/${o.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded"
                    >
                      Track Order →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !isPending && (
            <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center">
              <ClipboardList className="w-8 h-8 mb-2 opacity-50" />
              <p>No orders found.</p>
            </div>
          )}
        </div>
        <div className="px-4 pb-4">
          <Pagination 
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPageChange={handlePageChange}
            loading={isPending}
          />
        </div>
      </div>

      {/* Request Order Modal (BR-24) */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Request Fabric Manufacturing Order
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Your request will be submitted to the Everest Textile Mills office for schedule review and confirmation.
            </p>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded mb-3 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Fabric Type *
                </label>
                <select
                  name="fabricTypeId"
                  required
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
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
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Colour / Shade *
                  </label>
                  <input
                    type="text"
                    name="colour"
                    required
                    placeholder="e.g. Navy Blue"
                    className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Quantity (metres) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="qtyMetres"
                    required
                    placeholder="e.g. 500"
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Requested Delivery Deadline *
                </label>
                <input
                  type="date"
                  name="deadline"
                  required
                  defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]}
                  className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
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
