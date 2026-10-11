"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/authActions";
import { ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import MachineLoader from "@/components/common/MachineLoader";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("everest2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      role: "ADMINISTRATOR",
      name: "Arunachalam Chettiar",
      email: "administrator@everest.demo",
      badge: "Administrator & Executive",
      desc: "Full access to finance, margins, wage approvals & closed months",
    },
    {
      role: "DISPATCH_OFFICER",
      name: "Dispatch Officer",
      email: "dispatch@everest.demo",
      badge: "Dispatch Officer",
      desc: "Coordinate and dispatch truck orders",
    },
    {
      role: "PRODUCTION_SUPERVISOR",
      name: "Production Manager",
      email: "production@everest.demo",
      badge: "Production Supervisor",
      desc: "Assign machines & report breakdowns",
    },
    {
      role: "INSPECTION_SUPERVISOR",
      name: "QC Inspector",
      email: "qc@everest.demo",
      badge: "Inspection Supervisor",
      desc: "Inspect rolls and approve QC",
    },
    {
      role: "MECHANIC",
      name: "Head Mechanic",
      email: "mechanic@everest.demo",
      badge: "Machine Mechanic",
      desc: "Receive breakdown alerts & resolve them",
    },
    {
      role: "MANAGER",
      name: "Operations Manager",
      email: "manager@everest.demo",
      badge: "Operations Manager",
      desc: "Manage buyers, suppliers, invoices & people",
    },
    {
      role: "BUYER",
      name: "Madras Garments Ltd",
      email: "buyer.madras@everest.demo",
      buyerName: "Madras Garments",
      badge: "Buyer Portal",
      desc: "View assigned orders, roll statuses & invoices",
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAction(formData);
      if ((res as any)?.token && typeof window !== "undefined") {
        localStorage.setItem("texflow_token", (res as any).token);
      }
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err: any) {
      if (err?.message !== "NEXT_REDIRECT") {
        setError("Invalid email or password");
        setLoading(false);
      }
    }
  };

  const handleSelectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("everest2026");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md space-y-6 animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <span className="w-3.5 h-8 bg-[var(--primary)] rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.6)]"></span>
            <span className="text-3xl font-bold tracking-wider text-[var(--text-primary)]">TEXFLOW</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            Everest Textile Mills
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            From Yarn to Delivery, Every Roll Accounted For.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-xl shadow-xl space-y-6 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
              <MachineLoader message="Authenticating..." />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded bg-red-50 border border-[rgba(255,77,77,0.3)] text-[var(--critical)] font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@everest.demo"
                className="mt-1 block w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Default demo password: everest2026</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md text-[var(--background)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              Sign In to TexFlow
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Section 7.1: Demo Accounts Helper (Lists all 7 accounts) */}
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                Demo Accounts Helper
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">Click to prefill credentials</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc.email)}
                  className={`w-full text-left p-2.5 rounded border transition-all text-xs flex items-center justify-between ${
                    email === acc.email
                      ? "border-[var(--primary)] bg-[rgba(0,240,255,0.1)]"
                      : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--sidebar-secondary)]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{acc.name}</span>
                      {acc.buyerName && (
                        <span className="text-[11px] text-[var(--primary)] font-medium">
                          ({acc.buyerName})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{acc.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 border ${
                      acc.role === "ADMINISTRATOR"
                        ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800"
                        : acc.role === "MANAGER"
                        ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800"
                        : acc.role === "PRODUCTION_SUPERVISOR"
                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800"
                        : acc.role === "MECHANIC"
                        ? "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800"
                        : acc.role === "INSPECTION_SUPERVISOR"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800"
                        : acc.role === "DISPATCH_OFFICER"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800"
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
          <p className="text-[11px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary)]" />
            Encrypted httpOnly session authentication with server-side role enforcement
          </p>
        </div>
      </div>
    </div>
  );
}
