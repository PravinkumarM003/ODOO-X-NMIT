import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import OverviewClient from "./OverviewClient";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  let data: any = {};
  try {
    data = await apiClient.get<any>("/overview");
  } catch {}

  const notifications = data?.attentionItems || [];

  return (
    <AppShell user={user} notifications={notifications}>
      <OverviewClient
        attentionItems={notifications}
        summaryTiles={
          data?.summaryTiles || {
            activeOrdersCount: 0,
            atRiskOrdersCount: 0,
            pendingInspectionsCount: 0,
            readyToShipCount: 0,
            finishedMetresOnShelf: 0,
            machinesRunning: 0,
            machinesIdle: 0,
            machinesDown: 0,
          }
        }
        pipeline={data?.pipeline || []}
        todayOutputs={data?.todayOutputs || []}
        recentEvents={data?.recentEvents || []}
        userRole={user.role}
      />
    </AppShell>
  );
}
