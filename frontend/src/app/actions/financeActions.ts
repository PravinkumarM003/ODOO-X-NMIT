"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function markAttendanceAction(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const date = formData.get("date") as string;
  const shift = formData.get("shift") as "MORNING" | "EVENING" | "NIGHT";
  const status = formData.get("status") as "PRESENT" | "ABSENT" | "LEAVE";
  const overtimeHours = formData.get("overtimeHours")
    ? parseFloat(formData.get("overtimeHours") as string)
    : 0;

  if (!employeeId || !date) return { error: "Employee and date are required" };

  try {
    await apiClient.post("/finance/attendance", {
      employeeId,
      date,
      shift: shift || "MORNING",
      status: status || "PRESENT",
      overtimeHours,
    });

    revalidatePath("/people");
    revalidatePath("/finance");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function closeMonthWagesAction(formData: FormData) {
  const month = formData.get("month") as string;
  if (!month) return { error: "Month YYYY-MM is required" };

  try {
    await apiClient.post("/finance/wages/close", { month });

    revalidatePath("/people");
    revalidatePath("/finance");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markWagesPaidAction(formData: FormData) {
  const month = formData.get("month") as string;
  const employeeId = (formData.get("employeeId") as string) || undefined;
  const paidAtStr = formData.get("paidAt") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "BANK";
  const paymentReference = (formData.get("paymentReference") as string) || undefined;

  if (!month) return { error: "Month is required" };

  try {
    const res = await apiClient.post<{ success: boolean; count: number }>(
      "/finance/wages/pay",
      {
        month,
        employeeId,
        paidAt: paidAtStr || null,
        paymentMethod,
        paymentReference,
      }
    );

    revalidatePath("/people");
    revalidatePath("/finance");

    return { success: true, count: res.count };
  } catch (err: any) {
    return { error: err.message };
  }
}
