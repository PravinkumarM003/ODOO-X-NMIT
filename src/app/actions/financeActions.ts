"use server";

import { requireRole } from "@/lib/auth";
import {
  markAttendance,
  closeMonthWages,
  markWagesPaid,
} from "@/services/financeService";
import { revalidatePath } from "next/cache";

export async function markAttendanceAction(formData: FormData) {
  await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  const employeeId = formData.get("employeeId") as string;
  const date = formData.get("date") as string;
  const shift = formData.get("shift") as "MORNING" | "EVENING" | "NIGHT";
  const status = formData.get("status") as "PRESENT" | "ABSENT" | "LEAVE";
  const overtimeHours = formData.get("overtimeHours")
    ? parseFloat(formData.get("overtimeHours") as string)
    : 0;

  if (!employeeId || !date) return { error: "Employee and date are required" };

  try {
    await markAttendance({
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
  const user = await requireRole(["OWNER"]);

  const month = formData.get("month") as string;
  if (!month) return { error: "Month YYYY-MM is required" };

  try {
    await closeMonthWages(month, user.name);

    revalidatePath("/people");
    revalidatePath("/finance");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markWagesPaidAction(formData: FormData) {
  await requireRole(["OWNER"]);

  const month = formData.get("month") as string;
  const employeeId = (formData.get("employeeId") as string) || undefined;
  const paidAtStr = formData.get("paidAt") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "BANK";
  const paymentReference = (formData.get("paymentReference") as string) || undefined;

  if (!month) return { error: "Month is required" };

  try {
    const count = await markWagesPaid({
      month,
      employeeId,
      paidAt: paidAtStr ? new Date(paidAtStr) : new Date(),
      paymentMethod,
      paymentReference,
    });

    revalidatePath("/people");
    revalidatePath("/finance");

    return { success: true, count };
  } catch (err: any) {
    return { error: err.message };
  }
}
