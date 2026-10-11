import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
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

    const [suppliersRes, allSuppliersRes] = await Promise.all([
      apiClient.get<any>(`/suppliers?${params.toString()}`),
      apiClient.get<any>(`/suppliers?page_size=100`),
    ]);
    if (suppliersRes) data = suppliersRes;
    const companyNames: string[] = allSuppliersRes?.items
      ? Array.from(new Set(allSuppliersRes.items.map((s: any) => s.name as string)))
      : [];

    return (
      <SuppliersClient 
        suppliers={data.items || []}
        totalRecords={data.total || 0}
        currentPage={data.page || 1}
        companyNames={companyNames}
      />
    );
  } catch {
    return (
      <SuppliersClient 
        suppliers={[]}
        totalRecords={0}
        currentPage={1}
        companyNames={[]}
      />
    );
  }
}
