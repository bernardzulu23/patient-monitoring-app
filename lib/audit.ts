import { prisma } from "@/lib/prisma";

export async function logAction(
  userId: string | null,
  action: string,
  targetType: string,
  targetId: string,
) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      targetType,
      targetId,
    },
  });
}
