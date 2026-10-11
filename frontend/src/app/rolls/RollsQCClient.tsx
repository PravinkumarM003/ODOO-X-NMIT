"use client";

import { useRouter, useSearchParams } from "next/navigation";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import SortHeader from "@/components/common/SortHeader";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Plus,
  ShieldCheck,
  Search,
  ExternalLink,
  X,
  FileText,
  BarChart2,
} from "lucide-react";
import { registerRollsAction, inspectRollAction } from "@/app/actions/qcActions";

interface RollQCData {
  id: string;
  rollNo: string;
  orderId: string;
  orderNo: string;
  buyerName: string;
  fabricName: string;
  lengthMetres: number;
  weavingMachineCode?: string | null;
  dyeingMachineCode?: string | null;
  qcStatus: string;
  stockStatus: string;
  createdAt: string;
  qcRecordsCount: number;
  latestDefect?: {
    type: string;
    severity: string;
    notes?: string | null;
  } | null;
}

interface MachineDefectStat {
  machineCode: string;
  type: string;
  defectCount: number;
  totalRolls: number;
  defectRate: number;
}

interface RollsQCClientProps {
  rolls: RollQCData[];
  eligibleOrdersForRegistration: Array<{
    id: string;
    orderNo: string;
    buyerName: string;
    fabricName: string;
    qtyMetres: number;
    registeredMetres: number;
  }>;
  machineDefects: MachineDefectStat[];
  userRole?: string;
  attendanceData?: any[];
  qcCounts?: { passed: number; rework: number; rejected: number; pending: number };
  totalRecords?: number;
  currentPage?: number;
}

