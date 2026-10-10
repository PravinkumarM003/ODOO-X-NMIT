import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreRolls } from "@/services/dispatchService";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import DispatchClient from "./DispatchClient";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);
  const notifications = await getComputedNotifications();

  // 1. Get 4-section store view (BR-18)
  const storeView = await getStoreRolls();

  // 2. Find orders with Passed in-store rolls ready for dispatch
  const orders = await prisma.order.findMany({
    where: {
      rolls: {
        some: {
          qcStatus: "PASSED",
          stockStatus: "IN_STORE",
        },
      },
    },
    include: {
      buyer: true,
      fabricType: true,
      rolls: {
        include: { dispatchLine: true },
      },
    },
    orderBy: { deadline: "asc" },
  });

  const readyOrders = orders.map((o) => {
    const eligibleRolls = o.rolls.filter(
      (r) => r.qcStatus === "PASSED" && r.stockStatus === "IN_STORE" && !r.dispatchLine
    );
    const disabledRolls = o.rolls.filter(
      (r) => (r.qcStatus === "PENDING" || r.qcStatus === "REWORK") && r.stockStatus === "IN_STORE"
    );

    return {
      id: o.id,
      orderNo: o.orderNo,
      buyerName: o.buyer.name,
      fabricName: o.fabricType.name,
      colour: o.colour,
      pricePerMetre: o.pricePerMetre,
      eligibleRolls,
      disabledRolls,
    };
  }).filter((o) => o.eligibleRolls.length > 0);

  // 3. Dispatches list
  const dispatches = await prisma.dispatch.findMany({
    include: {
      order: { include: { buyer: true } },
      lines: { include: { roll: true } },
      invoice: true,
    },
    orderBy: { dispatchedAt: "desc" },
  });

  // 4. Invoices list
  const invoices = await prisma.invoice.findMany({
    include: {
      order: { include: { buyer: true } },
      dispatch: true,
      payments: true,
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <AppShell user={user} notifications={notifications}>
      <DispatchClient
        storeView={storeView}
        readyOrders={readyOrders}
        dispatches={dispatches}
        invoices={invoices}
      />
    </AppShell>
  );
}
