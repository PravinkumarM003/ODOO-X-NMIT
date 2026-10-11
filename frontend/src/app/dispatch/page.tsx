import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import DispatchClient from "./DispatchClient";

export const dynamic = "force-dynamic";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "DISPATCH_OFFICER"]);

  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";

  let data: any = { storeView: null, readyOrders: [], dispatches: [], invoices: [], invoicesTotal: 0, invoicesPage: 1 };
  let attendanceData: any[] = [];

  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    if (search) params.append("search", search);

    const [dispatchRes, peopleRes] = await Promise.all([
      apiClient.get<any>(`/dispatch?${params.toString()}`),
      apiClient.get<any>("/people"),
    ]);
    if (dispatchRes) data = dispatchRes;
    if (peopleRes && peopleRes.employees) attendanceData = peopleRes.employees;
  } catch {}

  return (
    <>
      <DispatchClient
        userRole={user.role}
        storeView={data.storeView || { shelf: [], awaitingQC: [], quarantined: [], dispatched: [] }}
        readyOrders={data.readyOrders || []}
        dispatches={data.dispatches || []}
        invoices={data.invoices || []}
        attendanceData={attendanceData}
        invoicesTotal={data.invoicesTotal || 0}
        invoicesPage={data.invoicesPage || 1}
      />
    </>
  );
}
