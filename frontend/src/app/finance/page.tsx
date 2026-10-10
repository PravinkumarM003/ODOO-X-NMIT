import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import FinanceClient from "./FinanceClient";
import Forbidden from "@/components/common/Forbidden";

export const dynamic = "force-dynamic";

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

  const params = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = params.month || defaultMonth;

  let financeData: any = {
    month: selectedMonth,
    cashIn: 0,
    cashOut: 0,
    netCashMovement: 0,
    machineOutputMetres: 0,
    unpaidCustomerTotal: 0,
    unpaidSupplierTotal: 0,
    closedWagesTotal: 0,
    unpaidObligationsTotal: 0,
    payments: [],
    supplierBills: [],
    wages: [],
  };
  let notifications: any[] = [];

  try {
    const [finRes, notifRes] = await Promise.all([
      apiClient.get<any>(`/finance?month=${selectedMonth}`),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (finRes) financeData = finRes;
    if (notifRes) notifications = notifRes;
  } catch {}

  return (
    <AppShell user={user} notifications={notifications}>
      <FinanceClient
        finance={financeData}
        wages={financeData.wages || []}
        selectedMonth={selectedMonth}
      />
    </AppShell>
  );
}
