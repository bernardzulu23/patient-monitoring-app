import { canManageWards } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.role === "admin" || session.role === "doctor"
      ? {}
      : session.wardId
        ? { id: session.wardId }
        : { id: "__none__" };

  const wards = await prisma.ward.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { rooms: true } } },
  });

  return NextResponse.json({ wards });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canManageWards(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Ward name is required" }, { status: 400 });
  }

  const ward = await prisma.ward.create({
    data: { name: name.trim() },
  });

  await logAction(session.userId, "CREATED_WARD", "Ward", ward.id);

  return NextResponse.json({ ward }, { status: 201 });
}
