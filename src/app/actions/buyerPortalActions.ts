"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export interface RequestBuyerOrderResult {
  success?: boolean;
  error?: string;
  orderId?: string;
  orderNo?: string;
}

export async function requestBuyerOrderAction(formData: FormData): Promise<RequestBuyerOrderResult> {
  const fabricTypeId = formData.get("fabricTypeId") as string;
  const colour = (formData.get("colour") as string)?.trim();
  const qtyMetres = parseFloat(formData.get("qtyMetres") as string);
  const deadlineStr = formData.get("deadline") as string;

  if (!fabricTypeId) return { error: "Please select a fabric type" };
  if (!colour) return { error: "Colour is required" };
  if (isNaN(qtyMetres) || qtyMetres <= 0) return { error: "Quantity must be greater than 0 metres" };
  if (!deadlineStr) return { error: "Deadline is required" };

  try {
    const res = await apiClient.post<RequestBuyerOrderResult>("/buyer/orders", {
      fabricTypeId,
      colour,
      qtyMetres,
      deadline: deadlineStr,
    });

    revalidatePath("/buyer/orders");
    revalidatePath("/orders");
    revalidatePath("/overview");

    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}
