"use server";

import { requireSession } from "@/lib/auth";
import { createOrder } from "@/services/orderService";
import { revalidatePath } from "next/cache";

export async function requestBuyerOrderAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "BUYER" || !session.buyerId) {
    return { error: "Only buyer accounts can request buyer orders" };
  }

  const fabricTypeId = formData.get("fabricTypeId") as string;
  const colour = (formData.get("colour") as string)?.trim();
  const qtyMetres = parseFloat(formData.get("qtyMetres") as string);
  const deadlineStr = formData.get("deadline") as string;

  if (!fabricTypeId) return { error: "Please select a fabric type" };
  if (!colour) return { error: "Colour is required" };
  if (isNaN(qtyMetres) || qtyMetres <= 0) return { error: "Quantity must be greater than 0 metres" };
  if (!deadlineStr) return { error: "Deadline is required" };

  try {
    const order = await createOrder({
      buyerId: session.buyerId,
      fabricTypeId,
      colour,
      qtyMetres,
      deadline: new Date(deadlineStr),
      createdBy: session.name,
      submittedByBuyer: true, // Flags submittedByBuyer = true (BR-24)
    });

    revalidatePath("/buyer/orders");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return {
      success: true,
      orderId: order.id,
      orderNo: order.orderNo,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
