"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function assignMachineAction(formData: FormData) {
  const workOrderId = formData.get("workOrderId") as string;
  const machineId = formData.get("machineId") as string;

  if (!workOrderId || !machineId) {
    return { error: "Both work order and machine must be selected" };
  }

  try {
    await apiClient.post("/production/assign", {
      workOrderId,
      machineId,
    });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function logOutputAction(formData: FormData) {
  const workOrderId = formData.get("workOrderId") as string;
  const employeeId = formData.get("employeeId") as string;
  const qtyMetres = parseFloat(formData.get("qtyMetres") as string);
  const hours = parseFloat(formData.get("hours") as string);
  const shift = formData.get("shift") as "MORNING" | "EVENING" | "NIGHT";

  if (!workOrderId) return { error: "Work order is required" };
  if (!employeeId) return { error: "Employee is required" };
  if (isNaN(qtyMetres) || qtyMetres <= 0) return { error: "Produced metres must be > 0" };
  if (isNaN(hours) || hours <= 0) return { error: "Hours must be > 0" };
  if (!["MORNING", "EVENING", "NIGHT"].includes(shift)) return { error: "Invalid shift" };

  try {
    await apiClient.post("/production/log-output", {
      workOrderId,
      employeeId,
      qtyMetres,
      hours,
      shift,
    });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function completeStageAction(formData: FormData) {
  const workOrderId = formData.get("workOrderId") as string;
  const stage = formData.get("stage") as string;
  const actualKgUsed = formData.get("actualKgUsed")
    ? parseFloat(formData.get("actualKgUsed") as string)
    : undefined;

  if (!workOrderId) return { error: "Work order is required" };

  try {
    await apiClient.post("/production/complete-stage", {
      workOrderId,
      stage,
      actualKgUsed,
    });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/rolls");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function reportBreakdownAction(formData: FormData) {
  const machineId = formData.get("machineId") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!machineId) return { error: "Machine ID is required" };
  if (!reason || reason.length < 3) return { error: "Reason for breakdown is required (min 3 chars)" };

  try {
    await apiClient.post("/production/breakdown", { machineId, reason });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function resolveBreakdownAction(formData: FormData) {
  const machineId = formData.get("machineId") as string;
  if (!machineId) return { error: "Machine ID is required" };

  try {
    await apiClient.post("/production/resolve-breakdown", { machineId });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function reassignWorkOrderAction(formData: FormData) {
  const workOrderId = formData.get("workOrderId") as string;
  const newMachineId = formData.get("newMachineId") as string;

  if (!workOrderId || !newMachineId) return { error: "Work order and replacement machine are required" };

  try {
    await apiClient.post("/production/reassign", {
      workOrderId,
      newMachineId,
    });

    revalidatePath("/production");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
