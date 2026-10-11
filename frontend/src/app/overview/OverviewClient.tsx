"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Truck,
  ClipboardList,
  ExternalLink,
  Info,
  Activity,
  ArrowRight,
} from "lucide-react";
import { NotificationItem } from "@/services/notificationService";
import Pagination from "@/components/Pagination";

interface SummaryTiles {
  activeOrdersCount: number;
  atRiskOrdersCount: number;
  pendingInspectionsCount: number;
  readyToShipCount: number;
  finishedMetresOnShelf: number;
  machinesRunning: number;
  machinesIdle: number;
  machinesDown: number;
}

interface PipelineCounts {
  spinning: number;
  weaving: number;
  dyeing: number;
  qc: number;
  ready: number;
}

interface MachineOutputToday {
  code: string;
  type: string;
  outputMetres: number;
}

interface FloorEvent {
  id: string;
  type: "PRODUCTION" | "QC" | "STOCK" | "DISPATCH";
  title: string;
  description: string;
  timestamp: string;
  link: string;
}

interface OverviewClientProps {
  attentionItems: NotificationItem[];
  totalAttentionItems?: number;
  summaryTiles: SummaryTiles;
  pipeline: PipelineCounts;
  todayOutputs: MachineOutputToday[];
  recentEvents: FloorEvent[];
  userRole: string;
  attendanceData?: any[];
}

