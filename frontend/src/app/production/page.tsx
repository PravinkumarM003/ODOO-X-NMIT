import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import ProductionBoardClient from "./ProductionBoardClient";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  let board: any = { machines: [], queuedWorkOrders: [], employees: [] };
  let notifications: any[] = [];

  try {
    const [boardRes, notifRes] = await Promise.all([
      apiClient.get<any>("/production/board"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (boardRes) board = boardRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <ProductionBoardClient
        machines={board.machines || []}
        workQueue={board.queuedWorkOrders || []}
        employees={board.employees || []}
      />
    </AppShell>
  );
}
