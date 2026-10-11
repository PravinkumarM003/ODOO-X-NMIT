import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import PeopleClient from "./PeopleClient";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER"]);
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const department = (sp.department as string) || "ALL";
  const sortBy = (sp.sort_by as string) || "empNo";
  const sortOrder = (sp.sort_order as string) || "asc";
  const todayStr = new Date().toISOString().split("T")[0];
  const selectedDate = (sp.date as string) || todayStr;

  let data: any = { employees: [], total: 0, page: 1, summary: null };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);
    if (department && department !== "ALL") params.append("department", department);
    if (selectedDate) params.append("date", selectedDate);

    const [peopleRes] = await Promise.all([
      apiClient.get<any>(`/people?${params.toString()}`),
    ]);
    if (peopleRes) data = peopleRes;
  } catch {}

  return (
    <PeopleClient
      employees={data.employees || []}
      selectedDate={selectedDate}
      userRole={user.role}
      totalRecords={data.total || 0}
      currentPage={data.page || 1}
      summary={data.summary}
    />
  );
}
