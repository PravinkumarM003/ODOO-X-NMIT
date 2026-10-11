import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    if (session.role === "BUYER") {
      redirect("/buyer/orders");
    } else if (
      session.role === "PRODUCTION_SUPERVISOR" ||
      session.role === "MECHANIC"
    ) {
      redirect("/production");
    } else if (session.role === "INSPECTION_SUPERVISOR") {
      redirect("/rolls");
    } else if (session.role === "DISPATCH_OFFICER") {
      redirect("/dispatch");
    } else {
      redirect("/overview");
    }
  }

  return <LoginClient />;
}

