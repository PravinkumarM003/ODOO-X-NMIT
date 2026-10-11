import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import SupportClient from "./SupportClient";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireRole([
    "ADMINISTRATOR",
    "MANAGER",
    "BUYER",
    "PRODUCTION_SUPERVISOR",
    "MECHANIC",
    "INSPECTION_SUPERVISOR",
    "DISPATCH_OFFICER",
  ]);

  let conversationsData: any = { items: [], total: 0 };
  let ordersList: any[] = [];
  let buyersList: any[] = [];

  try {
    const convRes = await apiClient.get<any>("/support/conversations?page=1&page_size=50").catch(() => null);
    if (convRes) conversationsData = convRes;

    if (user.role === "BUYER") {
      const ordRes = await apiClient.get<any>("/buyer/orders?page=1&page_size=100").catch(() => null);
      if (ordRes && ordRes.items) ordersList = ordRes.items;
    } else {
      const [ordRes, buyRes] = await Promise.all([
        apiClient.get<any>("/orders?page=1&page_size=100").catch(() => null),
        apiClient.get<any>("/buyers?page=1&page_size=100").catch(() => null),
      ]);
      if (ordRes && ordRes.items) ordersList = ordRes.items;
      if (buyRes && buyRes.items) buyersList = buyRes.items;
      else if (buyRes && Array.isArray(buyRes)) buyersList = buyRes;
    }
  } catch (err) {
    console.error("Error loading support data SSR:", err);
  }

  return (
    <SupportClient
      user={user}
      initialConversations={conversationsData.items || []}
      initialTotal={conversationsData.total || 0}
      userOrders={ordersList}
      buyersList={buyersList}
    />
  );
}
