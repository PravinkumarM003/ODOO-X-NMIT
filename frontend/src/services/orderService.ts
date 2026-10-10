import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getYarnStockSummary } from "./yarnService";

export type OrderCreationInput = {
  buyerId: string;
  fabricTypeId: string;
  colour: string;
  qtyMetres: number;
  deadline: Date;
  pricePerMetre?: number;
  createdBy: string;
  submittedByBuyer?: boolean;
};

/**
 * BR-04: Calculate yarn required and shortage
 */
export async function calculateYarnRequirement(
  fabricTypeId: string,
  qtyMetres: number,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  const fabric = await db.fabricType.findUnique({
    where: { id: fabricTypeId },
    include: { yarnItem: true },
  });
  if (!fabric) {
    throw new Error(`Fabric type ${fabricTypeId} not found`);
  }

  const yarnRequiredKg = Math.round(qtyMetres * fabric.yarnKgPerMetre * 100) / 100;
  const stockSummary = await getYarnStockSummary(fabric.yarnItemId, db);

  const shortageKg = Math.max(0, Math.round((yarnRequiredKg - stockSummary.availableKg) * 100) / 100);
  const isEnough = stockSummary.availableKg >= yarnRequiredKg;

  return {
    fabric,
    yarnItemId: fabric.yarnItemId,
    yarnCode: fabric.yarnItem.code,
    yarnRequiredKg,
    availableKg: stockSummary.availableKg,
    shortageKg,
    isEnough,
    message: isEnough
      ? "Enough yarn to start"
      : `Short by ${shortageKg.toFixed(1)} kg: order more yarn`,
  };
}

/**
 * Helper to generate sequential order number: ORD-2026-XXXX
 */
