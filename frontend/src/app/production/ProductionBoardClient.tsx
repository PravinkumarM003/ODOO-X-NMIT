"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Play,
  CheckCircle,
  AlertOctagon,
  Clock,
  Plus,
  RefreshCw,
  Sliders,
  ExternalLink,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  assignMachineAction,
  logOutputAction,
  completeStageAction,
  reportBreakdownAction,
  resolveBreakdownAction,
  reassignWorkOrderAction,
} from "@/app/actions/productionActions";

interface MachineData {
  id: string;
  code: string;
  type: string;
  status: string;
  hourlyRate: number;
  todayOutputMetres: number;
  currentWorkOrder?: {
    id: string;
    orderId: string;
    orderNo: string;
    buyerName: string;
    stage: string;
    plannedQtyMetres: number;
    producedQtyMetres: number;
    status: string;
  } | null;
  activeDowntime?: {
    id: string;
    reason: string;
    startedAt: string;
  } | null;
}

interface QueuedWorkOrder {
  id: string;
  orderId: string;
  orderNo: string;
  buyerName: string;
  stage: string;
  plannedQtyMetres: number;
  producedQtyMetres: number;
  status: string;
  canStart: boolean;
  blockReason?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  department: string;
}

interface ProductionBoardClientProps {
  machines: MachineData[];
  workQueue: QueuedWorkOrder[];
  employees: EmployeeOption[];
}

