import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import YarnStoreClient from "./YarnStoreClient";

export const dynamic = "force-dynamic";

export default async function YarnStorePage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  let data: any = { items: [], suppliers: [], orders: [], allLots: [] };
  let notifications: any[] = [];

  try {
    const [yarnRes, notifRes] = await Promise.all([
      apiClient.get<any>("/yarn"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (yarnRes) data = yarnRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <YarnStoreClient
        items={data.items || []}
        suppliers={data.suppliers || []}
        orders={data.orders || []}
        allLots={data.allLots || []}
      />
    </AppShell>
  );
}