export default function RollsQCClient({
  rolls,
  eligibleOrdersForRegistration,
  machineDefects,
  userRole = "PRODUCTION_SUPERVISOR",
  attendanceData = [],
  qcCounts = { passed: 0, rework: 0, rejected: 0, pending: 0 },
  totalRecords = 0,
  currentPage = 1,
}: RollsQCClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "QUEUE"); // QUEUE (Pending + Rework), ALL, PASSED, REWORK, REJECTED, PENDING
  const [isPending, startTransition] = useTransition();

  // Register Rolls Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regOrderId, setRegOrderId] = useState("");
  const [regLengthsInput, setRegLengthsInput] = useState("100, 100");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Inspect Modal
  const [inspectModalRoll, setInspectModalRoll] = useState<RollQCData | null>(null);
  const [inspectResult, setInspectResult] = useState<"PASSED" | "REWORK" | "REJECTED">("PASSED");
  const [defectType, setDefectType] = useState<string>("HOLE");
  const [severity, setSeverity] = useState<string>("MINOR");
  const [inspectNotes, setInspectNotes] = useState("");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Summary counts
  const passedCount = qcCounts.passed;
  const reworkCount = qcCounts.rework;
  const rejectedCount = qcCounts.rejected;
  const pendingCount = qcCounts.pending;

  const currentSortBy = searchParams.get("sort_by") || "createdAt";
  const currentSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "desc";

  const updateUrlParams = (search: string, status: string, page: number, sortBy = currentSortBy, sortOrder = currentSortOrder) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "QUEUE") params.set("status", status); // QUEUE is default
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
    updateUrlParams(searchTerm, statusFilter, 1, sortKey, nextOrder);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrlParams(searchTerm, statusFilter, 1);
    }
  };
  
  const handleSearchBlur = () => {
    if (searchTerm !== (searchParams.get("search") || "")) {
      updateUrlParams(searchTerm, statusFilter, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams(searchTerm, statusFilter, newPage);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    const lengths = regLengthsInput
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const formData = new FormData();
    formData.append("orderId", regOrderId);
    formData.append("lengthsJson", JSON.stringify(lengths));

    const res = await registerRollsAction(formData);
    setRegLoading(false);

    if (res.error) {
      setRegError(res.error);
    } else {
      router.refresh();
      setRegisterModalOpen(false);
    }
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectModalRoll) return;

    setInspectLoading(true);
    setInspectError(null);

    const formData = new FormData();
    formData.append("rollId", inspectModalRoll.id);
    formData.append("result", inspectResult);
    if (inspectResult !== "PASSED") {
      formData.append("defectType", defectType);
      formData.append("severity", severity);
    }
    formData.append("notes", inspectNotes);

    const res = await inspectRollAction(formData);
    setInspectLoading(false);

    if (res.error) {
      setInspectError(res.error);
    } else {
      router.refresh();
      setInspectModalRoll(null);
    }
  };

  const qcTeam = attendanceData.filter((emp: any) => emp.department === 'QC');
  const presentCount = qcTeam.filter((e: any) => e.currentAttendance?.status === 'PRESENT').length;
  const teamTotal = qcTeam.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--primary)]" />
            Rolls Registry & Quality Control (QC)
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Roll passport traceability, four-point visual examination, immutable QC history, and defect analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-blue-50 text-[var(--primary)] text-xs font-bold border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
            Team Attendance: {presentCount} / {teamTotal}
          </span>
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Finished Rolls (BR-13)
          </button>
        </div>
      </div>

      {/* QC Summary Metrics (Section 7.6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Passed Rolls</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[var(--success)] mt-1">{passedCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Eligible for store dispatch</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Rework Rolls</span>
            <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[var(--warning)] mt-1">{reworkCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Sent for trimming / mending</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Rejected Rolls</span>
            <AlertCircle className="w-4 h-4 text-[var(--critical)]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[var(--critical)] mt-1">{rejectedCount}</p>
          <span className="text-[10px] text-[var(--critical)] font-semibold">Quarantined (Never dispatchable)</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pending Inspection</span>
            <Clock className="w-4 h-4 text-[var(--info)]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[var(--info)] mt-1">{pendingCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Awaiting physical check</span>
        </div>
      </div>

      {/* Machine Defect Analysis Traceability (Section 7.6) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-[var(--primary)]" />
          Defect Rate Traceability by Machine (Root-Cause Attribution)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {machineDefects.map((stat) => (
            <div
              key={stat.machineCode}
              className={`p-3 rounded border font-mono-id ${
                stat.defectCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-[var(--sidebar-secondary)] border-[var(--border)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">{stat.machineCode}</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">{stat.type}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">Defects: <strong>{stat.defectCount}</strong></span>
                <span className={`font-bold ${stat.defectRate > 0 ? "text-[var(--critical)]" : "text-[var(--success)]"}`}>
                  {stat.defectRate}% rate
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { id: "QUEUE", label: `Inspection Queue (${pendingCount + reworkCount})` },
            { id: "ALL", label: `All Rolls (${rolls.length})` },
            { id: "PASSED", label: `Passed (${passedCount})` },
            { id: "REWORK", label: `Rework (${reworkCount})` },
            { id: "REJECTED", label: `Rejected (${rejectedCount})` },
            { id: "PENDING", label: `Pending (${pendingCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                updateUrlParams(searchTerm, tab.id, 1);
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex-shrink-0 ${
                statusFilter === tab.id
                  ? "bg-[var(--sidebar)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search roll ID, order no, buyer..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:bg-[var(--surface)]"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[var(--text-secondary)] font-mono-id ml-auto mr-1">
          {totalRecords} matching roll(s)
        </span>
      </div>

      {/* Rolls Table */}
      <div className={`premium-card overflow-hidden transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[11px]">
                <SortHeader label="Roll ID" sortKey="rollNo" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Linked Order" sortKey="orderNo" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <th className="py-3 px-4">Buyer</th>
                <SortHeader label="Length (m)" sortKey="lengthMetres" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-right" />
                <th className="py-3 px-4">Loom & Dye Machine</th>
                <SortHeader label="QC Status" sortKey="qcStatus" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-center" />
                <th className="py-3 px-4">Defect Detail (If any)</th>
                <SortHeader label="Stock Status" sortKey="stockStatus" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-center" />
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rolls.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--sidebar-secondary)]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                    <Link href={`/rolls/${r.id}`} className="hover:underline flex items-center gap-1">
                      {r.rollNo}
                      <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono-id font-medium text-[var(--text-primary)]">
                    <Link href={`/orders/${r.orderId}`} className="hover:underline text-[var(--primary)]">
                      {r.orderNo}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{r.buyerName}</td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                    {r.lengthMetres} m
                  </td>
                  <td className="py-3 px-4 font-mono-id text-[var(--text-secondary)]">
                    {r.weavingMachineCode || "—"} / {r.dyeingMachineCode || "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.qcStatus === "PASSED"
                          ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                          : r.qcStatus === "REWORK"
                          ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                          : r.qcStatus === "REJECTED"
                          ? "bg-[rgba(255,77,77,0.15)] text-[var(--critical)]"
                          : "bg-[rgba(58,141,212,0.15)] text-[var(--info)]"
                      }`}
                    >
                      {r.qcStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {r.latestDefect ? (
                      <div>
                        <span className="font-semibold text-[var(--critical)]">{r.latestDefect.type}</span>
                        <span className="text-[var(--text-secondary)] text-[10px]"> ({r.latestDefect.severity})</span>
                        {r.latestDefect.notes && (
                          <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-xs">{r.latestDefect.notes}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)] text-[11px]">No defects</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.stockStatus === "DISPATCHED"
                          ? "bg-purple-100 text-purple-700"
                          : r.qcStatus === "REJECTED"
                          ? "bg-red-50 text-[var(--critical)]"
                          : "bg-emerald-50 text-[var(--primary)]"
                      }`}
                    >
                      {r.stockStatus === "DISPATCHED" ? "DISPATCHED" : r.qcStatus === "REJECTED" ? "QUARANTINE" : "SHELF BAY"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Inspect Roll Button (Pending or Rework) */}
                      {(r.qcStatus === "PENDING" || r.qcStatus === "REWORK") && (
                        <button
                          onClick={() => {
                            setInspectModalRoll(r);
                            setInspectResult("PASSED");
                            setInspectNotes("");
                          }}
                          className="px-2.5 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded text-xs shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
                        >
                          Inspect (BR-14)
                        </button>
                      )}

                      <Link
                        href={`/rolls/${r.id}`}
                        className="px-2 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded"
                      >
                        Passport →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rolls.length === 0 && !isPending && (
            <div className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center">
              <ShieldCheck className="w-8 h-8 mb-2 opacity-50" />
              <p>No rolls found in this view.</p>
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

      {/* Register Rolls Modal (BR-13) */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Register Finished Fabric Rolls (BR-13)
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Enter individual roll lengths. Weaving and dyeing machines will be linked automatically.
            </p>

            {regError && (
              <div className="p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded mb-3 font-semibold">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Select Order in Dyeing or QC *
                </label>
                <select
                  required
                  value={regOrderId}
                  onChange={(e) => setRegOrderId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                >
                  <option value="">Select Order</option>
                  {eligibleOrdersForRegistration.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNo} ({o.buyerName}) - Reg: {o.registeredMetres}/{o.qtyMetres} m
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Roll Lengths in Metres (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={regLengthsInput}
                  onChange={(e) => setRegLengthsInput(e.target.value)}
                  placeholder="e.g. 100, 100, 80"
                  className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Total registered metres cannot exceed order quantity by more than 5% (BR-13).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
                >
                  {regLoading ? "Registering..." : "Generate Rolls"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Roll Modal (BR-14: Immutable QCRecord) */}
      {inspectModalRoll && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              QC Inspection: {inspectModalRoll.rollNo}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Order: <strong>{inspectModalRoll.orderNo}</strong> ({inspectModalRoll.buyerName}) · Length: {inspectModalRoll.lengthMetres} m.
            </p>

            {inspectError && (
              <div className="p-2.5 bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded mb-3 font-semibold">
                {inspectError}
              </div>
            )}

            <form onSubmit={handleInspectSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Inspection Result *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "PASSED", label: "Passed", bg: "hover:bg-green-50 text-[var(--success)]" },
                    { id: "REWORK", label: "Rework", bg: "hover:bg-amber-50 text-[var(--warning)]" },
                    { id: "REJECTED", label: "Rejected", bg: "hover:bg-red-50 text-[var(--critical)]" },
                  ].map((resOption) => (
                    <label
                      key={resOption.id}
                      className={`p-2 border rounded text-center cursor-pointer font-bold ${
                        inspectResult === resOption.id
                          ? "border-[var(--primary)] bg-[rgba(0,240,255,0.1)]"
                          : "border-[var(--border)]"
                      } ${resOption.bg}`}
                    >
                      <input
                        type="radio"
                        name="result"
                        value={resOption.id}
                        checked={inspectResult === resOption.id}
                        onChange={() => setInspectResult(resOption.id as any)}
                        className="sr-only"
                      />
                      {resOption.label}
                    </label>
                  ))}
                </div>
              </div>

              {inspectResult !== "PASSED" && (
                <div className="p-3 bg-red-50/50 border border-[rgba(255,77,77,0.3)] rounded space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[var(--text-primary)] mb-1">
                        Defect Type *
                      </label>
                      <select
                        value={defectType}
                        onChange={(e) => setDefectType(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] bg-[var(--surface)]"
                      >
                        <option value="HOLE">Hole / Tear</option>
                        <option value="COLOUR_MISMATCH">Colour Mismatch</option>
                        <option value="UNEVEN_WEAVE">Uneven Weave</option>
                        <option value="OTHER">Other Surface Defect</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[var(--text-primary)] mb-1">
                        Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)] bg-[var(--surface)]"
                      >
                        <option value="MINOR">Minor</option>
                        <option value="MAJOR">Major</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Inspector Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="e.g. Inspected on lighted examination table, 4-point method"
                  className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setInspectModalRoll(null)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inspectLoading}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
                >
                  {inspectLoading ? "Saving Record..." : "Submit QC Record (BR-14)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
