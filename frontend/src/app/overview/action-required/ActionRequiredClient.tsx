"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  ArrowLeft,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { NotificationItem } from "@/services/notificationService";
import Pagination from "@/components/Pagination";
import { apiClient } from "@/lib/apiClient";

interface ActionRequiredClientProps {
  userRole: string;
  initialData: {
    items: NotificationItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function ActionRequiredClient({
  userRole,
  initialData,
}: ActionRequiredClientProps) {
  const [items, setItems] = useState<NotificationItem[]>(initialData?.items || []);
  const [total, setTotal] = useState<number>(initialData?.total || 0);
  const [page, setPage] = useState<number>(initialData?.page || 1);
  const [pageSize] = useState<number>(initialData?.pageSize || 20);
  const [loading, setLoading] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("severity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        let url = `/overview/action-required?page=${targetPage}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
        if (severityFilter !== "ALL") url += `&severity=${severityFilter}`;
        if (typeFilter !== "ALL") url += `&type=${typeFilter}`;

        const res = await apiClient.get<any>(url);
        if (res) {
          setItems(res.items || []);
          setTotal(res.total || 0);
          setPage(res.page || targetPage);
        }
      } catch (err) {
        console.error("Failed to load action items:", err);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, search, severityFilter, typeFilter, sortBy, sortOrder]
  );

  // Trigger search/filter fetch on page 1
  useEffect(() => {
    fetchData(1);
  }, [search, severityFilter, typeFilter, sortBy, sortOrder, fetchData]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const severityBadge = (sev: string) => {
    if (sev === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(255,77,77,0.15)] text-[var(--critical)] border border-[rgba(255,77,77,0.3)]">
          <AlertCircle className="w-3 h-3" />
          Critical
        </span>
      );
    }
    if (sev === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(245,166,35,0.15)] text-[var(--warning)] border border-[rgba(245,166,35,0.3)]">
          <AlertTriangle className="w-3 h-3" />
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(58,141,212,0.15)] text-[var(--info)] border border-[rgba(58,141,212,0.3)]">
        <Info className="w-3 h-3" />
        Info
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/overview"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Executive Overview
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--critical)]" />
            Action Required Tasks ({total})
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Complete server-side paginated queue of urgent floor, inventory, and order action items matching role permissions ({userRole}).
          </p>
        </div>

        <button
          onClick={() => fetchData(page)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--sidebar-secondary)] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by title, description or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-semibold"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded px-2.5 py-2 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="INFO">Info Only</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded px-2.5 py-2 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="ALL">All Task Types</option>
              <option value="BREAKDOWN">Machine Breakdown</option>
              <option value="OVERDUE">Overdue Order</option>
              <option value="AT_RISK">At Risk Order</option>
              <option value="YARN_OUT">Yarn Out of Stock</option>
              <option value="YARN_LOW">Low Yarn Stock</option>
              <option value="NEEDS_REVIEW">Order Awaiting Review</option>
              <option value="READY_DISPATCH">Ready for Dispatch</option>
              <option value="NO_SHIPPABLE_ROLLS">All Rolls Rejected</option>
              <option value="PENDING_QC">Rolls Awaiting QC</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-") as [string, "asc" | "desc"];
                setSortBy(by);
                setSortOrder(order);
              }}
              className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded px-2.5 py-2 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="severity-desc">Priority (Urgent First)</option>
              <option value="severity-asc">Priority (Low First)</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="title-desc">Title (Z–A)</option>
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--sidebar-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Task Description & Title</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[var(--text-secondary)] font-semibold">
                    Loading Action Required items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[var(--text-secondary)] font-semibold">
                    No Action Required tasks match the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--sidebar-secondary)] transition-colors"
                  >
                    <td className="p-3.5 align-top whitespace-nowrap">
                      {severityBadge(item.severity)}
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="font-bold text-[var(--text-primary)]">{item.title}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.description}</div>
                    </td>

                    <td className="p-3.5 align-top whitespace-nowrap">
                      <span className="font-mono-id text-[10px] font-bold text-[var(--primary)] px-2 py-0.5 rounded bg-blue-50/50 border border-blue-200">
                        {item.type}
                      </span>
                    </td>

                    <td className="p-3.5 align-top text-right whitespace-nowrap">
                      <Link
                        href={item.link}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded transition-colors"
                      >
                        Resolve →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)]">
          <Pagination
            currentPage={page}
            totalRecords={total}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
