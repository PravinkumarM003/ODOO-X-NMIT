import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function Forbidden({ message }: { message?: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-10 text-center max-w-lg mx-auto mt-12 shadow-sm">
      <div className="w-12 h-12 bg-[rgba(255,77,77,0.15)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--critical)]">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-[var(--text-primary)]">You do not have access</h2>
      <p className="text-xs text-[var(--text-secondary)] mt-2 mb-6">
        {message || "Your current account role does not have authorization to view this area or financial data."}
      </p>
      <Link
        href="/overview"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 text-[var(--text-primary)] text-xs font-semibold rounded-md transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Overview
      </Link>
    </div>
  );
}
