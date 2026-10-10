import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function Forbidden({ message }: { message?: string }) {
  return (
    <div className="bg-white border border-[#DCE3E1] rounded-lg p-10 text-center max-w-lg mx-auto mt-12 shadow-sm">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#B44545]">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-[#202B32]">You do not have access</h2>
      <p className="text-xs text-[#617078] mt-2 mb-6">
        {message || "Your current account role does not have authorization to view this area or financial data."}
      </p>
      <Link
        href="/overview"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#176B63] hover:bg-[#11564F] text-white text-xs font-semibold rounded-md transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Overview
      </Link>
    </div>
  );
}
