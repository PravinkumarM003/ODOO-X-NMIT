"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export interface RegisterRollsResult {
  success?: boolean;
  error?: string;
  count?: number;
}

export interface InspectRollResult {
  success?: boolean;
  error?: string;
  rollNo?: string;
  status?: string;
}

export async function registerRollsAction(formData: FormData): Promise<RegisterRollsResult> {
  const orderId = formData.get("orderId") as string;
  const lengthsJson = formData.get("lengthsJson") as string;

  if (!orderId) return { error: "Order ID is required" };

  try {
    const lengths: number[] = JSON.parse(lengthsJson || "[]");
    if (!lengths.length) return { error: "Please provide at least one roll length" };

    const res = await apiClient.post<RegisterRollsResult>(
      "/rolls/register",
      {
        orderId,
        rolls: lengths.map((l) => ({ lengthMetres: l })),
      }
    );

    revalidatePath("/rolls");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/production");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function inspectRollAction(formData: FormData): Promise<InspectRollResult> {
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
    const res = await apiClient.post<InspectRollResult>(`/rolls/${rollId}/inspect`, {
      rollId,
      result,
      defectType: result === "PASSED" ? null : defectType,
      severity: result === "PASSED" ? null : severity,
      notes: notes || null,
    });

    revalidatePath("/rolls");
    revalidatePath(`/rolls/${rollId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}
