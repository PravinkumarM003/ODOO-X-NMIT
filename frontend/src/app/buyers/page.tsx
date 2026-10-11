import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import BuyersClient from "./BuyersClient";

export const dynamic = "force-dynamic";

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["ADMINISTRATOR", "MANAGER"]);
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const sortBy = (sp.sort_by as string) || "name";
  const sortOrder = (sp.sort_order as string) || "asc";

  let data: any = { items: [], total: 0, page: 1 };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);

    const [buyersRes] = await Promise.all([
      apiClient.get<any>(`/buyers?${params.toString()}`),
    ]);
    if (buyersRes) data = buyersRes;
  } catch {}

  return (
    <BuyersClient 
      buyers={data.items || []}
      totalRecords={data.total || 0}
      currentPage={data.page || 1}
    />
  );
}
