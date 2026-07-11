import { canManageWards } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ wardId: string }> },
) {
  const session = await getSession();
  if (!session || !canManageWards(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { wardId } = await params;
  const ward = await prisma.ward.findUnique({ where: { id: wardId } });
  if (!ward) {
    return NextResponse.json({ error: "Ward not found" }, { status: 404 });
  }

  const { number } = await req.json();
  if (typeof number !== "string" || !number.trim()) {
    return NextResponse.json(
      { error: "Room number is required" },
      { status: 400 },
    );
  }

  try {
    const room = await prisma.room.create({
      data: { wardId, number: number.trim() },
    });
    await logAction(session.userId, "CREATED_ROOM", "Room", room.id);
    return NextResponse.json({ room }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "A room with that number already exists in this ward" },
      { status: 409 },
    );
  }
}
