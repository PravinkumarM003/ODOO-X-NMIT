import React from "react";
import { getSession, requireRole } from "@/lib/auth";
import ProfileClient from "./ProfileClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | TexFlow",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireRole(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "BUYER"]);
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full animate-fade-in-up">
      <ProfileClient user={user} />
    </div>
  );
}
