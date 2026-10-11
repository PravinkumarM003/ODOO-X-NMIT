import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import OrderListClient from "./OrderListClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"]); // touch
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const statusFilter = (sp.status as string) || "ALL";
  const sortBy = (sp.sort_by as string) || "createdAt";
  const sortOrder = (sp.sort_order as string) || "desc";

  let ordersRaw: any = { items: [], total: 0, page: 1, pageSize: 20 };
  let formData: any = { buyers: [], fabricTypes: [] };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);
    if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);

    const [ordersRes, formRes] = await Promise.all([
      apiClient.get<any>(`/orders?${params.toString()}`),
      apiClient.get<any>("/orders/form-data"),
    ]);
    if (ordersRes) ordersRaw = ordersRes;
    if (formRes) formData = formRes;
  } catch {}

  const ordersData = (ordersRaw.items || []).map((ord: any) => ({
    id: ord.id,
    orderNo: ord.orderNo,
    buyerName: ord.buyer?.name || "",
    fabricName: ord.fabricType?.name || "",
    colour: ord.colour,
    qtyMetres: ord.qtyMetres,
    deadline: ord.deadline,
    status: ord.status,
    submittedByBuyer: ord.submittedByBuyer,
    risk: typeof ord.risk === "object" && ord.risk !== null ? ord.risk : { risk: ord.risk || "ON_TRACK", reason: ord.riskReason || "" },
    progress: ord.progress || {
      productionProgressPercent: 0,
      qcReadiness: { statusText: "Pending", qcResolvedPercent: null, passedCount: 0, reworkCount: 0, rejectedCount: 0 },
      dispatchCompletion: { summaryText: "0 m dispatched", dispatchPercent: 0, shortfallNote: null },
    },
  }));

  const fabricOptions = (formData.fabricTypes || []).map((ft: any) => ({
    id: ft.id,
    name: ft.name,
    yarnKgPerMetre: ft.yarnKgPerMetre,
    defaultPricePerMetre: ft.defaultPricePerMetre,
    yarnCode: ft.yarnCode || "",
  }));

  return (
    <>
      <OrderListClient
        orders={ordersData}
        buyers={formData.buyers || []}
        fabricTypes={fabricOptions}
        userRole={user.role}
        totalRecords={ordersRaw.total || 0}
        currentPage={ordersRaw.page || 1}
      />
    </>
  );
}
