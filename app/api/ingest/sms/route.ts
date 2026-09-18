import { NextResponse } from "next/server";
import { ingestReadingForDevice } from "@/lib/ingestReading";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * SMS fallback ingest stub for SIM800L / gateway webhooks.
 * Expected body (JSON or form):
 *   text: "KEY=dev_xxx HR=72 SPO2=98 TEMP=36.8 SYS=120 DIA=80 RR=16"
 * or discrete fields: apiKey/key, heartRate/hr, spo2, tempC/temp, systolic/sys, diastolic/dia, respiratoryRate/rr
 *
 * No live SMS provider is wired — this endpoint is ready for a gateway forwarder.
 */
function parseSmsText(text: string) {
  const get = (k: string) => {
    const m = new RegExp(`(?:^|\\s)${k}=([^\\s]+)`, "i").exec(text);
    return m?.[1];
  };
  const num = (v: string | undefined) => {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    apiKey: get("KEY") ?? get("APIKEY"),
    heartRate: num(get("HR")),
    spo2: num(get("SPO2")),
    tempC: num(get("TEMP")),
    systolic: num(get("SYS")),
    diastolic: num(get("DIA")),
    respiratoryRate: num(get("RR")),
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let apiKey =
      req.headers.get("x-api-key") ??
      req.headers.get("x-device-key") ??
      undefined;
    let heartRate: number | undefined;
    let spo2: number | undefined;
    let tempC: number | undefined;
    let systolic: number | undefined;
    let diastolic: number | undefined;
    let respiratoryRate: number | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (typeof body.text === "string") {
        const parsed = parseSmsText(body.text);
        apiKey = apiKey ?? parsed.apiKey ?? undefined;
        heartRate = parsed.heartRate;
        spo2 = parsed.spo2;
        tempC = parsed.tempC;
        systolic = parsed.systolic;
        diastolic = parsed.diastolic;
        respiratoryRate = parsed.respiratoryRate;
      } else {
        apiKey =
          apiKey ??
          (typeof body.apiKey === "string"
            ? body.apiKey
            : typeof body.key === "string"
              ? body.key
              : undefined);
        heartRate = Number(body.heartRate ?? body.hr);
        spo2 = Number(body.spo2);
        tempC = Number(body.tempC ?? body.temp);
        systolic = Number(body.systolic ?? body.sys);
        diastolic = Number(body.diastolic ?? body.dia);
        respiratoryRate = Number(body.respiratoryRate ?? body.rr);
        if (!Number.isFinite(heartRate)) heartRate = undefined;
        if (!Number.isFinite(spo2)) spo2 = undefined;
        if (!Number.isFinite(tempC)) tempC = undefined;
        if (!Number.isFinite(systolic)) systolic = undefined;
        if (!Number.isFinite(diastolic)) diastolic = undefined;
        if (!Number.isFinite(respiratoryRate)) respiratoryRate = undefined;
      }
    } else {
      const form = await req.formData().catch(() => null);
      const text = form?.get("text") ?? form?.get("Body") ?? form?.get("message");
      if (typeof text === "string") {
        const parsed = parseSmsText(text);
        apiKey = apiKey ?? parsed.apiKey ?? undefined;
        heartRate = parsed.heartRate;
        spo2 = parsed.spo2;
        tempC = parsed.tempC;
        systolic = parsed.systolic;
        diastolic = parsed.diastolic;
        respiratoryRate = parsed.respiratoryRate;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Missing device API key" }, { status: 401 });
    }

    const device = await prisma.device.findUnique({ where: { apiKey } });
    if (!device) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (
      heartRate === undefined &&
      spo2 === undefined &&
      tempC === undefined &&
      systolic === undefined &&
      diastolic === undefined &&
      respiratoryRate === undefined
    ) {
      return NextResponse.json({ error: "No vitals in SMS payload" }, { status: 400 });
    }

    const { reading, score } = await ingestReadingForDevice(device.id, {
      ...(heartRate !== undefined ? { heartRate } : {}),
      ...(spo2 !== undefined ? { spo2 } : {}),
      ...(tempC !== undefined ? { tempC } : {}),
      ...(systolic !== undefined ? { systolic } : {}),
      ...(diastolic !== undefined ? { diastolic } : {}),
      ...(respiratoryRate !== undefined ? { respiratoryRate } : {}),
    });

    return NextResponse.json({
      success: true,
      via: "sms-stub",
      readingId: reading.id,
      score,
    });
  } catch (error) {
    console.error("[api/ingest/sms]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
