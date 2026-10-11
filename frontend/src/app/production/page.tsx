import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import ProductionBoardClient from "./ProductionBoardClient";

export const dynamic = "force-dynamic";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "PRODUCTION_SUPERVISOR", "MECHANIC"]);

  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";

  let board: any = { machines: [], queuedWorkOrders: [], employees: [], queuedTotal: 0, queuedPage: 1 };
  let attendanceData: any[] = [];

  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    if (search) params.append("search", search);

    const [boardRes, peopleRes] = await Promise.all([
      apiClient.get<any>(`/production/board?${params.toString()}`),
      apiClient.get<any>("/people"),
    ]);
    if (boardRes) board = boardRes;
    if (peopleRes && peopleRes.employees) attendanceData = peopleRes.employees;
  } catch {}

  return (
    <>
      <ProductionBoardClient
        userRole={user.role}
        machines={board.machines || []}
        workQueue={board.queuedWorkOrders || []}
        employees={board.employees || []}
        attendanceData={attendanceData}
        queuedTotal={board.queuedTotal || 0}
        queuedPage={board.queuedPage || 1}
      />
    </>
  );
}
