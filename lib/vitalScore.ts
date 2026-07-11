export type ScoreLevel = "NORMAL" | "LOW" | "URGENT";

export function scoreHeartRate(hr: number): number {
  if (hr <= 40 || hr >= 131) return 3;
  if (hr >= 111) return 2;
  if (hr <= 50 || hr >= 91) return 1;
  return 0;
}

export function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

export function scoreSystolic(sys: number): number {
  if (sys <= 90 || sys >= 220) return 3;
  if (sys <= 100) return 2;
  if (sys <= 110) return 1;
  return 0;
}

export function scoreTemp(tempC: number): number {
  if (tempC <= 35.0) return 3;
  if (tempC >= 39.1) return 2;
  if (tempC <= 36.0 || tempC >= 38.1) return 1;
  return 0;
}

export type ReadingScores = {
  heartRate?: number | null;
  spo2?: number | null;
  systolic?: number | null;
  tempC?: number | null;
};

/**
 * NEWS2-inspired aggregate score (not full NEWS2 — no respiratory rate or consciousness).
 */
export function aggregateScore(reading: ReadingScores): {
  total: number;
  level: ScoreLevel;
  complete: boolean;
} {
  let total = 0;
  let scored = 0;

  if (reading.heartRate != null) {
    total += scoreHeartRate(reading.heartRate);
    scored += 1;
  }
  if (reading.spo2 != null) {
    total += scoreSpo2(reading.spo2);
    scored += 1;
  }
  if (reading.systolic != null) {
    total += scoreSystolic(reading.systolic);
    scored += 1;
  }
  if (reading.tempC != null) {
    total += scoreTemp(reading.tempC);
    scored += 1;
  }

  const complete = scored === 4;
  if (scored === 0) return { total: 0, level: "NORMAL", complete: false };
  if (total >= 5) return { total, level: "URGENT", complete };
  if (total >= 1) return { total, level: "LOW", complete };
  return { total, level: "NORMAL", complete };
}
