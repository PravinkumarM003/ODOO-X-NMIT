import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recomputeOrderStatus } from "./orderStatusService";

/**
 * BR-13: Register rolls from an order (weavingMachine and dyeingMachine auto-linked)
 */
export async function registerRolls(
  data: {
    orderId: string;
    rolls: Array<{ lengthMetres: number }>;
    registeredBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  if (!data.rolls || data.rolls.length === 0) {
    throw new Error("At least one roll must be registered");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const order = await client.order.findUnique({
      where: { id: data.orderId },
      include: {
        workOrders: true,
        rolls: true,
      },
    });
    if (!order) {
      throw new Error(`Order ${data.orderId} not found`);
    }

    const weavingWO = order.workOrders.find((w) => w.stage === "WEAVING");
    const dyeingWO = order.workOrders.find((w) => w.stage === "DYEING");

    const currentTotalRollMetres = order.rolls.reduce((acc, r) => acc + r.lengthMetres, 0);
    const newRollsMetres = data.rolls.reduce((acc, r) => acc + r.lengthMetres, 0);
    const combinedTotal = currentTotalRollMetres + newRollsMetres;
    const maxAllowed = Math.round(order.qtyMetres * 1.05 * 100) / 100;

    if (combinedTotal > maxAllowed) {
      throw new Error(
        `Total registered roll length (${combinedTotal} m) exceeds order quantity + 5% tolerance (${maxAllowed} m)`
      );
    }

    const rollCount = await client.roll.count();
    const createdRolls = [];

    let nextIndex = rollCount + 1;
    for (const rollInput of data.rolls) {
      if (rollInput.lengthMetres <= 0) {
        throw new Error("Roll length must be greater than 0 metres");
      }
      const rollNo = `ROLL-${String(nextIndex).padStart(4, "0")}`;
      nextIndex++;

      const roll = await client.roll.create({
        data: {
          rollNo,
          orderId: order.id,
          weavingMachineId: weavingWO?.machineId || null,
          dyeingMachineId: dyeingWO?.machineId || null,
          lengthMetres: rollInput.lengthMetres,
          qcStatus: "PENDING",
          stockStatus: "IN_STORE",
        },
      });
      createdRolls.push(roll);
    }

    // If dyeing is completed or in QC, recompute order status
    if (order.status === "IN_QC" || order.status === "READY_TO_SHIP" || order.status === "PARTIALLY_DISPATCHED") {
      await recomputeOrderStatus(order.id, client);
    }

    return createdRolls;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-14: Inspect roll (creates immutable QCRecord)
 */
export async function inspectRoll(
  data: {
    rollId: string;
    result: "PASSED" | "REWORK" | "REJECTED";
    defectType?: "HOLE" | "COLOUR_MISMATCH" | "UNEVEN_WEAVE" | "OTHER" | null;
    severity?: "MINOR" | "MAJOR" | "CRITICAL" | null;
    notes?: string | null;
    inspectorId?: string | null;
    inspectorName?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  if (data.result !== "PASSED") {
    if (!data.defectType) {
      throw new Error("Defect type is required when result is not PASSED");
    }
    if (!data.severity) {
      throw new Error("Severity is required when result is not PASSED");
    }
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const roll = await client.roll.findUnique({
      where: { id: data.rollId },
      include: { order: true, dispatchLine: true },
    });
    if (!roll) {
      throw new Error(`Roll ${data.rollId} not found`);
    }

    if (roll.dispatchLine) {
      throw new Error(`Dispatched rolls cannot be re-inspected (Roll ${roll.rollNo})`);
    }

    if (roll.qcStatus === "REJECTED") {
      throw new Error(`Roll ${roll.rollNo} is already Rejected (terminal state)`);
    }

    const qcCount = await client.qCRecord.count();
    const qcNo = `QC-${String(qcCount + 1).padStart(4, "0")}`;

    // Create immutable QCRecord
    await client.qCRecord.create({
      data: {
        qcNo,
        rollId: roll.id,
        inspectorId: data.inspectorId || null,
        inspectorName: data.inspectorName || null,
        result: data.result,
        defectType: data.result === "PASSED" ? null : data.defectType,
        severity: data.result === "PASSED" ? null : data.severity,
        notes: data.notes || null,
      },
    });

    // Update roll status
    const updatedRoll = await client.roll.update({
      where: { id: roll.id },
      data: {
        qcStatus: data.result,
      },
    });

    // Recompute order status inside the same transaction (BR-16)
    await recomputeOrderStatus(roll.orderId, client);

    return updatedRoll;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}
