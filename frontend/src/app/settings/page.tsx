import React from "react";
import { getSession, requireRole } from "@/lib/auth";
import SettingsClient from "@/app/settings/SettingsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | TexFlow",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER", "BUYER"]);
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full animate-fade-in-up">
      <SettingsClient user={user} />
    </div>
  );
}
