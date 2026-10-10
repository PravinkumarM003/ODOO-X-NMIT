"use server";

import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword, SessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "Invalid credentials: user not found" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid credentials: password incorrect" };
  }

  const sessionUser: SessionUser = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any,
    buyerId: user.buyerId,
  };

  await createSession(sessionUser);

  // Redirect based on role
  if (user.role === "BUYER") {
    redirect("/buyer/orders");
  } else {
    redirect("/overview");
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
