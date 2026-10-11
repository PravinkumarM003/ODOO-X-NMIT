"use client";

import { useRouter, useSearchParams } from "next/navigation";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import SortHeader from "@/components/common/SortHeader";
import {
  Layers,
  Plus,
  Sliders,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  PackagePlus,
  RefreshCw,
  X,
} from "lucide-react";
import { receiveYarnAction, adjustStockAction } from "@/app/actions/yarnActions";

interface YarnItemData {
  id: string;
  code: string;
  yarnType: string;
  count: string;
  colour: string;
  reorderThresholdKg: number;
  unit: string;
  stock: {
    onHandKg: number;
    reservedKg: number;
    availableKg: number;
    thresholdKg: number;
    health: "OK" | "LOW" | "OUT";
  };
  shortageAwaitingKg: number;
  lotCount: number;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface OrderOption {
  id: string;
  orderNo: string;
  buyerName: string;
}

interface LotOption {
  id: string;
  lotCode: string;
  yarnCode: string;
  remainingKg: number;
}

interface YarnStoreClientProps {
  items: YarnItemData[];
  suppliers: SupplierOption[];
  orders: OrderOption[];
  allLots: LotOption[];
  totalRecords?: number;
  currentPage?: number;
}

export default function YarnStoreClient({
  items,
  suppliers,
  orders,
  allLots,
  totalRecords = 0,
  currentPage = 1,
}: YarnStoreClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const currentSortBy = searchParams.get("sort_by") || "code";
  const currentSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "asc";

  const updateUrlParams = (search: string, page: number, sortBy = currentSortBy, sortOrder = currentSortOrder) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sortBy) params.set("sort_by", sortBy);
      if (sortOrder) params.set("sort_order", sortOrder);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const handleSort = (sortKey: string) => {
    let nextOrder: "asc" | "desc" = "asc";
    if (currentSortBy === sortKey) {
      nextOrder = currentSortOrder === "asc" ? "desc" : "asc";
    }
    updateUrlParams(searchTerm, 1, sortKey, nextOrder);
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

  // Receive modal state
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Adjust modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [confirmAdjustPrompt, setConfirmAdjustPrompt] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.yarnType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.colour.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHealth =
      healthFilter === "ALL" || item.stock.health === healthFilter;
    return matchesSearch && matchesHealth;
  });

  const needsOrderingItems = items.filter(
    (item) => item.stock.health !== "OK" || item.shortageAwaitingKg > 0
  );

  const handleReceiveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setReceiveLoading(true);
    setReceiveError(null);

    const formData = new FormData(e.currentTarget);
    const result = await receiveYarnAction(formData);

    setReceiveLoading(false);
    if (result.error) {
      setReceiveError(result.error);
    } else {
      setReceiveModalOpen(false);
      let toast = `Successfully received Lot ${result.lotCode} (${result.qtyReceivedKg} kg).`;
      if (result.releasedOrders && result.releasedOrders.length > 0) {
        toast += ` Auto-allocated and CONFIRMED orders: ${result.releasedOrders
          .map((o) => o.orderNo)
          .join(", ")}!`;
      }
      setToastMessage(toast);
      setTimeout(() => setToastMessage(null), 8000);
      router.refresh();
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAdjustPrompt) {
      setConfirmAdjustPrompt(true);
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);

    const formData = new FormData();
    formData.append("lotId", selectedLotId);
    formData.append("deltaKg", adjustDelta);
    formData.append("reason", adjustReason);

    const result = await adjustStockAction(formData);
    setAdjustLoading(false);

    if (result.error) {
      setAdjustError(result.error);
      setConfirmAdjustPrompt(false);
    } else {
      setAdjustModalOpen(false);
      setConfirmAdjustPrompt(false);
      setSelectedLotId("");
      setAdjustDelta("");
      setAdjustReason("");
      setToastMessage(`Stock adjustment successfully applied to ledger.`);
      setTimeout(() => setToastMessage(null), 6000);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-[rgba(0,240,255,0.1)] border border-[var(--primary)] text-[var(--primary)] rounded-md text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>
            <X className="w-4 h-4 text-[var(--primary)]" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            Yarn Store & Raw Material Inventory
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time ledger accounting for yarn lots, reservations, and gate receipts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--background)] rounded-md transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            Adjust Stock
          </button>
          <button
            onClick={() => setReceiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Receive Yarn (Gate Entry)
          </button>
        </div>
      </div>

      {/* Needs Ordering Warning Panel (Section 7.4) */}
      {needsOrderingItems.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--warning)] font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Needs Ordering Panel (Low Stock & Order Shortages)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {needsOrderingItems.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--surface)] border border-amber-200 rounded-md p-3 text-xs flex justify-between items-center shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{item.code}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {item.yarnType} ({item.colour})
                  </div>
                  <div className="text-[11px] mt-1 font-mono-id">
                    Avail: <span className="font-bold">{item.stock.availableKg} kg</span> / Min: {item.reorderThresholdKg} kg
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.stock.health === "OUT"
                        ? "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                        : "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                    }`}
                  >
                    {item.stock.health}
                  </span>
                  {item.shortageAwaitingKg > 0 && (
                    <div className="text-[10px] text-[var(--critical)] font-semibold mt-1">
                      Short: {item.shortageAwaitingKg} kg
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search code, type, colour..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)] font-mono-id mr-4">
            {totalRecords} matching item(s)
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-medium">Health:</span>
          {["ALL", "OK", "LOW", "OUT"].map((h) => (
            <button
              key={h}
              onClick={() => setHealthFilter(h)}
              className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                healthFilter === h
                  ? "bg-[var(--sidebar)] text-[var(--text-primary)]"
                  : "bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Yarn Items Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[11px]">
                <SortHeader label="Item Code" sortKey="code" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Yarn Type & Count" sortKey="yarnType" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Colour" sortKey="colour" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <th className="py-3 px-4 text-right">On-Hand (kg)</th>
                <th className="py-3 px-4 text-right">Reserved (kg)</th>
                <SortHeader label="Available (kg)" sortKey="availableStockKg" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-right" />
                <SortHeader label="Threshold (kg)" sortKey="minThresholdKg" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-right" />
                <th className="py-3 px-4 text-center">Stock Health</th>
                <th className="py-3 px-4 text-center">Lots</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--sidebar-secondary)] transition-colors">
                  <td className="py-3.5 px-4 font-mono-id font-bold text-[var(--primary)]">
                    <Link href={`/yarn/${item.id}`} className="hover:underline flex items-center gap-1">
                      {item.code}
                      <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                    {item.yarnType} <span className="text-[var(--text-secondary)]">({item.count})</span>
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-primary)]">{item.colour}</td>
                  <td className="py-3.5 px-4 text-right font-mono-id font-semibold text-[var(--text-primary)]">
                    {item.stock.onHandKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-id text-[var(--info)]">
                    {item.stock.reservedKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-id font-bold">
                    <span
                      className={
                        item.stock.availableKg <= 0
                          ? "text-[var(--critical)]"
                          : item.stock.availableKg < item.reorderThresholdKg
                          ? "text-[var(--warning)]"
                          : "text-[var(--success)]"
                      }
                    >
                      {item.stock.availableKg.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-id text-[var(--text-secondary)]">
                    {item.reorderThresholdKg}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.stock.health === "OK"
                          ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                          : item.stock.health === "LOW"
                          ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                          : "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                      }`}
                    >
                      {item.stock.health}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono-id text-[var(--text-secondary)]">
                    {item.lotCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/yarn/${item.id}`}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      Ledger & Lots →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && !isPending && (
            <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <p>No yarn items match your filters.</p>
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

      {/* Receive Yarn Modal (Section 7.4 Gate Entry Form) */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-[var(--primary)]" />
                Receive Yarn Lot (Gate Entry)
              </h3>
              <button onClick={() => setReceiveModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {receiveError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded text-xs font-medium">
                {receiveError}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Lot Code *
                  </label>
                  <input
                    type="text"
                    name="lotCode"
                    required
                    placeholder="e.g. LOT-0010"
                    defaultValue={`LOT-${String(allLots.length + 1).padStart(4, "0")}`}
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Yarn Item *
                  </label>
                  <select
                    name="yarnItemId"
                    required
                    className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">Select Item</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.code} ({i.yarnType} {i.colour})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Supplier *
                </label>
                <select
                  name="supplierId"
                  required
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Quantity (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="qtyReceivedKg"
                    required
                    placeholder="e.g. 500"
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Unit Cost (₹/kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="unitCostPerKg"
                    required
                    placeholder="e.g. 280"
                    className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Linked Order (Optional earmark)
                </label>
                <select
                  name="linkedOrderId"
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">None (General Store Inventory)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} - {o.buyerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text-primary)]">
                  <input type="checkbox" name="createSupplierBill" defaultChecked />
                  Generate Supplier Bill for this lot receipt (BR-01)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveLoading}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
                >
                  {receiveLoading ? "Processing Receipt..." : "Record Gate Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal with Confirmation Dialog (BR-02) */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--warning)]" />
                Stock Adjustment (Signed Delta)
              </h3>
              <button onClick={() => setAdjustModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {adjustError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded text-xs font-medium">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Select Lot to Adjust *
                </label>
                <select
                  required
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select Lot</option>
                  {allLots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lotCode} ({l.yarnCode}) - Rem: {l.remainingKg} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Adjustment Delta (kg) * (Positive adds, Negative removes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g. -25 or +15"
                  className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Required Reason (Min 3 characters) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Moisture evaporation loss verified during physical audit"
                  className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {confirmAdjustPrompt && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-semibold">
                  Are you sure you want to apply a delta of {adjustDelta} kg to lot stock? This will be permanently recorded in the immutable ledger.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustModalOpen(false);
                    setConfirmAdjustPrompt(false);
                  }}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)] hover:bg-[var(--background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className={`px-4 py-1.5 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50 ${
                    confirmAdjustPrompt
                      ? "bg-[#B44545] hover:bg-red-700"
                      : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200"
                  }`}
                >
                  {adjustLoading
                    ? "Applying..."
                    : confirmAdjustPrompt
                    ? "Confirm Stock Adjustment"
                    : "Review & Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
