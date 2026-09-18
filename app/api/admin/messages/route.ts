import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      name: m.name,
      institution: m.institution,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    })),
  });
}
