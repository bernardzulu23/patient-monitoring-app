import { prisma } from "@/lib/prisma";

export async function logAction(
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
) {
  await prisma.auditLog.create({
    data: { userId, action, targetType, targetId },
  });
}
