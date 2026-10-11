import { requireSession } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { redirect } from "next/navigation";
import BuyerInvoicesClient from "./BuyerInvoicesClient";

export const dynamic = "force-dynamic";

export default async function BuyerInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    redirect("/overview");
  }

  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const search = (sp.search as string) || "";
  const sortBy = (sp.sort_by as string) || "issuedAt";
  const sortOrder = (sp.sort_order as string) || "desc";

  let data: any = { items: [], total: 0, page: 1 };
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", "20");
    params.append("sort_by", sortBy);
    params.append("sort_order", sortOrder);
    if (search) params.append("search", search);

    const res = await apiClient.get<any>(`/buyer/invoices?${params.toString()}`);
    if (res) data = res;
  } catch {}

  return (
    <BuyerInvoicesClient
      invoices={data.items || []}
      totalRecords={data.total || 0}
      currentPage={data.page || 1}
    />
  );
}
