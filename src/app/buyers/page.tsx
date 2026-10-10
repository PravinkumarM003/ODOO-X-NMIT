import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Users2, Phone, Mail, MapPin, FileText, ArrowRight } from "lucide-react";

export default async function BuyersPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);
  const notifications = await getComputedNotifications();

  const buyers = await prisma.buyer.findMany({
    include: {
      orders: {
        include: { invoices: { include: { payments: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={user} notifications={notifications}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[#176B63]" />
            Buyer Directory & Customer Ledger
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Registered commercial garment manufacturers, uniforms, and home textile buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buyers.map((buyer) => {
            let totalInvoiced = 0;
            let totalPaid = 0;

            for (const ord of buyer.orders) {
              for (const inv of ord.invoices) {
                totalInvoiced += inv.amount;
                for (const p of inv.payments) {
                  totalPaid += p.amount;
                }
              }
            }
            const outstandingBalance = Math.round((totalInvoiced - totalPaid) * 100) / 100;

            return (
              <div key={buyer.id} className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#202B32]">{buyer.name}</h2>
                      <p className="text-xs text-[#176B63] font-medium mt-0.5">{buyer.contactPerson}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F4F6F5] text-[#202B32] border border-[#DCE3E1]">
                      {buyer.orders.length} Orders
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[#617078]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#617078]" />
                      <span>{buyer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#617078]" />
                      <span>{buyer.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#617078] flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{buyer.address}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#DCE3E1] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#617078] block text-[11px]">Outstanding Balance</span>
                    <span className={`font-mono-id font-bold ${outstandingBalance > 0 ? "text-[#B44545]" : "text-[#277653]"}`}>
                      ₹{outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Link
                    href={`/orders?buyer=${buyer.id}`}
                    className="text-[#176B63] hover:underline font-semibold flex items-center gap-1"
                  >
                    View Orders <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
