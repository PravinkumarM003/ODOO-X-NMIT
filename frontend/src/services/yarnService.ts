import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type YarnStockSummary = {
  yarnItemId: string;
  onHandKg: number;
  reservedKg: number;
  availableKg: number;
  thresholdKg: number;
  health: "OK" | "LOW" | "OUT";
};

export type LotRemaining = {
  lotId: string;
  lotCode: string;
  yarnItemId: string;
  qtyReceivedKg: number;
  unitCostPerKg: number;
  remainingKg: number;
  receivedAt: Date;
};

/**
 * Computes on-hand, reserved, and available stock from the ledger for a yarn item.
 * BR-02 & BR-03
 */
export async function getYarnStockSummary(
  yarnItemId: string,
  tx?: Prisma.TransactionClient
): Promise<YarnStockSummary> {
  const db = tx || prisma;

  const yarn = await db.yarnItem.findUnique({
    where: { id: yarnItemId },
    include: {
      stockMovements: true,
    },
  });

  if (!yarn) {
    throw new Error(`Yarn item ${yarnItemId} not found`);
  }

  let onHandKg = 0;
  let reservedKg = 0;

  for (const m of yarn.stockMovements) {
    switch (m.type) {
      case "RECEIPT":
        onHandKg += m.qtyKg;
        break;
      case "CONSUME":
        onHandKg -= m.qtyKg;
        break;
      case "ADJUST":
        onHandKg += m.qtyKg; // signed delta
        break;
      case "RESERVE":
        reservedKg += m.qtyKg;
        break;
      case "RELEASE":
        reservedKg -= m.qtyKg;
        break;
    }
  }

  // Round floating point artifacts to 2 decimal places
  onHandKg = Math.round(onHandKg * 100) / 100;
  reservedKg = Math.round(reservedKg * 100) / 100;
  let availableKg = Math.round((onHandKg - reservedKg) * 100) / 100;

  // Health
  let health: "OK" | "LOW" | "OUT" = "OK";
  if (availableKg <= 0) {
    health = "OUT";
  } else if (availableKg < yarn.reorderThresholdKg) {
    health = "LOW";
  }

  return {
    yarnItemId,
    onHandKg,
    reservedKg,
    availableKg,
    thresholdKg: yarn.reorderThresholdKg,
    health,
  };
}

/**
 * Calculates remaining quantity for lots of a yarn item using FIFO ledger.
 */
export async function getLotRemainings(
  yarnItemId: string,
  tx?: Prisma.TransactionClient
): Promise<LotRemaining[]> {
  const db = tx || prisma;

  const lots = await db.yarnLot.findMany({
    where: { yarnItemId },
    include: {
      stockMovements: true,
    },
    orderBy: { receivedAt: "asc" },
  });

  return lots.map((lot) => {
    let remainingKg = lot.qtyReceivedKg;
    for (const m of lot.stockMovements) {
      if (m.type === "CONSUME") {
        remainingKg -= m.qtyKg;
      } else if (m.type === "ADJUST") {
        remainingKg += m.qtyKg; // signed delta
      }
    }
    remainingKg = Math.round(remainingKg * 100) / 100;
    return {
      lotId: lot.id,
      lotCode: lot.lotCode,
      yarnItemId: lot.yarnItemId,
      qtyReceivedKg: lot.qtyReceivedKg,
      unitCostPerKg: lot.unitCostPerKg,
      remainingKg: Math.max(0, remainingKg),
      receivedAt: lot.receivedAt,
    };
  });
}

/**
 * BR-01: Receive yarn
 */
export async function receiveYarn(
  data: {
    lotCode: string;
    yarnItemId: string;
    supplierId: string;
    qtyReceivedKg: number;
    unitCostPerKg: number;
    linkedOrderId?: string | null;
    receivedBy: string;
    createSupplierBill?: boolean;
    billAmount?: number;
  },
  tx?: Prisma.TransactionClient
) {
  if (data.qtyReceivedKg <= 0) {
    throw new Error("Quantity received must be greater than 0 kg");
  }
  if (data.unitCostPerKg < 0) {
    throw new Error("Unit cost cannot be negative");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    // Check lot code uniqueness
    const existing = await client.yarnLot.findUnique({
      where: { lotCode: data.lotCode },
    });
    if (existing) {
      throw new Error(`Lot code ${data.lotCode} already exists`);
    }

    const lot = await client.yarnLot.create({
      data: {
        lotCode: data.lotCode,
        yarnItemId: data.yarnItemId,
        supplierId: data.supplierId,
        qtyReceivedKg: data.qtyReceivedKg,
        unitCostPerKg: data.unitCostPerKg,
        linkedOrderId: data.linkedOrderId || null,
        receivedBy: data.receivedBy,
      },
    });

    // Create RECEIPT stock movement
    await client.stockMovement.create({
      data: {
        yarnItemId: data.yarnItemId,
        lotId: lot.id,
        orderId: data.linkedOrderId || null,
        type: "RECEIPT",
        qtyKg: data.qtyReceivedKg,
        reason: `Initial receipt: Lot ${data.lotCode}`,
        createdBy: data.receivedBy,
      },
    });

    // Optional SupplierBill
    if (data.createSupplierBill || (data.billAmount && data.billAmount > 0)) {
      const amount = data.billAmount || data.qtyReceivedKg * data.unitCostPerKg;
      const count = await client.supplierBill.count();
      const billNo = `BILL-${String(count + 1).padStart(4, "0")}`;
      await client.supplierBill.create({
        data: {
          billNo,
          supplierId: data.supplierId,
          lotId: lot.id,
          amount,
          status: "UNPAID",
        },
      });
    }

    return lot;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-02: Adjust stock (signed delta, must name a lot and a reason)
 */
export async function adjustStock(
  data: {
    lotId: string;
    deltaKg: number;
    reason: string;
    adjustedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  if (data.deltaKg === 0) {
    throw new Error("Adjustment delta cannot be 0 kg");
  }
  if (!data.reason || data.reason.trim().length < 3) {
    throw new Error("Adjustment requires a valid reason (min 3 characters)");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const lot = await client.yarnLot.findUnique({
      where: { id: data.lotId },
      include: {
        stockMovements: true,
      },
    });
    if (!lot) {
      throw new Error(`Yarn lot ${data.lotId} not found`);
    }

    // Check lot remaining
    let lotRemaining = lot.qtyReceivedKg;
    for (const m of lot.stockMovements) {
      if (m.type === "CONSUME") lotRemaining -= m.qtyKg;
      else if (m.type === "ADJUST") lotRemaining += m.qtyKg;
    }
    const newLotRemaining = lotRemaining + data.deltaKg;
    if (newLotRemaining < 0) {
      throw new Error(
        `Cannot reduce stock by ${Math.abs(data.deltaKg)} kg: Lot ${lot.lotCode} has only ${lotRemaining.toFixed(1)} kg remaining`
      );
    }

    // Check item available
    const itemStock = await getYarnStockSummary(lot.yarnItemId, client);
    const newAvailable = itemStock.availableKg + data.deltaKg;
    if (newAvailable < 0) {
      throw new Error(
        `Cannot reduce stock by ${Math.abs(data.deltaKg)} kg: Available stock would drop to ${newAvailable.toFixed(1)} kg (cannot be negative)`
      );
    }

    const movement = await client.stockMovement.create({
      data: {
        yarnItemId: lot.yarnItemId,
        lotId: lot.id,
        type: "ADJUST",
        qtyKg: data.deltaKg, // signed delta
        reason: data.reason,
        createdBy: data.adjustedBy,
      },
    });

    return movement;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}
