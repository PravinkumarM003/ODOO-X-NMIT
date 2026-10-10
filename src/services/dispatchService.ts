import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recomputeOrderStatus } from "./orderStatusService";

/**
 * BR-15, BR-16, BR-17: Create Dispatch and generate matching Invoice
 */
export async function createDispatch(
  data: {
    orderId: string;
    rollIds: string[];
    truckNo: string;
    driverName: string;
    dispatchedBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  if (!data.rollIds || data.rollIds.length === 0) {
    throw new Error("At least one roll must be selected for dispatch");
  }
  if (!data.truckNo || !data.truckNo.trim()) {
    throw new Error("Truck number is required");
  }
  if (!data.driverName || !data.driverName.trim()) {
    throw new Error("Driver name is required");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const order = await client.order.findUnique({
      where: { id: data.orderId },
      include: {
        rolls: {
          include: { dispatchLine: true },
        },
      },
    });
    if (!order) {
      throw new Error(`Order ${data.orderId} not found`);
    }

    // Verify all selected rolls
    const selectedRolls = await client.roll.findMany({
      where: { id: { in: data.rollIds } },
      include: { dispatchLine: true },
    });

    if (selectedRolls.length !== data.rollIds.length) {
      throw new Error("One or more selected rolls could not be found");
    }

    let totalMetres = 0;

    for (const roll of selectedRolls) {
      // Must belong to the same order
      if (roll.orderId !== order.id) {
        throw new Error(`Roll ${roll.rollNo} does not belong to Order ${order.orderNo}`);
      }

      // Check double dispatch
      if (roll.dispatchLine || roll.stockStatus === "DISPATCHED") {
        throw new Error(`Roll ${roll.rollNo} has already been dispatched`);
      }

      // Check Rejected
      if (roll.qcStatus === "REJECTED") {
        throw new Error(`Roll ${roll.rollNo} is Rejected (quarantined) and cannot be dispatched`);
      }

      // Check Passed & In Store
      if (roll.qcStatus !== "PASSED" || roll.stockStatus !== "IN_STORE") {
        throw new Error(`Roll ${roll.rollNo} is not ready for dispatch (QC: ${roll.qcStatus}, Stock: ${roll.stockStatus})`);
      }

      totalMetres += roll.lengthMetres;
    }

    totalMetres = Math.round(totalMetres * 100) / 100;

    // Generate dispatch number: DSP-XXXX
    const dispatchCount = await client.dispatch.count();
    const dispatchNo = `DSP-${String(dispatchCount + 1).padStart(4, "0")}`;

    // Create Dispatch
    const dispatch = await client.dispatch.create({
      data: {
        dispatchNo,
        orderId: order.id,
        buyerId: order.buyerId,
        truckNo: data.truckNo.trim(),
        driverName: data.driverName.trim(),
        dispatchedBy: data.dispatchedBy,
      },
    });

    // Create DispatchLines and update Roll stockStatus to DISPATCHED
    for (const roll of selectedRolls) {
      await client.dispatchLine.create({
        data: {
          dispatchId: dispatch.id,
          rollId: roll.id,
          lengthMetres: roll.lengthMetres,
        },
      });

      await client.roll.update({
        where: { id: roll.id },
        data: {
          stockStatus: "DISPATCHED",
        },
      });
    }

    // BR-17 Invoice creation in the same transaction
    const invoiceAmount = Math.round(totalMetres * order.pricePerMetre * 100) / 100;
    const invoiceCount = await client.invoice.count();
    const invoiceNo = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

    const invoice = await client.invoice.create({
      data: {
        invoiceNo,
        orderId: order.id,
        dispatchId: dispatch.id,
        amount: invoiceAmount,
        status: "UNPAID",
      },
    });

    // Recompute order status inside the same transaction (BR-16)
    await recomputeOrderStatus(order.id, client);

    return {
      dispatch,
      invoice,
      totalMetres,
      rollCount: selectedRolls.length,
    };
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-19: Record Payment against an invoice
 */
export async function recordPayment(
  data: {
    invoiceId: string;
    amount: number;
    method: "BANK" | "CASH" | "UPI";
    reference?: string | null;
  },
  tx?: Prisma.TransactionClient
) {
  if (data.amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const execute = async (client: Prisma.TransactionClient) => {
    const invoice = await client.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new Error(`Invoice ${data.invoiceId} not found`);
    }

    const totalPaid = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
    const balance = Math.round((invoice.amount - totalPaid) * 100) / 100;

    if (data.amount > balance) {
      throw new Error(
        `Payment amount (₹${data.amount}) exceeds outstanding balance (₹${balance})`
      );
    }

    const payment = await client.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
      },
    });

    const newTotalPaid = Math.round((totalPaid + data.amount) * 100) / 100;
    let newStatus = "UNPAID";
    if (newTotalPaid >= invoice.amount) {
      newStatus = "PAID";
    } else if (newTotalPaid > 0) {
      newStatus = "PARTIAL";
    }

    await client.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
    });

    return payment;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-18: Store view - four mutually exclusive sections
 */
export async function getStoreRolls(tx?: Prisma.TransactionClient) {
  const db = tx || prisma;

  const rolls = await db.roll.findMany({
    include: {
      order: {
        include: { buyer: true },
      },
      qcRecords: {
        orderBy: { createdAt: "desc" },
      },
      dispatchLine: {
        include: {
          dispatch: {
            include: { invoice: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 1. Shelf: Passed and In store
  const shelf = rolls.filter((r) => r.qcStatus === "PASSED" && r.stockStatus === "IN_STORE");

  // 2. Awaiting QC or rework: (Pending or Rework) and In store
  const awaitingQC = rolls.filter(
    (r) => (r.qcStatus === "PENDING" || r.qcStatus === "REWORK") && r.stockStatus === "IN_STORE"
  );

  // 3. Rejected / Quarantined: Rejected and In store
  const quarantined = rolls.filter(
    (r) => r.qcStatus === "REJECTED" && r.stockStatus === "IN_STORE"
  );

  // 4. Dispatched: stockStatus === "DISPATCHED"
  const dispatched = rolls.filter((r) => r.stockStatus === "DISPATCHED");

  return {
    shelf: {
      rolls: shelf,
      count: shelf.length,
      metres: shelf.reduce((acc, r) => acc + r.lengthMetres, 0),
    },
    awaitingQC: {
      rolls: awaitingQC,
      count: awaitingQC.length,
      metres: awaitingQC.reduce((acc, r) => acc + r.lengthMetres, 0),
    },
    quarantined: {
      rolls: quarantined,
      count: quarantined.length,
      metres: quarantined.reduce((acc, r) => acc + r.lengthMetres, 0),
    },
    dispatched: {
      rolls: dispatched,
      count: dispatched.length,
      metres: dispatched.reduce((acc, r) => acc + r.lengthMetres, 0),
    },
  };
}
