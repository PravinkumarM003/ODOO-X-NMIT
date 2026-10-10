import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import RollsQCClient from "./RollsQCClient";

export default async function RollsQCPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();

  const rolls = await prisma.roll.findMany({
    include: {
      order: {
        include: { buyer: true, fabricType: true },
      },
      weavingMachine: true,
      dyeingMachine: true,
      qcRecords: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rollsData = rolls.map((r) => {
    const latestQC = r.qcRecords[0];
    return {
      id: r.id,
      rollNo: r.rollNo,
      orderId: r.orderId,
      orderNo: r.order.orderNo,
      buyerName: r.order.buyer.name,
      fabricName: r.order.fabricType.name,
      lengthMetres: r.lengthMetres,
      weavingMachineCode: r.weavingMachine?.code || null,
      dyeingMachineCode: r.dyeingMachine?.code || null,
      qcStatus: r.qcStatus,
      stockStatus: r.stockStatus,
      createdAt: r.createdAt.toISOString(),
      qcRecordsCount: r.qcRecords.length,
      latestDefect:
        latestQC && latestQC.result !== "PASSED"
          ? {
              type: latestQC.defectType || "OTHER",
              severity: latestQC.severity || "MINOR",
              notes: latestQC.notes,
            }
          : null,
    };
  });

  // Calculate machine defect statistics (weaving & dyeing)
  const machines = await prisma.machine.findMany();
  const machineDefectStats = machines.map((m) => {
    const machineRolls = rolls.filter(
      (r) => r.weavingMachineId === m.id || r.dyeingMachineId === m.id
    );
    const defects = machineRolls.filter((r) =>
      r.qcRecords.some((qc) => qc.result !== "PASSED")
    );
    const defectRate =
      machineRolls.length > 0
        ? Math.round((defects.length / machineRolls.length) * 100)
        : 0;

    return {
      machineCode: m.code,
      type: m.type,
      defectCount: defects.length,
      totalRolls: machineRolls.length,
      defectRate,
    };
  });

  // Eligible orders for registration: in Dyeing or in QC
  const eligibleOrders = await prisma.order.findMany({
    where: {
      status: { in: ["IN_PRODUCTION", "IN_QC"] },
    },
    include: {
      buyer: true,
      fabricType: true,
      rolls: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const eligibleOrdersData = eligibleOrders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    buyerName: o.buyer.name,
    fabricName: o.fabricType.name,
    qtyMetres: o.qtyMetres,
    registeredMetres: o.rolls.reduce((a, r) => a + r.lengthMetres, 0),
  }));

  return (
    <AppShell user={user} notifications={notifications}>
      <RollsQCClient
        rolls={rollsData}
        eligibleOrdersForRegistration={eligibleOrdersData}
        machineDefects={machineDefectStats}
      />
    </AppShell>
  );
}
