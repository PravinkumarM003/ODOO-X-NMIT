"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export interface ReceiveYarnResult {
  success?: boolean;
  error?: string;
  lotCode?: string;
  qtyReceivedKg?: number;
  releasedOrders?: Array<{ orderNo: string; orderId?: string; qtyMetres?: number }>;
}

export interface AdjustStockResult {
  success?: boolean;
  error?: string;
}

export async function receiveYarnAction(formData: FormData): Promise<ReceiveYarnResult> {
  const lotCode = (formData.get("lotCode") as string)?.trim().toUpperCase();
  const yarnItemId = formData.get("yarnItemId") as string;
  const supplierId = formData.get("supplierId") as string;
  const qtyReceivedKg = parseFloat(formData.get("qtyReceivedKg") as string);
  const unitCostPerKg = parseFloat(formData.get("unitCostPerKg") as string);
  const linkedOrderId = (formData.get("linkedOrderId") as string) || null;
  const createSupplierBill = formData.get("createSupplierBill") === "on";
  const billAmount = formData.get("billAmount") ? parseFloat(formData.get("billAmount") as string) : undefined;

  if (!lotCode) return { error: "Lot code is required (e.g. LOT-0010)" };
  if (!yarnItemId) return { error: "Please select a yarn item" };
  if (!supplierId) return { error: "Please select a supplier" };
  if (isNaN(qtyReceivedKg) || qtyReceivedKg <= 0) return { error: "Quantity must be greater than 0 kg" };
  if (isNaN(unitCostPerKg) || unitCostPerKg < 0) return { error: "Unit cost must be valid" };

  try {
    const res = await apiClient.post<ReceiveYarnResult>("/yarn/receive", {
      lotCode,
      yarnItemId,
      supplierId,
      qtyReceivedKg,
      unitCostPerKg,
      linkedOrderId,
      createSupplierBill,
      billAmount,
    });

    revalidatePath("/yarn");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function adjustStockAction(formData: FormData): Promise<AdjustStockResult> {
  const lotId = formData.get("lotId") as string;
  const deltaKg = parseFloat(formData.get("deltaKg") as string);
  const reason = (formData.get("reason") as string)?.trim();

  if (!lotId) return { error: "Lot selection is required" };
  if (isNaN(deltaKg) || deltaKg === 0) return { error: "Adjustment quantity cannot be 0" };
  if (!reason || reason.length < 3) return { error: "A valid reason (minimum 3 characters) is required" };

  try {
    await apiClient.post("/yarn/adjust", {
      lotId,
      deltaKg,
      reason,
    });

    revalidatePath("/yarn");
    revalidatePath("/overview");

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
