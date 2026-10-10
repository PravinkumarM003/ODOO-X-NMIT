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
  summaryTiles: SummaryTiles;
  pipeline: PipelineCounts;
  todayOutputs: MachineOutputToday[];
  recentEvents: FloorEvent[];
  userRole: string;
}

export default function OverviewClient({
  attentionItems,
  summaryTiles,
  pipeline,
  todayOutputs,
  recentEvents,
  userRole,
}: OverviewClientProps) {
  return (
    <div className="space-y-6">
      {/* 1. ATTENTION STRIP (Most urgent first, Section 7.2) */}
      {attentionItems.length > 0 && (
        <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-red-50/70 border-b border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#B44545]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#B44545]">
                Action Required ({attentionItems.length} Urgent Item{attentionItems.length > 1 ? "s" : ""})
              </h2>
            </div>
            <span className="text-[11px] text-[#617078]">Floor walks replaced by live telemetry</span>
          </div>

          <div className="divide-y divide-[#DCE3E1]">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 hover:bg-[#F9FAFA] transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  {item.severity === "CRITICAL" && (
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[#B44545] flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {item.severity === "WARNING" && (
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[#A86F1F] flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {item.severity === "INFO" && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[#54758A] flex-shrink-0 mt-0.5">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div>
                    <span className="font-bold text-[#202B32]">{item.title}</span>
                    <p className="text-[11px] text-[#617078] mt-0.5">{item.description}</p>
                  </div>
                </div>

                <Link
                  href={item.link}
                  className="px-2.5 py-1 text-xs font-semibold text-[#176B63] hover:bg-[#EBF3F1] rounded transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  Resolve →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SUMMARY TILES (Section 7.2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#617078] block">Active Orders</span>
          <p className="text-2xl font-bold font-mono-id text-[#202B32] mt-1">{summaryTiles.activeOrdersCount}</p>
          <span className="text-[10px] text-[#617078]">In progress</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B44545] block">Orders at Risk</span>
          <p className="text-2xl font-bold font-mono-id text-[#B44545] mt-1">{summaryTiles.atRiskOrdersCount}</p>
          <span className="text-[10px] text-[#B44545]">Overdue / Bottleneck</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#54758A] block">Pending Inspections</span>
          <p className="text-2xl font-bold font-mono-id text-[#54758A] mt-1">{summaryTiles.pendingInspectionsCount}</p>
          <span className="text-[10px] text-[#617078]">Rolls awaiting QC</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B63] block">Ready to Ship</span>
          <p className="text-2xl font-bold font-mono-id text-[#176B63] mt-1">{summaryTiles.readyToShipCount}</p>
          <span className="text-[10px] text-[#617078]">Passed, in store</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#277653] block">Shelf Stock</span>
          <p className="text-2xl font-bold font-mono-id text-[#277653] mt-1">{summaryTiles.finishedMetresOnShelf} m</p>
          <span className="text-[10px] text-[#617078]">Finished fabric</span>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#202B32] block">Machines</span>
          <p className="text-xs font-mono-id font-bold text-[#202B32] mt-2">
            <span className="text-[#277653]">{summaryTiles.machinesRunning} Run</span> ·{" "}
            <span className="text-[#617078]">{summaryTiles.machinesIdle} Idle</span> ·{" "}
            <span className="text-[#B44545]">{summaryTiles.machinesDown} Down</span>
          </p>
          <span className="text-[10px] text-[#617078]">Floor utilization</span>
        </div>
      </div>

      {/* 3. STAGE PIPELINE (Section 7.2) */}
      <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] mb-3 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#176B63]" />
          Item 3: Factory Stage Pipeline (Orders in Flow)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#F4F6F5] rounded border border-[#DCE3E1]">
            <span className="text-[#617078] text-[11px] block">1. Spinning Stage</span>
            <span className="font-mono-id font-bold text-lg text-[#202B32]">{pipeline.spinning}</span>
            <span className="text-[10px] text-[#617078] block">Orders active</span>
          </div>

          <div className="p-3 bg-[#F4F6F5] rounded border border-[#DCE3E1]">
            <span className="text-[#617078] text-[11px] block">2. Weaving Looms</span>
            <span className="font-mono-id font-bold text-lg text-[#202B32]">{pipeline.weaving}</span>
            <span className="text-[10px] text-[#617078] block">Orders active</span>
          </div>

          <div className="p-3 bg-[#F4F6F5] rounded border border-[#DCE3E1]">
            <span className="text-[#617078] text-[11px] block">3. Dyeing Vats</span>
            <span className="font-mono-id font-bold text-lg text-[#202B32]">{pipeline.dyeing}</span>
            <span className="text-[10px] text-[#617078] block">Orders active</span>
          </div>

          <div className="p-3 bg-blue-50/50 rounded border border-blue-200">
            <span className="text-[#54758A] text-[11px] block">4. QC Examination</span>
            <span className="font-mono-id font-bold text-lg text-[#54758A]">{pipeline.qc}</span>
            <span className="text-[10px] text-[#617078] block">Orders in check</span>
          </div>

          <div className="p-3 bg-green-50/50 rounded border border-green-200">
            <span className="text-[#277653] text-[11px] block">5. Ready for Shipping</span>
            <span className="font-mono-id font-bold text-lg text-[#277653]">{pipeline.ready}</span>
            <span className="text-[10px] text-[#617078] block">Cleared to dispatch</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. TODAY'S OUTPUT BY MACHINE (Section 7.2) */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E1] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#176B63]" />
              Item 4: Today's Output by Machine (Real Metres Logged)
            </h2>
            <Link href="/production" className="text-xs font-semibold text-[#176B63] hover:underline">
              Floor Board →
            </Link>
          </div>

          <div className="space-y-2">
            {todayOutputs.map((mach) => (
              <div
                key={mach.code}
                className="flex items-center justify-between p-2.5 bg-[#F9FAFA] border border-[#DCE3E1] rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono-id font-bold text-[#176B63]">{mach.code}</span>
                  <span className="text-[10px] text-[#617078] uppercase">{mach.type}</span>
                </div>
                <span className="font-mono-id font-bold text-[#202B32]">
                  {mach.outputMetres} metres
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. RECENT FLOOR EVENTS (Section 7.2) */}
        <div className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE3E1] mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#176B63]" />
              Item 5: Recent Mill Events (Last 10 Logged Events)
            </h2>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {recentEvents.map((evt) => (
              <Link
                key={evt.id}
                href={evt.link}
                className="block p-2.5 hover:bg-[#F9FAFA] border border-[#DCE3E1] rounded transition-colors text-xs"
              >
                <div className="flex items-center justify-between font-mono-id text-[10px] text-[#617078] mb-1">
                  <span className="font-bold text-[#176B63]">{evt.type}</span>
                  <span>{evt.timestamp}</span>
                </div>
                <div className="font-semibold text-[#202B32]">{evt.title}</div>
                <div className="text-[11px] text-[#617078] mt-0.5">{evt.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
