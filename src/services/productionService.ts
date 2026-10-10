import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getYarnStockSummary, getLotRemainings } from "./yarnService";
import { recomputeOrderStatus } from "./orderStatusService";

/**
 * BR-09: Assign machine to work order
 */
export async function assignMachineToWorkOrder(
  data: {
    workOrderId: string;
    machineId: string;
    assignedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const workOrder = await client.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: {
        order: {
          include: { workOrders: true },
        },
      },
    });
    if (!workOrder) {
      throw new Error(`Work order ${data.workOrderId} not found`);
    }

    // BR-08 Stage Order Validation
    if (workOrder.stage === "WEAVING") {
      const spinningWO = workOrder.order.workOrders.find((w) => w.stage === "SPINNING");
      if (!spinningWO || spinningWO.status !== "COMPLETED") {
        throw new Error("Spinning stage must be completed before weaving can start");
      }
    } else if (workOrder.stage === "DYEING") {
      const weavingWO = workOrder.order.workOrders.find((w) => w.stage === "WEAVING");
      if (!weavingWO || weavingWO.status !== "COMPLETED") {
        throw new Error("Weaving stage must be completed before dyeing can start");
      }
    }

    const machine = await client.machine.findUnique({
      where: { id: data.machineId },
    });
    if (!machine) {
      throw new Error(`Machine ${data.machineId} not found`);
    }

    // Machine type check
    if (machine.type !== workOrder.stage) {
      throw new Error(`Machine ${machine.code} (${machine.type}) cannot be assigned to ${workOrder.stage} stage`);
    }

    // Machine status check
    if (machine.status !== "IDLE") {
      throw new Error(`Machine ${machine.code} is not IDLE (current status: ${machine.status})`);
    }

    // Assign machine and set status
    const updatedWO = await client.workOrder.update({
      where: { id: workOrder.id },
      data: {
        machineId: machine.id,
        status: "IN_PROGRESS",
        startedAt: workOrder.startedAt || new Date(),
      },
    });

    await client.machine.update({
      where: { id: machine.id },
      data: { status: "RUNNING" },
    });

    // Update order status to IN_PRODUCTION with currentStage
    await client.order.update({
      where: { id: workOrder.orderId },
      data: {
        status: "IN_PRODUCTION",
        currentStage: workOrder.stage,
      },
    });

    return updatedWO;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-10: Output logging
 */
