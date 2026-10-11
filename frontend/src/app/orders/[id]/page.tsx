import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import OrderDetailClient from "./OrderDetailClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"]);
  const { id } = await params;

  let detail: any = null;
    try {
    const [detailRes] = await Promise.all([
      apiClient.get<any>(`/orders/${id}`),
    ]);
    detail = detailRes;
      } catch {}

  if (!detail || !detail.order) {
    notFound();
  }

  const cost = user.role === "ADMINISTRATOR" ? detail.cost : null;

  return (
    <>
      <OrderDetailClient
        order={{
          ...detail.order,
          workOrders: detail.workOrders || [],
          rolls: detail.rolls || [],
          movements: detail.movements || [],
          yarnAllocations: detail.yarnAllocations || [],
          dispatches: detail.dispatches || [],
          invoices: detail.invoices || []
        }}
        progress={detail.progress}
        risk={typeof detail.risk === "object" && detail.risk !== null ? detail.risk : { risk: detail.risk || "ON_TRACK", reason: detail.riskReason || "" }}
        cost={cost}
        userRole={user.role}
      />
    </>
  );
}
