import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import OrderListClient from "./OrderListClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  let ordersRaw: any[] = [];
  let formData: any = { buyers: [], fabricTypes: [] };
  let notifications: any[] = [];

  try {
    const [ordersRes, formRes, notifRes] = await Promise.all([
      apiClient.get<any[]>("/orders"),
      apiClient.get<any>("/orders/form-data"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (ordersRes) ordersRaw = ordersRes;
    if (formRes) formData = formRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  const ordersData = ordersRaw.map((ord: any) => ({
    id: ord.id,
    orderNo: ord.orderNo,
    buyerName: ord.buyer?.name || "",
    fabricName: ord.fabricType?.name || "",
    colour: ord.colour,
    qtyMetres: ord.qtyMetres,
    deadline: ord.deadline,
    status: ord.status,
    submittedByBuyer: ord.submittedByBuyer,
    risk: ord.risk,
    progress: ord.progress,
  }));

  const fabricOptions = (formData.fabricTypes || []).map((ft: any) => ({
    id: ft.id,
    name: ft.name,
    yarnKgPerMetre: ft.yarnKgPerMetre,
    defaultPricePerMetre: ft.defaultPricePerMetre,
    yarnCode: ft.yarnCode || "",
  }));

  return (
    <AppShell user={user} notifications={notifications}>
      <OrderListClient
        orders={ordersData}
        buyers={formData.buyers || []}
        fabricTypes={fabricOptions}
        userRole={user.role}
      />
    </AppShell>
  );
}
