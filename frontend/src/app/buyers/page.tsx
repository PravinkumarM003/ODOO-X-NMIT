import { requireRole } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Users2, Phone, Mail, MapPin, FileText, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyersPage() {
  const user = await requireRole(["OWNER", "OFFICE"]);

  let buyers: any[] = [];
  let notifications: any[] = [];

  try {
    const [buyersRes, notifRes] = await Promise.all([
      apiClient.get<any[]>("/buyers"),
      apiClient.get<any[]>("/notifications"),
    ]);
    if (buyersRes) buyers = buyersRes;
    if (notifRes) notifications = notifRes;
  } catch {}

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
          {buyers.map((buyer) => (
            <div key={buyer.id} className="bg-white border border-[#DCE3E1] rounded-lg p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#202B32]">{buyer.name}</h2>
                    <p className="text-xs text-[#176B63] font-medium mt-0.5">{buyer.contactPerson}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F4F6F5] text-[#202B32] border border-[#DCE3E1]">
                    {buyer.orderCount} Orders
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-[#617078]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#A3B3B0]" />
                    <span>{buyer.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#DCE3E1] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#617078]">Outstanding Balance:</span>
                  <div className="text-sm font-bold font-mono-id text-[#202B32]">
                    ₹{Number(buyer.outstandingBalance).toLocaleString()}
                  </div>
                </div>

                <Link
                  href={`/orders?buyer=${buyer.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B63] hover:text-[#0E4B45]"
                >
                  View Orders
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
