import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * BR-20: Attendance logging and summary
 */
export async function markAttendance(
  data: {
    employeeId: string;
    date: string; // YYYY-MM-DD
    shift: "MORNING" | "EVENING" | "NIGHT";
    status: "PRESENT" | "ABSENT" | "LEAVE";
    overtimeHours?: number;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  return db.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: data.date,
      },
    },
    update: {
      shift: data.shift,
      status: data.status,
      overtimeHours: data.overtimeHours ?? 0,
    },
    create: {
      employeeId: data.employeeId,
      date: data.date,
      shift: data.shift,
      status: data.status,
      overtimeHours: data.overtimeHours ?? 0,
    },
  });
}

/**
 * BR-21: Monthly Wages calculation & summary
 */
export async function getMonthlyWages(
  month: string, // YYYY-MM
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const employees = await db.employee.findMany({
    include: {
      attendances: {
        where: {
          date: { startsWith: month },
        },
      },
      wageSummaries: {
        where: { month },
      },
    },
    orderBy: { empNo: "asc" },
  });

  return employees.map((emp) => {
    const summary = emp.wageSummaries[0] || null;

    let daysPresent = 0;
    let overtimeHours = 0;

    for (const att of emp.attendances) {
      if (att.status === "PRESENT") {
        daysPresent++;
      }
      overtimeHours += att.overtimeHours;
    }

    const calculatedAmount = Math.round(
      (daysPresent * emp.dailyWage + overtimeHours * emp.overtimeRatePerHour) * 100
    ) / 100;

    let state: "Calculated" | "Closed (not recorded as paid)" | "Paid" = "Calculated";
    if (summary) {
      if (summary.paidAt) {
        state = "Paid";
      } else {
        state = "Closed (not recorded as paid)";
      }
    }

    return {
      employeeId: emp.id,
      empNo: emp.empNo,
      name: emp.name,
      department: emp.department,
      jobTitle: emp.jobTitle,
      dailyWage: emp.dailyWage,
      overtimeRatePerHour: emp.overtimeRatePerHour,
      daysPresent: summary ? summary.daysPresent : daysPresent,
      overtimeHours: summary ? summary.overtimeHours : overtimeHours,
      amount: summary ? summary.amount : calculatedAmount,
      summaryId: summary?.id || null,
      state,
      closedAt: summary?.closedAt || null,
      paidAt: summary?.paidAt || null,
      paidAmount: summary?.paidAmount || null,
      paymentMethod: summary?.paymentMethod || null,
      paymentReference: summary?.paymentReference || null,
    };
  });
}

/**
 * Close month for all employees (freezes wage summary, state becomes Closed)
 */
export async function closeMonthWages(
  month: string, // YYYY-MM
  closedBy: string,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const wages = await getMonthlyWages(month, client);

    for (const w of wages) {
      await client.wageSummary.upsert({
        where: {
          employeeId_month: {
            employeeId: w.employeeId,
            month,
          },
        },
        update: {
          daysPresent: w.daysPresent,
          overtimeHours: w.overtimeHours,
          amount: w.amount,
          closedAt: new Date(),
          closedBy,
        },
        create: {
          employeeId: w.employeeId,
          month,
          daysPresent: w.daysPresent,
          overtimeHours: w.overtimeHours,
          amount: w.amount,
          closedAt: new Date(),
          closedBy,
        },
      });
    }

    return getMonthlyWages(month, client);
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * Mark wages as paid (BR-26 Owner only)
 */
export async function markWagesPaid(
  data: {
    month: string;
    employeeId?: string; // if omitted, marks all closed employees for the month
    paidAt: Date;
    paymentMethod: string;
    paymentReference?: string;
  },
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const whereClause: Prisma.WageSummaryWhereInput = {
      month: data.month,
      paidAt: null,
    };
    if (data.employeeId) {
      whereClause.employeeId = data.employeeId;
    }

    const summaries = await client.wageSummary.findMany({
      where: whereClause,
    });

    for (const s of summaries) {
      await client.wageSummary.update({
        where: { id: s.id },
        data: {
          paidAt: data.paidAt,
          paidAmount: s.amount,
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference || null,
        },
      });
    }

    return summaries.length;
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (client) => execute(client));
  }
}

/**
 * BR-22: Order Costing
 */
