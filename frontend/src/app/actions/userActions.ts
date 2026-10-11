"use server";

import { apiClient } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";
import { getSession, createSession, SessionUser } from "@/lib/auth";

export async function updateProfileAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name || !email) {
    return { error: "Name and email are required" };
  }

  try {
    const data = await apiClient.put<any>("/auth/profile", { name, email });
    const session = await getSession();
    if (session) {
      session.name = data.name;
      session.email = data.email;
      await createSession(session);
    }
    revalidatePath("/"); // Revalidate all layouts to update the user name
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    const data = await apiClient.put("/auth/password", { currentPassword, newPassword });
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { error: "No file selected" };
  }
  
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File must be less than 5MB" };
  }
  
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." };
  }

  try {
    const data = await apiClient.post<any>("/auth/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    
    const session = await getSession();
    if (session) {
      session.avatarUrl = data.avatarUrl;
      await createSession(session);
    }
    
    revalidatePath("/"); 
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "Failed to upload avatar" };
  }
}
