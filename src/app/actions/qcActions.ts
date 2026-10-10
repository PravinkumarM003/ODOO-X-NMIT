"use server";

import { requireRole } from "@/lib/auth";
import { registerRolls, inspectRoll } from "@/services/qcService";
import { revalidatePath } from "next/cache";

export async function registerRollsAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  const orderId = formData.get("orderId") as string;
  const lengthsJson = formData.get("lengthsJson") as string;

  if (!orderId) return { error: "Order ID is required" };

  try {
    const lengths: number[] = JSON.parse(lengthsJson || "[]");
    if (!lengths.length) return { error: "Please provide at least one roll length" };

    const rolls = await registerRolls({
      orderId,
      rolls: lengths.map((l) => ({ lengthMetres: l })),
      registeredBy: user.name,
    });

    revalidatePath("/rolls");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/production");
    revalidatePath("/overview");

    return { success: true, count: rolls.length };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function inspectRollAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);

  const rollId = formData.get("rollId") as string;
  const result = formData.get("result") as "PASSED" | "REWORK" | "REJECTED";
  const defectType = formData.get("defectType") as any;
  const severity = formData.get("severity") as any;
  const notes = (formData.get("notes") as string)?.trim();

  if (!rollId) return { error: "Roll ID is required" };
  if (!result || !["PASSED", "REWORK", "REJECTED"].includes(result)) {
    return { error: "Valid inspection result is required" };
  }

  if (result !== "PASSED") {
    if (!defectType) return { error: "Defect type is required for non-passed rolls" };
    if (!severity) return { error: "Severity is required for non-passed rolls" };
  }

  try {
    const updatedRoll = await inspectRoll({
      rollId,
      result,
      defectType: result === "PASSED" ? null : defectType,
      severity: result === "PASSED" ? null : severity,
      notes: notes || null,
      inspectorId: user.userId,
      inspectorName: user.name,
    });

    revalidatePath("/rolls");
    revalidatePath(`/rolls/${rollId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true, rollNo: updatedRoll.rollNo, status: updatedRoll.qcStatus };
  } catch (err: any) {
    return { error: err.message };
  }
}
