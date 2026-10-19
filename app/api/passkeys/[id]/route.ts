import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const passkey = await prisma.passkey.findUnique({ where: { id } });
  if (!passkey || passkey.userId !== session.userId) {
    // Same status whether missing or owned by someone else — no IDOR leak.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.passkey.delete({ where: { id } });
  await logAction(session.userId, "PASSKEY_REMOVED", "Passkey", id);

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