export async function logProductionOutput(
  data: {
    workOrderId: string;
    employeeId: string;
    qtyMetres: number;
    hours: number;
    shift: "MORNING" | "EVENING" | "NIGHT";
  },
  tx?: Prisma.TransactionClient
) {
  if (data.qtyMetres <= 0) {
    throw new Error("Produced metres must be greater than 0");
  }
  if (data.hours <= 0) {
    throw new Error("Hours must be greater than 0");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const workOrder = await client.workOrder.findUnique({
      where: { id: data.workOrderId },
    });
    if (!workOrder) {
      throw new Error(`Work order ${data.workOrderId} not found`);
    }

    const maxAllowed = Math.round(workOrder.plannedQtyMetres * 1.05 * 100) / 100;
    const newProduced = Math.round((workOrder.producedQtyMetres + data.qtyMetres) * 100) / 100;

    if (newProduced > maxAllowed) {
      throw new Error(
        `Logging ${data.qtyMetres} m would result in ${newProduced} m, exceeding 5% tolerance limit (${maxAllowed} m)`
      );
    }

    const log = await client.productionLog.create({
      data: {
        workOrderId: workOrder.id,
        employeeId: data.employeeId,
        qtyMetres: data.qtyMetres,
        hours: data.hours,
        shift: data.shift,
      },
    });

    await client.workOrder.update({
      where: { id: workOrder.id },
      data: {
        producedQtyMetres: newProduced,
      },
    });

    return log;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-11: Complete Spinning and consume yarn FIFO
 */
export async function completeSpinningStage(
  data: {
    workOrderId: string;
    actualKgUsed?: number;
    completedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const workOrder = await client.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: {
        order: {
          include: {
            fabricType: true,
            stockMovements: true,
          },
        },
        machine: true,
      },
    });

    if (!workOrder || workOrder.stage !== "SPINNING") {
      throw new Error("Invalid work order or not a SPINNING stage");
    }

    // Outstanding reservation for order: Σ RESERVE - Σ RELEASE
    let outstandingReserve = 0;
    for (const m of workOrder.order.stockMovements) {
      if (m.type === "RESERVE") outstandingReserve += m.qtyKg;
      else if (m.type === "RELEASE") outstandingReserve -= m.qtyKg;
    }
    outstandingReserve = Math.round(outstandingReserve * 100) / 100;

    const yarnItemId = workOrder.order.fabricType.yarnItemId;
    const kgToConsume = data.actualKgUsed ?? outstandingReserve;

    if (kgToConsume <= 0) {
      throw new Error("Consumed yarn must be greater than 0 kg");
    }

    // 1. Post RELEASE movement for order's full outstanding reservation
    if (outstandingReserve > 0) {
      await client.stockMovement.create({
        data: {
          yarnItemId,
          orderId: workOrder.order.id,
          type: "RELEASE",
          qtyKg: outstandingReserve,
          reason: `Release reservation upon spinning completion for Order ${workOrder.order.orderNo}`,
          createdBy: data.completedBy,
        },
      });
    }

    // Verify on-hand can fulfill consumption
    const stock = await getYarnStockSummary(yarnItemId, client);
    if (stock.onHandKg < kgToConsume) {
      throw new Error(
        `Insufficient on-hand yarn to consume ${kgToConsume} kg (On-hand: ${stock.onHandKg} kg)`
      );
    }

    // 2. Consume FIFO from lots oldest-first
    const lots = await getLotRemainings(yarnItemId, client);
    let remainingToConsume = kgToConsume;

    for (const lot of lots) {
      if (remainingToConsume <= 0) break;
      if (lot.remainingKg <= 0) continue;

      const takeKg = Math.min(lot.remainingKg, remainingToConsume);
      await client.stockMovement.create({
        data: {
          yarnItemId,
          lotId: lot.lotId,
          orderId: workOrder.order.id,
          type: "CONSUME",
          qtyKg: takeKg,
          reason: `Spinning consumption from Lot ${lot.lotCode} for Order ${workOrder.order.orderNo}`,
          createdBy: data.completedBy,
        },
      });

      remainingToConsume = Math.round((remainingToConsume - takeKg) * 100) / 100;
    }

    if (remainingToConsume > 0) {
      throw new Error(`Unable to consume full quantity: ${remainingToConsume} kg unallocated across lots`);
    }

    // Set work order completed & machine idle
    await client.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    if (workOrder.machineId) {
      await client.machine.update({
        where: { id: workOrder.machineId },
        data: { status: "IDLE" },
      });
    }

    // Update order stage
    await client.order.update({
      where: { id: workOrder.orderId },
      data: { currentStage: "WEAVING" },
    });

    return workOrder;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * Complete Weaving or Dyeing stage
 */
export async function completeStage(
  data: {
    workOrderId: string;
    completedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const workOrder = await client.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { order: true },
    });
    if (!workOrder) {
      throw new Error(`Work order ${data.workOrderId} not found`);
    }

    if (workOrder.stage === "SPINNING") {
      throw new Error("Use completeSpinningStage for SPINNING stage");
    }

    await client.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    if (workOrder.machineId) {
      await client.machine.update({
        where: { id: workOrder.machineId },
        data: { status: "IDLE" },
      });
    }

    if (workOrder.stage === "WEAVING") {
      await client.order.update({
        where: { id: workOrder.orderId },
        data: { currentStage: "DYEING" },
      });
    } else if (workOrder.stage === "DYEING") {
      // Order moves to IN_QC! (BR-13, BR-16)
      await client.order.update({
        where: { id: workOrder.orderId },
        data: {
          currentStage: null,
          status: "IN_QC",
        },
      });
      // Trigger status recompute
      await recomputeOrderStatus(workOrder.orderId, client);
    }

    return workOrder;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-12: Report Machine Breakdown and handle reassignment
 */
export async function reportMachineBreakdown(
  data: {
    machineId: string;
    reason: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const machine = await client.machine.findUnique({
      where: { id: data.machineId },
      include: {
        workOrders: {
          where: { status: "IN_PROGRESS" },
        },
      },
    });
    if (!machine) {
      throw new Error(`Machine ${data.machineId} not found`);
    }

    // Set machine to BREAKDOWN
    await client.machine.update({
      where: { id: machine.id },
      data: { status: "BREAKDOWN" },
    });

    // Open MachineDowntime
    await client.machineDowntime.create({
      data: {
        machineId: machine.id,
        reason: data.reason,
      },
    });

    // If active work order, set to BLOCKED
    for (const wo of machine.workOrders) {
      await client.workOrder.update({
        where: { id: wo.id },
        data: { status: "BLOCKED" },
      });
    }

    return machine;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * Resolve Machine Breakdown and set back to IDLE
 */
export async function resolveMachineBreakdown(
  machineId: string,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    // Close open downtime
    const openDowntime = await client.machineDowntime.findFirst({
      where: { machineId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (openDowntime) {
      await client.machineDowntime.update({
        where: { id: openDowntime.id },
        data: { endedAt: new Date() },
      });
    }

    // Set machine back to IDLE
    return client.machine.update({
      where: { id: machineId },
      data: { status: "IDLE" },
    });
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * Reassign a BLOCKED work order to an IDLE machine
 */
export async function reassignBlockedWorkOrder(
  data: {
    workOrderId: string;
    newMachineId: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const workOrder = await client.workOrder.findUnique({
      where: { id: data.workOrderId },
    });
    if (!workOrder) {
      throw new Error(`Work order ${data.workOrderId} not found`);
    }

    const newMachine = await client.machine.findUnique({
      where: { id: data.newMachineId },
    });
    if (!newMachine) {
      throw new Error(`Machine ${data.newMachineId} not found`);
    }

    if (newMachine.type !== workOrder.stage) {
      throw new Error(`Machine ${newMachine.code} (${newMachine.type}) cannot be assigned to ${workOrder.stage} stage`);
    }
    if (newMachine.status !== "IDLE") {
      throw new Error(`Machine ${newMachine.code} is not IDLE`);
    }

    await client.workOrder.update({
      where: { id: workOrder.id },
      data: {
        machineId: newMachine.id,
        status: "IN_PROGRESS",
      },
    });

    await client.machine.update({
      where: { id: newMachine.id },
      data: { status: "RUNNING" },
    });

    return workOrder;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}
