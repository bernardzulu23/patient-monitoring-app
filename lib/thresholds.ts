import { prisma } from "@/lib/prisma";

export type ThresholdValues = {
  tempLow: number;
  tempHigh: number;
  hrLow: number;
  hrHigh: number;
  spo2Low: number;
  sysLow: number;
  sysHigh: number;
};

export const DEFAULT_THRESHOLDS: ThresholdValues = {
  tempLow: 35,
  tempHigh: 38.5,
  hrLow: 50,
  hrHigh: 120,
  spo2Low: 92,
  sysLow: 90,
  sysHigh: 180,
};

export type ThresholdBreach = {
  alertType: string;
  value: number;
};

/** Merge hospital defaults with optional patient overrides (null = inherit). */
export function mergeThresholds(
  hospital: ThresholdValues,
  override: Partial<{
    tempLow: number | null;
    tempHigh: number | null;
    hrLow: number | null;
    hrHigh: number | null;
    spo2Low: number | null;
    sysLow: number | null;
    sysHigh: number | null;
  }> | null,
): ThresholdValues {
  if (!override) return hospital;
  return {
    tempLow: override.tempLow ?? hospital.tempLow,
    tempHigh: override.tempHigh ?? hospital.tempHigh,
    hrLow: override.hrLow ?? hospital.hrLow,
    hrHigh: override.hrHigh ?? hospital.hrHigh,
    spo2Low: override.spo2Low ?? hospital.spo2Low,
    sysLow: override.sysLow ?? hospital.sysLow,
    sysHigh: override.sysHigh ?? hospital.sysHigh,
  };
}

export function evaluateThresholdBreaches(
  vitals: {
    heartRate?: number | null;
    spo2?: number | null;
    tempC?: number | null;
    systolic?: number | null;
  },
  t: ThresholdValues,
): ThresholdBreach[] {
  const breaches: ThresholdBreach[] = [];

  if (vitals.tempC != null) {
    if (vitals.tempC < t.tempLow) {
      breaches.push({ alertType: "THRESH_LOW_TEMP", value: vitals.tempC });
    } else if (vitals.tempC > t.tempHigh) {
      breaches.push({ alertType: "THRESH_HIGH_TEMP", value: vitals.tempC });
    }
  }
  if (vitals.heartRate != null) {
    if (vitals.heartRate < t.hrLow) {
      breaches.push({ alertType: "THRESH_LOW_HR", value: vitals.heartRate });
    } else if (vitals.heartRate > t.hrHigh) {
      breaches.push({ alertType: "THRESH_HIGH_HR", value: vitals.heartRate });
    }
  }
  if (vitals.spo2 != null && vitals.spo2 < t.spo2Low) {
    breaches.push({ alertType: "THRESH_LOW_SPO2", value: vitals.spo2 });
  }
  if (vitals.systolic != null) {
    if (vitals.systolic < t.sysLow) {
      breaches.push({ alertType: "THRESH_LOW_SYSTOLIC", value: vitals.systolic });
    } else if (vitals.systolic > t.sysHigh) {
      breaches.push({
        alertType: "THRESH_HIGH_SYSTOLIC",
        value: vitals.systolic,
      });
    }
  }

  return breaches;
}

export async function getHospitalThresholds(): Promise<ThresholdValues> {
  const row = await prisma.hospitalThresholds.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_THRESHOLDS },
    update: {},
  });
  return {
    tempLow: row.tempLow,
    tempHigh: row.tempHigh,
    hrLow: row.hrLow,
    hrHigh: row.hrHigh,
    spo2Low: row.spo2Low,
    sysLow: row.sysLow,
    sysHigh: row.sysHigh,
  };
}

export async function getEffectiveThresholds(
  patientId: string | null | undefined,
): Promise<ThresholdValues> {
  const hospital = await getHospitalThresholds();
  if (!patientId) return hospital;
  const override = await prisma.patientThresholdOverride.findUnique({
    where: { patientId },
  });
  return mergeThresholds(hospital, override);
}
