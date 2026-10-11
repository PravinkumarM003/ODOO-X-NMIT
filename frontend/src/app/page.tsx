import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "BUYER") {
    redirect("/buyer/orders");
  } else if (session.role === "PRODUCTION_SUPERVISOR" || session.role === "MECHANIC") {
    redirect("/production");
  } else if (session.role === "INSPECTION_SUPERVISOR") {
    redirect("/rolls");
  } else if (session.role === "DISPATCH_OFFICER") {
    redirect("/dispatch");
  } else {
    redirect("/overview");
  }
}
