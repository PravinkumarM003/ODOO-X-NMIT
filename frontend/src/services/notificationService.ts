import { apiClient } from "@/lib/apiClient";

export type NotificationItem = {
  id: string;
  type:
    | "OVERDUE"
    | "AT_RISK"
    | "BREAKDOWN"
    | "YARN_LOW"
    | "YARN_OUT"
    | "PENDING_QC"
    | "READY_DISPATCH"
    | "NEEDS_REVIEW"
    | "NO_SHIPPABLE_ROLLS";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  link: string;
  timestamp?: Date;
};

export async function getComputedNotifications(): Promise<NotificationItem[]> {
  try {
    const data = await apiClient.get<NotificationItem[]>("/notifications");
    return data || [];
  } catch {
    return [];
  }
}
