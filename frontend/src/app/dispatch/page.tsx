import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import DispatchClient from "./DispatchClient";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);

  let data: any = { storeView: null, readyOrders: [], dispatches: [], invoices: [] };
  let notifications: any[] = [];

  try {
    const [dispatchRes, notifRes] = await Promise.all([
      apiClient.get<any>("/dispatch"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (dispatchRes) data = dispatchRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <DispatchClient
        storeView={data.storeView || { shelf: [], awaitingQC: [], quarantined: [], dispatched: [] }}
        readyOrders={data.readyOrders || []}
        dispatches={data.dispatches || []}
        invoices={data.invoices || []}
      />
    </AppShell>
  );
}
