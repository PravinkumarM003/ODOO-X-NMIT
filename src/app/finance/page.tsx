import { requireRole } from "@/lib/auth";
import { getMonthlyFinance, getMonthlyWages } from "@/services/financeService";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import FinanceClient from "./FinanceClient";
import Forbidden from "@/components/common/Forbidden";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  let user;
  try {
    user = await requireRole(["OWNER"]);
  } catch {
    return (
      <div className="p-8">
        <Forbidden message="Financial statements, margins, and wage payrolls are strictly restricted to the OWNER role." />
      </div>
    );
  }

  const notifications = await getComputedNotifications();
  const params = await searchParams;

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = params.month || defaultMonth;

  const finance = await getMonthlyFinance(selectedMonth);
  const wages = await getMonthlyWages(selectedMonth);

  return (
    <AppShell user={user} notifications={notifications}>
      <FinanceClient
        finance={finance}
        wages={wages}
        selectedMonth={selectedMonth}
      />
    </AppShell>
  );
}