export default function OverviewClient({
  attentionItems,
  totalAttentionItems,
  summaryTiles,
  pipeline,
  todayOutputs,
  recentEvents,
  userRole,
  attendanceData = [],
}: OverviewClientProps) {
  const [tiles, setTiles] = React.useState<SummaryTiles>(summaryTiles);
  const [pipe, setPipe] = React.useState<PipelineCounts>(pipeline);
  const [attItems, setAttItems] = React.useState<NotificationItem[]>(attentionItems);
  const [totalAttCount, setTotalAttCount] = React.useState<number>(
    totalAttentionItems !== undefined ? totalAttentionItems : attentionItems.length
  );
  const [outputs, setOutputs] = React.useState<MachineOutputToday[]>(todayOutputs);
  const [events, setEvents] = React.useState<FloorEvent[]>(recentEvents);
  const [attendance, setAttendance] = React.useState<any[]>(attendanceData);

  React.useEffect(() => {
    setTiles(summaryTiles);
    setPipe(pipeline);
    setAttItems(attentionItems);
    if (totalAttentionItems !== undefined) {
      setTotalAttCount(totalAttentionItems);
    } else {
      setTotalAttCount(attentionItems.length);
    }
    setOutputs(todayOutputs);
    setEvents(recentEvents);
    setAttendance(attendanceData);
  }, [summaryTiles, pipeline, attentionItems, totalAttentionItems, todayOutputs, recentEvents, attendanceData]);

  React.useEffect(() => {
    async function fetchLiveData() {
      try {
        const { apiClient } = await import("@/lib/apiClient");
        const [overviewRes, peopleRes] = await Promise.all([
          apiClient.get<any>("/overview").catch(() => null),
          apiClient.get<any>("/people").catch(() => null),
        ]);
        if (overviewRes) {
          if (overviewRes.summaryTiles) setTiles(overviewRes.summaryTiles);
          if (overviewRes.pipeline) setPipe(overviewRes.pipeline);
          if (overviewRes.attentionItems) setAttItems(overviewRes.attentionItems);
          if (overviewRes.totalAttentionItems !== undefined) setTotalAttCount(overviewRes.totalAttentionItems);
          if (overviewRes.todayOutputs) setOutputs(overviewRes.todayOutputs);
          if (overviewRes.recentEvents) setEvents(overviewRes.recentEvents);
        }
        if (peopleRes && peopleRes.employees) {
          setAttendance(peopleRes.employees);
        }
      } catch (err) {
        console.error("Failed to load overview telemetry:", err);
      }
    }
    fetchLiveData();
  }, []);

  const [taskSortBy, setTaskSortBy] = React.useState<"severity" | "title" | "type">("severity");
  const [taskSortOrder, setTaskSortOrder] = React.useState<"asc" | "desc">("desc");
  const [attPage, setAttPage] = React.useState<number>(1);
  const [loadingAttItems, setLoadingAttItems] = React.useState<boolean>(false);

  const handleFetchAttPage = React.useCallback(async (targetPage: number, sortB = taskSortBy, sortO = taskSortOrder) => {
    setLoadingAttItems(true);
    try {
      const { apiClient } = await import("@/lib/apiClient");
      const res = await apiClient.get<any>(
        `/overview/action-required?page=${targetPage}&page_size=20&sort_by=${sortB}&sort_order=${sortO}`
      );
      if (res && res.items) {
        setAttItems(res.items);
        if (res.total !== undefined) setTotalAttCount(res.total);
        setAttPage(res.page || targetPage);
      }
    } catch (err: any) {
      console.warn("Failed to fetch paginated attention items:", err?.message || err);
    } finally {
      setLoadingAttItems(false);
    }
  }, [taskSortBy, taskSortOrder]);

  const sortedAttItems = React.useMemo(() => {
    const items = [...attItems];
    const sevMap: Record<string, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
    items.sort((a, b) => {
      let res = 0;
      if (taskSortBy === "title") {
        res = a.title.localeCompare(b.title);
      } else if (taskSortBy === "type") {
        res = a.type.localeCompare(b.type);
      } else {
        res = (sevMap[a.severity] || 0) - (sevMap[b.severity] || 0);
      }
      return taskSortOrder === "asc" ? res : -res;
    });
    return items;
  }, [attItems, taskSortBy, taskSortOrder]);

  const presentCount = attendance.filter((e: any) => e.currentAttendance?.status === 'PRESENT').length;
  const teamTotal = attendance.length;
  const attendanceRate = teamTotal > 0 ? Math.round((presentCount / teamTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Attendance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            Executive Overview
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            High-level summaries of production performance, inventory, dispatch, and company-wide attendance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded bg-blue-50 text-[var(--primary)] text-xs font-bold border border-blue-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
            Company Attendance: {presentCount} / {teamTotal} ({attendanceRate}%)
          </span>
        </div>
      </div>

      {/* 2. SUMMARY TILES (Section 7.2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Active Orders</span>
          <p className="text-2xl font-bold font-mono-id text-[var(--text-primary)] mt-1">{tiles.activeOrdersCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">In progress</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--critical)] block">Orders at Risk</span>
          <p className="text-2xl font-bold font-mono-id text-[var(--critical)] mt-1">{tiles.atRiskOrdersCount}</p>
          <span className="text-[10px] text-[var(--critical)]">Overdue / Bottleneck</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--info)] block">Pending Inspections</span>
          <p className="text-2xl font-bold font-mono-id text-[var(--info)] mt-1">{tiles.pendingInspectionsCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Rolls awaiting QC</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block">Ready to Ship</span>
          <p className="text-2xl font-bold font-mono-id text-[var(--primary)] mt-1">{tiles.readyToShipCount}</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Passed, in store</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)] block">Shelf Stock</span>
          <p className="text-2xl font-bold font-mono-id text-[var(--success)] mt-1">{tiles.finishedMetresOnShelf} m</p>
          <span className="text-[10px] text-[var(--text-secondary)]">Finished fabric</span>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] block">Machines</span>
          <p className="text-xs font-mono-id font-bold text-[var(--text-primary)] mt-2">
            <span className="text-[var(--success)]">{tiles.machinesRunning} Run</span> ·{" "}
            <span className="text-[var(--text-secondary)]">{tiles.machinesIdle} Idle</span> ·{" "}
            <span className="text-[var(--critical)]">{tiles.machinesDown} Down</span>
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Floor utilization</span>
        </div>
      </div>

      {/* 1. ATTENTION STRIP TABLE (Most urgent first, Section 7.2) */}
      {sortedAttItems.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md overflow-hidden">
          <div className="px-4 py-3 bg-[rgba(255,77,77,0.1)] border-b border-[rgba(255,77,77,0.3)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--critical)]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--critical)]">
                Action Required ({attPage === 1 ? `Top ${Math.min(20, sortedAttItems.length)}` : `Page ${attPage} (${sortedAttItems.length} items)`} of {totalAttCount} Urgent Item{totalAttCount !== 1 ? "s" : ""})
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/overview/action-required"
                className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                View all ({totalAttCount}) →
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Sort Tasks:</span>
                <select
                  value={`${taskSortBy}-${taskSortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split("-") as ["severity" | "title" | "type", "asc" | "desc"];
                    setTaskSortBy(by);
                    setTaskSortOrder(order);
                    handleFetchAttPage(1, by, order);
                  }}
                  className="text-xs bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                >
                  <option value="severity-desc">Priority (Urgent First)</option>
                  <option value="severity-asc">Priority (Low First)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="type-asc">Category Type</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs border-collapse ${loadingAttItems ? "opacity-50 pointer-events-none" : ""}`}>
              <thead>
                <tr className="bg-[var(--sidebar-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3">Priority</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Task & Description</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedAttItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--sidebar-secondary)] transition-colors"
                  >
                    <td className="p-3 align-middle whitespace-nowrap">
                      {item.severity === "CRITICAL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(255,77,77,0.15)] text-[var(--critical)] border border-[rgba(255,77,77,0.3)]">
                          <AlertCircle className="w-3 h-3" /> CRITICAL
                        </span>
                      )}
                      {item.severity === "WARNING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(245,166,35,0.15)] text-[var(--warning)] border border-[rgba(245,166,35,0.3)]">
                          <AlertTriangle className="w-3 h-3" /> WARNING
                        </span>
                      )}
                      {item.severity === "INFO" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(58,141,212,0.15)] text-[var(--info)] border border-[rgba(58,141,212,0.3)]">
                          <Info className="w-3 h-3" /> INFO
                        </span>
                      )}
                    </td>

                    <td className="p-3 align-middle whitespace-nowrap">
                      <span className="font-mono-id text-[10px] font-bold text-[var(--primary)] px-2 py-0.5 rounded bg-blue-50/10 border border-blue-500/20">
                        {item.type}
                      </span>
                    </td>

                    <td className="p-3 align-middle">
                      <div className="font-bold text-[var(--text-primary)]">{item.title}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.description}</div>
                    </td>

                    <td className="p-3 align-middle text-right whitespace-nowrap">
                      <Link
                        href={item.link}
                        className="px-2.5 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[rgba(0,240,255,0.1)] rounded transition-colors inline-flex items-center gap-1"
                      >
                        Resolve →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalAttCount > 20 && (
            <div className="px-4 py-3 bg-[var(--surface-glass)] border-t border-[var(--border)]">
              <Pagination
                currentPage={attPage}
                pageSize={20}
                totalRecords={totalAttCount}
                loading={loadingAttItems}
                onPageChange={(p) => handleFetchAttPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. STAGE PIPELINE (Section 7.2) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[var(--primary)]" />
          Item 3: Factory Stage Pipeline (Orders in Flow)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[var(--background)] rounded border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] text-[11px] block">1. Spinning Stage</span>
            <span className="font-mono-id font-bold text-lg text-[var(--text-primary)]">{pipe.spinning}</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">Orders active</span>
          </div>

          <div className="p-3 bg-[var(--background)] rounded border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] text-[11px] block">2. Weaving Looms</span>
            <span className="font-mono-id font-bold text-lg text-[var(--text-primary)]">{pipe.weaving}</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">Orders active</span>
          </div>

          <div className="p-3 bg-[var(--background)] rounded border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] text-[11px] block">3. Dyeing Vats</span>
            <span className="font-mono-id font-bold text-lg text-[var(--text-primary)]">{pipe.dyeing}</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">Orders active</span>
          </div>

          <div className="p-3 bg-[rgba(58,141,212,0.1)] rounded border border-[rgba(58,141,212,0.3)]">
            <span className="text-[var(--info)] text-[11px] block">4. QC Examination</span>
            <span className="font-mono-id font-bold text-lg text-[var(--info)]">{pipe.qc}</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">Orders in check</span>
          </div>

          <div className="p-3 bg-green-50/50 rounded border border-green-200">
            <span className="text-[var(--success)] text-[11px] block">5. Ready for Shipping</span>
            <span className="font-mono-id font-bold text-lg text-[var(--success)]">{pipe.ready}</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">Cleared to dispatch</span>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. TODAY'S OUTPUT BY MACHINE (Section 7.2) */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[var(--primary)]" />
              Item 4: Today's Output by Machine (Real Metres Logged)
            </h2>
            <Link href="/production" className="text-xs font-semibold text-[var(--primary)] hover:underline">
              Floor Board →
            </Link>
          </div>

          <div className="space-y-2">
            {outputs.map((mach) => (
              <div
                key={mach.code}
                className="flex items-center justify-between p-2.5 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono-id font-bold text-[var(--primary)]">{mach.code}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase">{mach.type}</span>
                </div>
                <span className="font-mono-id font-bold text-[var(--text-primary)]">
                  {mach.outputMetres} metres
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. RECENT FLOOR EVENTS (Section 7.2) */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              Item 5: Recent Mill Events (Last 10 Logged Events)
            </h2>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {events.map((evt) => (
              <Link
                key={evt.id}
                href={evt.link}
                className="block p-2.5 hover:bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded transition-colors text-xs"
              >
                <div className="flex items-center justify-between font-mono-id text-[10px] text-[var(--text-secondary)] mb-1">
                  <span className="font-bold text-[var(--primary)]">{evt.type}</span>
                  <span>{evt.timestamp}</span>
                </div>
                <div className="font-semibold text-[var(--text-primary)]">{evt.title}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{evt.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
