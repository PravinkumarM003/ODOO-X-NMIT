import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import YarnStoreClient from "./YarnStoreClient";

export const dynamic = "force-dynamic";

export default async function YarnStorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"]);
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const sortBy = (sp.sort_by as string) || "code";
  const sortOrder = (sp.sort_order as string) || "asc";

  let data: any = { items: [], suppliers: [], orders: [], allLots: [], total: 0, page: 1 };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);

    const [yarnRes] = await Promise.all([
      apiClient.get<any>(`/yarn?${params.toString()}`),
    ]);
    if (yarnRes) data = yarnRes;
  } catch {}

  return (
    <>
      <YarnStoreClient
        items={data.items || []}
        suppliers={data.suppliers || []}
        orders={data.orders || []}
        allLots={data.allLots || []}
        totalRecords={data.total || 0}
        currentPage={data.page || 1}
      />
    </>
  );
}
