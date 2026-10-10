import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import { Factory, Phone, CheckCircle, Clock } from "lucide-react";
import { markSupplierBillPaidAction } from "@/app/actions/buyerSupplierActions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);
  const notifications = await getComputedNotifications();

  const suppliers = await prisma.supplier.findMany({
    include: {
      lots: {
        include: { yarnItem: true },
        orderBy: { receivedAt: "desc" },
      },
      bills: {
        orderBy: { billedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  async function handleMarkBillPaid(formData: FormData) {
    "use server";
    await markSupplierBillPaidAction(formData);
  }

  return (
    <AppShell user={user} notifications={notifications}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <Factory className="w-5 h-5 text-[#176B63]" />
            Supplier Directory & Yarn Procurement
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Spinning mills, fiber co-operatives, and yarn supplier bills with recorded payment status.
          </p>
        </div>

        <div className="space-y-6">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE3E1]">
                <div>
                  <h2 className="text-sm font-bold text-[#202B32]">{sup.name}</h2>
                  <p className="text-xs text-[#176B63] font-medium">Contact: {sup.contactPerson} · {sup.phone}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#617078]">
                    Lots Received: <strong>{sup.lots.length}</strong>
                  </span>
                  <span className="text-[#617078]">
                    Bills: <strong>{sup.bills.length}</strong>
                  </span>
                </div>
              </div>

              {/* Bills List with Mark Paid Action (BR-26) */}
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#617078] mb-2">
                  Supplier Bills & Outflow Records
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F4F6F5] text-[#617078] font-bold text-[11px] uppercase">
                        <th className="py-2 px-3">Bill No</th>
                        <th className="py-2 px-3">Billed Date</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3">Paid Date</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3E1]">
                      {sup.bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-[#F9FAFA]">
                          <td className="py-2.5 px-3 font-mono-id font-bold text-[#176B63]">{bill.billNo}</td>
                          <td className="py-2.5 px-3 text-[#617078]">{new Date(bill.billedAt).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono-id font-bold text-[#202B32]">
                            ₹{bill.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                bill.status === "PAID"
                                  ? "bg-green-100 text-[#277653]"
                                  : "bg-red-100 text-[#B44545]"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#617078] font-mono-id">
                            {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {bill.status === "UNPAID" ? (
                              <form action={handleMarkBillPaid} className="inline-block">
                                <input type="hidden" name="billId" value={bill.id} />
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 text-xs font-semibold bg-[#176B63] hover:bg-[#11564F] text-white rounded transition-colors"
                                >
                                  Mark Paid (BR-26)
                                </button>
                              </form>
                            ) : (
                              <span className="text-[11px] text-[#277653] font-semibold flex items-center justify-end gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Paid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
