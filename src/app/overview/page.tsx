import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import { calculateOrderRisk } from "@/services/financeService";
import AppShell from "@/components/layout/AppShell";
import OverviewClient from "./OverviewClient";

export default async function OverviewPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Orders and Risk
  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
      fabricType: true,
      workOrders: true,
      rolls: { include: { dispatchLine: true } },
    },
  });

  let activeOrdersCount = 0;
  let atRiskOrdersCount = 0;
  let readyToShipCount = 0;

  for (const ord of orders) {
    if (!["COMPLETED", "CANCELLED"].includes(ord.status)) {
      activeOrdersCount++;
    }
    if (ord.status === "READY_TO_SHIP") {
      readyToShipCount++;
    }
    const risk = await calculateOrderRisk(ord, now);
    if (risk.risk !== "ON_TRACK") {
      atRiskOrdersCount++;
    }
  }

  // 2. Pending inspections
  const pendingInspectionsCount = await prisma.roll.count({
    where: { qcStatus: { in: ["PENDING", "REWORK"] }, stockStatus: "IN_STORE" },
  });

  // 3. Finished metres on shelf
  const shelfRolls = await prisma.roll.findMany({
    where: { qcStatus: "PASSED", stockStatus: "IN_STORE" },
    select: { lengthMetres: true },
  });
  const finishedMetresOnShelf = shelfRolls.reduce((a, r) => a + r.lengthMetres, 0);

  // 4. Machine Status counts
  const machines = await prisma.machine.findMany();
  const machinesRunning = machines.filter((m) => m.status === "RUNNING").length;
  const machinesIdle = machines.filter((m) => m.status === "IDLE").length;
  const machinesDown = machines.filter((m) => m.status === "BREAKDOWN").length;

  // 5. Stage pipeline counts
  const pipeline = {
    spinning: orders.filter((o) => o.status === "IN_PRODUCTION" && o.currentStage === "SPINNING").length,
    weaving: orders.filter((o) => o.status === "IN_PRODUCTION" && o.currentStage === "WEAVING").length,
    dyeing: orders.filter((o) => o.status === "IN_PRODUCTION" && o.currentStage === "DYEING").length,
    qc: orders.filter((o) => o.status === "IN_QC").length,
    ready: readyToShipCount,
  };

  // 6. Today's output by machine
  const todayLogs = await prisma.productionLog.findMany({
    where: { loggedAt: { gte: todayStart } },
    include: { workOrder: true },
  });
  const todayMap = new Map<string, number>();
  for (const log of todayLogs) {
    if (log.workOrder.machineId) {
      const cur = todayMap.get(log.workOrder.machineId) || 0;
      todayMap.set(log.workOrder.machineId, cur + log.qtyMetres);
    }
  }

  const todayOutputs = machines.map((m) => ({
    code: m.code,
    type: m.type,
    outputMetres: Math.round((todayMap.get(m.id) || 0) * 10) / 10,
  }));

  // 7. Recent floor events (last 10 real events from ProductionLog, QCRecord, StockMovement, Dispatch)
  const recentLogs = await prisma.productionLog.findMany({
    take: 5,
    orderBy: { loggedAt: "desc" },
    include: {
      workOrder: { include: { order: true } },
      employee: true,
    },
  });

  const recentQCs = await prisma.qCRecord.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { roll: true },
  });

  const recentDispatches = await prisma.dispatch.findMany({
    take: 5,
    orderBy: { dispatchedAt: "desc" },
    include: { lines: true, order: true },
  });

  const events: Array<{
    id: string;
    type: "PRODUCTION" | "QC" | "STOCK" | "DISPATCH";
    title: string;
    description: string;
    date: Date;
    link: string;
  }> = [];

  for (const l of recentLogs) {
    events.push({
      id: `p-${l.id}`,
      type: "PRODUCTION",
      title: `${l.qtyMetres} m output logged on ${l.workOrder.stage}`,
      description: `Order ${l.workOrder.order.orderNo} by ${l.employee.name} (${l.hours} hrs, ${l.shift} shift)`,
      date: l.loggedAt,
      link: "/production",
    });
  }

  for (const q of recentQCs) {
    events.push({
      id: `q-${q.id}`,
      type: "QC",
      title: `Roll ${q.roll.rollNo} marked ${q.result}`,
      description: q.defectType
        ? `Defect: ${q.defectType} (${q.severity}) · Notes: ${q.notes || "None"}`
        : "Passed inspection standards",
      date: q.createdAt,
      link: `/rolls/${q.roll.id}`,
    });
  }

  for (const d of recentDispatches) {
    events.push({
      id: `d-${d.id}`,
      type: "DISPATCH",
      title: `Consignment ${d.dispatchNo} shipped`,
      description: `${d.lines.length} rolls on truck ${d.truckNo} for Order ${d.order.orderNo}`,
      date: d.dispatchedAt,
      link: "/dispatch",
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentEvents = events.slice(0, 10).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    description: e.description,
    timestamp: e.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    link: e.link,
  }));

  return (
    <AppShell user={user} notifications={notifications}>
      <OverviewClient
        attentionItems={notifications}
        summaryTiles={{
          activeOrdersCount,
          atRiskOrdersCount,
          pendingInspectionsCount,
          readyToShipCount,
          finishedMetresOnShelf,
          machinesRunning,
          machinesIdle,
          machinesDown,
        }}
        pipeline={pipeline}
        todayOutputs={todayOutputs}
        recentEvents={recentEvents}
        userRole={user.role}
      />
    </AppShell>
  );
}
