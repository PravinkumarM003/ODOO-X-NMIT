import { requireSession } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
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

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    redirect("/overview");
  }

  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const sortBy = (sp.sort_by as string) || "createdAt";
  const sortOrder = (sp.sort_order as string) || "desc";

  let data: any = { orders: [], fabricTypes: [], buyer: null, total: 0, page: 1 };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);

    const res = await apiClient.get<any>(`/buyer/orders?${params.toString()}`);
    if (res) data = res;
  } catch {}

  const ordersData = (data.orders || []).map((ord: any) => {
    // Note: getBuyerStatusWording logic is simplified as buyerStatusText is now sent from backend
    return {
      id: ord.id,
      orderNo: ord.orderNo,
      fabricName: ord.fabricName,
      colour: ord.colour,
      qtyMetres: ord.qtyMetres,
      deadline: ord.deadline,
      buyerStatusText: ord.buyerStatusText,
      internalStatus: ord.internalStatus,
      productionProgressPercent: ord.productionProgressPercent || 0,
      qcReadinessText: ord.qcReadinessText || "Pending",
      dispatchSummaryText: ord.dispatchSummaryText || "0% Shipped",
    };
  });

  return (
    <>
      <BuyerOrdersClient
        orders={ordersData}
        fabricTypes={data.fabricTypes || []}
        buyerName={data.buyerName || session.name}
        totalRecords={data.total || 0}
        currentPage={data.page || 1}
      />
    </>
  );
}
