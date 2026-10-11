"use client";

import React from "react";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export default function PrintButton({
  label = "Print Roll Passport",
  className = "flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--background)] text-[var(--text-primary)] font-semibold rounded shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-md",
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="w-3.5 h-3.5 text-[var(--primary)]" />
      {label}
    </button>
  );
}
