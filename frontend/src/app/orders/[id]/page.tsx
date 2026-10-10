import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
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
  const { id } = await params;

  let detail: any = null;
  let notifications: any[] = [];

  try {
    const [detailRes, notifRes] = await Promise.all([
      apiClient.get<any>(`/orders/${id}`),
      apiClient.get<any[]>("/notifications"),
    ]);
    detail = detailRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  if (!detail || !detail.order) {
    notFound();
  }

  const cost = user.role === "OWNER" ? detail.cost : null;

  return (
    <AppShell user={user} notifications={notifications}>
      <OrderDetailClient
        order={detail.order}
        progress={detail.progress}
        risk={detail.risk}
        cost={cost}
        userRole={user.role}
      />
    </AppShell>
  );
}
