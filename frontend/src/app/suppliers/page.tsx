import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import { Factory, Phone, CheckCircle, Clock } from "lucide-react";
import { markSupplierBillPaidAction } from "@/app/actions/buyerSupplierActions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);

  let suppliers: any[] = [];
  let notifications: any[] = [];

  try {
    const [suppliersRes, notifRes] = await Promise.all([
      apiClient.get<any[]>("/suppliers"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (suppliersRes) suppliers = suppliersRes;
    if (notifRes) notifications = notifRes;
  } catch {}

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

              {/* Bills Section */}
              <div className="mt-4">
                <h3 className="text-xs font-bold text-[#202B32] uppercase tracking-wider mb-2">
                  Procurement Bills & Payables
                </h3>
                {sup.bills.length === 0 ? (
                  <p className="text-xs text-[#617078] italic">No procurement bills on file for this supplier.</p>
                ) : (
                  <div className="overflow-x-auto border border-[#DCE3E1] rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F6F5] text-[#202B32] font-semibold border-b border-[#DCE3E1]">
                        <tr>
                          <th className="px-3 py-2">Bill No</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE3E1] bg-white">
                        {sup.bills.map((bill: any) => (
                          <tr key={bill.id} className="hover:bg-[#F9FBFA]">
                            <td className="px-3 py-2 font-mono-id font-bold text-[#176B63]">{bill.billNo}</td>
                            <td className="px-3 py-2 text-[#617078]">
                              {new Date(bill.billedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono-id font-semibold text-[#202B32]">
                              ₹{bill.amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {bill.status === "PAID" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E4B45] bg-[#E1F5E8] px-2 py-0.5 rounded">
                                  <CheckCircle className="w-3 h-3" />
                                  PAID
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A3B14] bg-[#FCECE4] px-2 py-0.5 rounded">
                                  <Clock className="w-3 h-3" />
                                  UNPAID
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {bill.status !== "PAID" ? (
                                <form action={handleMarkBillPaid}>
                                  <input type="hidden" name="billId" value={bill.id} />
                                  <button
                                    type="submit"
                                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#176B63] text-white rounded hover:bg-[#0E4B45]"
                                  >
                                    Mark Paid
                                  </button>
                                </form>
                              ) : (
                                <span className="text-[11px] text-[#A3B3B0]">Settled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
