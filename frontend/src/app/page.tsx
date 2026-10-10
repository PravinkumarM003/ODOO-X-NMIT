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
  } else {
    redirect("/overview");
  }
}
