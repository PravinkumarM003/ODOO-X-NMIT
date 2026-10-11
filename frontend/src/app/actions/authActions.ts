"use server";

import { apiClient, ApiError } from "@/lib/apiClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password" };
  }

  try {
    const data = await apiClient.post<{
      success: boolean;
      token: string;
      user: {
        userId: string;
        email: string;
        name: string;
        role: string;
        buyerId: string | null;
      };
      redirectUrl: string;
    }>("/auth/login", { email, password });

    const cookieStore = await cookies();
    cookieStore.set("texflow_session", data.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    if (data.redirectUrl) {
      redirect(data.redirectUrl);
    }
    return { success: true, token: data.token };
  } catch (err: any) {
    // Next.js redirect throws NEXT_REDIRECT which must not be caught as an error
    if (err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return { error: err.message || "Login failed" };
  }
}

export async function logoutAction() {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Ignore error on logout call
  }
  const cookieStore = await cookies();
  cookieStore.delete("texflow_session");
  redirect("/login");
}
