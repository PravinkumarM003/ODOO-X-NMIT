import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import ProductionBoardClient from "./ProductionBoardClient";

export default async function ProductionPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();

  // Start of today in UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const machines = await prisma.machine.findMany({
    include: {
      workOrders: {
        where: { status: { in: ["IN_PROGRESS", "BLOCKED"] } },
        include: {
          order: {
            include: { buyer: true },
          },
        },
      },
      downtimes: {
        where: { endedAt: null },
        orderBy: { startedAt: "desc" },
      },
    },
    orderBy: { code: "asc" },
  });

  // Calculate today's output per machine
  const todayLogs = await prisma.productionLog.findMany({
    where: { loggedAt: { gte: todayStart } },
    include: {
      workOrder: true,
    },
  });

  const machineOutputTodayMap = new Map<string, number>();
  for (const log of todayLogs) {
    if (log.workOrder.machineId) {
      const current = machineOutputTodayMap.get(log.workOrder.machineId) || 0;
      machineOutputTodayMap.set(log.workOrder.machineId, current + log.qtyMetres);
    }
  }

  const machinesData = machines.map((m) => {
    const activeWO = m.workOrders[0] || null;
    const activeDowntime = m.downtimes[0] || null;

    return {
      id: m.id,
      code: m.code,
      type: m.type,
      status: m.status,
      hourlyRate: m.hourlyRate,
      todayOutputMetres: Math.round((machineOutputTodayMap.get(m.id) || 0) * 10) / 10,
      currentWorkOrder: activeWO
        ? {
            id: activeWO.id,
            orderId: activeWO.orderId,
            orderNo: activeWO.order.orderNo,
            buyerName: activeWO.order.buyer.name,
            stage: activeWO.stage,
            plannedQtyMetres: activeWO.plannedQtyMetres,
            producedQtyMetres: activeWO.producedQtyMetres,
            status: activeWO.status,
          }
        : null,
      activeDowntime: activeDowntime
        ? {
            id: activeDowntime.id,
            reason: activeDowntime.reason,
            startedAt: activeDowntime.startedAt.toISOString(),
          }
        : null,
    };
  });

  // Fetch unassigned work orders (status NOT_STARTED or BLOCKED)
  const unassignedWOs = await prisma.workOrder.findMany({
    where: {
      status: { in: ["NOT_STARTED", "BLOCKED"] },
      order: {
        status: { in: ["CONFIRMED", "IN_PRODUCTION"] },
      },
    },
    include: {
      order: {
        include: {
          buyer: true,
          workOrders: true,
        },
      },
    },
    orderBy: { order: { deadline: "asc" } },
  });

  const workQueueData = unassignedWOs.map((wo) => {
    let canStart = false;
    let blockReason: string | undefined = undefined;

    if (wo.status === "BLOCKED") {
      canStart = false;
      blockReason = "Machine is in Breakdown";
    } else if (wo.stage === "SPINNING") {
      canStart = true;
    } else if (wo.stage === "WEAVING") {
      const spinningWO = wo.order.workOrders.find((w) => w.stage === "SPINNING");
      if (spinningWO && spinningWO.status === "COMPLETED") {
        canStart = true;
      } else {
        blockReason = "Spinning stage not yet completed";
      }
    } else if (wo.stage === "DYEING") {
      const weavingWO = wo.order.workOrders.find((w) => w.stage === "WEAVING");
      if (weavingWO && weavingWO.status === "COMPLETED") {
        canStart = true;
      } else {
        blockReason = "Weaving stage not yet completed";
      }
    }

    return {
      id: wo.id,
      orderId: wo.orderId,
      orderNo: wo.order.orderNo,
      buyerName: wo.order.buyer.name,
      stage: wo.stage,
      plannedQtyMetres: wo.plannedQtyMetres,
      producedQtyMetres: wo.producedQtyMetres,
      status: wo.status,
      canStart,
      blockReason,
    };
  });

  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={user} notifications={notifications}>
      <ProductionBoardClient
        machines={machinesData}
        workQueue={workQueueData}
        employees={employees}
      />
    </AppShell>
  );
}
