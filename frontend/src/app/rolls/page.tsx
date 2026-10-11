import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import RollsQCClient from "./RollsQCClient";

export const dynamic = "force-dynamic";

export default async function RollsQCPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR"]);
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const statusFilter = (sp.status as string) || "ALL";
  const sortBy = (sp.sort_by as string) || "createdAt";
  const sortOrder = (sp.sort_order as string) || "desc";

  let rollsRes: any = { rolls: [], eligibleOrders: [], machineDefects: [], total: 0, page: 1, pageSize: 20 };
  let attendanceData: any[] = [];

  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);
    if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);

    const [rollsData, peopleRes] = await Promise.all([
      apiClient.get<any>(`/rolls?${params.toString()}`),
      apiClient.get<any>("/people"),
    ]);
    if (rollsData) rollsRes = rollsData;
    if (peopleRes && peopleRes.employees) attendanceData = peopleRes.employees;
  } catch {}

  return (
    <>
      <RollsQCClient
        userRole={user.role}
        rolls={rollsRes.rolls || []}
        qcCounts={rollsRes.qcCounts || { passed: 0, rework: 0, rejected: 0, pending: 0 }}
        eligibleOrdersForRegistration={rollsRes.eligibleOrders || []}
        machineDefects={rollsRes.machineDefects || []}
        attendanceData={attendanceData}
        totalRecords={rollsRes.total || 0}
        currentPage={rollsRes.page || 1}
      />
    </>
  );
}
