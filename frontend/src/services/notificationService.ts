import { prisma } from "@/lib/prisma";
import { getYarnStockSummary } from "./yarnService";
import { calculateOrderRisk } from "./financeService";

export type NotificationItem = {
  id: string;
  type: "OVERDUE" | "AT_RISK" | "BREAKDOWN" | "YARN_LOW" | "YARN_OUT" | "PENDING_QC" | "READY_DISPATCH" | "NEEDS_REVIEW" | "NO_SHIPPABLE_ROLLS";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  link: string;
  timestamp?: Date;
};

export async function getComputedNotifications(): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const now = new Date();

  // 1. Yarn Low & Out items
  const yarnItems = await prisma.yarnItem.findMany();
  for (const yarn of yarnItems) {
    const stock = await getYarnStockSummary(yarn.id);
    if (stock.health === "OUT") {
      items.push({
        id: `yarn-out-${yarn.id}`,
        type: "YARN_OUT",
        severity: "CRITICAL",
        title: `Yarn Out of Stock: ${yarn.code}`,
        description: `${yarn.yarnType} (${yarn.count}, ${yarn.colour}) has 0 kg available stock`,
        link: `/yarn/${yarn.id}`,
      });
    } else if (stock.health === "LOW") {
      items.push({
        id: `yarn-low-${yarn.id}`,
        type: "YARN_LOW",
        severity: "WARNING",
        title: `Low Yarn Stock: ${yarn.code}`,
        description: `Available ${stock.availableKg} kg is below reorder threshold (${stock.thresholdKg} kg)`,
        link: `/yarn/${yarn.id}`,
      });
    }
  }

  // 2. Machine Breakdowns
  const brokenMachines = await prisma.machine.findMany({
    where: { status: "BREAKDOWN" },
    include: {
      downtimes: { where: { endedAt: null }, orderBy: { startedAt: "desc" } },
    },
  });
  for (const mach of brokenMachines) {
    const reason = mach.downtimes[0]?.reason || "Machine fault reported";
    items.push({
      id: `breakdown-${mach.id}`,
      type: "BREAKDOWN",
      severity: "CRITICAL",
      title: `Machine Breakdown: ${mach.code}`,
      description: `${mach.type} machine down. Reason: ${reason}`,
      link: "/production",
    });
  }

  // 3. Orders: Needs Review, Overdue, At Risk, Ready to Ship, No Shippable rolls
  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
      workOrders: true,
      rolls: {
        include: { dispatchLine: true },
      },
    },
  });

  for (const ord of orders) {
    // Buyer submitted NEW orders awaiting review
    if (ord.status === "NEW") {
      items.push({
        id: `review-${ord.id}`,
        type: "NEEDS_REVIEW",
        severity: "WARNING",
        title: `Order Awaiting Review: ${ord.orderNo}`,
        description: `Submitted by ${ord.buyer.name} for ${ord.qtyMetres} m. Requires Office review`,
        link: `/orders/${ord.id}`,
      });
    }

    // Orders with no shippable rolls (all registered rolls rejected in QC)
    if (ord.rolls.length > 0 && ord.rolls.every((r) => r.qcStatus === "REJECTED")) {
      items.push({
        id: `no-ship-${ord.id}`,
        type: "NO_SHIPPABLE_ROLLS",
        severity: "CRITICAL",
        title: `All Rolls Rejected: ${ord.orderNo}`,
        description: `All ${ord.rolls.length} rolls failed QC. Zero shippable meters available`,
        link: `/orders/${ord.id}`,
      });
    }

    // Ready to ship
    if (ord.status === "READY_TO_SHIP") {
      items.push({
        id: `ready-${ord.id}`,
        type: "READY_DISPATCH",
        severity: "INFO",
        title: `Ready for Dispatch: ${ord.orderNo}`,
        description: `All QC inspections complete for ${ord.buyer.name}. Ready to schedule truck`,
        link: `/dispatch`,
      });
    }

    // Overdue or At risk
    const riskResult = await calculateOrderRisk(ord, now);
    if (riskResult.risk === "OVERDUE") {
      items.push({
        id: `overdue-${ord.id}`,
        type: "OVERDUE",
        severity: "CRITICAL",
        title: `Overdue Order: ${ord.orderNo}`,
        description: `${ord.buyer.name} (${ord.qtyMetres} m): ${riskResult.reason}`,
        link: `/orders/${ord.id}`,
      });
    } else if (riskResult.risk === "AT_RISK") {
      items.push({
        id: `at-risk-${ord.id}`,
        type: "AT_RISK",
        severity: "WARNING",
        title: `At Risk Order: ${ord.orderNo}`,
        description: `${ord.buyer.name}: ${riskResult.reason}`,
        link: `/orders/${ord.id}`,
      });
    }
  }

  // 4. Pending QC Rolls
  const pendingQCCount = await prisma.roll.count({
    where: { qcStatus: { in: ["PENDING", "REWORK"] }, stockStatus: "IN_STORE" },
  });
  if (pendingQCCount > 0) {
    items.push({
      id: "pending-qc-queue",
      type: "PENDING_QC",
      severity: "INFO",
      title: `${pendingQCCount} Rolls Awaiting QC Inspection`,
      description: "Rolls in store awaiting examination or rework clearance",
      link: "/rolls",
    });
  }

  return items;
}
