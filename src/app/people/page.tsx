import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComputedNotifications } from "@/services/notificationService";
import AppShell from "@/components/layout/AppShell";
import PeopleClient from "./PeopleClient";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireRole(["OWNER", "OFFICE", "FLOOR"]);
  const notifications = await getComputedNotifications();
  const params = await searchParams;

  const todayStr = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || todayStr;

  const employees = await prisma.employee.findMany({
    include: {
      attendances: {
        where: { date: selectedDate },
      },
    },
    orderBy: { empNo: "asc" },
  });

  const employeesData = employees.map((emp) => {
    const att = emp.attendances[0] || null;
    return {
      id: emp.id,
      empNo: emp.empNo,
      name: emp.name,
      department: emp.department,
      jobTitle: emp.jobTitle,
      dailyWage: emp.dailyWage,
      overtimeRatePerHour: emp.overtimeRatePerHour,
      active: emp.active,
      currentAttendance: att
        ? {
            status: att.status,
            shift: att.shift,
            overtimeHours: att.overtimeHours,
          }
        : null,
    };
  });

  return (
    <AppShell user={user} notifications={notifications}>
      <PeopleClient
        employees={employeesData}
        selectedDate={selectedDate}
        userRole={user.role}
      />
    </AppShell>
  );
}
