import { requireSession } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerInvoicesPage() {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    redirect("/overview");
  }

  let invoices: any[] = [];
  try {
    const res = await apiClient.get<any[]>("/buyer/invoices");
    if (res) invoices = res;
  } catch {}

  return (
    <AppShell user={session} notifications={[]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#176B63]" />
            My Invoices & Payment Receipts
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Billing history, commercial invoice copies, and verified payments.
          </p>
        </div>

        <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F4F6F5] border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Issued Date</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Dispatch Ref</th>
                  <th className="py-3 px-4 text-right">Invoice Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Paid Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E1]">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#617078]">
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F9FAFA]">
                      <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">{inv.invoiceNo}</td>
                      <td className="py-3 px-4 text-[#617078]">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-mono-id">{inv.orderNo || "—"}</td>
                      <td className="py-3 px-4 font-mono-id text-[#54758A]">{inv.dispatchNo || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                        ₹{Number(inv.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-id font-bold text-[#277653]">
                        ₹{Number(inv.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === "PAID"
                              ? "bg-green-100 text-[#277653]"
                              : inv.status === "PARTIAL"
                              ? "bg-amber-100 text-[#A86F1F]"
                              : "bg-red-100 text-[#B44545]"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
