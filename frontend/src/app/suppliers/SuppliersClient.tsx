"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useTransition } from "react";
import { Factory, Phone, CheckCircle, Clock, Search, ArrowUpDown, Building2 } from "lucide-react";
import { markSupplierBillPaidAction } from "@/app/actions/buyerSupplierActions";
import { formatDate } from "@/lib/dateUtils";
import Pagination from "@/components/Pagination";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  lots: any[];
  bills: any[];
}

interface SuppliersClientProps {
  suppliers: Supplier[];
  totalRecords: number;
  currentPage: number;
  companyNames?: string[];
}

export default function SuppliersClient({
  suppliers,
  totalRecords = 0,
  currentPage = 1,
  companyNames = [],
}: SuppliersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();

  const currentSortBy = searchParams.get("sort_by") || "name";
  const currentSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "asc";

  // Derive unique list of all company names from prop or current supplier list
  const availableCompanyNames = React.useMemo(() => {
    const set = new Set<string>();
    if (companyNames && companyNames.length > 0) {
      companyNames.forEach((n) => set.add(n));
    }
    suppliers.forEach((s) => set.add(s.name));
    return Array.from(set).sort();
  }, [companyNames, suppliers]);

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

  const handleCompanySelect = (selectedName: string) => {
    setSearchTerm(selectedName);
    updateUrlParams(selectedName, 1);
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

  const handleMarkBillPaid = async (formData: FormData) => {
    await markSupplierBillPaidAction(formData);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Factory className="w-5 h-5 text-[var(--primary)]" />
            Supplier Directory & Yarn Procurement
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Spinning mills, fiber co-operatives, and yarn supplier bills with recorded payment status.
          </p>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="bg-[var(--surface)] p-3.5 border border-[var(--border)] rounded-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* 1. Supplier Company Dropdown Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Company:</span>
            <select
              value={searchTerm}
              onChange={(e) => handleCompanySelect(e.target.value)}
              className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-1.5 font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] cursor-pointer min-w-[200px]"
            >
              <option value="">All Suppliers</option>
              {availableCompanyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Text Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search contact, phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-8 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
            />
          </div>

          {/* 3. Sort By */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Sort:</span>
              <select
                value={`${currentSortBy}-${currentSortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split("-") as [string, "asc" | "desc"];
                  updateUrlParams(searchTerm, 1, by, order);
                }}
                className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-1.5 font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="name-asc">Company Name</option>
                <option value="createdAt-desc">Recently Added</option>
                <option value="contactPerson-asc">Contact Person</option>
                <option value="phone-asc">Phone Number</option>
              </select>
            </div>

            <span className="text-xs text-[var(--text-secondary)] font-mono-id">
              {totalRecords} suppliers
            </span>
          </div>
        </div>

        {/* 4. Quick-select Chips for Original Company Names */}
        {availableCompanyNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border)]/60">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] mr-1">Select:</span>
            <button
              type="button"
              onClick={() => handleCompanySelect("")}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                !searchTerm
                  ? "bg-[var(--primary)] text-black font-bold border-[var(--primary)] shadow-sm"
                  : "bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
              }`}
            >
              All
            </button>
            {availableCompanyNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleCompanySelect(name)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                  searchTerm === name
                    ? "bg-[var(--primary)] text-black font-bold border-[var(--primary)] shadow-sm"
                    : "bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`space-y-6 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        {suppliers.map((sup) => (
          <div key={sup.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] bg-[var(--surface-glass)] backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">{sup.name}</h2>
                <p className="text-xs text-[var(--primary)] font-medium">Contact: {sup.contactPerson} · {sup.phone}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--text-secondary)]">
                  Lots Received: <strong>{sup.lots.length}</strong>
                </span>
                <span className="text-[var(--text-secondary)]">
                  Bills: <strong>{sup.bills.length}</strong>
                </span>
              </div>
            </div>

            {/* Bills Section */}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                Procurement Bills & Payables
              </h3>
              {sup.bills.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] italic">No procurement bills on file for this supplier.</p>
              ) : (
                <div className="overflow-x-auto border border-[var(--border)] rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--background)] text-[var(--text-primary)] font-semibold border-b border-[var(--border)]">
                      <tr>
                        <th className="px-3 py-2">Bill No</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {sup.bills.map((bill: any) => (
                        <tr key={bill.id} className="hover:bg-[#F9FBFA]">
                          <td className="px-3 py-2 font-mono-id font-bold text-[var(--primary)]">{bill.billNo}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {formatDate(bill.billedAt)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-id font-semibold text-[var(--text-primary)]" suppressHydrationWarning>
                            ₹{Number(bill.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {bill.status === "PAID" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E4B45] bg-[#E1F5E8] px-2 py-0.5 rounded">
                                <CheckCircle className="w-3 h-3" />
                                PAID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A3B14] bg-[#FCECE4] px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3" />
                                UNPAID
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {bill.status !== "PAID" ? (
                              <form action={handleMarkBillPaid}>
                                <input type="hidden" name="billId" value={bill.id} />
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-[var(--primary)] text-[var(--text-primary)] rounded hover:bg-[#0E4B45]"
                                >
                                  Mark Paid
                                </button>
                              </form>
                            ) : (
                              <span className="text-[11px] text-[#A3B3B0]">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}

        {suppliers.length === 0 && !isPending && (
          <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center premium-card">
            <Factory className="w-8 h-8 mb-2 opacity-50" />
            <p>No suppliers found.</p>
          </div>
        )}

        <div className="mt-4">
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
