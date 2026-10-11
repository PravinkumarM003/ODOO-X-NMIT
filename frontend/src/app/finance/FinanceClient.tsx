"use client";

import { useRouter } from "next/navigation";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  CreditCard,
  Building,
  Cpu,
  Clock,
  Layers,
  FileText,
} from "lucide-react";
import { closeMonthWagesAction, markWagesPaidAction } from "@/app/actions/financeActions";

interface FinanceClientProps {
  finance: any;
  wages: any[];
  selectedMonth: string;
}

const num = (v: any) => (typeof v === "number" && !isNaN(v) ? v : 0);
const fmt = (v: any, dec = 2) => num(v).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtInt = (v: any) => num(v).toLocaleString("en-IN");

export default function FinanceClient({
  finance,
  wages,
  selectedMonth,
}: FinanceClientProps) {
  const router = useRouter();
  const [month, setMonth] = useState(selectedMonth);

  const payments = finance?.payments || [];
  const paidSupplierBills = finance?.paidSupplierBills || [];
  const paidWages = finance?.paidWages || [];
  const unpaidSupplierBills = finance?.unpaidSupplierBills || [];
  const unpaidWagesList = finance?.unpaidWagesList || [];
  const unpaidInvoices = finance?.unpaidInvoices || [];
  const orderCostings = finance?.orderCostings || [];
  const machineOutputs = finance?.machineOutputs || [];
  const wagesList = wages || finance?.wages || [];

  // Close Month Wages Dialog state (BR-21)
  const [closeMonthOpen, setCloseMonthOpen] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  // Mark Wages Paid Dialog state (BR-26)
  const [payWagesOpen, setPayWagesOpen] = useState(false);
  const [payWagesEmployeeId, setPayWagesEmployeeId] = useState<string>("");
  const [payMethod, setPayMethod] = useState("BANK");
  const [payRef, setPayRef] = useState("NEFT-WAGES-BULK");
  const [payLoading, setPayLoading] = useState(false);

  const handleCloseMonth = async () => {
    setCloseLoading(true);
    const formData = new FormData();
    formData.append("month", month);
    await closeMonthWagesAction(formData);
    setCloseLoading(false);
    setCloseMonthOpen(false);
    router.refresh();
      };

  const handlePayWages = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);

    const formData = new FormData();
    formData.append("month", month);
    if (payWagesEmployeeId) formData.append("employeeId", payWagesEmployeeId);
    formData.append("paymentMethod", payMethod);
    formData.append("paymentReference", payRef);
    formData.append("paidAt", new Date().toISOString());

    await markWagesPaidAction(formData);
    setPayLoading(false);
    setPayWagesOpen(false);
    router.refresh();
      };

  return (
    <div className="space-y-6">
      {/* Page Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
            Owner Executive Financial Statement
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Strict separation of recorded cash movements vs outstanding obligations (BR-26).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--surface)] px-3 py-1.5 border border-[var(--border)] rounded-md shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <Calendar className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs text-[var(--text-secondary)] font-medium">Month:</span>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              router.push(`/finance?month=${e.target.value}`);
            }}
            className="text-xs font-mono-id font-bold text-[var(--text-primary)] bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* SECTION 6: TWO CLEARLY LABELLED RESULT LINES (NEVER MERGED PER BR-26) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Result Line 1: Recorded Net Cash Movement */}
        <div className="bg-[var(--surface)] border-2 border-[var(--primary)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
            Result Line 1: Net Cash Movement (Recorded)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-black font-mono-id ${
                num(finance?.netCashMovement) >= 0 ? "text-[var(--success)]" : "text-[var(--critical)]"
              }`}
            >
              {num(finance?.netCashMovement) >= 0 ? "+" : ""}₹
              {fmt(finance?.netCashMovement)}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              In: ₹{fmtInt(finance?.cashIn)} · Out: ₹{fmtInt(finance?.cashOut)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-2 border-t border-[var(--border)] pt-2">
            Real bank/cash liquidity: Calculated strictly from payments received minus paid supplier bills and paid wages in {month}.
          </p>
        </div>

        {/* Result Line 2: Order Margin */}
        <div className="bg-[var(--surface)] border-2 border-[#54758A] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--info)]">
            Result Line 2: Order Margin (Invoiced Revenue Minus Order Cost)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-3xl font-black font-mono-id ${
                num(finance?.orderMargin) >= 0 ? "text-[var(--success)]" : "text-[var(--critical)]"
              }`}
            >
              {num(finance?.orderMargin) >= 0 ? "+" : ""}₹
              {fmt(finance?.orderMargin)}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Rev: ₹{fmtInt(finance?.totalInvoicedRevenue)} · Cost: ₹{fmtInt(finance?.totalOrderCost)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-2 border-t border-[var(--border)] pt-2">
            Economic manufacturing profit: Total commercial invoices minus FIFO yarn, allocated hourly labour and machine wear cost.
          </p>
        </div>
      </div>

      {/* SECTION 4: ACTUAL CASH FLOW (RECORDED ONLY) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[var(--primary)]" />
          Item 4: Actual Recorded Cash Flow for {month}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-green-50/50 border border-green-200 rounded">
            <span className="text-[var(--text-secondary)] block">Cash In (Buyer Receipts):</span>
            <p className="font-mono-id font-bold text-lg text-[var(--success)]">
              +₹{fmt(finance?.cashIn)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {payments.length} payment(s) received in {month}
            </span>
          </div>

          <div className="p-3 bg-red-50/50 border border-[rgba(255,77,77,0.3)] rounded">
            <span className="text-[var(--text-secondary)] block">Cash Out (Supplier Bills Paid):</span>
            <p className="font-mono-id font-bold text-lg text-[var(--critical)]">
              -₹{fmt(finance?.supplierCashOut)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {paidSupplierBills.length} bill(s) paid in {month}
            </span>
          </div>

          <div className="p-3 bg-red-50/50 border border-[rgba(255,77,77,0.3)] rounded">
            <span className="text-[var(--text-secondary)] block">Cash Out (Wages Paid):</span>
            <p className="font-mono-id font-bold text-lg text-[var(--critical)]">
              -₹{fmt(finance?.wageCashOut)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {paidWages.length} employee wage(s) paid in {month}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: OUTSTANDING OBLIGATIONS & RECEIVABLES (LABELLED "NOT CASH" PER BR-26) */}
      <div className="bg-amber-50/60 border border-amber-300 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2 text-[var(--warning)] font-bold text-xs uppercase tracking-wider">
          <AlertCircle className="w-4 h-4" />
          <span>Item 5: Outstanding Obligations & Receivables (Labelled: NOT CASH)</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mb-4">
          Unsettled balances and future commitments. Kept strictly separate and never added to the recorded cash result (BR-26).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[var(--surface)] border border-amber-200 rounded p-3">
            <span className="text-[var(--text-secondary)] block">Unpaid Supplier Bills:</span>
            <p className="font-mono-id font-bold text-base text-[var(--critical)]">
              ₹{fmt(finance?.unpaidSupplierBillsTotal)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {unpaidSupplierBills.length} pending bill(s)
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-amber-200 rounded p-3">
            <span className="text-[var(--text-secondary)] block">Unpaid Wages (Calculated or Closed):</span>
            <p className="font-mono-id font-bold text-base text-[var(--critical)]">
              ₹{fmt(finance?.unpaidWagesTotal)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {unpaidWagesList.length} employee(s) unpaid for {month}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-amber-200 rounded p-3">
            <span className="text-[var(--text-secondary)] block">Outstanding Buyer Receivables:</span>
            <p className="font-mono-id font-bold text-base text-[var(--success)]">
              ₹{fmt(finance?.unpaidInvoicesTotal)}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {unpaidInvoices.length} unpaid / partial invoice(s)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: WAGES REGISTER & APPROVALS (BR-21, BR-26) */}
      <div className="premium-card overflow-hidden">
        <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[var(--primary)]" />
              Item 3: Staff Monthly Wages Register ({month})
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Wage states: Calculated → Closed (not recorded as paid) → Paid (BR-26).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCloseMonthOpen(true)}
              className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--background)] text-[var(--text-primary)] font-semibold text-xs rounded shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
            >
              Close Month (Freeze Wages)
            </button>
            <button
              onClick={() => {
                setPayWagesEmployeeId("");
                setPayWagesOpen(true);
              }}
              className="px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold text-xs rounded shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md"
            >
              Mark Wages Paid (Owner Action)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-bold text-[11px] uppercase">
                <th className="py-2.5 px-4">Emp No</th>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-center">Days Present</th>
                <th className="py-2.5 px-4 text-center">OT Hours</th>
                <th className="py-2.5 px-4 text-right">Wage Amount (₹)</th>
                <th className="py-2.5 px-4 text-center">State (BR-21, BR-26)</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {wagesList.map((w: any) => (
                <tr key={w.employeeId} className="hover:bg-[var(--sidebar-secondary)]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">{w.empNo}</td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{w.name}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{w.department}</td>
                  <td className="py-3 px-4 text-center font-mono-id">{w.daysPresent}</td>
                  <td className="py-3 px-4 text-center font-mono-id">{w.overtimeHours}</td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                    ₹{fmt(w.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        w.state === "Paid"
                          ? "bg-[rgba(0,230,118,0.15)] text-[var(--success)]"
                          : w.state === "Closed (not recorded as paid)"
                          ? "bg-[rgba(245,166,35,0.15)] text-[var(--warning)]"
                          : "bg-gray-100 text-[var(--text-secondary)]"
                      }`}
                    >
                      {w.state}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {w.state !== "Paid" && (
                      <button
                        onClick={() => {
                          setPayWagesEmployeeId(w.employeeId);
                          setPayWagesOpen(true);
                        }}
                        className="px-2 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold text-[11px] rounded"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 1: ORDER COSTING TABLE (BR-22) */}
      <div className="premium-card overflow-hidden">
        <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[var(--primary)]" />
              Item 1: Manufacturing Cost Breakdown by Order (BR-22)
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Yarn consumption at real lot cost + hourly operator labour + machine hourly rate wear.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-bold text-[11px] uppercase">
                <th className="py-2.5 px-4">Order No</th>
                <th className="py-2.5 px-4">Buyer</th>
                <th className="py-2.5 px-4 text-right">Invoiced Revenue (₹)</th>
                <th className="py-2.5 px-4 text-right">Yarn Cost (₹)</th>
                <th className="py-2.5 px-4 text-right">Labour (₹)</th>
                <th className="py-2.5 px-4 text-right">Machine (₹)</th>
                <th className="py-2.5 px-4 text-right">Total Cost (₹)</th>
                <th className="py-2.5 px-4 text-right">Margin (₹)</th>
                <th className="py-2.5 px-4 text-right">Cost/Good Metre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orderCostings.map((c: any) => (
                <tr key={c.orderId} className="hover:bg-[var(--sidebar-secondary)]">
                  <td className="py-3 px-4 font-mono-id font-bold text-[var(--primary)]">
                    <Link href={`/orders/${c.orderId}`} className="hover:underline flex items-center gap-1">
                      {c.orderNo}
                      <ExternalLink className="w-3 h-3 text-[var(--text-secondary)]" />
                    </Link>
                    {c.isCostIncomplete && (
                      <span className="block text-[9px] font-bold uppercase text-[var(--warning)]">
                        Cost Incomplete
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{c.buyerName}</td>
                  <td className="py-3 px-4 text-right font-mono-id text-[var(--text-primary)]">
                    ₹{fmt(c.invoicedRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id text-[var(--text-secondary)]">
                    ₹{fmt(c.yarnCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id text-[var(--text-secondary)]">
                    ₹{fmt(c.labourCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id text-[var(--text-secondary)]">
                    ₹{fmt(c.machineCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold text-[var(--text-primary)]">
                    ₹{fmt(c.totalCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id font-bold">
                    <span className={num(c.margin) >= 0 ? "text-[var(--success)]" : "text-[var(--critical)]"}>
                      ₹{fmt(c.margin)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-id text-[var(--text-secondary)]">
                    {c.costPerGoodMetre ? `₹${c.costPerGoodMetre}/m` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: MACHINE OUTPUT */}
      <div className="premium-card overflow-hidden">
        <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[var(--primary)]" />
            Item 2: Machine Output for {month}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 text-xs">
          {machineOutputs.map((mach: any) => (
            <div key={mach.machineId} className="p-3 bg-[var(--sidebar-secondary)] border border-[var(--border)] rounded">
              <div className="flex items-center justify-between font-mono-id font-bold">
                <span className="text-[var(--primary)]">{mach.code}</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">{mach.type}</span>
              </div>
              <div className="mt-2 text-[var(--text-primary)] font-mono-id">
                <div>Output: <strong>{fmtInt(mach.metresProduced)} m</strong></div>
                <div>Hours: <strong>{num(mach.hoursWorked)} hrs</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Close Month Modal (BR-21) */}
      {closeMonthOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Close Month ({month})
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Closing a month freezes a WageSummary per employee (state: Closed, not recorded as paid). Closing a month is not payment and does NOT change any cash figure (BR-21).
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setCloseMonthOpen(false)}
                className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseMonth}
                disabled={closeLoading}
                className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
              >
                {closeLoading ? "Freezing..." : "Confirm Close Month"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Wages Paid Modal (BR-26) */}
      {payWagesOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-lg shadow-xl border border-[var(--border)] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[var(--success)] uppercase tracking-wider mb-2">
              Record Wages Payment ({month})
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Owner statement confirming actual wage transfer. This will record a paid cash outflow in {month} (BR-26).
            </p>

            <form onSubmit={handlePayWages} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                >
                  <option value="BANK">Bank NEFT Batch</option>
                  <option value="CASH">Cash Payroll</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. NEFT-WAGES-BATCH-01"
                  className="w-full font-mono-id px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setPayWagesOpen(false)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-4 py-1.5 bg-[#277653] hover:bg-green-700 text-[var(--text-primary)] font-semibold rounded disabled:opacity-50"
                >
                  {payLoading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
