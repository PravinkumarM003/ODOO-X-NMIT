"use server";

import { requireRole } from "@/lib/auth";
import { createDispatch, recordPayment } from "@/services/dispatchService";
import { revalidatePath } from "next/cache";

export async function createDispatchAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE"]);

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

    const result = await createDispatch({
      orderId,
      rollIds,
      truckNo,
      driverName,
      dispatchedBy: user.name,
    });

    revalidatePath("/dispatch");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/rolls");
    revalidatePath("/overview");

    return {
      success: true,
      dispatchNo: result.dispatch.dispatchNo,
      invoiceNo: result.invoice.invoiceNo,
      rollCount: result.rollCount,
      totalMetres: result.totalMetres,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE"]);

  const invoiceId = formData.get("invoiceId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const method = formData.get("method") as "BANK" | "CASH" | "UPI";
  const reference = (formData.get("reference") as string)?.trim();

  if (!invoiceId) return { error: "Invoice ID is required" };
  if (isNaN(amount) || amount <= 0) return { error: "Payment amount must be greater than 0" };
  if (!method || !["BANK", "CASH", "UPI"].includes(method)) return { error: "Valid payment method is required" };

  try {
    const payment = await recordPayment({
      invoiceId,
      amount,
      method,
      reference: reference || null,
    });

    revalidatePath("/dispatch");
    revalidatePath("/finance");
    revalidatePath("/overview");

    return { success: true, paymentId: payment.id };
  } catch (err: any) {
    return { error: err.message };
  }
}
