import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import PeopleClient from "./PeopleClient";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const params = await searchParams;

  const todayStr = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || todayStr;

  let data: any = { employees: [] };
  let notifications: any[] = [];

  try {
    const [peopleRes, notifRes] = await Promise.all([
      apiClient.get<any>(`/people?date=${selectedDate}`),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (peopleRes) data = peopleRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <PeopleClient
        employees={data.employees || []}
        selectedDate={selectedDate}
        userRole={user.role}
      />
    </AppShell>
  );
}
