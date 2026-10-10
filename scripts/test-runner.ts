import { PrismaClient } from "@prisma/client";
import {
  getYarnStockSummary,
  receiveYarn,
  adjustStock,
  getLotRemainings,
} from "../src/services/yarnService";
import {
  deriveOrderStatusFromRolls,
  recomputeOrderStatus,
} from "../src/services/orderStatusService";
import { createOrder, reviewBuyerOrder, cancelOrder } from "../src/services/orderService";
import {
  assignMachineToWorkOrder,
  logProductionOutput,
  completeSpinningStage,
  completeStage,
  reportMachineBreakdown,
  resolveMachineBreakdown,
} from "../src/services/productionService";
import { registerRolls, inspectRoll } from "../src/services/qcService";
import { createDispatch, recordPayment } from "../src/services/dispatchService";

const prisma = new PrismaClient();

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    failedTests++;
    throw new Error(msg);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`Testing: ${name} ... `);
  try {
    await fn();
    console.log("PASS");
    passedTests++;
  } catch (err: any) {
    console.log(`FAIL\n    Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log("=== TexFlow Automated Test Suite ===");

  // TEST 23: Stock Invariants (BR-02, BR-03)
  await runTest("Test 23: Stock invariants, ledger arithmetic & validation", async () => {
    // 1. Fetch any test yarn item
    const yarnItem = await prisma.yarnItem.findFirst({
      where: { code: "YRN-C30-W" },
    });
    assert(!!yarnItem, "Yarn item YRN-C30-W must exist");

    // 2. Reject negative or 0 receipt
    let errCaught = false;
    try {
      await receiveYarn({
        lotCode: "LOT-TEST-NEG",
        yarnItemId: yarnItem!.id,
        supplierId: (await prisma.supplier.findFirst())!.id,
        qtyReceivedKg: -10,
        unitCostPerKg: 200,
        receivedBy: "Test Runner",
      });
    } catch {
      errCaught = true;
    }
    assert(errCaught, "RECEIPT with negative quantity was rejected");

    errCaught = false;
    try {
      await receiveYarn({
        lotCode: "LOT-TEST-ZERO",
        yarnItemId: yarnItem!.id,
        supplierId: (await prisma.supplier.findFirst())!.id,
        qtyReceivedKg: 0,
        unitCostPerKg: 200,
        receivedBy: "Test Runner",
      });
    } catch {
      errCaught = true;
    }
    assert(errCaught, "RECEIPT with zero quantity was rejected");

    // 3. Receive 500 kg
    const initialSummary = await getYarnStockSummary(yarnItem!.id);
    const uniqueLotCode = `LOT-T-${Date.now()}`;
    const newLot = await receiveYarn({
      lotCode: uniqueLotCode,
      yarnItemId: yarnItem!.id,
      supplierId: (await prisma.supplier.findFirst())!.id,
      qtyReceivedKg: 500,
      unitCostPerKg: 250,
      receivedBy: "Test Runner",
    });

    const afterReceipt = await getYarnStockSummary(yarnItem!.id);
    assert(
      Math.abs(afterReceipt.onHandKg - (initialSummary.onHandKg + 500)) < 0.01,
      "On-hand rose by exactly 500 kg"
    );
    assert(
      Math.abs(afterReceipt.availableKg - (initialSummary.availableKg + 500)) < 0.01,
      "Available rose by exactly 500 kg"
    );

    // 4. Reject ADJUST of 0
    errCaught = false;
    try {
      await adjustStock({
        lotId: newLot.id,
        deltaKg: 0,
        reason: "Zero delta test",
        adjustedBy: "Test Runner",
      });
    } catch {
      errCaught = true;
    }
    assert(errCaught, "ADJUST with 0 delta was rejected");

    // 5. Reject negative ADJUST that exceeds lot remaining
    errCaught = false;
    try {
      await adjustStock({
        lotId: newLot.id,
        deltaKg: -600, // lot only has 500
        reason: "Excessive drop test",
        adjustedBy: "Test Runner",
      });
    } catch {
      errCaught = true;
    }
    assert(errCaught, "Negative ADJUST exceeding lot remaining was rejected");

    // 6. Valid positive and negative ADJUST
    await adjustStock({
      lotId: newLot.id,
      deltaKg: 50,
      reason: "Inventory surplus correction",
      adjustedBy: "Test Runner",
    });
    const afterPosAdj = await getYarnStockSummary(yarnItem!.id);
    assert(
      Math.abs(afterPosAdj.onHandKg - (afterReceipt.onHandKg + 50)) < 0.01,
      "On-hand updated by +50 kg"
    );

    await adjustStock({
      lotId: newLot.id,
      deltaKg: -50,
      reason: "Inventory balance return",
      adjustedBy: "Test Runner",
    });
    const afterNegAdj = await getYarnStockSummary(yarnItem!.id);
    assert(
      Math.abs(afterNegAdj.onHandKg - afterReceipt.onHandKg) < 0.01,
      "On-hand returned to receipt baseline"
    );

    // 7. Verify all yarn items satisfy on-hand >= 0, reserved >= 0, available >= 0
    const allItems = await prisma.yarnItem.findMany();
    for (const item of allItems) {
      const summary = await getYarnStockSummary(item.id);
      assert(summary.onHandKg >= 0, `Item ${item.code} on-hand >= 0`);
      assert(summary.reservedKg >= 0, `Item ${item.code} reserved >= 0`);
      assert(summary.availableKg >= 0, `Item ${item.code} available >= 0`);
    }
  });

  // TEST 31: Order Readiness and Completion Safety (BR-16)
  await runTest("Test 31: Order readiness & completion safety (pure and DB tests)", async () => {
    // (a) All rolls Passed and in store, none dispatched -> READY_TO_SHIP
    const resA = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PASSED", stockStatus: "IN_STORE", lengthMetres: 100 },
        { id: "2", qcStatus: "PASSED", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resA.status === "READY_TO_SHIP", "(a) Expected READY_TO_SHIP");

    // (b) All rolls Pending or Rework with none Passed -> IN_QC, never READY_TO_SHIP
    const resB = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PENDING", stockStatus: "IN_STORE", lengthMetres: 100 },
        { id: "2", qcStatus: "REWORK", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resB.status === "IN_QC", "(b) Expected IN_QC");

    // (c) No Pending or Rework, but zero Passed (every roll Rejected) and nothing dispatched -> stays IN_QC
    const resC = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "REJECTED", stockStatus: "IN_STORE", lengthMetres: 100 },
        { id: "2", qcStatus: "REJECTED", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resC.status === "IN_QC", "(c) Expected IN_QC when all rejected");
    assert(
      resC.explanation.includes("All 2 registered rolls") && resC.explanation.includes("Nothing can be shipped"),
      "(c) Explanation banner contains rejected quantity and cannot ship notice"
    );

    // (d) Zero rolls registered -> IN_QC showing "No rolls registered yet"
    const resD = deriveOrderStatusFromRolls([], 200);
    assert(resD.status === "IN_QC", "(d) Expected IN_QC with 0 rolls");
    assert(resD.explanation === "No rolls registered yet", "(d) Explanation matches exactly");

    // (e) One Passed roll dispatched while another is Pending -> PARTIALLY_DISPATCHED
    const resE1 = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PASSED", stockStatus: "DISPATCHED", lengthMetres: 100, dispatchLine: { id: "d1" } },
        { id: "2", qcStatus: "PENDING", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resE1.status === "PARTIALLY_DISPATCHED", "(e1) Expected PARTIALLY_DISPATCHED");

    // Resolving Pending roll as Rejected -> COMPLETED with shortfall note
    const resE2 = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PASSED", stockStatus: "DISPATCHED", lengthMetres: 100, dispatchLine: { id: "d1" } },
        { id: "2", qcStatus: "REJECTED", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resE2.status === "COMPLETED", "(e2) Expected COMPLETED");
    assert(resE2.explanation.includes("100.0 m rejected"), "(e2) Explanation has shortfall note");

    // Resolving Pending roll as Passed -> stays PARTIALLY_DISPATCHED
    const resE3 = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PASSED", stockStatus: "DISPATCHED", lengthMetres: 100, dispatchLine: { id: "d1" } },
        { id: "2", qcStatus: "PASSED", stockStatus: "IN_STORE", lengthMetres: 100 },
      ],
      200
    );
    assert(resE3.status === "PARTIALLY_DISPATCHED", "(e3) Expected PARTIALLY_DISPATCHED");

    // (f) Dispatching every Passed roll with none unresolved -> COMPLETED
    const resF = deriveOrderStatusFromRolls(
      [
        { id: "1", qcStatus: "PASSED", stockStatus: "DISPATCHED", lengthMetres: 100, dispatchLine: { id: "d1" } },
        { id: "2", qcStatus: "PASSED", stockStatus: "DISPATCHED", lengthMetres: 100, dispatchLine: { id: "d2" } },
      ],
      200
    );
    assert(resF.status === "COMPLETED", "(f) Expected COMPLETED");

    // (i) DB Invariants on seeded database
    const completedOrders = await prisma.order.findMany({
      where: { status: "COMPLETED" },
      include: { dispatches: { include: { lines: true } } },
    });
    for (const co of completedOrders) {
      const lineCount = co.dispatches.reduce((acc, d) => acc + d.lines.length, 0);
      assert(lineCount > 0, `COMPLETED Order ${co.orderNo} must have at least one DispatchLine`);
    }

    const readyOrders = await prisma.order.findMany({
      where: { status: "READY_TO_SHIP" },
      include: {
        dispatches: { include: { lines: true } },
        rolls: { include: { dispatchLine: true } },
      },
    });
    for (const ro of readyOrders) {
      const lineCount = ro.dispatches.reduce((acc, d) => acc + d.lines.length, 0);
      assert(lineCount === 0, `READY_TO_SHIP Order ${ro.orderNo} must have 0 DispatchLines`);
      const eligible = ro.rolls.filter((r) => r.qcStatus === "PASSED" && r.stockStatus === "IN_STORE" && !r.dispatchLine);
      assert(eligible.length > 0, `READY_TO_SHIP Order ${ro.orderNo} must have at least one eligible roll`);
    }
  });

  // TEST 1, 2, 3, 4: Order Lifecycle & Yarn Allocation
  await runTest("Test 1-4: Order creation, yarn sufficiency, and auto-allocation", async () => {
    const buyer = await prisma.buyer.findFirst();
    const fabPoplin = await prisma.fabricType.findFirst({
      where: { name: { contains: "Poplin" } },
      include: { yarnItem: true },
    });
    assert(!!buyer && !!fabPoplin, "Buyer and Poplin fabric type must exist");

    // Order needing 100,000 metres -> Insufficient yarn!
    const shortageOrder = await createOrder({
      buyerId: buyer!.id,
      fabricTypeId: fabPoplin!.id,
      colour: "White",
      qtyMetres: 100000,
      deadline: new Date(Date.now() + 10 * 86400000),
      createdBy: "Test Runner",
    });

    assert(
      shortageOrder.status === "AWAITING_YARN",
      `Expected status AWAITING_YARN, got ${shortageOrder.status}`
    );
    assert(shortageOrder.shortageKg > 0, "Shortage quantity is recorded");

    // Clean up test order
    await prisma.order.delete({ where: { id: shortageOrder.id } });
  });

  // TEST 14, 15, 26: Dispatch and Quarantine Rules
  await runTest("Test 12, 14, 26: Dispatch eligibility, double-dispatch prevention, and rejected quarantine", async () => {
    // 1. Try to dispatch a Rejected roll -> Must be refused with clear message
    const rejectedRoll = await prisma.roll.findFirst({
      where: { qcStatus: "REJECTED" },
    });
    assert(!!rejectedRoll, "Rejected roll must exist in database");

    let errCaught = false;
    let errMsg = "";
    try {
      await createDispatch({
        orderId: rejectedRoll!.orderId,
        rollIds: [rejectedRoll!.id],
        truckNo: "TN 01 TEST 123",
        driverName: "Tester",
        dispatchedBy: "Test Runner",
      });
    } catch (e: any) {
      errCaught = true;
      errMsg = e.message;
    }
    assert(errCaught, "Dispatch of Rejected roll was refused");
    assert(
      errMsg.includes("is Rejected (quarantined) and cannot be dispatched"),
      `Expected quarantine error message, got: ${errMsg}`
    );

    // 2. Try to dispatch an already dispatched roll -> Must be refused
    const dispatchedRoll = await prisma.roll.findFirst({
      where: { stockStatus: "DISPATCHED" },
    });
    assert(!!dispatchedRoll, "Dispatched roll must exist");

    errCaught = false;
    errMsg = "";
    try {
      await createDispatch({
        orderId: dispatchedRoll!.orderId,
        rollIds: [dispatchedRoll!.id],
        truckNo: "TN 01 TEST 123",
        driverName: "Tester",
        dispatchedBy: "Test Runner",
      });
    } catch (e: any) {
      errCaught = true;
      errMsg = e.message;
    }
    assert(errCaught, "Double dispatch of roll was refused");
    assert(
      errMsg.includes("has already been dispatched"),
      `Expected double dispatch message, got: ${errMsg}`
    );
  });

  console.log("\n=====================================");
  console.log(`Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=====================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test runner error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