export async function getOrderCost(
  orderId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      stockMovements: {
        where: { type: "CONSUME" },
        include: { lot: true },
      },
      workOrders: {
        include: {
          machine: true,
          productionLogs: {
            include: { employee: true },
          },
        },
      },
      rolls: true,
      invoices: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Yarn cost = sum over CONSUME lot quantities * lot unit cost
  let yarnCost = 0;
  let yarnConsumedKg = 0;
  let hasMissingYarnCost = false;

  for (const m of order.stockMovements) {
    yarnConsumedKg += m.qtyKg;
    if (m.lot) {
      yarnCost += m.qtyKg * m.lot.unitCostPerKg;
    } else {
      hasMissingYarnCost = true;
    }
  }

  // Labour cost = sum of ProductionLog hours * (employee dailyWage / 8)
  // Machine cost = sum of ProductionLog hours * machine hourlyRate
  let labourCost = 0;
  let machineCost = 0;
  let totalHours = 0;

  for (const wo of order.workOrders) {
    const machineRate = wo.machine?.hourlyRate || 0;
    for (const log of wo.productionLogs) {
      totalHours += log.hours;
      const hourlyWage = log.employee.dailyWage / 8;
      labourCost += log.hours * hourlyWage;
      machineCost += log.hours * machineRate;
    }
  }

  yarnCost = Math.round(yarnCost * 100) / 100;
  labourCost = Math.round(labourCost * 100) / 100;
  machineCost = Math.round(machineCost * 100) / 100;
  const totalCost = Math.round((yarnCost + labourCost + machineCost) * 100) / 100;

  // Invoiced revenue
  const invoicedRevenue = order.invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const margin = Math.round((invoicedRevenue - totalCost) * 100) / 100;

  // Registered roll lengths
  const totalRegisteredMetres = order.rolls.reduce((acc, r) => acc + r.lengthMetres, 0);
  const passedMetres = order.rolls
    .filter((r) => r.qcStatus === "PASSED")
    .reduce((acc, r) => acc + r.lengthMetres, 0);

  const costPerGoodMetre = passedMetres > 0 ? Math.round((totalCost / passedMetres) * 100) / 100 : null;

  // "Cost incomplete" flag if order is in progress or missing consumption records
  const isComplete = order.status === "COMPLETED";
  const isCostIncomplete = !isComplete || hasMissingYarnCost || yarnConsumedKg === 0;

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    yarnCost,
    yarnConsumedKg,
    labourCost,
    machineCost,
    totalHours,
    totalCost,
    invoicedRevenue,
    margin,
    totalRegisteredMetres,
    passedMetres,
    costPerGoodMetre,
    isCostIncomplete,
  };
}

/**
 * BR-23: Order Risk calculation
 */
