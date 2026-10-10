import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrderProgress } from "@/services/progressService";
import { calculateOrderRisk, getOrderCost } from "@/services/financeService";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import OrderDetailClient from "./OrderDetailClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: true,
      fabricType: {
        include: { yarnItem: true },
      },
      workOrders: {
        include: {
          machine: true,
          productionLogs: {
            include: { employee: true },
          },
        },
      },
      rolls: {
        include: {
          weavingMachine: true,
          dyeingMachine: true,
          dispatchLine: true,
          qcRecords: true,
        },
      },
      dispatches: {
        include: {
          lines: true,
          invoice: true,
        },
      },
      invoices: {
        include: {
          payments: true,
        },
      },
      stockMovements: {
        include: {
          lot: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const progress = await getOrderProgress(order.id);
  const risk = await calculateOrderRisk(order);
  const cost = user.role === "OWNER" ? await getOrderCost(order.id) : null;

  return (
    <AppShell user={user} notifications={notifications}>
      <OrderDetailClient
        order={order}
        progress={progress}
        risk={risk}
        cost={cost}
        userRole={user.role}
      />
    </AppShell>
  );
}
