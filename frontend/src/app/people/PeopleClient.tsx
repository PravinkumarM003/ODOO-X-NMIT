"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useTransition, useEffect } from "react";
import {
  UserCheck,
  UserX,
  Users,
  Calendar,
  Clock,
  Search,
  Lock,
  ShieldCheck,
  Save,
  Filter,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import SortHeader from "@/components/common/SortHeader";
import { markAttendanceAction } from "@/app/actions/financeActions";

interface EmployeeRow {
  id: string;
  empNo: string;
  name: string;
  department: string;
  jobTitle: string;
  dailyWage: number;
  overtimeRatePerHour: number;
  active: boolean;
  currentAttendance?: {
    id?: string | null;
    status: string;
    shift: string;
    overtimeHours: number;
    isSubmitted?: boolean;
  } | null;
}

interface AttendanceSummary {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  attendancePercentage: number;
}

interface PeopleClientProps {
  employees: EmployeeRow[];
  selectedDate: string;
  userRole: string;
  totalRecords?: number;
  currentPage?: number;
  summary?: AttendanceSummary | null;
}

export default function PeopleClient({
  employees,
  selectedDate: initialDate,
  userRole,
  totalRecords = 0,
  currentPage = 1,
  summary,
}: PeopleClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState(initialDate);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "ALL");
  const [isPending, startTransition] = useTransition();

  // Local state for table row inputs & submission status
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: string; shift: string; overtimeHours: number; isSubmitted: boolean }>
  >({});

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdministrator = userRole === "ADMINISTRATOR";

  // Re-sync attendance local state when employees prop changes
  useEffect(() => {
    const map: Record<string, { status: string; shift: string; overtimeHours: number; isSubmitted: boolean }> = {};
    for (const emp of employees) {
      const att = emp.currentAttendance;
      map[emp.id] = {
        status: att?.status || "PRESENT",
        shift: att?.shift || "MORNING",
        overtimeHours: att?.overtimeHours || 0,
        isSubmitted: !!att?.isSubmitted,
      };
    }
    setAttendanceState(map);
  }, [employees]);

  // Handle status change - immediately force OT = 0 if ABSENT or LEAVE (BR-20)
  const handleStatusChange = (empId: string, newStatus: string) => {
    setAttendanceState((prev) => {
      const current = prev[empId] || { status: "PRESENT", shift: "MORNING", overtimeHours: 0, isSubmitted: false };
      const isZeroOt = newStatus === "ABSENT" || newStatus === "LEAVE";
      return {
        ...prev,
        [empId]: {
          ...current,
          status: newStatus,
          overtimeHours: isZeroOt ? 0 : current.overtimeHours,
        },
      };
    });
  };

  // Handle OT change - enforce non-negative check
  const handleOTChange = (empId: string, val: number) => {
    const validOt = Math.max(0, isNaN(val) ? 0 : val);
    setAttendanceState((prev) => {
      const current = prev[empId] || { status: "PRESENT", shift: "MORNING", overtimeHours: 0, isSubmitted: false };
      return {
        ...prev,
        [empId]: {
          ...current,
          overtimeHours: current.status === "PRESENT" ? validOt : 0,
        },
      };
    });
  };

  const handleSaveAttendance = async (empId: string) => {
    setErrorMsg(null);
    setSavingId(empId);
    const entry = attendanceState[empId] || { status: "PRESENT", shift: "MORNING", overtimeHours: 0, isSubmitted: false };

    // Front-end lock guard for non-administrators
    if (entry.isSubmitted && !isAdministrator) {
      setErrorMsg("Attendance is locked. Only Administrators can modify submitted records.");
      setSavingId(null);
      return;
    }

    const formData = new FormData();
    formData.append("employeeId", empId);
    formData.append("date", date);
    formData.append("status", entry.status);
    formData.append("shift", entry.shift);
    formData.append("overtimeHours", (entry.status === "PRESENT" ? entry.overtimeHours : 0).toString());

    const result = await markAttendanceAction(formData);

    setSavingId(null);
    if (result?.error) {
      setErrorMsg(result.error);
    } else {
      setSavedId(empId);
      // Update local state to mark as submitted
      setAttendanceState((prev) => ({
        ...prev,
        [empId]: { ...prev[empId], isSubmitted: true },
      }));
      setTimeout(() => setSavedId(null), 2500);
      router.refresh();
    }
  };

  const currentSortBy = searchParams.get("sort_by") || "empNo";
  const currentSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "asc";

  const updateUrlParams = (search: string, dept: string, dateStr: string, page: number, sortBy = currentSortBy, sortOrder = currentSortOrder) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dept && dept !== "ALL") params.set("department", dept);
      if (dateStr) params.set("date", dateStr);
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
    updateUrlParams(searchTerm, selectedDept, date, 1, sortKey, nextOrder);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updateUrlParams(searchTerm, selectedDept, date, 1);
    }
  };

  const handleSearchBlur = () => {
    if (searchTerm !== (searchParams.get("search") || "")) {
      updateUrlParams(searchTerm, selectedDept, date, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams(searchTerm, selectedDept, date, newPage);
  };

  const departments = ["ALL", "WEAVING", "SPINNING", "DYEING", "QUALITY", "MAINTENANCE", "DISPATCH", "FINANCE", "LOGISTICS", "ADMIN"];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[var(--primary)]" />
            Attendance Management
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
            Enterprise daily shift attendance register & role-enforced overtime log
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] shadow-sm">
          <Calendar className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Working Date:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const newDate = e.target.value;
              setDate(newDate);
              updateUrlParams(searchTerm, selectedDept, newDate, 1);
            }}
            className="text-xs font-mono font-bold text-[var(--text-primary)] bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Employees */}
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
            {summary?.totalEmployees ?? totalRecords}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Active headcount</span>
        </div>

        {/* Card 2: Present */}
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Present</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.present ?? 0}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">On duty today</span>
        </div>

        {/* Card 3: Absent */}
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Absent</span>
            <UserX className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
            {summary?.absent ?? 0}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Unexcused absentees</span>
        </div>

        {/* Card 4: On Leave */}
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Leave</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {summary?.onLeave ?? 0}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Approved leave</span>
        </div>

        {/* Card 5: Attendance % */}
        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[var(--primary)] mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Attendance %</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--primary)]">
            {summary?.attendancePercentage ?? 0}%
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Daily turnout rate</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 border border-[var(--border)] rounded-lg shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search employee name, Emp No, job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full text-xs bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => {
              const dept = e.target.value;
              setSelectedDept(dept);
              updateUrlParams(searchTerm, dept, date, 1);
            }}
            className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "All Departments" : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <span>Daily Attendance Register for {date}</span>
              {isAdministrator ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                  ADMINISTRATOR MODE (Full Correction Rights)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                  STAFF MODE (Single Submission Lock)
                </span>
              )}
            </h2>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-mono">
            Showing {employees.length} of {totalRecords} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] font-bold uppercase tracking-wider text-[11px] bg-[var(--background)]/50">
                <SortHeader label="Emp No" sortKey="empNo" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Employee Name" sortKey="name" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                <SortHeader label="Department & Role" sortKey="department" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} />
                {isAdministrator && (
                  <SortHeader label="Daily Wage" sortKey="dailyWages" currentSortBy={currentSortBy} currentSortOrder={currentSortOrder} onSort={handleSort} className="text-right" />
                )}
                <th className="py-3 px-4 text-center">Attendance Status</th>
                <th className="py-3 px-4 text-center">Overtime (Hrs)</th>
                <th className="py-3 px-4 text-center">Record Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {employees.map((emp) => {
                const current = attendanceState[emp.id] || {
                  status: emp.currentAttendance?.status || "PRESENT",
                  shift: emp.currentAttendance?.shift || "MORNING",
                  overtimeHours: emp.currentAttendance?.overtimeHours || 0,
                  isSubmitted: !!emp.currentAttendance?.isSubmitted,
                };

                const isLocked = current.isSubmitted && !isAdministrator;
                const isSaved = savedId === emp.id;
                const isSaving = savingId === emp.id;

                return (
                  <tr key={emp.id} className="hover:bg-[var(--sidebar-secondary)] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[var(--primary)]">{emp.empNo}</td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{emp.name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{emp.department}</span> · {emp.jobTitle}
                    </td>

                    {/* Wage figures visible to Administrator only */}
                    {isAdministrator && (
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]" suppressHydrationWarning>
                        ₹{Number(emp.dailyWage || 0).toLocaleString("en-IN")}/day
                      </td>
                    )}

                    {/* Attendance Status Selector */}
                    <td className="py-3 px-4 text-center">
                      <select
                        value={current.status}
                        disabled={isLocked}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                        className={`text-xs font-bold rounded-md px-2.5 py-1.5 border transition-all focus:outline-none ${
                          current.status === "PRESENT"
                            ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : current.status === "ABSENT"
                            ? "bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                            : "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        } ${isLocked ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:border-[var(--primary)]"}`}
                      >
                        <option value="PRESENT">✓ PRESENT</option>
                        <option value="ABSENT">✕ ABSENT</option>
                        <option value="LEAVE">⏳ LEAVE</option>
                      </select>
                    </td>

                    {/* Overtime Input */}
                    <td className="py-3 px-4 text-center">
                      {current.status === "PRESENT" ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="12"
                            step="0.5"
                            disabled={isLocked}
                            value={current.overtimeHours}
                            onChange={(e) => handleOTChange(emp.id, parseFloat(e.target.value))}
                            className={`w-16 font-mono text-center px-2 py-1 text-xs border rounded-md text-[var(--text-primary)] bg-[var(--background)] focus:outline-none focus:border-[var(--primary)] ${
                              isLocked ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                          />
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">hrs</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono font-medium opacity-60">
                          0.0 hrs
                        </span>
                      )}
                    </td>

                    {/* Record Submission Status */}
                    <td className="py-3 px-4 text-center">
                      {current.isSubmitted ? (
                        isAdministrator ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                            Saved (Admin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            Submitted
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right">
                      {isLocked ? (
                        <button
                          disabled
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3 text-amber-500" />
                          Locked
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveAttendance(emp.id)}
                          disabled={isSaving}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all inline-flex items-center gap-1.5 ${
                            isSaved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-[var(--background)] shadow-sm disabled:opacity-50"
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Saved
                            </>
                          ) : current.isSubmitted ? (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Update
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Submit
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {employees.length === 0 && !isPending && (
            <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center">
              <Users className="w-10 h-10 mb-2 opacity-40 text-[var(--primary)]" />
              <p className="font-semibold text-sm text-[var(--text-primary)]">No employees found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Try clearing search terms or selecting a different department filter.
              </p>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--background)]">
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
