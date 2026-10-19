import { toPublicPasskey } from "@/lib/passkey";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** List the signed-in user's passkeys (metadata only — no public keys). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passkeys = await prisma.passkey.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { passkeys: passkeys.map(toPublicPasskey) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
