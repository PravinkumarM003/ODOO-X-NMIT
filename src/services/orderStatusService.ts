import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type RecomputedStatusResult = {
  status: "IN_QC" | "READY_TO_SHIP" | "PARTIALLY_DISPATCHED" | "COMPLETED";
  eligibleCount: number;
  eligibleMetres: number;
  unresolvedCount: number;
  unresolvedMetres: number;
  dispatchedCount: number;
  dispatchedMetres: number;
  rejectedCount: number;
  rejectedMetres: number;
  totalRolls: number;
  totalRegisteredMetres: number;
  explanation: string;
};

/**
 * BR-16: Order readiness and completion
 * Pure derivation logic based on an order's rolls and dispatch lines.
 */
export function deriveOrderStatusFromRolls(
  rolls: Array<{
    id: string;
    qcStatus: string;
    stockStatus: string;
    lengthMetres: number;
    dispatchLine?: { id: string } | null;
  }>,
  orderQtyMetres: number
): RecomputedStatusResult {
  const totalRolls = rolls.length;
  const totalRegisteredMetres = rolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  const eligibleRolls = rolls.filter(
    (r) => r.qcStatus === "PASSED" && r.stockStatus === "IN_STORE" && !r.dispatchLine
  );
  const unresolvedRolls = rolls.filter(
    (r) => r.qcStatus === "PENDING" || r.qcStatus === "REWORK"
  );
  const dispatchedRolls = rolls.filter((r) => !!r.dispatchLine);
  const rejectedRolls = rolls.filter((r) => r.qcStatus === "REJECTED");

  const eligibleCount = eligibleRolls.length;
  const eligibleMetres = eligibleRolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  const unresolvedCount = unresolvedRolls.length;
  const unresolvedMetres = unresolvedRolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  const dispatchedCount = dispatchedRolls.length;
  const dispatchedMetres = dispatchedRolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  const rejectedCount = rejectedRolls.length;
  const rejectedMetres = rejectedRolls.reduce((acc, r) => acc + r.lengthMetres, 0);

  let status: "IN_QC" | "READY_TO_SHIP" | "PARTIALLY_DISPATCHED" | "COMPLETED";
  let explanation = "";

  if (dispatchedCount > 0) {
    if (eligibleCount > 0 || unresolvedCount > 0) {
      status = "PARTIALLY_DISPATCHED";
      explanation = `${dispatchedMetres.toFixed(1)} m dispatched. ${eligibleMetres.toFixed(1)} m awaiting dispatch, ${unresolvedCount} roll(s) pending QC.`;
    } else {
      status = "COMPLETED";
      if (rejectedMetres > 0) {
        explanation = `Delivered ${dispatchedMetres.toFixed(1)} of ${orderQtyMetres.toFixed(1)} m (${rejectedMetres.toFixed(1)} m rejected)`;
      } else {
        explanation = `Delivered ${dispatchedMetres.toFixed(1)} of ${orderQtyMetres.toFixed(1)} m`;
      }
    }
  } else {
    // Nothing dispatched yet
    if (unresolvedCount > 0) {
      status = "IN_QC";
      explanation = `${unresolvedCount} rolls awaiting inspection or rework`;
    } else if (totalRolls === 0) {
      status = "IN_QC";
      explanation = "No rolls registered yet";
    } else if (eligibleCount > 0) {
      status = "READY_TO_SHIP";
      explanation = `All registered rolls inspected. ${eligibleCount} rolls (${eligibleMetres.toFixed(1)} m) ready to ship.`;
    } else {
      // unresolved === 0 and eligible === 0 (every registered roll is Rejected)
      status = "IN_QC";
      explanation = `No dispatch-eligible rolls. All ${totalRolls} registered rolls (${rejectedMetres.toFixed(1)} m) were rejected. Rejected quantity: ${rejectedMetres.toFixed(1)} m of ${orderQtyMetres.toFixed(1)} m ordered. Nothing can be shipped.`;
    }
  }

  return {
    status,
    eligibleCount,
    eligibleMetres,
    unresolvedCount,
    unresolvedMetres,
    dispatchedCount,
    dispatchedMetres,
    rejectedCount,
    rejectedMetres,
    totalRolls,
    totalRegisteredMetres,
    explanation,
  };
}

/**
 * Recomputes and updates the order status in the database.
 * Must be executed in database transactions after any QC record or Dispatch event.
 */
export async function recomputeOrderStatus(
  orderId: string,
  tx?: Prisma.TransactionClient
): Promise<RecomputedStatusResult> {
  const db = tx || prisma;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
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

  // Derive status
  const result = deriveOrderStatusFromRolls(order.rolls, order.qtyMetres);

  // Update order in db if changed
  if (order.status !== result.status) {
    await db.order.update({
      where: { id: orderId },
      data: { status: result.status },
    });
  }

  return result;
}
