"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export interface CreateDispatchResult {
  success?: boolean;
  error?: string;
  dispatchNo?: string;
  invoiceNo?: string;
  rollCount?: number;
  totalMetres?: number;
}

export interface RecordPaymentResult {
  success?: boolean;
  error?: string;
  paymentId?: string;
}

export async function createDispatchAction(formData: FormData): Promise<CreateDispatchResult> {
  const orderId = formData.get("orderId") as string;
  const rollIdsJson = formData.get("rollIdsJson") as string;
  const truckNo = (formData.get("truckNo") as string)?.trim();
  const driverName = (formData.get("driverName") as string)?.trim();

  if (!orderId) return { error: "Order ID is required" };
  if (!truckNo) return { error: "Truck registration number is required" };
  if (!driverName) return { error: "Driver name is required" };

  try {
    const rollIds: string[] = JSON.parse(rollIdsJson || "[]");
    if (!rollIds.length) return { error: "Please select at least one roll for dispatch" };

    const res = await apiClient.post<CreateDispatchResult>("/dispatch/create", {
      orderId,
      rollIds,
      truckNo,
      driverName,
    });

    revalidatePath("/dispatch");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/rolls");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function recordPaymentAction(formData: FormData): Promise<RecordPaymentResult> {
  const invoiceId = formData.get("invoiceId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const method = formData.get("method") as "BANK" | "CASH" | "UPI";
  const reference = (formData.get("reference") as string)?.trim();

  if (!invoiceId) return { error: "Invoice ID is required" };
  if (isNaN(amount) || amount <= 0) return { error: "Payment amount must be greater than 0" };
  if (!method || !["BANK", "CASH", "UPI"].includes(method)) return { error: "Valid payment method is required" };

  try {
    const res = await apiClient.post<RecordPaymentResult>(
      "/dispatch/payment",
      {
        invoiceId,
        amount,
        method,
        reference: reference || null,
      }
    );

    revalidatePath("/dispatch");
    revalidatePath("/finance");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}
