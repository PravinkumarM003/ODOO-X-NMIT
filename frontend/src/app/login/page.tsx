"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/authActions";
import { ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("everest2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      role: "OWNER",
      name: "Arunachalam Chettiar",
      email: "owner@everest.demo",
      badge: "Owner & Executive",
      desc: "Full access to finance, margins, wage approvals & closed months",
    },
    {
      role: "OFFICE",
      name: "Meenakshi Sundaram",
      email: "office@everest.demo",
      badge: "Office & Commercial",
      desc: "Orders, review approvals, yarn procurement, bills, dispatch paperwork",
    },
    {
      role: "FLOOR",
      name: "Selvam Kumar",
      email: "floor@everest.demo",
      badge: "Floor Supervisor",
      desc: "Gate receipt, loom assignments, output logging, QC inspection & store",
    },
    {
      role: "BUYER",
      name: "R. Ramanathan",
      buyerName: "Madras Garments Pvt Ltd",
      email: "buyer.madras@everest.demo",
      badge: "Buyer Portal",
      desc: "Live order tracking, submitted orders & dispatch status",
    },
    {
      role: "BUYER",
      name: "Anita Varghese",
      buyerName: "Coastal Apparels",
      email: "buyer.coastal@everest.demo",
      badge: "Buyer Portal",
      desc: "Live order tracking, invoices & payment status",
    },
    {
      role: "BUYER",
      name: "S. K. Murugan",
      buyerName: "Kaveri Home Textiles",
      email: "buyer.kaveri@everest.demo",
      badge: "Buyer Portal",
      desc: "Order stage progress & delivery records",
    },
    {
      role: "BUYER",
      name: "Deepak Mehra",
      buyerName: "Zenith Uniforms",
      email: "buyer.zenith@everest.demo",
      badge: "Buyer Portal",
      desc: "Uniform fabric orders & shipping updates",
    },
  ];

  const handleSelectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("everest2026");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch {
      // In Next.js redirect throws a NEXT_REDIRECT error which is normal behavior
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Wordmark & Tagline */}
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-3.5 h-8 bg-[#176B63] rounded-sm"></span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#172D38]">TEXFLOW</h1>
        </div>
        <p className="text-xs uppercase font-semibold tracking-wider text-[#176B63]">
          Everest Textile Mills
        </p>
        <p className="mt-2 text-sm text-[#617078] font-medium">
          From Yarn to Delivery, Every Roll Accounted For.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#DCE3E1] rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded bg-red-50 border border-red-200 text-[#B44545] font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#202B32]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@everest.demo"
                className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#DCE3E1] rounded-md text-[#202B32] focus:outline-none focus:border-[#176B63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#202B32]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-sm bg-white border border-[#DCE3E1] rounded-md text-[#202B32] focus:outline-none focus:border-[#176B63]"
              />
              <p className="text-[11px] text-[#617078] mt-1">Default demo password: everest2026</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md text-white bg-[#176B63] hover:bg-[#11564F] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to TexFlow"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Section 7.1: Demo Accounts Helper (Lists all 7 accounts) */}
          <div className="mt-8 pt-6 border-t border-[#DCE3E1]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#176B63]" />
                Demo Accounts Helper
              </span>
              <span className="text-[11px] text-[#617078]">Click to prefill credentials</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc.email)}
                  className={`w-full text-left p-2.5 rounded border transition-all text-xs flex items-center justify-between ${
                    email === acc.email
                      ? "border-[#176B63] bg-[#EBF3F1]"
                      : "border-[#DCE3E1] hover:border-[#176B63] hover:bg-[#F9FAFA]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#202B32]">{acc.name}</span>
                      {acc.buyerName && (
                        <span className="text-[11px] text-[#176B63] font-medium">
                          ({acc.buyerName})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#617078] truncate">{acc.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                      acc.role === "OWNER"
                        ? "bg-[#172D38] text-white"
                        : acc.role === "OFFICE"
                        ? "bg-[#54758A] text-white"
                        : acc.role === "FLOOR"
                        ? "bg-[#A86F1F] text-white"
                        : "bg-[#176B63] text-white"
                    }`}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#8EA0A8] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#176B63]" />
            Encrypted httpOnly session authentication with server-side role enforcement
          </p>
        </div>
      </div>
    </div>
  );
}
