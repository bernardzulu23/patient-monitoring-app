import { canManageStaff } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSession, type SessionPayload } from "@/lib/session";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function requireAdmin(
  req: Request,
): Promise<{ session: SessionPayload } | { response: NextResponse }> {
  if (!isAllowedRequestOrigin(req)) {
    return { response: jsonError(403, "Forbidden") };
  }
  const session = await getSession();
  if (!session || !canManageStaff(session)) {
    return { response: jsonError(403, "Forbidden") };
  }
  return { session };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  if (userId === auth.session.userId) {
    return jsonError(400, "Change your own password under Settings");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError(404, "Account not found");
  if (user.role === "admin") {
    return jsonError(400, "Admin passwords can only be changed under Settings");
  }

  const temporaryPassword = randomBytes(8).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(temporaryPassword) },
  });
  await logAction(auth.session.userId, "RESET_STAFF_PASSWORD", "User", userId);

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
    temporaryPassword,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  if (userId === auth.session.userId) {
    return jsonError(400, "You cannot delete your own account");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError(404, "Account not found");
  if (user.role === "admin") {
    return jsonError(400, "Admin accounts cannot be deleted");
  }

  await prisma.user.delete({ where: { id: userId } });
  await logAction(auth.session.userId, "DELETED_STAFF", "User", userId);

  return NextResponse.json({ success: true });
}