export default function ProductionBoardClient({
  machines,
  workQueue,
  employees,
}: ProductionBoardClientProps) {
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modals
  const [assignModalWO, setAssignModalWO] = useState<QueuedWorkOrder | null>(null);
  const [logOutputWO, setLogOutputWO] = useState<any | null>(null);
  const [completeStageWO, setCompleteStageWO] = useState<any | null>(null);
  const [breakdownMachine, setBreakdownMachine] = useState<MachineData | null>(null);
  const [reassignWO, setReassignWO] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredMachines = machines.filter(
    (m) => typeFilter === "ALL" || m.type === typeFilter
  );

  const runningCount = machines.filter((m) => m.status === "RUNNING").length;
  const idleCount = machines.filter((m) => m.status === "IDLE").length;
  const downCount = machines.filter((m) => m.status === "BREAKDOWN").length;

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await assignMachineAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setAssignModalWO(null);
      window.location.reload();
    }
  };

  const handleLogSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await logOutputAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setLogOutputWO(null);
      window.location.reload();
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await completeStageAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setCompleteStageWO(null);
      window.location.reload();
    }
  };

  const handleBreakdownSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await reportBreakdownAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setBreakdownMachine(null);
      window.location.reload();
    }
  };

  const handleResolveBreakdown = async (machineId: string) => {
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("machineId", machineId);
    const res = await resolveBreakdownAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await reassignWorkOrderAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setReassignWO(null);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#176B63]" />
            Production Floor & Machine Board
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Real-time machine telemetry, active stage progress, work order queues, and output logging.
          </p>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-[#277653] font-bold border border-green-200">
            <span className="w-2 h-2 rounded-full bg-[#277653]"></span>
            {runningCount} Running
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 text-[#617078] font-bold border border-[#DCE3E1]">
            <span className="w-2 h-2 rounded-full bg-[#617078]"></span>
            {idleCount} Idle
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-[#B44545] font-bold border border-red-200">
            <span className="w-2 h-2 rounded-full bg-[#B44545]"></span>
            {downCount} Down
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-[#B44545] rounded-md text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Machine Type Filter */}
      <div className="flex items-center gap-2 border-b border-[#DCE3E1] pb-2 text-xs">
        {["ALL", "SPINNING", "WEAVING", "DYEING"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              typeFilter === t
                ? "bg-[#172D38] text-white"
                : "text-[#617078] hover:text-[#202B32] hover:bg-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Machine Cards Grid (Section 7.5 Machine Board) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMachines.map((m) => {
          const wo = m.currentWorkOrder;
          const stageProgress = wo && wo.plannedQtyMetres > 0
            ? Math.min(100, Math.round((wo.producedQtyMetres / wo.plannedQtyMetres) * 100))
            : 0;

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-lg p-4 shadow-xs flex flex-col justify-between transition-all ${
                m.status === "RUNNING"
                  ? "border-[#176B63]/40"
                  : m.status === "BREAKDOWN"
                  ? "border-red-300 bg-red-50/20"
                  : "border-[#DCE3E1]"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#DCE3E1]">
                  <span className="font-mono-id text-base font-bold text-[#176B63]">{m.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.status === "RUNNING"
                        ? "bg-green-100 text-[#277653]"
                        : m.status === "IDLE"
                        ? "bg-gray-100 text-[#617078]"
                        : "bg-red-100 text-[#B44545]"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#617078]">
                  <span>Type: <strong className="text-[#202B32]">{m.type}</strong></span>
                  <span className="font-mono-id">Today: <strong>{m.todayOutputMetres} m</strong></span>
                </div>

                {/* Active Work Order / Breakdown Info */}
                {m.status === "BREAKDOWN" ? (
                  <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-center gap-1 text-[#B44545] font-bold text-[11px] uppercase">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Breakdown Active
                    </div>
                    <p className="text-[11px] text-[#202B32] mt-1 font-medium">
                      {m.activeDowntime?.reason || "Under unscheduled maintenance"}
                    </p>
                    <button
                      onClick={() => handleResolveBreakdown(m.id)}
                      disabled={loading}
                      className="mt-2 w-full py-1 bg-white border border-red-300 hover:bg-red-50 text-[#B44545] font-semibold text-[11px] rounded transition-colors"
                    >
                      Resolve Breakdown & Set Idle
                    </button>
                  </div>
                ) : wo ? (
                  <div className="mt-3 p-2.5 bg-[#F9FAFA] border border-[#DCE3E1] rounded text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/orders/${wo.orderId}`}
                        className="font-mono-id font-bold text-[#176B63] hover:underline"
                      >
                        {wo.orderNo}
                      </Link>
                      <span className="text-[10px] text-[#617078] font-semibold uppercase">{wo.stage}</span>
                    </div>

                    {/* Stage Progress Bar (Labelled "Stage progress" per Section 7.5 & BR-25) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#617078] mb-0.5 font-mono-id">
                        <span>Stage progress</span>
                        <span className="font-bold text-[#202B32]">{stageProgress}%</span>
                      </div>
                      <div className="w-full bg-[#E5EAE8] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#176B63] h-full rounded-full transition-all"
                          style={{ width: `${stageProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-[#617078] mt-0.5 font-mono-id">
                        {wo.producedQtyMetres} m / {wo.plannedQtyMetres} m
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-center py-4 text-xs text-[#617078] bg-[#F9FAFA] rounded border border-dashed border-[#DCE3E1]">
                    No active job. Machine is IDLE and available for allocation.
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="mt-3 pt-2 border-t border-[#DCE3E1] flex items-center justify-between gap-1 text-xs">
                {wo && (
                  <>
                    <button
                      onClick={() => setLogOutputWO(wo)}
                      className="px-2 py-1 text-[11px] font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded transition-colors"
                    >
                      Log Output
                    </button>

                    <button
                      onClick={() => setCompleteStageWO(wo)}
                      className="px-2 py-1 text-[11px] font-semibold text-[#277653] hover:bg-green-50 rounded transition-colors"
                    >
                      Complete
                    </button>
                  </>
                )}

                {m.status !== "BREAKDOWN" && (
                  <button
                    onClick={() => setBreakdownMachine(m)}
                    className="ml-auto px-2 py-1 text-[11px] font-semibold text-[#B44545] hover:bg-red-50 rounded transition-colors"
                  >
                    Report Down
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Work Queue (Confirmed Orders Ready for Next Stage) */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#176B63]" />
              Production Work Queue (Awaiting Machine Assignment)
            </h2>
            <p className="text-[11px] text-[#617078] mt-0.5">
              Orders requiring machines for Spinning, Weaving, or Dyeing. Stage precedence is strictly enforced (BR-08).
            </p>
          </div>
          <span className="text-xs font-mono-id text-[#617078]">{workQueue.length} jobs in queue</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Order No</th>
                <th className="py-2.5 px-4">Buyer</th>
                <th className="py-2.5 px-4">Stage</th>
                <th className="py-2.5 px-4 text-right">Planned (m)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3E1]">
              {workQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#617078]">
                    No unassigned work orders in the queue.
                  </td>
                </tr>
              ) : (
                workQueue.map((wq) => (
                  <tr key={wq.id} className="hover:bg-[#F9FAFA]">
                    <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                      <Link href={`/orders/${wq.orderId}`} className="hover:underline flex items-center gap-1">
                        {wq.orderNo}
                        <ExternalLink className="w-3 h-3 text-[#617078]" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#202B32]">{wq.buyerName}</td>
                    <td className="py-3 px-4 font-semibold text-[#202B32]">{wq.stage}</td>
                    <td className="py-3 px-4 text-right font-mono-id text-[#202B32]">{wq.plannedQtyMetres} m</td>
                    <td className="py-3 px-4 text-center">
                      {wq.status === "BLOCKED" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#B44545] uppercase">
                          BLOCKED
                        </span>
                      ) : wq.canStart ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-[#277653] uppercase">
                          Ready to Assign
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-[#617078] uppercase" title={wq.blockReason}>
                          Waiting Preceding Stage
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {wq.status === "BLOCKED" ? (
                        <button
                          onClick={() => setReassignWO(wq)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs shadow-xs"
                        >
                          Reassign Machine
                        </button>
                      ) : wq.canStart ? (
                        <button
                          onClick={() => setAssignModalWO(wq)}
                          className="px-2.5 py-1 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded text-xs shadow-xs"
                        >
                          Assign Machine (BR-09)
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#617078] italic">
                          {wq.blockReason || "Stage locked"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Machine Modal (BR-09) */}
      {assignModalWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              Assign Machine to {assignModalWO.stage} Stage
            </h3>
            <p className="text-[#617078] mb-4">
              Order <strong>{assignModalWO.orderNo}</strong> ({assignModalWO.buyerName}) · {assignModalWO.plannedQtyMetres} metres.
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <input type="hidden" name="workOrderId" value={assignModalWO.id} />

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Select Matching IDLE Machine *
                </label>
                <select
                  name="machineId"
                  required
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="">Select IDLE {assignModalWO.stage} Machine</option>
                  {machines
                    .filter((m) => m.type === assignModalWO.stage && m.status === "IDLE")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} (Hourly Rate: ₹{m.hourlyRate}/hr)
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-[#617078] mt-1">
                  Only IDLE machines matching stage type {assignModalWO.stage} can be assigned (BR-09).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setAssignModalWO(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Assigning..." : "Assign Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Output Dialog (BR-10) */}
      {logOutputWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2">
              Log Production Output
            </h3>
            <p className="text-[#617078] mb-4">
              Order <strong>{logOutputWO.orderNo}</strong> ({logOutputWO.stage} Stage). Produced so far: {logOutputWO.producedQtyMetres} / {logOutputWO.plannedQtyMetres} m.
            </p>

            <form onSubmit={handleLogSubmit} className="space-y-3.5">
              <input type="hidden" name="workOrderId" value={logOutputWO.id} />

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Operator / Employee *
                </label>
                <select
                  name="employeeId"
                  required
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="">Select Operator</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Metres Produced *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="qtyMetres"
                    required
                    placeholder="e.g. 150"
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Hours Worked *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    name="hours"
                    required
                    placeholder="e.g. 6.5"
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Shift *
                </label>
                <select
                  name="shift"
                  required
                  defaultValue="MORNING"
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="MORNING">Morning Shift</option>
                  <option value="EVENING">Evening Shift</option>
                  <option value="NIGHT">Night Shift</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setLogOutputWO(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Record Output (BR-10)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Stage Action Dialog (BR-11 for Spinning consumption) */}
      {completeStageWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#277653] uppercase tracking-wider mb-2">
              Complete {completeStageWO.stage} Stage
            </h3>
            <p className="text-[#617078] mb-4">
              Completing this stage releases the machine back to IDLE.
            </p>

            <form onSubmit={handleCompleteSubmit} className="space-y-3.5">
              <input type="hidden" name="workOrderId" value={completeStageWO.id} />
              <input type="hidden" name="stage" value={completeStageWO.stage} />

              {completeStageWO.stage === "SPINNING" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-2">
                  <div className="font-bold text-[#A86F1F] uppercase text-[11px]">
                    BR-11: FIFO Yarn Consumption
                  </div>
                  <p className="text-[11px] text-[#202B32]">
                    Completing Spinning will release the order reservation and post CONSUME movements from the oldest lots.
                  </p>
                  <div>
                    <label className="block font-semibold text-[#202B32] mb-1">
                      Actual Yarn Consumed (kg):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="actualKgUsed"
                      placeholder="Leave empty for reserved default"
                      className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded bg-white text-[#202B32]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setCompleteStageWO(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#277653] hover:bg-green-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Completing..." : "Complete Stage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Breakdown Modal (BR-12) */}
      {breakdownMachine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#B44545] uppercase tracking-wider mb-2">
              Report Breakdown on {breakdownMachine.code}
            </h3>
            <p className="text-[#617078] mb-4">
              Marking BREAKDOWN opens a MachineDowntime record and sets any active work order to BLOCKED (BR-12).
            </p>

            <form onSubmit={handleBreakdownSubmit} className="space-y-3.5">
              <input type="hidden" name="machineId" value={breakdownMachine.id} />

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Reason for Breakdown (min 3 chars) *
                </label>
                <textarea
                  name="reason"
                  rows={2}
                  required
                  placeholder="e.g. Needle bar jamming and lubrication pump alarm"
                  className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setBreakdownMachine(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#B44545] hover:bg-red-700 text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Confirm Breakdown"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Blocked Work Order Modal (BR-12) */}
      {reassignWO && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">
              Reassign Blocked Work Order
            </h3>
            <p className="text-[#617078] mb-4">
              Order <strong>{reassignWO.orderNo}</strong> ({reassignWO.stage} Stage). Select an alternate IDLE machine of the same type.
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-3.5">
              <input type="hidden" name="workOrderId" value={reassignWO.id} />

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Select Alternate IDLE Machine *
                </label>
                <select
                  name="newMachineId"
                  required
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="">Select IDLE Machine</option>
                  {machines
                    .filter((m) => m.type === reassignWO.stage && m.status === "IDLE")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} ({m.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setReassignWO(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading ? "Reassigning..." : "Reassign & Resume"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
