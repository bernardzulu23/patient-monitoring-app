import { isAllowedRequestOrigin } from "@/lib/sameOrigin";
import { destroySession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!isAllowedRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await destroySession();
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
