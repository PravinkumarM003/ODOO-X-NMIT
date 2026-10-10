"use server";

import { requireRole } from "@/lib/auth";
import {
  createOrder,
  reviewBuyerOrder,
  cancelOrder,
  calculateYarnRequirement,
} from "@/services/orderService";
import { revalidatePath } from "next/cache";

export async function checkYarnAvailabilityAction(fabricTypeId: string, qtyMetres: number) {
  if (!fabricTypeId || isNaN(qtyMetres) || qtyMetres <= 0) {
    return null;
  }
  return calculateYarnRequirement(fabricTypeId, qtyMetres);
}

export async function createOrderAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE"]);

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
    const order = await createOrder({
      buyerId,
      fabricTypeId,
      colour,
      qtyMetres,
      deadline: new Date(deadlineStr),
      pricePerMetre,
      createdBy: user.name,
      submittedByBuyer: false,
    });

    revalidatePath("/orders");
    revalidatePath("/yarn");
    revalidatePath("/overview");

    return {
      success: true,
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function reviewBuyerOrderAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE"]);

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
    const updated = await reviewBuyerOrder({
      orderId,
      action,
      adjustedPricePerMetre: adjustedPrice,
      cancelReason,
      reviewedBy: user.name,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return {
      success: true,
      status: updated.status,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function cancelOrderAction(formData: FormData) {
  const user = await requireRole(["OWNER", "OFFICE"]);

  const orderId = formData.get("orderId") as string;
  const cancelReason = (formData.get("cancelReason") as string)?.trim();

  if (!orderId) return { error: "Order ID is required" };
  if (!cancelReason || cancelReason.length < 5) {
    return { error: "Cancellation reason is required (minimum 5 characters)" };
  }

  try {
    const cancelled = await cancelOrder({
      orderId,
      cancelReason,
      cancelledBy: user.name,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/overview");

    return { success: true, status: cancelled.status };
  } catch (err: any) {
    return { error: err.message };
  }
}
