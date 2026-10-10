"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function createBuyerAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!name || !email) return { error: "Name and email are required" };

  try {
    const res = await apiClient.post<{ success: boolean; buyerId: string }>("/buyers", {
      name,
      contactPerson,
      email,
      phone,
      address,
    });
    revalidatePath("/buyers");
    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createSupplierAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  if (!name) return { error: "Supplier name is required" };

  try {
    const res = await apiClient.post<{ success: boolean; supplierId: string }>("/suppliers", {
      name,
      contactPerson,
      phone,
    });
    revalidatePath("/suppliers");
    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markSupplierBillPaidAction(formData: FormData) {
  const billId = formData.get("billId") as string;
  const paidAtStr = formData.get("paidAt") as string;

  if (!billId) return { error: "Bill ID is required" };

  try {
    const res = await apiClient.post<{ success: boolean; billId: string; status: string }>(
      `/suppliers/bills/${billId}/pay`,
      {
        billId,
        paidAt: paidAtStr || null,
      }
    );

    revalidatePath("/suppliers");
    revalidatePath("/finance");
    return res;
  } catch (err: any) {
    return { error: err.message };
  }
}
