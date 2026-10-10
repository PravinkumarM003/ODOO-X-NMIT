import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrderProgress } from "@/services/progressService";
import { calculateOrderRisk } from "@/services/financeService";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import OrderListClient from "./OrderListClient";

export default async function OrdersPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();

  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
      fabricType: true,
      workOrders: true,
      rolls: {
        include: { dispatchLine: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const buyers = await prisma.buyer.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const fabricTypes = await prisma.fabricType.findMany({
    include: { yarnItem: true },
    orderBy: { name: "asc" },
  });

  const ordersData = await Promise.all(
    orders.map(async (ord) => {
      const progress = await getOrderProgress(ord.id);
      const risk = await calculateOrderRisk(ord);

      return {
        id: ord.id,
        orderNo: ord.orderNo,
        buyerName: ord.buyer.name,
        fabricName: ord.fabricType.name,
        colour: ord.colour,
        qtyMetres: ord.qtyMetres,
        deadline: ord.deadline.toISOString(),
        status: ord.status,
        submittedByBuyer: ord.submittedByBuyer,
        risk,
        progress,
      };
    })
  );

  const fabricOptions = fabricTypes.map((ft) => ({
    id: ft.id,
    name: ft.name,
    yarnKgPerMetre: ft.yarnKgPerMetre,
    defaultPricePerMetre: ft.defaultPricePerMetre,
    yarnCode: ft.yarnItem.code,
  }));

  return (
    <AppShell user={user} notifications={notifications}>
      <OrderListClient
        orders={ordersData}
        buyers={buyers}
        fabricTypes={fabricOptions}
        userRole={user.role}
      />
    </AppShell>
  );
}
