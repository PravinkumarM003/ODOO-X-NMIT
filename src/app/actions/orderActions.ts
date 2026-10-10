"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export interface CreateOrderResult {
  success?: boolean;
  error?: string;
  orderId?: string;
  orderNo?: string;
  status?: string;
}

export interface ReviewOrderResult {
  success?: boolean;
  error?: string;
  status?: string;
}

export interface CancelOrderResult {
  success?: boolean;
  error?: string;
  status?: string;
}

export async function checkYarnAvailabilityAction(fabricTypeId: string, qtyMetres: number) {
  if (!fabricTypeId || isNaN(qtyMetres) || qtyMetres <= 0) {
    return null;
  }
  try {
    return await apiClient.get<any>(
      `/orders/check-yarn?fabricTypeId=${fabricTypeId}&qtyMetres=${qtyMetres}`
    );
  } catch {
    return null;
  }
}

export async function createOrderAction(formData: FormData): Promise<CreateOrderResult> {
  const buyerId = formData.get("buyerId") as string;
  const fabricTypeId = formData.get("fabricTypeId") as string;
  const colour = (formData.get("colour") as string)?.trim();
  const qtyMetres = parseFloat(formData.get("qtyMetres") as string);
  const deadlineStr = formData.get("deadline") as string;
  const pricePerMetre = formData.get("pricePerMetre")
    ? parseFloat(formData.get("pricePerMetre") as string)
    : undefined;

  if (!buyerId) return { error: "Please select a buyer" };
  if (!fabricTypeId) return { error: "Please select a fabric type" };
  if (!colour) return { error: "Colour is required" };
  if (isNaN(qtyMetres) || qtyMetres <= 0) return { error: "Quantity must be greater than 0 metres" };
  if (!deadlineStr) return { error: "Deadline is required" };

  try {
    const res = await apiClient.post<CreateOrderResult>("/orders", {
      buyerId,
      fabricTypeId,
      colour,
      qtyMetres,
      deadline: deadlineStr,
      pricePerMetre,
      submittedByBuyer: false,
    });

    revalidatePath("/orders");
    revalidatePath("/yarn");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function reviewBuyerOrderAction(formData: FormData): Promise<ReviewOrderResult> {
  const orderId = formData.get("orderId") as string;
  const action = formData.get("action") as "APPROVE" | "CANCEL";
  const adjustedPrice = formData.get("adjustedPricePerMetre")
    ? parseFloat(formData.get("adjustedPricePerMetre") as string)
    : undefined;
  const cancelReason = (formData.get("cancelReason") as string)?.trim();

  if (!orderId) return { error: "Order ID is required" };
  if (!action || !["APPROVE", "CANCEL"].includes(action)) {
    return { error: "Invalid review action" };
  }

  try {
    const res = await apiClient.post<ReviewOrderResult>(`/orders/${orderId}/review`, {
      action,
      adjustedPricePerMetre: adjustedPrice,
      cancelReason,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function cancelOrderAction(formData: FormData): Promise<CancelOrderResult> {
  const orderId = formData.get("orderId") as string;
  const cancelReason = (formData.get("cancelReason") as string)?.trim();

  if (!orderId) return { error: "Order ID is required" };
  if (!cancelReason || cancelReason.length < 5) {
    return { error: "Cancellation reason is required (minimum 5 characters)" };
  }

  try {
    const res = await apiClient.post<CancelOrderResult>(`/orders/${orderId}/cancel`, {
      cancelReason,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}
