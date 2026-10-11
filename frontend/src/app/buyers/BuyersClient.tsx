"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Users2, Phone, Mail, MapPin, Search, ArrowRight } from "lucide-react";
import Pagination from "@/components/Pagination";

interface Buyer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
}

interface BuyersClientProps {
  buyers: Buyer[];
  totalRecords: number;
  currentPage: number;
}

export default function BuyersClient({
  buyers,
  totalRecords = 0,
  currentPage = 1,
}: BuyersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();

  const currentSortBy = searchParams.get("sort_by") || "name";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[var(--primary)]" />
            Buyer Directory & Customer Ledger
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Registered commercial garment manufacturers, uniforms, and home textile buyers.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search buyer name or contact..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Sort By:</span>
            <select
              value={`${currentSortBy}-${currentSortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-") as [string, "asc" | "desc"];
                updateUrlParams(searchTerm, 1, by, order);
              }}
              className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-1.5 font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="name-asc">Buyer Name (A-Z)</option>
              <option value="name-desc">Buyer Name (Z-A)</option>
              <option value="contactPerson-asc">Contact Person (A-Z)</option>
              <option value="createdAt-desc">Recently Added</option>
            </select>
          </div>

          <span className="text-xs text-[var(--text-secondary)] font-mono-id">
            {totalRecords} buyers
          </span>
        </div>
      </div>

      <div className={`transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buyers.map((buyer) => (
            <div key={buyer.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{buyer.name}</h2>
                    <p className="text-xs text-[var(--primary)] font-medium mt-0.5">{buyer.contactPerson}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)]">
                    {buyer.orderCount} Orders
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)]">Outstanding Balance:</span>
                  <div className="text-sm font-bold font-mono-id text-[var(--text-primary)]" suppressHydrationWarning>
                    ₹{Number(buyer.outstandingBalance || 0).toLocaleString("en-IN")}
                  </div>
                </div>

                <Link
                  href={`/orders?buyer=${buyer.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:text-[#0E4B45]"
                >
                  View Orders
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {buyers.length === 0 && !isPending && (
          <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center premium-card">
            <Users2 className="w-8 h-8 mb-2 opacity-50" />
            <p>No buyers found.</p>
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
