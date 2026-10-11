import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import OverviewClient from "./OverviewClient";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER"]);

  let data: any = {};
  let attendanceData: any[] = [];
  try {
    const [overviewData, peopleRes] = await Promise.all([
      apiClient.get<any>("/overview"),
      apiClient.get<any>("/people"),
    ]);
    if (overviewData) data = overviewData;
    if (peopleRes && peopleRes.employees) attendanceData = peopleRes.employees;
  } catch {}

  const notifications = data?.attentionItems || [];
  const totalAttentionItems = data?.totalAttentionItems ?? notifications.length;

  return (
    <>
      <OverviewClient
        attentionItems={notifications}
        totalAttentionItems={totalAttentionItems}
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
        attendanceData={attendanceData}
      />
    </>
  );
}
