"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useTransition } from "react";
import { FileText, Search } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import Pagination from "@/components/Pagination";

interface InvoiceData {
  id: string;
  invoiceNo: string;
  issuedAt: string;
  orderNo: string;
  dispatchNo: string;
  amount: number;
  paidAmount: number;
  status: string;
}

interface BuyerInvoicesClientProps {
  invoices: InvoiceData[];
  totalRecords: number;
  currentPage: number;
}

export default function BuyerInvoicesClient({
  invoices,
  totalRecords = 0,
  currentPage = 1,
}: BuyerInvoicesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--primary)]" />
          My Invoices & Payment Receipts
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Billing history, commercial invoice copies, and verified payments.
        </p>
      </div>

      <div className="flex items-center justify-between bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search invoice no, order no..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-mono-id">
          {totalRecords} invoices
        </span>
      </div>

      <div className={`premium-card overflow-hidden transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Dispatch Ref</th>
                <th className="py-3 px-4 text-right">Invoice Amount (₹)</th>
                <th className="py-3 px-4 text-right">Paid Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {invoices.length === 0 && !isPending ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--sidebar-secondary)]">
                    <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">{inv.invoiceNo}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{formatDate(inv.issuedAt)}</td>
                    <td className="py-3 px-4 font-mono-id">{inv.orderNo || "—"}</td>
                    <td className="py-3 px-4 font-mono-id text-[var(--text-secondary)]">{inv.dispatchNo || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]" suppressHydrationWarning>
                      ₹{Number(inv.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-id text-[#0E4B45] font-semibold" suppressHydrationWarning>
                      ₹{Number(inv.paidAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                            : inv.status === "PARTIAL"
                            ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                            : "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  );
}
