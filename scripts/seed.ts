import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { deriveOrderStatusFromRolls } from "../src/services/orderStatusService";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting deterministic seed for TexFlow (Everest Textile Mills)...");

  // 1. Clean existing data in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.dispatchLine.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.qCRecord.deleteMany();
  await prisma.roll.deleteMany();
  await prisma.productionLog.deleteMany();
  await prisma.machineDowntime.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.supplierBill.deleteMany();
  await prisma.yarnLot.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.wageSummary.deleteMany();
  await prisma.order.deleteMany();
  await prisma.fabricType.deleteMany();
  await prisma.yarnItem.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.buyer.deleteMany();

  const passwordHash = await bcrypt.hash("everest2026", 10);
  const now = new Date();

  // Helper date generators
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 2. Buyers (4)
  const buyer1 = await prisma.buyer.create({
    data: {
      name: "Madras Garments Pvt Ltd",
      contactPerson: "R. Ramanathan",
      email: "buyer.madras@everest.demo",
      phone: "+91 98401 22334",
      address: "12 Nelson Manickam Road, Aminjikarai, Chennai 600029",
    },
  });

  const buyer2 = await prisma.buyer.create({
    data: {
      name: "Coastal Apparels",
      contactPerson: "Anita Varghese",
      email: "buyer.coastal@everest.demo",
      phone: "+91 94470 55667",
      address: "44 Harbour View Road, Willingdon Island, Kochi 682003",
    },
  });

  const buyer3 = await prisma.buyer.create({
    data: {
      name: "Kaveri Home Textiles",
      contactPerson: "S. K. Murugan",
      email: "buyer.kaveri@everest.demo",
      phone: "+91 97892 88990",
      address: "88 Sengunthar Puram, Karur 639002",
    },
  });

  const buyer4 = await prisma.buyer.create({
    data: {
      name: "Zenith Uniforms",
      contactPerson: "Deepak Mehra",
      email: "buyer.zenith@everest.demo",
      phone: "+91 98110 44556",
      address: "21 Okhla Industrial Area Phase III, New Delhi 110020",
    },
  });

  // 3. Users (7 accounts)
  await prisma.user.createMany({
    data: [
      {
        name: "Arunachalam Chettiar (Owner)",
        email: "owner@everest.demo",
        passwordHash,
        role: "OWNER",
      },
      {
        name: "Meenakshi Sundaram (Office)",
        email: "office@everest.demo",
        passwordHash,
        role: "OFFICE",
      },
      {
        name: "Selvam Kumar (Floor Supervisor)",
        email: "floor@everest.demo",
        passwordHash,
        role: "FLOOR",
      },
      {
        name: "R. Ramanathan (Madras Garments)",
        email: "buyer.madras@everest.demo",
        passwordHash,
        role: "BUYER",
        buyerId: buyer1.id,
      },
      {
        name: "Anita Varghese (Coastal Apparels)",
        email: "buyer.coastal@everest.demo",
        passwordHash,
        role: "BUYER",
        buyerId: buyer2.id,
      },
      {
        name: "S. K. Murugan (Kaveri Home Textiles)",
        email: "buyer.kaveri@everest.demo",
        passwordHash,
        role: "BUYER",
        buyerId: buyer3.id,
      },
      {
        name: "Deepak Mehra (Zenith Uniforms)",
        email: "buyer.zenith@everest.demo",
        passwordHash,
        role: "BUYER",
        buyerId: buyer4.id,
      },
    ],
  });

  // 4. Suppliers (2)
  const sup1 = await prisma.supplier.create({
    data: {
      name: "Salem Yarn Traders",
      contactPerson: "V. Thangavel",
      phone: "+91 94432 11223",
    },
  });

  const sup2 = await prisma.supplier.create({
    data: {
      name: "Coimbatore Spinners Co-op",
      contactPerson: "K. Palaniswami",
      phone: "+91 98422 66778",
    },
  });

  // 5. Yarn Items (5 items: one Low, one Out)
  const yarn1 = await prisma.yarnItem.create({
    data: {
      code: "YRN-C30-W",
      yarnType: "Combed Cotton",
      count: "30s",
      colour: "Bleached White",
      reorderThresholdKg: 300,
      unit: "kg",
    },
  });

  const yarn2 = await prisma.yarnItem.create({
    data: {
      code: "YRN-C40-B",
      yarnType: "Combed Cotton",
      count: "40s",
      colour: "Navy Blue",
      reorderThresholdKg: 250, // Low stock item
      unit: "kg",
    },
  });

  const yarn3 = await prisma.yarnItem.create({
    data: {
      code: "YRN-P50-K",
      yarnType: "Polyester Filament",
      count: "50D",
      colour: "Jet Black",
      reorderThresholdKg: 200, // Out of stock item (0 available)
      unit: "kg",
    },
  });

  const yarn4 = await prisma.yarnItem.create({
    data: {
      code: "YRN-C20-G",
      yarnType: "Carded Cotton",
      count: "20s",
      colour: "Grey Melange",
      reorderThresholdKg: 400,
      unit: "kg",
    },
  });

  const yarn5 = await prisma.yarnItem.create({
    data: {
      code: "YRN-L60-N",
      yarnType: "Linen Cotton Blend",
      count: "60s",
      colour: "Natural Raw",
      reorderThresholdKg: 150,
      unit: "kg",
    },
  });

  // 6. Fabric Types (4)
  const fab1 = await prisma.fabricType.create({
    data: {
      name: "Cotton Poplin 120 GSM",
      gsm: 120,
      widthCm: 140,
      yarnItemId: yarn1.id,
      yarnKgPerMetre: 0.18,
      defaultPricePerMetre: 145,
    },
  });

  const fab2 = await prisma.fabricType.create({
    data: {
      name: "Cotton Twill 180 GSM",
      gsm: 180,
      widthCm: 150,
      yarnItemId: yarn2.id,
      yarnKgPerMetre: 0.25,
      defaultPricePerMetre: 190,
    },
  });

  const fab3 = await prisma.fabricType.create({
    data: {
      name: "Polyester Crepe 90 GSM",
      gsm: 90,
      widthCm: 110,
      yarnItemId: yarn3.id,
      yarnKgPerMetre: 0.12,
      defaultPricePerMetre: 110,
    },
  });

  const fab4 = await prisma.fabricType.create({
    data: {
      name: "Cotton Canvas 240 GSM",
      gsm: 240,
      widthCm: 160,
      yarnItemId: yarn4.id,
      yarnKgPerMetre: 0.30,
      defaultPricePerMetre: 260,
    },
  });

  // 7. Machines (8)
  const spn1 = await prisma.machine.create({
    data: { code: "SPN-01", type: "SPINNING", status: "RUNNING", hourlyRate: 350 },
  });
  const spn2 = await prisma.machine.create({
    data: { code: "SPN-02", type: "SPINNING", status: "IDLE", hourlyRate: 350 },
  });
  const wvn1 = await prisma.machine.create({
    data: { code: "WVN-01", type: "WEAVING", status: "RUNNING", hourlyRate: 420 },
  });
  const wvn2 = await prisma.machine.create({
    data: { code: "WVN-02", type: "WEAVING", status: "RUNNING", hourlyRate: 420 },
  });
  const wvn3 = await prisma.machine.create({
    data: { code: "WVN-03", type: "WEAVING", status: "BREAKDOWN", hourlyRate: 420 },
  });
  const wvn4 = await prisma.machine.create({
    data: { code: "WVN-04", type: "WEAVING", status: "IDLE", hourlyRate: 420 },
  });
  const dye1 = await prisma.machine.create({
    data: { code: "DYE-01", type: "DYEING", status: "RUNNING", hourlyRate: 550 },
  });
  const dye2 = await prisma.machine.create({
    data: { code: "DYE-02", type: "DYEING", status: "IDLE", hourlyRate: 550 },
  });

  // Machine downtime for WVN-03
  await prisma.machineDowntime.create({
    data: {
      machineId: wvn3.id,
      startedAt: daysAgo(1),
      reason: "Warp tension motor failure and sensor fault",
    },
  });

  // 8. Employees (12)
  const employeesData = [
    { empNo: "EMP-001", name: "Murugesan K.", department: "SPINNING", jobTitle: "Lead Ring Frame Operator", dailyWage: 650, overtimeRatePerHour: 110 },
    { empNo: "EMP-002", name: "Suresh Babu", department: "SPINNING", jobTitle: "Doffer Technician", dailyWage: 580, overtimeRatePerHour: 100 },
    { empNo: "EMP-003", name: "Muthuvel P.", department: "WEAVING", jobTitle: "Master Weaver", dailyWage: 700, overtimeRatePerHour: 120 },
    { empNo: "EMP-004", name: "Kandasamy R.", department: "WEAVING", jobTitle: "Air-jet Loom Operator", dailyWage: 620, overtimeRatePerHour: 105 },
    { empNo: "EMP-005", name: "Vellaisamy T.", department: "WEAVING", jobTitle: "Loom Operator", dailyWage: 600, overtimeRatePerHour: 100 },
    { empNo: "EMP-006", name: "Dharmalingam S.", department: "DYEING", jobTitle: "Chief Dyeing Master", dailyWage: 750, overtimeRatePerHour: 130 },
    { empNo: "EMP-007", name: "Jayaprakash N.", department: "DYEING", jobTitle: "Jigger Dyeing Operator", dailyWage: 620, overtimeRatePerHour: 105 },
    { empNo: "EMP-008", name: "Anbuchelvan M.", department: "QC", jobTitle: "Senior Fabric Inspector", dailyWage: 680, overtimeRatePerHour: 115 },
    { empNo: "EMP-009", name: "Balamurugan C.", department: "QC", jobTitle: "QC Examiner", dailyWage: 600, overtimeRatePerHour: 100 },
    { empNo: "EMP-010", name: "Ramesh Kannan", department: "STORE", jobTitle: "Yarn Store In-charge", dailyWage: 640, overtimeRatePerHour: 110 },
    { empNo: "EMP-011", name: "Gopalakrishnan V.", department: "STORE", jobTitle: "Packing & Dispatch Clerk", dailyWage: 580, overtimeRatePerHour: 100 },
    { empNo: "EMP-012", name: "Geetha Lakshmi", department: "OFFICE", jobTitle: "Production Accounts Clerk", dailyWage: 720, overtimeRatePerHour: 125 },
  ];

  const employees = [];
  for (const emp of employeesData) {
    const created = await prisma.employee.create({ data: emp });
    employees.push(created);
  }

  // 9. Attendance (30 days of records for all 12 employees)
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    const dateStr = d.toISOString().split("T")[0];
    for (const emp of employees) {
      // mostly PRESENT, few ABSENT or LEAVE
      let status = "PRESENT";
      let ot = 0;
      const seedVal = (emp.empNo.charCodeAt(6) + i) % 17;
      if (seedVal === 0) status = "ABSENT";
      else if (seedVal === 1) status = "LEAVE";
      else if (seedVal > 12) ot = 2;

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: dateStr,
          shift: "MORNING",
          status,
          overtimeHours: ot,
        },
      });
    }
  }

  // 10. WageSummary: Last month closed for all 12 employees (9 paid, 3 closed but not recorded as paid)
  // Let's compute last month string YYYY-MM
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  for (let idx = 0; idx < employees.length; idx++) {
    const emp = employees[idx];
    const isPaid = idx < 9; // 9 paid, 3 unpaid
    const daysPresent = 25;
    const otHours = idx * 2;
    const wageAmount = Math.round(daysPresent * emp.dailyWage + otHours * emp.overtimeRatePerHour);

    await prisma.wageSummary.create({
      data: {
        employeeId: emp.id,
        month: lastMonthStr,
        daysPresent,
        overtimeHours: otHours,
        amount: wageAmount,
        closedAt: daysAgo(10),
        closedBy: "Arunachalam Chettiar (Owner)",
        paidAt: isPaid ? daysAgo(5) : null,
        paidAmount: isPaid ? wageAmount : null,
        paymentMethod: isPaid ? "BANK" : null,
        paymentReference: isPaid ? `NEFT-WAGE-${emp.empNo}` : null,
      },
    });
  }

  // 11. Yarn Lots & Initial Receipts
  // Lot 1 on yarn 1 (White 30s)
  const lot1 = await prisma.yarnLot.create({
    data: {
      lotCode: "LOT-0001",
      yarnItemId: yarn1.id,
      supplierId: sup1.id,
      receivedAt: daysAgo(20),
      qtyReceivedKg: 1200,
      unitCostPerKg: 280,
      receivedBy: "Ramesh Kannan",
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot1.id,
      type: "RECEIPT",
      qtyKg: 1200,
      reason: "Initial receipt: Lot LOT-0001",
      createdBy: "Ramesh Kannan",
      createdAt: daysAgo(20),
    },
  });

  // Lot 2 on yarn 1
  const lot2 = await prisma.yarnLot.create({
    data: {
      lotCode: "LOT-0002",
      yarnItemId: yarn1.id,
      supplierId: sup2.id,
      receivedAt: daysAgo(10),
      qtyReceivedKg: 800,
      unitCostPerKg: 285,
      receivedBy: "Ramesh Kannan",
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot2.id,
      type: "RECEIPT",
      qtyKg: 800,
      reason: "Initial receipt: Lot LOT-0002",
      createdBy: "Ramesh Kannan",
      createdAt: daysAgo(10),
    },
  });

  // Lot 3 on yarn 2 (Navy Blue 40s - Low stock: threshold 250, available ~180)
  const lot3 = await prisma.yarnLot.create({
    data: {
      lotCode: "LOT-0003",
      yarnItemId: yarn2.id,
      supplierId: sup1.id,
      receivedAt: daysAgo(15),
      qtyReceivedKg: 200,
      unitCostPerKg: 310,
      receivedBy: "Ramesh Kannan",
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn2.id,
      lotId: lot3.id,
      type: "RECEIPT",
      qtyKg: 200,
      reason: "Initial receipt: Lot LOT-0003",
      createdBy: "Ramesh Kannan",
      createdAt: daysAgo(15),
    },
  });

  // Lot 4 on yarn 4 (Melange 20s)
  const lot4 = await prisma.yarnLot.create({
    data: {
      lotCode: "LOT-0004",
      yarnItemId: yarn4.id,
      supplierId: sup2.id,
      receivedAt: daysAgo(25),
      qtyReceivedKg: 1500,
      unitCostPerKg: 240,
      receivedBy: "Ramesh Kannan",
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn4.id,
      lotId: lot4.id,
      type: "RECEIPT",
      qtyKg: 1500,
      reason: "Initial receipt: Lot LOT-0004",
      createdBy: "Ramesh Kannan",
      createdAt: daysAgo(25),
    },
  });

  // Lot 5 on yarn 5 (Linen 60s)
  const lot5 = await prisma.yarnLot.create({
    data: {
      lotCode: "LOT-0005",
      yarnItemId: yarn5.id,
      supplierId: sup1.id,
      receivedAt: daysAgo(8),
      qtyReceivedKg: 400,
      unitCostPerKg: 450,
      receivedBy: "Ramesh Kannan",
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn5.id,
      lotId: lot5.id,
      type: "RECEIPT",
      qtyKg: 400,
      reason: "Initial receipt: Lot LOT-0005",
      createdBy: "Ramesh Kannan",
      createdAt: daysAgo(8),
    },
  });

  // Supplier Bills: some paid, 2 unpaid
  await prisma.supplierBill.createMany({
    data: [
      {
        billNo: "BILL-0001",
        supplierId: sup1.id,
        lotId: lot1.id,
        amount: 336000,
        billedAt: daysAgo(20),
        status: "PAID",
        paidAt: daysAgo(12),
      },
      {
        billNo: "BILL-0002",
        supplierId: sup2.id,
        lotId: lot2.id,
        amount: 228000,
        billedAt: daysAgo(10),
        status: "PAID",
        paidAt: daysAgo(2),
      },
      {
        billNo: "BILL-0003",
        supplierId: sup1.id,
        lotId: lot3.id,
        amount: 62000,
        billedAt: daysAgo(15),
        status: "UNPAID",
        paidAt: null,
      },
      {
        billNo: "BILL-0004",
        supplierId: sup2.id,
        lotId: lot4.id,
        amount: 360000,
        billedAt: daysAgo(25),
        status: "PAID",
        paidAt: daysAgo(18),
      },
      {
        billNo: "BILL-0005",
        supplierId: sup1.id,
        lotId: lot5.id,
        amount: 180000,
        billedAt: daysAgo(8),
        status: "UNPAID",
        paidAt: null,
      },
    ],
  });

  // 12. Create exactly 11 Orders across all specified states
  // Count: 1 NEW, 2 AWAITING_YARN, 1 CONFIRMED, 2 IN_PRODUCTION, 1 IN_QC, 1 READY_TO_SHIP, 1 PARTIALLY_DISPATCHED, 2 COMPLETED = 11 orders!
  // One is Overdue. Every buyer has at least one order.

  // ORDER 1: NEW (Submitted by buyer 1: Madras Garments) -> Demo Storyline
  const ord1 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0001",
      buyerId: buyer1.id,
      fabricTypeId: fab1.id,
      colour: "Bleached White",
      qtyMetres: 600,
      deadline: daysFromNow(12),
      pricePerMetre: 145,
      status: "NEW",
      yarnRequiredKg: 108,
      shortageKg: 0,
      submittedByBuyer: true,
      createdBy: "R. Ramanathan (Madras Garments)",
      createdAt: daysAgo(1),
    },
  });

  // ORDER 2: AWAITING_YARN (Buyer 2: Coastal Apparels) -> Needs yarn3 (Out of stock!) -> Demo Storyline: Receive yarn to auto-allocate!
  const ord2 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0002",
      buyerId: buyer2.id,
      fabricTypeId: fab3.id,
      colour: "Jet Black",
      qtyMetres: 1000,
      deadline: daysFromNow(8),
      pricePerMetre: 110,
      status: "AWAITING_YARN",
      yarnRequiredKg: 120,
      shortageKg: 120, // yarn3 has 0 available
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(3),
    },
  });

  // ORDER 3: AWAITING_YARN (Buyer 3: Kaveri) -> OVERDUE ORDER (deadline passed 2 days ago!)
  const ord3 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0003",
      buyerId: buyer3.id,
      fabricTypeId: fab3.id,
      colour: "Jet Black",
      qtyMetres: 500,
      deadline: daysAgo(2), // Overdue!
      pricePerMetre: 110,
      status: "AWAITING_YARN",
      yarnRequiredKg: 60,
      shortageKg: 60,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(10),
    },
  });

  // ORDER 4: CONFIRMED (Buyer 4: Zenith) -> fab4 (Canvas), yarn reserved
  const ord4 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0004",
      buyerId: buyer4.id,
      fabricTypeId: fab4.id,
      colour: "Grey Melange",
      qtyMetres: 800,
      deadline: daysFromNow(15),
      pricePerMetre: 260,
      status: "CONFIRMED",
      yarnRequiredKg: 240,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(4),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn4.id,
      orderId: ord4.id,
      type: "RESERVE",
      qtyKg: 240,
      reason: `Reservation for Order ${ord4.orderNo}`,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(4),
    },
  });
  // WorkOrders for ord4
  await prisma.workOrder.createMany({
    data: [
      { orderId: ord4.id, stage: "SPINNING", plannedQtyMetres: 800, producedQtyMetres: 0, status: "NOT_STARTED" },
      { orderId: ord4.id, stage: "WEAVING", plannedQtyMetres: 800, producedQtyMetres: 0, status: "NOT_STARTED" },
      { orderId: ord4.id, stage: "DYEING", plannedQtyMetres: 800, producedQtyMetres: 0, status: "NOT_STARTED" },
    ],
  });

  // ORDER 5: IN_PRODUCTION (WEAVING stage, on WVN-03 BREAKDOWN!) -> At risk demo!
  const ord5 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0005",
      buyerId: buyer1.id,
      fabricTypeId: fab1.id,
      colour: "Bleached White",
      qtyMetres: 500,
      deadline: daysFromNow(5),
      pricePerMetre: 145,
      status: "IN_PRODUCTION",
      currentStage: "WEAVING",
      yarnRequiredKg: 90,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(6),
    },
  });
  // ord5 had yarn consumed at spinning completion
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot1.id,
      orderId: ord5.id,
      type: "CONSUME",
      qtyKg: 90,
      reason: `Spinning consumption for Order ${ord5.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(5),
    },
  });
  // ord5 WorkOrders
  const wo5_spn = await prisma.workOrder.create({
    data: {
      orderId: ord5.id,
      stage: "SPINNING",
      machineId: spn1.id,
      plannedQtyMetres: 500,
      producedQtyMetres: 500,
      status: "COMPLETED",
      startedAt: daysAgo(6),
      completedAt: daysAgo(5),
    },
  });
  const wo5_wvn = await prisma.workOrder.create({
    data: {
      orderId: ord5.id,
      stage: "WEAVING",
      machineId: wvn3.id,
      plannedQtyMetres: 500,
      producedQtyMetres: 180,
      status: "BLOCKED", // Blocked due to machine breakdown
      startedAt: daysAgo(4),
    },
  });
  await prisma.workOrder.create({
    data: {
      orderId: ord5.id,
      stage: "DYEING",
      plannedQtyMetres: 500,
      producedQtyMetres: 0,
      status: "NOT_STARTED",
    },
  });
  // Production logs for ord5
  await prisma.productionLog.create({
    data: {
      workOrderId: wo5_spn.id,
      employeeId: employees[0].id,
      qtyMetres: 500,
      hours: 12,
      shift: "MORNING",
      loggedAt: daysAgo(5),
    },
  });
  await prisma.productionLog.create({
    data: {
      workOrderId: wo5_wvn.id,
      employeeId: employees[2].id,
      qtyMetres: 180,
      hours: 6,
      shift: "EVENING",
      loggedAt: daysAgo(2),
    },
  });

  // ORDER 6: IN_PRODUCTION (DYEING stage on DYE-01)
  const ord6 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0006",
      buyerId: buyer2.id,
      fabricTypeId: fab2.id,
      colour: "Navy Blue",
      qtyMetres: 400,
      deadline: daysFromNow(7),
      pricePerMetre: 190,
      status: "IN_PRODUCTION",
      currentStage: "DYEING",
      yarnRequiredKg: 100,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(8),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn2.id,
      lotId: lot3.id,
      orderId: ord6.id,
      type: "CONSUME",
      qtyKg: 100,
      reason: `Spinning consumption for Order ${ord6.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(7),
    },
  });
  const wo6_spn = await prisma.workOrder.create({
    data: {
      orderId: ord6.id,
      stage: "SPINNING",
      machineId: spn1.id,
      plannedQtyMetres: 400,
      producedQtyMetres: 400,
      status: "COMPLETED",
      startedAt: daysAgo(8),
      completedAt: daysAgo(7),
    },
  });
  const wo6_wvn = await prisma.workOrder.create({
    data: {
      orderId: ord6.id,
      stage: "WEAVING",
      machineId: wvn1.id,
      plannedQtyMetres: 400,
      producedQtyMetres: 400,
      status: "COMPLETED",
      startedAt: daysAgo(6),
      completedAt: daysAgo(4),
    },
  });
  const wo6_dye = await prisma.workOrder.create({
    data: {
      orderId: ord6.id,
      stage: "DYEING",
      machineId: dye1.id,
      plannedQtyMetres: 400,
      producedQtyMetres: 240,
      status: "IN_PROGRESS",
      startedAt: daysAgo(3),
    },
  });
  // Production logs for ord6
  await prisma.productionLog.create({
    data: {
      workOrderId: wo6_spn.id,
      employeeId: employees[1].id,
      qtyMetres: 400,
      hours: 10,
      shift: "MORNING",
      loggedAt: daysAgo(7),
    },
  });
  await prisma.productionLog.create({
    data: {
      workOrderId: wo6_wvn.id,
      employeeId: employees[3].id,
      qtyMetres: 400,
      hours: 12,
      shift: "EVENING",
      loggedAt: daysAgo(4),
    },
  });
  // Log today's output! (Section 7.2 requirement: today's output by machine non-zero)
  await prisma.productionLog.create({
    data: {
      workOrderId: wo6_dye.id,
      employeeId: employees[5].id,
      qtyMetres: 240,
      hours: 6,
      shift: "MORNING",
      loggedAt: now,
    },
  });

  // ORDER 7: IN_QC with mixed roll results (Pending, Rework, Rejected, Passed)
  const ord7 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0007",
      buyerId: buyer3.id,
      fabricTypeId: fab4.id,
      colour: "Grey Melange",
      qtyMetres: 600,
      deadline: daysFromNow(4),
      pricePerMetre: 260,
      status: "IN_QC",
      yarnRequiredKg: 180,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(10),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn4.id,
      lotId: lot4.id,
      orderId: ord7.id,
      type: "CONSUME",
      qtyKg: 180,
      reason: `Spinning consumption for Order ${ord7.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(9),
    },
  });
  await prisma.workOrder.createMany({
    data: [
      { orderId: ord7.id, stage: "SPINNING", machineId: spn1.id, plannedQtyMetres: 600, producedQtyMetres: 600, status: "COMPLETED", startedAt: daysAgo(10), completedAt: daysAgo(9) },
      { orderId: ord7.id, stage: "WEAVING", machineId: wvn2.id, plannedQtyMetres: 600, producedQtyMetres: 600, status: "COMPLETED", startedAt: daysAgo(8), completedAt: daysAgo(6) },
      { orderId: ord7.id, stage: "DYEING", machineId: dye1.id, plannedQtyMetres: 600, producedQtyMetres: 600, status: "COMPLETED", startedAt: daysAgo(5), completedAt: daysAgo(3) },
    ],
  });

  // ORDER 8: READY_TO_SHIP (Zero dispatches, all Passed in-store, no Pending or Rework)
  const ord8 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0008",
      buyerId: buyer4.id,
      fabricTypeId: fab1.id,
      colour: "Bleached White",
      qtyMetres: 400,
      deadline: daysFromNow(6),
      pricePerMetre: 145,
      status: "READY_TO_SHIP",
      yarnRequiredKg: 72,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(12),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot1.id,
      orderId: ord8.id,
      type: "CONSUME",
      qtyKg: 72,
      reason: `Spinning consumption for Order ${ord8.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(11),
    },
  });
  await prisma.workOrder.createMany({
    data: [
      { orderId: ord8.id, stage: "SPINNING", machineId: spn1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(12), completedAt: daysAgo(11) },
      { orderId: ord8.id, stage: "WEAVING", machineId: wvn1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(10), completedAt: daysAgo(8) },
      { orderId: ord8.id, stage: "DYEING", machineId: dye2.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(7), completedAt: daysAgo(5) },
    ],
  });

  // ORDER 9: PARTIALLY_DISPATCHED (Has 1 dispatch, 1 invoice, and Passed in-store rolls still on shelf!)
  const ord9 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0009",
      buyerId: buyer1.id,
      fabricTypeId: fab1.id,
      colour: "Bleached White",
      qtyMetres: 500,
      deadline: daysFromNow(3),
      pricePerMetre: 145,
      status: "PARTIALLY_DISPATCHED",
      yarnRequiredKg: 90,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(14),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot1.id,
      orderId: ord9.id,
      type: "CONSUME",
      qtyKg: 90,
      reason: `Spinning consumption for Order ${ord9.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(13),
    },
  });
  await prisma.workOrder.createMany({
    data: [
      { orderId: ord9.id, stage: "SPINNING", machineId: spn2.id, plannedQtyMetres: 500, producedQtyMetres: 500, status: "COMPLETED", startedAt: daysAgo(14), completedAt: daysAgo(13) },
      { orderId: ord9.id, stage: "WEAVING", machineId: wvn2.id, plannedQtyMetres: 500, producedQtyMetres: 500, status: "COMPLETED", startedAt: daysAgo(12), completedAt: daysAgo(10) },
      { orderId: ord9.id, stage: "DYEING", machineId: dye1.id, plannedQtyMetres: 500, producedQtyMetres: 500, status: "COMPLETED", startedAt: daysAgo(9), completedAt: daysAgo(7) },
    ],
  });

  // ORDER 10: COMPLETED 1 (Fully dispatched, Invoice Paid)
  const ord10 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0010",
      buyerId: buyer2.id,
      fabricTypeId: fab4.id,
      colour: "Grey Melange",
      qtyMetres: 400,
      deadline: daysAgo(3),
      pricePerMetre: 260,
      status: "COMPLETED",
      yarnRequiredKg: 120,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(18),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn4.id,
      lotId: lot4.id,
      orderId: ord10.id,
      type: "CONSUME",
      qtyKg: 120,
      reason: `Spinning consumption for Order ${ord10.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(17),
    },
  });
  const wo10_spn = await prisma.workOrder.create({
    data: { orderId: ord10.id, stage: "SPINNING", machineId: spn1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(18), completedAt: daysAgo(17) },
  });
  const wo10_wvn = await prisma.workOrder.create({
    data: { orderId: ord10.id, stage: "WEAVING", machineId: wvn1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(16), completedAt: daysAgo(14) },
  });
  const wo10_dye = await prisma.workOrder.create({
    data: { orderId: ord10.id, stage: "DYEING", machineId: dye1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(13), completedAt: daysAgo(11) },
  });
  // Production logs for ord10
  await prisma.productionLog.create({
    data: { workOrderId: wo10_spn.id, employeeId: employees[0].id, qtyMetres: 400, hours: 8, shift: "MORNING", loggedAt: daysAgo(17) },
  });
  await prisma.productionLog.create({
    data: { workOrderId: wo10_wvn.id, employeeId: employees[2].id, qtyMetres: 400, hours: 10, shift: "MORNING", loggedAt: daysAgo(14) },
  });
  await prisma.productionLog.create({
    data: { workOrderId: wo10_dye.id, employeeId: employees[5].id, qtyMetres: 400, hours: 8, shift: "EVENING", loggedAt: daysAgo(11) },
  });

  // ORDER 11: COMPLETED 2 (With 1 Rejected roll! Shows shortfall note: "Delivered X of Y m (Z m rejected)", Invoice Partial)
  const ord11 = await prisma.order.create({
    data: {
      orderNo: "ORD-2026-0011",
      buyerId: buyer3.id,
      fabricTypeId: fab1.id,
      colour: "Bleached White",
      qtyMetres: 400,
      deadline: daysAgo(1),
      pricePerMetre: 145,
      status: "COMPLETED",
      yarnRequiredKg: 72,
      shortageKg: 0,
      submittedByBuyer: false,
      createdBy: "Meenakshi Sundaram",
      createdAt: daysAgo(20),
    },
  });
  await prisma.stockMovement.create({
    data: {
      yarnItemId: yarn1.id,
      lotId: lot1.id,
      orderId: ord11.id,
      type: "CONSUME",
      qtyKg: 72,
      reason: `Spinning consumption for Order ${ord11.orderNo}`,
      createdBy: "Selvam Kumar",
      createdAt: daysAgo(19),
    },
  });
  const wo11_spn = await prisma.workOrder.create({
    data: { orderId: ord11.id, stage: "SPINNING", machineId: spn1.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(20), completedAt: daysAgo(19) },
  });
  const wo11_wvn = await prisma.workOrder.create({
    data: { orderId: ord11.id, stage: "WEAVING", machineId: wvn3.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(18), completedAt: daysAgo(16) },
  });
  const wo11_dye = await prisma.workOrder.create({
    data: { orderId: ord11.id, stage: "DYEING", machineId: dye2.id, plannedQtyMetres: 400, producedQtyMetres: 400, status: "COMPLETED", startedAt: daysAgo(15), completedAt: daysAgo(13) },
  });
  await prisma.productionLog.create({
    data: { workOrderId: wo11_spn.id, employeeId: employees[1].id, qtyMetres: 400, hours: 8, shift: "MORNING", loggedAt: daysAgo(19) },
  });
  await prisma.productionLog.create({
    data: { workOrderId: wo11_wvn.id, employeeId: employees[3].id, qtyMetres: 400, hours: 10, shift: "MORNING", loggedAt: daysAgo(16) },
  });
  await prisma.productionLog.create({
    data: { workOrderId: wo11_dye.id, employeeId: employees[6].id, qtyMetres: 400, hours: 8, shift: "EVENING", loggedAt: daysAgo(13) },
  });

  // 13. Rolls (exactly 28 rolls):
  // Target status split:
  // 20 Passed (one was first marked Rework and later passed!)
  // 2 Rework
  // 2 Rejected
  // 4 Pending
  // Total = 28 rolls!

  const rolls = [];
  let rollIdx = 1;
  const nextRollNo = () => `ROLL-${String(rollIdx++).padStart(4, "0")}`;

  // Rolls on ORDER 7 (IN_QC): 6 rolls
  // 1 Passed, 2 Rework, 1 Rejected (defects from WVN-03), 2 Pending
  // Roll 1: Pending
  const r1 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PENDING", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  rolls.push(r1);

  // Roll 2: Pending
  const r2 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PENDING", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  rolls.push(r2);

  // Roll 3: Rework (UNEVEN_WEAVE from WVN-03)
  const r3 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn3.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "REWORK", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0001", rollId: r3.id, inspectorName: "Anbuchelvan M.", result: "REWORK", defectType: "UNEVEN_WEAVE", severity: "MAJOR", notes: "Uneven warp tension bands visible across roll width", createdAt: daysAgo(2) },
  });
  rolls.push(r3);

  // Roll 4: Rework (COLOUR_MISMATCH)
  const r4 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "REWORK", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0002", rollId: r4.id, inspectorName: "Balamurugan C.", result: "REWORK", defectType: "COLOUR_MISMATCH", severity: "MINOR", notes: "Selvedge shade variation", createdAt: daysAgo(2) },
  });
  rolls.push(r4);

  // Roll 5: Rejected (Quarantined! Severe HOLE from WVN-03 loom shuttle strike)
  const r5 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn3.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "REJECTED", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0003", rollId: r5.id, inspectorName: "Anbuchelvan M.", result: "REJECTED", defectType: "HOLE", severity: "CRITICAL", notes: "Repeated shuttle damage holes every 2 metres. Quarantine immediately.", createdAt: daysAgo(2) },
  });
  rolls.push(r5);

  // Roll 6: Passed (was first REWORK, then re-inspected and PASSED! To demonstrate history preservation)
  const r6 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord7.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "IN_STORE", createdAt: daysAgo(3) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0004", rollId: r6.id, inspectorName: "Balamurugan C.", result: "REWORK", defectType: "OTHER", severity: "MINOR", notes: "Surface lint and oil spot on tail edge", createdAt: daysAgo(2) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0005", rollId: r6.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Re-cleared after trimming tail and ultrasonic cleaning", createdAt: daysAgo(1) },
  });
  rolls.push(r6);

  // Rolls on ORDER 8 (READY_TO_SHIP): 4 rolls, all Passed and In Store, zero dispatches
  for (let k = 0; k < 4; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord8.id, weavingMachineId: wvn1.id, dyeingMachineId: dye2.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "IN_STORE", createdAt: daysAgo(5) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 4).padStart(4, "0")}`, rollId: r.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Clean uniform weave, passed AATCC standards", createdAt: daysAgo(4) },
    });
    rolls.push(r);
  }

  // Rolls on ORDER 9 (PARTIALLY_DISPATCHED): 5 rolls
  // 3 Dispatched, 2 Passed still In Store on shelf!
  const ord9DispatchedRolls = [];
  for (let k = 0; k < 3; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord9.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "DISPATCHED", createdAt: daysAgo(7) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 8).padStart(4, "0")}`, rollId: r.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Passed inspection", createdAt: daysAgo(6) },
    });
    rolls.push(r);
    ord9DispatchedRolls.push(r);
  }
  // 2 Passed on shelf for ord9
  for (let k = 0; k < 2; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord9.id, weavingMachineId: wvn2.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "IN_STORE", createdAt: daysAgo(7) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 11).padStart(4, "0")}`, rollId: r.id, inspectorName: "Balamurugan C.", result: "PASSED", notes: "Passed inspection, stored on Shelf Bay B", createdAt: daysAgo(6) },
    });
    rolls.push(r);
  }

  // Rolls on ORDER 10 (COMPLETED 1): 4 rolls, all 4 Passed and Dispatched
  const ord10DispatchedRolls = [];
  for (let k = 0; k < 4; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord10.id, weavingMachineId: wvn1.id, dyeingMachineId: dye1.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "DISPATCHED", createdAt: daysAgo(11) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 13).padStart(4, "0")}`, rollId: r.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Grade A export quality", createdAt: daysAgo(10) },
    });
    rolls.push(r);
    ord10DispatchedRolls.push(r);
  }

  // Rolls on ORDER 11 (COMPLETED 2): 4 rolls total (3 Passed & Dispatched, 1 Rejected & In Store quarantine!)
  const ord11DispatchedRolls = [];
  for (let k = 0; k < 3; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord11.id, weavingMachineId: wvn3.id, dyeingMachineId: dye2.id, lengthMetres: 100, qcStatus: "PASSED", stockStatus: "DISPATCHED", createdAt: daysAgo(13) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 17).padStart(4, "0")}`, rollId: r.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Minor slub removed, passed", createdAt: daysAgo(12) },
    });
    rolls.push(r);
    ord11DispatchedRolls.push(r);
  }
  // Roll 4 of ord11: REJECTED (Quarantined)
  const rRejected11 = await prisma.roll.create({
    data: { rollNo: nextRollNo(), orderId: ord11.id, weavingMachineId: wvn3.id, dyeingMachineId: dye2.id, lengthMetres: 100, qcStatus: "REJECTED", stockStatus: "IN_STORE", createdAt: daysAgo(13) },
  });
  await prisma.qCRecord.create({
    data: { qcNo: "QC-0021", rollId: rRejected11.id, inspectorName: "Balamurugan C.", result: "REJECTED", defectType: "COLOUR_MISMATCH", severity: "MAJOR", notes: "Severe dye lot streak along weft", createdAt: daysAgo(12) },
  });
  rolls.push(rRejected11);

  // Rolls on ORDER 6 (IN_PRODUCTION): 5 rolls (2 Pending, 3 Passed on shelf)
  // Let's count current totals before adding ord6 rolls:
  // So far:
  // ord7: 1 Pending, 2 Rework, 1 Rejected, 1 Passed, 1 Pending (2 Pending, 2 Rework, 1 Rejected, 1 Passed)
  // ord8: 4 Passed
  // ord9: 3 Passed (disp), 2 Passed (shelf) (5 Passed)
  // ord10: 4 Passed (disp)
  // ord11: 3 Passed (disp), 1 Rejected (3 Passed, 1 Rejected)
  // Sum so far:
  // Passed = 1 + 4 + 5 + 4 + 3 = 17 Passed.
  // Rework = 2 Rework.
  // Rejected = 1 + 1 = 2 Rejected.
  // Pending = 2 Pending.
  // Total rolls so far = 17 + 2 + 2 + 2 = 23 rolls.
  // We need total exactly 28 rolls with split:
  // 20 Passed, 2 Rework, 2 Rejected, 4 Pending!
  // Difference needed:
  // Passed: 20 - 17 = 3 Passed!
  // Pending: 4 - 2 = 2 Pending!
  // Rework: 2 - 2 = 0 needed!
  // Rejected: 2 - 2 = 0 needed!
  // Exactly 3 Passed + 2 Pending = 5 rolls for Order 6!
  // Let's add them:
  // 3 Passed rolls:
  for (let k = 0; k < 3; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord6.id, weavingMachineId: wvn1.id, dyeingMachineId: dye1.id, lengthMetres: 80, qcStatus: "PASSED", stockStatus: "IN_STORE", createdAt: daysAgo(2) },
    });
    await prisma.qCRecord.create({
      data: { qcNo: `QC-${String(rollIdx + 22).padStart(4, "0")}`, rollId: r.id, inspectorName: "Anbuchelvan M.", result: "PASSED", notes: "Early roll check passed", createdAt: daysAgo(1) },
    });
    rolls.push(r);
  }
  // 2 Pending rolls:
  for (let k = 0; k < 2; k++) {
    const r = await prisma.roll.create({
      data: { rollNo: nextRollNo(), orderId: ord6.id, weavingMachineId: wvn1.id, dyeingMachineId: dye1.id, lengthMetres: 80, qcStatus: "PENDING", stockStatus: "IN_STORE", createdAt: daysAgo(1) },
    });
    rolls.push(r);
  }

  // 14. Dispatches (3) and Invoices (3)
  // Exactly three dispatch records, each with exactly one invoice:
  // - DSP-0001 & INV-0001 for ord10 (COMPLETED 1)
  //   4 rolls x 100m = 400m @ Rs 260 = Rs 104,000. Invoice status: PAID (1 full payment)
  const dsp1 = await prisma.dispatch.create({
    data: {
      dispatchNo: "DSP-0001",
      orderId: ord10.id,
      buyerId: ord10.buyerId,
      truckNo: "TN 38 AA 4512",
      driverName: "K. Selvaraj",
      dispatchedAt: daysAgo(8),
      dispatchedBy: "Gopalakrishnan V.",
    },
  });
  for (const r of ord10DispatchedRolls) {
    await prisma.dispatchLine.create({
      data: { dispatchId: dsp1.id, rollId: r.id, lengthMetres: r.lengthMetres },
    });
  }
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNo: "INV-0001",
      orderId: ord10.id,
      dispatchId: dsp1.id,
      amount: 400 * ord10.pricePerMetre, // 104,000
      issuedAt: daysAgo(8),
      status: "PAID",
    },
  });
  // Full payment received in current month
  await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      amount: inv1.amount,
      receivedAt: daysAgo(4),
      method: "BANK",
      reference: "NEFT-COASTAL-8842",
    },
  });

  // - DSP-0002 & INV-0002 for ord11 (COMPLETED 2)
  //   3 rolls x 100m = 300m @ Rs 145 = Rs 43,500. Invoice status: PARTIAL (1 part payment Rs 20,000)
  const dsp2 = await prisma.dispatch.create({
    data: {
      dispatchNo: "DSP-0002",
      orderId: ord11.id,
      buyerId: ord11.buyerId,
      truckNo: "TN 47 B 9901",
      driverName: "M. Ganesan",
      dispatchedAt: daysAgo(5),
      dispatchedBy: "Gopalakrishnan V.",
    },
  });
  for (const r of ord11DispatchedRolls) {
    await prisma.dispatchLine.create({
      data: { dispatchId: dsp2.id, rollId: r.id, lengthMetres: r.lengthMetres },
    });
  }
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNo: "INV-0002",
      orderId: ord11.id,
      dispatchId: dsp2.id,
      amount: 300 * ord11.pricePerMetre, // 43,500
      issuedAt: daysAgo(5),
      status: "PARTIAL",
    },
  });
  // Partial payment received in current month
  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      amount: 20000,
      receivedAt: daysAgo(2),
      method: "UPI",
      reference: "UPI-KAVERI-3391",
    },
  });

  // - DSP-0003 & INV-0003 for ord9 (PARTIALLY_DISPATCHED)
  //   3 rolls x 100m = 300m @ Rs 145 = Rs 43,500. Invoice status: UNPAID (0 payments)
  const dsp3 = await prisma.dispatch.create({
    data: {
      dispatchNo: "DSP-0003",
      orderId: ord9.id,
      buyerId: ord9.buyerId,
      truckNo: "TN 01 AK 6620",
      driverName: "S. Rajendran",
      dispatchedAt: daysAgo(2),
      dispatchedBy: "Gopalakrishnan V.",
    },
  });
  for (const r of ord9DispatchedRolls) {
    await prisma.dispatchLine.create({
      data: { dispatchId: dsp3.id, rollId: r.id, lengthMetres: r.lengthMetres },
    });
  }
  await prisma.invoice.create({
    data: {
      invoiceNo: "INV-0003",
      orderId: ord9.id,
      dispatchId: dsp3.id,
      amount: 300 * ord9.pricePerMetre, // 43,500
      issuedAt: daysAgo(2),
      status: "UNPAID",
    },
  });

  console.log("Seeding completed. Running comprehensive self-check...");

  // 15. SELF-CHECK (Section 9, Test 29, Test 32)
  const buyerCount = await prisma.buyer.count();
  const userCount = await prisma.user.count();
  const buyerUserCount = await prisma.user.count({ where: { role: "BUYER" } });
  const orderCount = await prisma.order.count();
  const rollCount = await prisma.roll.count();
  const machineCount = await prisma.machine.count();
  const employeeCount = await prisma.employee.count();
  const dispatchCount = await prisma.dispatch.count();
  const invoiceCount = await prisma.invoice.count();

  console.log(`- Buyers: ${buyerCount} (expected 4)`);
  console.log(`- Users: ${userCount} (expected 7)`);
  console.log(`- Buyer Logins: ${buyerUserCount} (expected 4)`);
  console.log(`- Orders: ${orderCount} (expected 11)`);
  console.log(`- Rolls: ${rollCount} (expected 28)`);
  console.log(`- Machines: ${machineCount} (expected 8)`);
  console.log(`- Employees: ${employeeCount} (expected 12)`);
  console.log(`- Dispatches: ${dispatchCount} (expected 3)`);
  console.log(`- Invoices: ${invoiceCount} (expected 3)`);

  if (buyerCount !== 4) throw new Error(`Self-check failed: Buyer count is ${buyerCount}, expected 4`);
  if (userCount !== 7) throw new Error(`Self-check failed: User count is ${userCount}, expected 7`);
  if (buyerUserCount !== 4) throw new Error(`Self-check failed: Buyer logins count is ${buyerUserCount}, expected 4`);
  if (orderCount !== 11) throw new Error(`Self-check failed: Order count is ${orderCount}, expected 11`);
  if (rollCount !== 28) throw new Error(`Self-check failed: Roll count is ${rollCount}, expected 28`);
  if (machineCount !== 8) throw new Error(`Self-check failed: Machine count is ${machineCount}, expected 8`);
  if (employeeCount !== 12) throw new Error(`Self-check failed: Employee count is ${employeeCount}, expected 12`);
  if (dispatchCount !== 3) throw new Error(`Self-check failed: Dispatch count is ${dispatchCount}, expected 3`);
  if (invoiceCount !== 3) throw new Error(`Self-check failed: Invoice count is ${invoiceCount}, expected 3`);

  // Check roll status split: 20 Passed, 2 Rework, 2 Rejected, 4 Pending
  const passedRolls = await prisma.roll.count({ where: { qcStatus: "PASSED" } });
  const reworkRolls = await prisma.roll.count({ where: { qcStatus: "REWORK" } });
  const rejectedRolls = await prisma.roll.count({ where: { qcStatus: "REJECTED" } });
  const pendingRolls = await prisma.roll.count({ where: { qcStatus: "PENDING" } });

  console.log(`- Roll QC breakdown: Passed=${passedRolls} (expected 20), Rework=${reworkRolls} (expected 2), Rejected=${rejectedRolls} (expected 2), Pending=${pendingRolls} (expected 4)`);
  if (passedRolls !== 20 || reworkRolls !== 2 || rejectedRolls !== 2 || pendingRolls !== 4) {
    throw new Error(`Self-check failed: Roll split mismatch (${passedRolls}, ${reworkRolls}, ${rejectedRolls}, ${pendingRolls})`);
  }

  // Check order status split:
  // 1 NEW, 2 AWAITING_YARN, 1 CONFIRMED, 2 IN_PRODUCTION, 1 IN_QC, 1 READY_TO_SHIP, 1 PARTIALLY_DISPATCHED, 2 COMPLETED = 11
  const orders = await prisma.order.findMany({
    include: {
      rolls: {
        include: { dispatchLine: true },
      },
    },
  });

  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  console.log("- Order status counts:", statusCounts);

  if (statusCounts["NEW"] !== 1) throw new Error("Order status NEW count != 1");
  if (statusCounts["AWAITING_YARN"] !== 2) throw new Error("Order status AWAITING_YARN count != 2");
  if (statusCounts["CONFIRMED"] !== 1) throw new Error("Order status CONFIRMED count != 1");
  if (statusCounts["IN_PRODUCTION"] !== 2) throw new Error("Order status IN_PRODUCTION count != 2");
  if (statusCounts["IN_QC"] !== 1) throw new Error("Order status IN_QC count != 1");
  if (statusCounts["READY_TO_SHIP"] !== 1) throw new Error("Order status READY_TO_SHIP count != 1");
  if (statusCounts["PARTIALLY_DISPATCHED"] !== 1) throw new Error("Order status PARTIALLY_DISPATCHED count != 1");
  if (statusCounts["COMPLETED"] !== 2) throw new Error("Order status COMPLETED count != 2");

  // BR-16 consistency check: Every order that has entered QC/dispatch matches deriveOrderStatusFromRolls
  for (const o of orders) {
    if (["IN_QC", "READY_TO_SHIP", "PARTIALLY_DISPATCHED", "COMPLETED"].includes(o.status)) {
      const derived = deriveOrderStatusFromRolls(o.rolls, o.qtyMetres);
      if (o.status !== derived.status) {
        throw new Error(
          `Order ${o.orderNo} stored status "${o.status}" does not match derived status "${derived.status}" (BR-16 self-check failed)`
        );
      }
    }
  }

  // Invoice status check: Paid, Partial, Unpaid
  const invPaid = await prisma.invoice.count({ where: { status: "PAID" } });
  const invPartial = await prisma.invoice.count({ where: { status: "PARTIAL" } });
  const invUnpaid = await prisma.invoice.count({ where: { status: "UNPAID" } });
  console.log(`- Invoice statuses: Paid=${invPaid}, Partial=${invPartial}, Unpaid=${invUnpaid} (expected 1, 1, 1)`);
  if (invPaid !== 1 || invPartial !== 1 || invUnpaid !== 1) {
    throw new Error("Invoice status breakdown mismatch");
  }

  console.log("✓ ALL SELF-CHECKS PASSED! Seed database verified successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