async function generateOrderNo(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.order.count();
  return `ORD-2026-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Helper to create the 3 WorkOrders when an order is confirmed (BR-08)
 */
async function createWorkOrdersForOrder(
  orderId: string,
  qtyMetres: number,
  tx: Prisma.TransactionClient
) {
  const stages = ["SPINNING", "WEAVING", "DYEING"];
  for (const stage of stages) {
    await tx.workOrder.create({
      data: {
        orderId,
        stage,
        plannedQtyMetres: qtyMetres,
        producedQtyMetres: 0,
        status: "NOT_STARTED",
      },
    });
  }
}

/**
 * Creates an order directly (by Office) or from a Buyer request (BR-24)
 */
export async function createOrder(
  data: OrderCreationInput,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const fabric = await client.fabricType.findUnique({
      where: { id: data.fabricTypeId },
    });
    if (!fabric) {
      throw new Error(`Fabric type ${data.fabricTypeId} not found`);
    }

    const pricePerMetre = data.pricePerMetre ?? fabric.defaultPricePerMetre;
    const yarnRequiredKg = Math.round(data.qtyMetres * fabric.yarnKgPerMetre * 100) / 100;
    const orderNo = await generateOrderNo(client);

    // If submitted by buyer, status is NEW, no reservation, no work orders (BR-24)
    if (data.submittedByBuyer) {
      const order = await client.order.create({
        data: {
          orderNo,
          buyerId: data.buyerId,
          fabricTypeId: data.fabricTypeId,
          colour: data.colour,
          qtyMetres: data.qtyMetres,
          deadline: data.deadline,
          pricePerMetre,
          status: "NEW",
          yarnRequiredKg,
          shortageKg: 0,
          submittedByBuyer: true,
          createdBy: data.createdBy,
        },
      });
      return order;
    }

    // Direct Office creation: evaluate yarn stock (BR-04, BR-05)
    const stockSummary = await getYarnStockSummary(fabric.yarnItemId, client);
    const isEnough = stockSummary.availableKg >= yarnRequiredKg;

    if (isEnough) {
      // Reserve full amount, status CONFIRMED
      const order = await client.order.create({
        data: {
          orderNo,
          buyerId: data.buyerId,
          fabricTypeId: data.fabricTypeId,
          colour: data.colour,
          qtyMetres: data.qtyMetres,
          deadline: data.deadline,
          pricePerMetre,
          status: "CONFIRMED",
          yarnRequiredKg,
          shortageKg: 0,
          submittedByBuyer: false,
          createdBy: data.createdBy,
        },
      });

      // Post RESERVE movement
      await client.stockMovement.create({
        data: {
          yarnItemId: fabric.yarnItemId,
          orderId: order.id,
          type: "RESERVE",
          qtyKg: yarnRequiredKg,
          reason: `Reservation for Order ${order.orderNo}`,
          createdBy: data.createdBy,
        },
      });

      // Create work orders (BR-08)
      await createWorkOrdersForOrder(order.id, data.qtyMetres, client);

      return order;
    } else {
      // Shortage: status AWAITING_YARN, reserve nothing
      const shortageKg = Math.round((yarnRequiredKg - stockSummary.availableKg) * 100) / 100;
      const order = await client.order.create({
        data: {
          orderNo,
          buyerId: data.buyerId,
          fabricTypeId: data.fabricTypeId,
          colour: data.colour,
          qtyMetres: data.qtyMetres,
          deadline: data.deadline,
          pricePerMetre,
          status: "AWAITING_YARN",
          yarnRequiredKg,
          shortageKg,
          submittedByBuyer: false,
          createdBy: data.createdBy,
        },
      });
      return order;
    }
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-24: Office Review of Buyer-submitted NEW order (Approve or Cancel)
 */
export async function reviewBuyerOrder(
  data: {
    orderId: string;
    action: "APPROVE" | "CANCEL";
    adjustedPricePerMetre?: number;
    cancelReason?: string;
    reviewedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const order = await client.order.findUnique({
      where: { id: data.orderId },
      include: { fabricType: true },
    });
    if (!order) {
      throw new Error(`Order ${data.orderId} not found`);
    }

    if (order.status !== "NEW") {
      throw new Error(`Only orders with status NEW can be reviewed. Current status: ${order.status}`);
    }

    if (data.action === "CANCEL") {
      if (!data.cancelReason || data.cancelReason.trim().length < 5) {
        throw new Error("Cancellation reason is required (at least 5 characters)");
      }
      return client.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelReason: data.cancelReason.trim(),
          cancelledAt: new Date(),
          cancelledBy: data.reviewedBy,
          reviewedBy: data.reviewedBy,
          reviewedAt: new Date(),
        },
      });
    }

    // Action is APPROVE
    const pricePerMetre = data.adjustedPricePerMetre ?? order.pricePerMetre;
    const stockSummary = await getYarnStockSummary(order.fabricType.yarnItemId, client);
    const isEnough = stockSummary.availableKg >= order.yarnRequiredKg;

    if (isEnough) {
      // Reserve full amount, CONFIRMED
      const updated = await client.order.update({
        where: { id: order.id },
        data: {
          pricePerMetre,
          status: "CONFIRMED",
          shortageKg: 0,
          reviewedBy: data.reviewedBy,
          reviewedAt: new Date(),
        },
      });

      // Post RESERVE movement
      await client.stockMovement.create({
        data: {
          yarnItemId: order.fabricType.yarnItemId,
          orderId: order.id,
          type: "RESERVE",
          qtyKg: order.yarnRequiredKg,
          reason: `Reservation for Order ${order.orderNo} upon review approval`,
          createdBy: data.reviewedBy,
        },
      });

      // Create work orders
      await createWorkOrdersForOrder(order.id, order.qtyMetres, client);
      return updated;
    } else {
      // Shortage: AWAITING_YARN
      const shortageKg = Math.round((order.yarnRequiredKg - stockSummary.availableKg) * 100) / 100;
      return client.order.update({
        where: { id: order.id },
        data: {
          pricePerMetre,
          status: "AWAITING_YARN",
          shortageKg,
          reviewedBy: data.reviewedBy,
          reviewedAt: new Date(),
        },
      });
    }
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-07: Cancellation of an order
 */
export async function cancelOrder(
  data: {
    orderId: string;
    cancelReason: string;
    cancelledBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  if (!data.cancelReason || data.cancelReason.trim().length < 5) {
    throw new Error("Cancellation reason is required (at least 5 characters)");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const order = await client.order.findUnique({
      where: { id: data.orderId },
      include: {
        workOrders: true,
        fabricType: true,
        stockMovements: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${data.orderId} not found`);
    }

    if (order.status === "CANCELLED" || order.status === "COMPLETED") {
      throw new Error(`Order ${order.orderNo} cannot be cancelled in status ${order.status}`);
    }

    // Check if any work order has started
    const hasStarted = order.workOrders.some(
      (wo) => wo.status === "IN_PROGRESS" || wo.status === "COMPLETED" || wo.producedQtyMetres > 0
    );
    if (hasStarted) {
      throw new Error(`Order ${order.orderNo} cannot be cancelled because production has already started`);
    }

    // Compute outstanding reservation for this order: Σ RESERVE − Σ RELEASE
    let outstandingReserve = 0;
    for (const m of order.stockMovements) {
      if (m.type === "RESERVE") outstandingReserve += m.qtyKg;
      else if (m.type === "RELEASE") outstandingReserve -= m.qtyKg;
    }
    outstandingReserve = Math.round(outstandingReserve * 100) / 100;

    // Release reservation if any exists
    if (outstandingReserve > 0) {
      await client.stockMovement.create({
        data: {
          yarnItemId: order.fabricType.yarnItemId,
          orderId: order.id,
          type: "RELEASE",
          qtyKg: outstandingReserve,
          reason: `Reservation released due to cancellation of Order ${order.orderNo}`,
          createdBy: data.cancelledBy,
        },
      });
    }

    const updated = await client.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelReason: data.cancelReason.trim(),
        cancelledAt: new Date(),
        cancelledBy: data.cancelledBy,
      },
    });

    return updated;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-06: Auto-allocation of yarn to AWAITING_YARN orders
 * Called automatically after yarn receipt.
 */
