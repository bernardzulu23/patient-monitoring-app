import { redirect } from "next/navigation";
import { StaffManager } from "@/components/staff-manager";
import { canManageStaff } from "@/lib/authz";
import { requireSession } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function StaffPage() {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const [users, wards] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: { ward: { select: { id: true, name: true } } },
    }),
    prisma.ward.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <StaffManager
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        ward: u.ward,
      }))}
      wards={wards}
    />
  );
}
