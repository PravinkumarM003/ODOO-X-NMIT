import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import ActionRequiredClient from "./ActionRequiredClient";

export const dynamic = "force-dynamic";

export default async function ActionRequiredPage() {
  const user = await requireRole([
    "ADMINISTRATOR",
    "MANAGER",
    "PRODUCTION_SUPERVISOR",
    "MECHANIC",
    "INSPECTION_SUPERVISOR",
    "DISPATCH_OFFICER",
  ]);

  let initialData: any = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  try {
    const res = await apiClient.get<any>("/overview/action-required?page=1&page_size=20");
    if (res) initialData = res;
  } catch {}

  return (
    <ActionRequiredClient
      userRole={user.role}
      initialData={initialData}
    />
  );
}
