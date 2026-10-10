import { requireSession } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
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

  let data: any = { orders: [], fabricTypes: [], buyer: null };
  try {
    const res = await apiClient.get<any>("/buyer/orders");
    if (res) data = res;
  } catch {}

  const ordersData = (data.orders || []).map((ord: any) => {
    const buyerStatusText = getBuyerStatusWording(ord.status, ord.currentStage);
    return {
      id: ord.id,
      orderNo: ord.orderNo,
      fabricName: ord.fabricName,
      colour: ord.colour,
      qtyMetres: ord.qtyMetres,
      deadline: ord.deadline,
      buyerStatusText,
      internalStatus: ord.status,
      productionProgressPercent: ord.progress?.productionProgressPercent || 0,
      qcReadinessText: ord.progress?.qcReadiness?.statusText || "Pending",
      dispatchSummaryText: ord.progress?.dispatchCompletion?.summaryText || "0% Shipped",
    };
  });

  return (
    <AppShell user={session} notifications={[]}>
      <BuyerOrdersClient
        orders={ordersData}
        fabricTypes={data.fabricTypes || []}
        buyerName={data.buyer?.name || session.name}
      />
    </AppShell>
  );
}
