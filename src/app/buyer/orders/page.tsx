import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrderProgress } from "@/services/progressService";
import AppShell from "@/components/layout/AppShell";
import BuyerOrdersClient from "./BuyerOrdersClient";
import { redirect } from "next/navigation";

export function getBuyerStatusWording(status: string, currentStage?: string | null): string {
  if (status === "NEW") return "Order received";
  if (status === "AWAITING_YARN") return "Waiting for raw material";
  if (status === "CONFIRMED") return "Material reserved, scheduled";
  if (status === "IN_PRODUCTION") {
    if (currentStage === "SPINNING") return "In spinning";
    if (currentStage === "WEAVING") return "Being woven";
    if (currentStage === "DYEING") return "Being dyed";
    return "In production";
  }
  if (status === "IN_QC") return "Being checked";
  if (status === "READY_TO_SHIP") return "Ready to ship";
  if (status === "PARTIALLY_DISPATCHED") return "Partly shipped";
  if (status === "COMPLETED") return "Delivered / fully shipped";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage() {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    redirect("/overview");
  }

  const buyer = await prisma.buyer.findUnique({
    where: { id: session.buyerId },
  });

  const orders = await prisma.order.findMany({
    where: { buyerId: session.buyerId },
    include: {
      fabricType: true,
      workOrders: true,
      rolls: {
        include: { dispatchLine: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const ordersData = await Promise.all(
    orders.map(async (ord) => {
      const progress = await getOrderProgress(ord.id);
      const buyerStatusText = getBuyerStatusWording(ord.status, ord.currentStage);

      return {
        id: ord.id,
        orderNo: ord.orderNo,
        fabricName: ord.fabricType.name,
        colour: ord.colour,
        qtyMetres: ord.qtyMetres,
        deadline: ord.deadline.toISOString(),
        buyerStatusText,
        internalStatus: ord.status,
        productionProgressPercent: progress.productionProgressPercent,
        qcReadinessText: progress.qcReadiness.statusText,
        dispatchSummaryText: progress.dispatchCompletion.summaryText,
      };
    })
  );

  const fabricTypes = await prisma.fabricType.findMany({
    select: { id: true, name: true, defaultPricePerMetre: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={session} notifications={[]}>
      <BuyerOrdersClient
        orders={ordersData}
        fabricTypes={fabricTypes}
        buyerName={buyer?.name || session.name}
      />
    </AppShell>
  );
}
