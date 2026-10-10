import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYarnStockSummary, getLotRemainings } from "@/services/yarnService";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import YarnStoreClient from "./YarnStoreClient";

export const dynamic = "force-dynamic";

export default async function YarnStorePage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();

  const yarnItems = await prisma.yarnItem.findMany({
    include: {
      lots: true,
      fabricTypes: {
        include: {
          orders: {
            where: { status: "AWAITING_YARN" },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const orders = await prisma.order.findMany({
    where: { status: { in: ["AWAITING_YARN", "CONFIRMED", "IN_PRODUCTION"] } },
    select: { id: true, orderNo: true, buyer: { select: { name: true } } },
    orderBy: { orderNo: "asc" },
  });

  // Calculate stock summary and shortage for each item
  const itemsData = await Promise.all(
    yarnItems.map(async (item) => {
      const stock = await getYarnStockSummary(item.id);

      // Shortage for orders waiting for this yarn
      let shortageAwaitingKg = 0;
      for (const ft of item.fabricTypes) {
        for (const ord of ft.orders) {
          shortageAwaitingKg += ord.shortageKg;
        }
      }

      return {
        id: item.id,
        code: item.code,
        yarnType: item.yarnType,
        count: item.count,
        colour: item.colour,
        reorderThresholdKg: item.reorderThresholdKg,
        unit: item.unit,
        stock,
        shortageAwaitingKg: Math.round(shortageAwaitingKg * 100) / 100,
        lotCount: item.lots.length,
      };
    })
  );

  // All lots for adjustment dropdown
  const allLotsList = [];
  for (const item of yarnItems) {
    const remainings = await getLotRemainings(item.id);
    for (const r of remainings) {
      allLotsList.push({
        id: r.lotId,
        lotCode: r.lotCode,
        yarnCode: item.code,
        remainingKg: r.remainingKg,
      });
    }
  }

  const flattenedOrders = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    buyerName: o.buyer.name,
  }));

  return (
    <AppShell user={user} notifications={notifications}>
      <YarnStoreClient
        items={itemsData}
        suppliers={suppliers}
        orders={flattenedOrders}
        allLots={allLotsList}
      />
    </AppShell>
  );
}
