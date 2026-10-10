import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import RollsQCClient from "./RollsQCClient";

export const dynamic = "force-dynamic";

export default async function RollsQCPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  let rollsRes: any = { rolls: [], eligibleOrders: [], machineDefects: [] };
  let notifications: any[] = [];

  try {
    const [rollsData, notifRes] = await Promise.all([
      apiClient.get<any>("/rolls"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (rollsData) rollsRes = rollsData;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <RollsQCClient
        rolls={rollsRes.rolls || []}
        eligibleOrdersForRegistration={rollsRes.eligibleOrders || []}
        machineDefects={rollsRes.machineDefects || []}
      />
    </AppShell>
  );
}