export async function autoAllocateYarn(
  yarnItemId: string,
  allocatedBy: string,
  tx?: Prisma.TransactionClient
): Promise<Array<{ orderId: string; orderNo: string; qtyMetres: number }>> {
  const execute = async (client: Prisma.TransactionClient) => {
    // Find all AWAITING_YARN orders for fabric types using this yarn item, earliest deadline first
    const waitingOrders = await client.order.findMany({
      where: {
        status: "AWAITING_YARN",
        fabricType: {
          yarnItemId,
        },
      },
      include: {
        fabricType: true,
      },
      orderBy: { deadline: "asc" },
    });

    const releasedOrders: Array<{ orderId: string; orderNo: string; qtyMetres: number }> = [];

    for (const order of waitingOrders) {
      const stockSummary = await getYarnStockSummary(yarnItemId, client);
      if (stockSummary.availableKg >= order.yarnRequiredKg) {
        // Can fulfill this whole order!
        await client.order.update({
          where: { id: order.id },
          data: {
            status: "CONFIRMED",
            shortageKg: 0,
          },
        });

        // Post RESERVE movement
        await client.stockMovement.create({
          data: {
            yarnItemId,
            orderId: order.id,
            type: "RESERVE",
            qtyKg: order.yarnRequiredKg,
            reason: `Auto-allocation for Order ${order.orderNo}`,
            createdBy: allocatedBy,
          },
        });

        // Create work orders (BR-08)
        await createWorkOrdersForOrder(order.id, order.qtyMetres, client);

        releasedOrders.push({
          orderId: order.id,
          orderNo: order.orderNo,
          qtyMetres: order.qtyMetres,
        });
      } else {
        // Update shortage if available changed
        const currentShortage = Math.max(0, Math.round((order.yarnRequiredKg - stockSummary.availableKg) * 100) / 100);
        if (currentShortage !== order.shortageKg) {
          await client.order.update({
            where: { id: order.id },
            data: { shortageKg: currentShortage },
          });
        }
      }
    }

    return releasedOrders;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}