export async function calculateOrderRisk(
  order: {
    id: string;
    orderNo: string;
    status: string;
    deadline: Date;
    qtyMetres: number;
    workOrders: Array<{ stage: string; status: string }>;
    rolls: Array<{ qcStatus: string; stockStatus: string; lengthMetres: number; dispatchLine?: { id: string } | null }>;
  },
  now: Date = new Date()
): Promise<{
  risk: "OVERDUE" | "AT_RISK" | "ON_TRACK";
  reason: string;
}> {
  if (order.status === "COMPLETED" || order.status === "CANCELLED") {
    return { risk: "ON_TRACK", reason: "" };
  }

  // 1. Overdue: deadline passed
  if (new Date(order.deadline) < now) {
    return {
      risk: "OVERDUE",
      reason: `Deadline passed (${new Date(order.deadline).toLocaleDateString()})`,
    };
  }

  // Estimated days remaining per stage
  const stageEstimates: Record<string, number> = {
    SPINNING: 2,
    WEAVING: 3,
    DYEING: 2,
  };
  let estimatedDays = 1; // 1 day for QC

  for (const wo of order.workOrders) {
    if (wo.status !== "COMPLETED") {
      estimatedDays += stageEstimates[wo.stage] || 2;
    }
  }

  const daysToDeadline = Math.max(
    0,
    (new Date(order.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check condition (a): days to deadline < estimated days remaining
  if (daysToDeadline < estimatedDays) {
    return {
      risk: "AT_RISK",
      reason: `${daysToDeadline.toFixed(1)} days left vs ~${estimatedDays} days required`,
    };
  }

  // Check condition (b): status AWAITING_YARN
  if (order.status === "AWAITING_YARN") {
    return {
      risk: "AT_RISK",
      reason: "Waiting for raw material arrival",
    };
  }

  // Check condition (c): active work order is BLOCKED
  const hasBlocked = order.workOrders.some((wo) => wo.status === "BLOCKED");
  if (hasBlocked) {
    return {
      risk: "AT_RISK",
      reason: "Work order blocked due to machine breakdown",
    };
  }

  // Check condition (d): Rework rolls and < 2 days to deadline
  const hasRework = order.rolls.some((r) => r.qcStatus === "REWORK");
  if (hasRework && daysToDeadline < 2) {
    return {
      risk: "AT_RISK",
      reason: `Has rework rolls with only ${daysToDeadline.toFixed(1)} days remaining`,
    };
  }

  // Check condition (e): QC resolved but every roll rejected
  const totalRolls = order.rolls.length;
  if (totalRolls > 0) {
    const allRejected = order.rolls.every((r) => r.qcStatus === "REJECTED");
    if (allRejected) {
      return {
        risk: "AT_RISK",
        reason: "All registered rolls were rejected in QC (no shippable fabric)",
      };
    }
  }

  return { risk: "ON_TRACK", reason: "" };
}

/**
 * BR-26: Actual Cash Flow vs Obligations for Finance
 */
export async function getMonthlyFinance(
  month: string, // YYYY-MM
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
  // End of month
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const nextMonthDate = m === 12 ? new Date(year + 1, 0, 1) : new Date(year, m, 1);

  // 1. CASH IN: Payments received in month
  const payments = await db.payment.findMany({
    where: {
      receivedAt: {
        gte: startOfMonth,
        lt: nextMonthDate,
      },
    },
    include: {
      invoice: {
        include: { order: { include: { buyer: true } } },
      },
    },
  });
  const cashIn = payments.reduce((acc, p) => acc + p.amount, 0);

  // 2. CASH OUT: Paid SupplierBills + Paid WageSummary in month
  const paidSupplierBills = await db.supplierBill.findMany({
    where: {
      status: "PAID",
      paidAt: {
        gte: startOfMonth,
        lt: nextMonthDate,
      },
    },
    include: { supplier: true },
  });
  const supplierCashOut = paidSupplierBills.reduce((acc, b) => acc + b.amount, 0);

  const paidWages = await db.wageSummary.findMany({
    where: {
      paidAt: {
        gte: startOfMonth,
        lt: nextMonthDate,
      },
    },
    include: { employee: true },
  });
  const wageCashOut = paidWages.reduce((acc, w) => acc + (w.paidAmount || w.amount), 0);

  const cashOut = supplierCashOut + wageCashOut;
  const netCashMovement = Math.round((cashIn - cashOut) * 100) / 100;

  // 3. OUTSTANDING OBLIGATIONS & RECEIVABLES (Labelled "Not cash")
  // Unpaid supplier bills
  const unpaidSupplierBills = await db.supplierBill.findMany({
    where: { status: "UNPAID" },
    include: { supplier: true },
  });
  const unpaidSupplierBillsTotal = unpaidSupplierBills.reduce((acc, b) => acc + b.amount, 0);

  // Unpaid wages for the month (Calculated or Closed, but not paid)
  const allMonthWages = await getMonthlyWages(month, db);
  const unpaidWagesList = allMonthWages.filter((w) => w.state !== "Paid");
  const unpaidWagesTotal = unpaidWagesList.reduce((acc, w) => acc + w.amount, 0);

  // Unpaid buyer invoices (Receivable)
  const unpaidInvoices = await db.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    include: { payments: true, order: { include: { buyer: true } } },
  });
  const unpaidInvoicesTotal = unpaidInvoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((pAcc, p) => pAcc + p.amount, 0);
    return acc + (inv.amount - paid);
  }, 0);

  // 4. Machine output for the month
  const machines = await db.machine.findMany({
    include: {
      workOrders: {
        include: {
          productionLogs: {
            where: {
              loggedAt: {
                gte: startOfMonth,
                lt: nextMonthDate,
              },
            },
          },
        },
      },
    },
  });

  const machineOutputs = machines.map((mach) => {
    let metres = 0;
    let hours = 0;
    for (const wo of mach.workOrders) {
      for (const log of wo.productionLogs) {
        metres += log.qtyMetres;
        hours += log.hours;
      }
    }
    return {
      machineId: mach.id,
      code: mach.code,
      type: mach.type,
      status: mach.status,
      metresProduced: metres,
      hoursWorked: hours,
    };
  });

  // 5. Order costing list for completed / active orders
  const orders = await db.order.findMany({
    where: {
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      buyer: true,
      fabricType: true,
    },
  });

  const orderCostings = [];
  let totalInvoicedRevenue = 0;
  let totalOrderCost = 0;

  for (const ord of orders) {
    const cost = await getOrderCost(ord.id, db);
    orderCostings.push({
      ...cost,
      buyerName: ord.buyer.name,
      fabricName: ord.fabricType.name,
      status: ord.status,
    });
    totalInvoicedRevenue += cost.invoicedRevenue;
    totalOrderCost += cost.totalCost;
  }

  const orderMargin = Math.round((totalInvoicedRevenue - totalOrderCost) * 100) / 100;

  return {
    month,
    // Item 4: Recorded cash movement
    cashIn: Math.round(cashIn * 100) / 100,
    cashOut: Math.round(cashOut * 100) / 100,
    supplierCashOut: Math.round(supplierCashOut * 100) / 100,
    wageCashOut: Math.round(wageCashOut * 100) / 100,
    netCashMovement,
    payments,
    paidSupplierBills,
    paidWages,

    // Item 5: Outstanding obligations (Not cash)
    unpaidSupplierBills,
    unpaidSupplierBillsTotal: Math.round(unpaidSupplierBillsTotal * 100) / 100,
    unpaidWagesList,
    unpaidWagesTotal: Math.round(unpaidWagesTotal * 100) / 100,
    unpaidInvoices,
    unpaidInvoicesTotal: Math.round(unpaidInvoicesTotal * 100) / 100,

    // Item 2: Machine output
    machineOutputs,

    // Item 1: Order costing
    orderCostings,
    totalInvoicedRevenue: Math.round(totalInvoicedRevenue * 100) / 100,
    totalOrderCost: Math.round(totalOrderCost * 100) / 100,
    orderMargin,
  };
}
