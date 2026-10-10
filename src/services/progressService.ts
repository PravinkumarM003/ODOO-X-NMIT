import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type OrderProgressResult = {
  orderId: string;
  // 1. Production progress
  productionProgressPercent: number; // 0 - 100
  totalPlannedMetres: number;
  totalProducedMetres: number;
  workOrdersBreakdown: Array<{
    stage: string;
    plannedMetres: number;
    producedMetres: number;
    status: string;
    machineCode?: string | null;
  }>;

  // 2. QC readiness
  qcReadiness: {
    statusText: string;
    qcResolvedPercent: number | null; // null if not started
    registeredRollCount: number;
    registeredRollMetres: number;
    passedCount: number;
    passedMetres: number;
    reworkCount: number;
    reworkMetres: number;
    rejectedCount: number;
    rejectedMetres: number;
    pendingCount: number;
    pendingMetres: number;
  };

  // 3. Dispatch completion
  dispatchCompletion: {
    dispatchPercent: number;
    dispatchedMetres: number;
    orderQtyMetres: number;
    summaryText: string;
    shortfallNote?: string | null;
  };
};

export async function getOrderProgress(
  orderId: string,
  tx?: Prisma.TransactionClient
): Promise<OrderProgressResult> {
  const db = tx || prisma;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      workOrders: {
        include: {
          machine: true,
        },
      },
      rolls: {
        include: {
          dispatchLine: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // 1. Production Progress
  const workOrders = order.workOrders;
  let productionProgressPercent = 0;
  let totalPlanned = 0;
  let totalProducedCapped = 0;
  let rawTotalProduced = 0;

  if (workOrders.length > 0) {
    for (const wo of workOrders) {
      totalPlanned += wo.plannedQtyMetres;
      totalProducedCapped += Math.min(wo.producedQtyMetres, wo.plannedQtyMetres);
      rawTotalProduced += wo.producedQtyMetres;
    }
    if (totalPlanned > 0) {
      productionProgressPercent = Math.min(100, Math.round((totalProducedCapped / totalPlanned) * 100));
    }
  }

  const workOrdersBreakdown = workOrders.map((wo) => ({
    stage: wo.stage,
    plannedMetres: wo.plannedQtyMetres,
    producedMetres: wo.producedQtyMetres,
    status: wo.status,
    machineCode: wo.machine?.code || null,
  }));

  // 2. QC Readiness
  const rolls = order.rolls;
  const registeredCount = rolls.length;
  const registeredMetres = rolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  let passedCount = 0;
  let passedMetres = 0;
  let reworkCount = 0;
  let reworkMetres = 0;
  let rejectedCount = 0;
  let rejectedMetres = 0;
  let pendingCount = 0;
  let pendingMetres = 0;

  for (const r of rolls) {
    if (r.qcStatus === "PASSED") {
      passedCount++;
      passedMetres += r.lengthMetres;
    } else if (r.qcStatus === "REWORK") {
      reworkCount++;
      reworkMetres += r.lengthMetres;
    } else if (r.qcStatus === "REJECTED") {
      rejectedCount++;
      rejectedMetres += r.lengthMetres;
    } else {
      pendingCount++;
      pendingMetres += r.lengthMetres;
    }
  }

  let qcResolvedPercent: number | null = null;
  let qcStatusText = "Not started";

  if (registeredCount > 0) {
    const resolvedMetres = passedMetres + rejectedMetres;
    qcResolvedPercent = registeredMetres > 0 ? Math.round((resolvedMetres / registeredMetres) * 100) : 0;
    qcStatusText = `${qcResolvedPercent}% resolved (${passedCount} passed, ${reworkCount} rework, ${rejectedCount} rejected, ${pendingCount} pending)`;
  }

  // 3. Dispatch completion
  let dispatchedMetres = 0;
  for (const r of rolls) {
    if (r.dispatchLine) {
      dispatchedMetres += r.lengthMetres;
    }
  }

  const dispatchPercent = order.qtyMetres > 0 ? Math.min(100, Math.round((dispatchedMetres / order.qtyMetres) * 100)) : 0;
  let shortfallNote: string | null = null;
  if (order.status === "COMPLETED" && rejectedMetres > 0) {
    shortfallNote = `Delivered ${dispatchedMetres.toFixed(1)} of ${order.qtyMetres.toFixed(1)} m (${rejectedMetres.toFixed(1)} m rejected)`;
  }

  const summaryText = `${dispatchedMetres.toFixed(1)} m dispatched of ${order.qtyMetres.toFixed(1)} m ordered`;

  return {
    orderId: order.id,
    productionProgressPercent,
    totalPlannedMetres: totalPlanned,
    totalProducedMetres: rawTotalProduced,
    workOrdersBreakdown,
    qcReadiness: {
      statusText: qcStatusText,
      qcResolvedPercent,
      registeredRollCount: registeredCount,
      registeredRollMetres: registeredMetres,
      passedCount,
      passedMetres,
      reworkCount,
      reworkMetres,
      rejectedCount,
      rejectedMetres,
      pendingCount,
      pendingMetres,
    },
    dispatchCompletion: {
      dispatchPercent,
      dispatchedMetres,
      orderQtyMetres: order.qtyMetres,
      summaryText,
      shortfallNote,
    },
  };
}
