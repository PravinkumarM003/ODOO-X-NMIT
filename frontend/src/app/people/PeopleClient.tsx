"use client";

import React, { useState } from "react";
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Users,
  Save,
  Check,
} from "lucide-react";
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
    status: string;
    shift: string;
    overtimeHours: number;
  } | null;
}

interface PeopleClientProps {
  employees: EmployeeRow[];
  selectedDate: string;
  userRole: string;
}

export default function PeopleClient({
  employees,
  selectedDate: initialDate,
  userRole,
}: PeopleClientProps) {
  const [date, setDate] = useState(initialDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: string; shift: string; overtimeHours: number }>
  >(() => {
    const map: Record<string, any> = {};
    for (const emp of employees) {
      map[emp.id] = {
        status: emp.currentAttendance?.status || "PRESENT",
        shift: emp.currentAttendance?.shift || "MORNING",
        overtimeHours: emp.currentAttendance?.overtimeHours || 0,
      };
    }
    return map;
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const isOwner = userRole === "OWNER";

  const handleStatusChange = (empId: string, status: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], status },
    }));
  };

  const handleOTChange = (empId: string, overtimeHours: number) => {
    setAttendanceState((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], overtimeHours },
    }));
  };

  const handleSaveAttendance = async (empId: string) => {
    setSavingId(empId);
    const entry = attendanceState[empId];

    const formData = new FormData();
    formData.append("employeeId", empId);
    formData.append("date", date);
    formData.append("status", entry.status);
    formData.append("shift", entry.shift);
    formData.append("overtimeHours", entry.overtimeHours.toString());

    await markAttendanceAction(formData);

    setSavingId(null);
    setSavedId(empId);
    setTimeout(() => setSavedId(null), 2500);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#176B63]" />
            People & Attendance Register
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Mill staff directory and daily shift attendance register (BR-20).
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#DCE3E1] rounded-md shadow-xs">
          <Calendar className="w-4 h-4 text-[#176B63]" />
          <span className="text-xs text-[#617078] font-medium">Date:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              window.location.href = `/people?date=${e.target.value}`;
            }}
            className="text-xs font-mono-id font-bold text-[#202B32] bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between bg-white p-3 border border-[#DCE3E1] rounded-lg">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#617078]" />
          <input
            type="text"
            placeholder="Search employee name, ID, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#F4F6F5] border border-[#DCE3E1] rounded-md pl-9 pr-3 py-1.5 text-[#202B32] focus:outline-none focus:border-[#176B63] focus:bg-white"
          />
        </div>
        <span className="text-xs text-[#617078] font-mono-id">
          {filteredEmployees.length} employees
        </span>
      </div>

      {/* Daily Attendance Register Table (BR-20) */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32]">
              Daily Attendance Register for {date}
            </h2>
            <p className="text-[11px] text-[#617078]">
              Defaults to PRESENT. Adjust absences, leave or overtime hours quickly (BR-20).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Emp No</th>
                <th className="py-2.5 px-4">Employee Name</th>
                <th className="py-2.5 px-4">Department & Role</th>
                {isOwner && <th className="py-2.5 px-4 text-right">Daily Wage</th>}
                <th className="py-2.5 px-4 text-center">Status (Fast Select)</th>
                <th className="py-2.5 px-4 text-center">Overtime (Hours)</th>
                <th className="py-2.5 px-4 text-right">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {filteredEmployees.map((emp) => {
                const current = attendanceState[emp.id] || {
                  status: "PRESENT",
                  shift: "MORNING",
                  overtimeHours: 0,
                };
                const isSaved = savedId === emp.id;
                const isSaving = savingId === emp.id;

                return (
                  <tr key={emp.id} className="hover:bg-[#F9FAFA]">
                    <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">{emp.empNo}</td>
                    <td className="py-3 px-4 font-semibold text-[#202B32]">{emp.name}</td>
                    <td className="py-3 px-4 text-[#617078]">
                      <span className="font-medium text-[#202B32]">{emp.department}</span> · {emp.jobTitle}
                    </td>

                    {/* Wage figures visible to Owner only (Section 3 & BR-21) */}
                    {isOwner && (
                      <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                        ₹{emp.dailyWage}/day
                      </td>
                    )}

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-md border border-[#DCE3E1] overflow-hidden text-[11px] font-bold">
                        {["PRESENT", "ABSENT", "LEAVE"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(emp.id, st)}
                            className={`px-2.5 py-1 transition-colors ${
                              current.status === st
                                ? st === "PRESENT"
                                  ? "bg-[#277653] text-white"
                                  : st === "ABSENT"
                                  ? "bg-[#B44545] text-white"
                                  : "bg-[#A86F1F] text-white"
                                : "bg-white text-[#617078] hover:bg-[#F4F6F5]"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="8"
                        step="0.5"
                        value={current.overtimeHours}
                        onChange={(e) => handleOTChange(emp.id, parseFloat(e.target.value) || 0)}
                        className="w-16 font-mono-id text-center px-1.5 py-1 border border-[#DCE3E1] rounded text-[#202B32]"
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSaveAttendance(emp.id)}
                        disabled={isSaving}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          isSaved
                            ? "bg-green-100 text-[#277653]"
                            : "bg-[#176B63] hover:bg-[#11564F] text-white"
                        }`}
                      >
                        {isSaving ? "Saving..." : isSaved ? "✓ Saved" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
