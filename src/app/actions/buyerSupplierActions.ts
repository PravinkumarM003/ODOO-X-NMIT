"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBuyerAction(formData: FormData) {
  await requireRole(["OWNER", "OFFICE"]);
  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!name || !email) return { error: "Name and email are required" };

  try {
    const buyer = await prisma.buyer.create({
      data: { name, contactPerson, email, phone, address },
    });
    revalidatePath("/buyers");
    return { success: true, buyerId: buyer.id };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createSupplierAction(formData: FormData) {
  await requireRole(["OWNER", "OFFICE"]);
  const name = (formData.get("name") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  if (!name) return { error: "Supplier name is required" };

  try {
    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, phone },
    });
    revalidatePath("/suppliers");
    return { success: true, supplierId: supplier.id };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markSupplierBillPaidAction(formData: FormData) {
  await requireRole(["OWNER", "OFFICE"]);
  const billId = formData.get("billId") as string;
  const paidAtStr = formData.get("paidAt") as string;

  if (!billId) return { error: "Bill ID is required" };

  try {
    await prisma.supplierBill.update({
      where: { id: billId },
      data: {
        status: "PAID",
        paidAt: paidAtStr ? new Date(paidAtStr) : new Date(),
      },
    });

    revalidatePath("/suppliers");
    revalidatePath("/finance");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
