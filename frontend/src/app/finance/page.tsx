import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
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
    user = await requireRole(["ADMINISTRATOR"]);
  } catch {
    return (
      <div className="p-8">
        <Forbidden message="Financial statements, margins, and wage payrolls are strictly restricted to the ADMINISTRATOR role." />
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
    orderMargin: 0,
    totalInvoicedRevenue: 0,
    totalOrderCost: 0,
    supplierCashOut: 0,
    wageCashOut: 0,
    unpaidSupplierBillsTotal: 0,
    unpaidWagesTotal: 0,
    unpaidInvoicesTotal: 0,
    machineOutputMetres: 0,
    unpaidCustomerTotal: 0,
    unpaidSupplierTotal: 0,
    closedWagesTotal: 0,
    unpaidObligationsTotal: 0,
    payments: [],
    supplierBills: [],
    paidSupplierBills: [],
    paidWages: [],
    unpaidSupplierBills: [],
    unpaidWagesList: [],
    unpaidInvoices: [],
    orderCostings: [],
    machineOutputs: [],
    wages: [],
  };
    try {
    const [finRes] = await Promise.all([
      apiClient.get<any>(`/finance?month=${selectedMonth}`),
    ]);
    if (finRes) financeData = finRes;
      } catch {}

  return (
    <>
      <FinanceClient
        finance={financeData}
        wages={financeData.wages || []}
        selectedMonth={selectedMonth}
      />
    </>
  );
}
