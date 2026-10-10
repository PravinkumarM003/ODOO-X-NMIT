"use client";

import React, { useState } from "react";
import Link from "next/link";
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
}

export default function RollsQCClient({
  rolls,
  eligibleOrdersForRegistration,
  machineDefects,
}: RollsQCClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("QUEUE"); // QUEUE (Pending + Rework), ALL, PASSED, REWORK, REJECTED, PENDING

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
  const passedCount = rolls.filter((r) => r.qcStatus === "PASSED").length;
  const reworkCount = rolls.filter((r) => r.qcStatus === "REWORK").length;
  const rejectedCount = rolls.filter((r) => r.qcStatus === "REJECTED").length;
  const pendingCount = rolls.filter((r) => r.qcStatus === "PENDING").length;

  const filteredRolls = rolls.filter((r) => {
    const matchesSearch =
      r.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.buyerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "QUEUE") return r.qcStatus === "PENDING" || r.qcStatus === "REWORK";
    if (statusFilter === "ALL") return true;
    return r.qcStatus === statusFilter;
  });

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
      setRegisterModalOpen(false);
      window.location.reload();
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
      setInspectModalRoll(null);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#176B63]" />
            Rolls Registry & Quality Control (QC)
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Roll passport traceability, four-point visual examination, immutable QC history, and defect analysis.
          </p>
        </div>

        <button
          onClick={() => setRegisterModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#176B63] hover:bg-[#11564F] rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Finished Rolls (BR-13)
        </button>
      </div>

      {/* QC Summary Metrics (Section 7.6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#617078]">Passed Rolls</span>
            <CheckCircle2 className="w-4 h-4 text-[#277653]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[#277653] mt-1">{passedCount}</p>
          <span className="text-[10px] text-[#617078]">Eligible for store dispatch</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#617078]">Rework Rolls</span>
            <AlertTriangle className="w-4 h-4 text-[#A86F1F]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[#A86F1F] mt-1">{reworkCount}</p>
          <span className="text-[10px] text-[#617078]">Sent for trimming / mending</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#617078]">Rejected Rolls</span>
            <AlertCircle className="w-4 h-4 text-[#B44545]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[#B44545] mt-1">{rejectedCount}</p>
          <span className="text-[10px] text-[#B44545] font-semibold">Quarantined (Never dispatchable)</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#617078]">Pending Inspection</span>
            <Clock className="w-4 h-4 text-[#54758A]" />
          </div>
          <p className="text-2xl font-bold font-mono-id text-[#54758A] mt-1">{pendingCount}</p>
          <span className="text-[10px] text-[#617078]">Awaiting physical check</span>
        </div>
      </div>

      {/* Machine Defect Analysis Traceability (Section 7.6) */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg p-4 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-2 flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-[#176B63]" />
          Defect Rate Traceability by Machine (Root-Cause Attribution)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {machineDefects.map((stat) => (
            <div
              key={stat.machineCode}
              className={`p-3 rounded border font-mono-id ${
                stat.defectCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-[#F9FAFA] border-[#DCE3E1]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#202B32]">{stat.machineCode}</span>
                <span className="text-[10px] text-[#617078] uppercase">{stat.type}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-[#617078]">Defects: <strong>{stat.defectCount}</strong></span>
                <span className={`font-bold ${stat.defectRate > 0 ? "text-[#B44545]" : "text-[#277653]"}`}>
                  {stat.defectRate}% rate
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#DCE3E1] rounded-lg">
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
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex-shrink-0 ${
                statusFilter === tab.id
                  ? "bg-[#172D38] text-white"
                  : "text-[#617078] hover:text-[#202B32] hover:bg-[#F4F6F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#617078]" />
          <input
            type="text"
            placeholder="Search roll ID, order no, buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#F4F6F5] border border-[#DCE3E1] rounded-md pl-9 pr-3 py-1.5 text-[#202B32] focus:outline-none focus:border-[#176B63] focus:bg-white"
          />
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F4F6F5] border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Roll ID</th>
                <th className="py-3 px-4">Linked Order</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4 text-right">Length (m)</th>
                <th className="py-3 px-4">Loom & Dye Machine</th>
                <th className="py-3 px-4 text-center">QC Status</th>
                <th className="py-3 px-4">Defect Detail (If any)</th>
                <th className="py-3 px-4 text-center">Stock Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {filteredRolls.map((r) => (
                <tr key={r.id} className="hover:bg-[#F9FAFA]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                    <Link href={`/rolls/${r.id}`} className="hover:underline flex items-center gap-1">
                      {r.rollNo}
                      <ExternalLink className="w-3 h-3 text-[#617078]" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono-id font-medium text-[#202B32]">
                    <Link href={`/orders/${r.orderId}`} className="hover:underline text-[#176B63]">
                      {r.orderNo}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#202B32]">{r.buyerName}</td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                    {r.lengthMetres} m
                  </td>
                  <td className="py-3 px-4 font-mono-id text-[#617078]">
                    {r.weavingMachineCode || "—"} / {r.dyeingMachineCode || "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.qcStatus === "PASSED"
                          ? "bg-green-100 text-[#277653]"
                          : r.qcStatus === "REWORK"
                          ? "bg-amber-100 text-[#A86F1F]"
                          : r.qcStatus === "REJECTED"
                          ? "bg-red-100 text-[#B44545]"
                          : "bg-blue-100 text-[#54758A]"
                      }`}
                    >
                      {r.qcStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {r.latestDefect ? (
                      <div>
                        <span className="font-semibold text-[#B44545]">{r.latestDefect.type}</span>
                        <span className="text-[#617078] text-[10px]"> ({r.latestDefect.severity})</span>
                        {r.latestDefect.notes && (
                          <div className="text-[11px] text-[#617078] truncate max-w-xs">{r.latestDefect.notes}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#617078] text-[11px]">No defects</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.stockStatus === "DISPATCHED"
                          ? "bg-purple-100 text-purple-700"
                          : r.qcStatus === "REJECTED"
                          ? "bg-red-50 text-[#B44545]"
                          : "bg-emerald-50 text-[#176B63]"
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
                          className="px-2.5 py-1 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded text-xs shadow-xs"
                        >
                          Inspect (BR-14)
                        </button>
                      )}

                      <Link
                        href={`/rolls/${r.id}`}
                        className="px-2 py-1 text-xs font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded"
                      >
                        Passport →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Rolls Modal (BR-13) */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              Register Finished Fabric Rolls (BR-13)
            </h3>
            <p className="text-[#617078] mb-4">
              Enter individual roll lengths. Weaving and dyeing machines will be linked automatically.
            </p>

            {regError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Select Order in Dyeing or QC *
                </label>
                <select
                  required
                  value={regOrderId}
                  onChange={(e) => setRegOrderId(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
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
                <label className="block font-semibold text-[#202B32] mb-1">
                  Roll Lengths in Metres (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={regLengthsInput}
                  onChange={(e) => setRegLengthsInput(e.target.value)}
                  placeholder="e.g. 100, 100, 80"
                  className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
                <p className="text-[10px] text-[#617078] mt-1">
                  Total registered metres cannot exceed order quantity by more than 5% (BR-13).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
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
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              QC Inspection: {inspectModalRoll.rollNo}
            </h3>
            <p className="text-[#617078] mb-4">
              Order: <strong>{inspectModalRoll.orderNo}</strong> ({inspectModalRoll.buyerName}) · Length: {inspectModalRoll.lengthMetres} m.
            </p>

            {inspectError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {inspectError}
              </div>
            )}

            <form onSubmit={handleInspectSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Inspection Result *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "PASSED", label: "Passed", bg: "hover:bg-green-50 text-[#277653]" },
                    { id: "REWORK", label: "Rework", bg: "hover:bg-amber-50 text-[#A86F1F]" },
                    { id: "REJECTED", label: "Rejected", bg: "hover:bg-red-50 text-[#B44545]" },
                  ].map((resOption) => (
                    <label
                      key={resOption.id}
                      className={`p-2 border rounded text-center cursor-pointer font-bold ${
                        inspectResult === resOption.id
                          ? "border-[#176B63] bg-[#EBF3F1]"
                          : "border-[#DCE3E1]"
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
                <div className="p-3 bg-red-50/50 border border-red-200 rounded space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#202B32] mb-1">
                        Defect Type *
                      </label>
                      <select
                        value={defectType}
                        onChange={(e) => setDefectType(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] bg-white"
                      >
                        <option value="HOLE">Hole / Tear</option>
                        <option value="COLOUR_MISMATCH">Colour Mismatch</option>
                        <option value="UNEVEN_WEAVE">Uneven Weave</option>
                        <option value="OTHER">Other Surface Defect</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#202B32] mb-1">
                        Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32] bg-white"
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
                <label className="block font-semibold text-[#202B32] mb-1">
                  Inspector Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="e.g. Inspected on lighted examination table, 4-point method"
                  className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setInspectModalRoll(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inspectLoading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
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
