export const LANDING_SLOTS = ["HERO", "GALLERY"] as const;
export type LandingSlot = (typeof LANDING_SLOTS)[number];

export const MAX_IMAGE_BYTES = 1_500_000; // ~1.5 MB
export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isLandingSlot(value: string): value is LandingSlot {
  return (LANDING_SLOTS as readonly string[]).includes(value);
}

export function publicImageUrl(id: string) {
  return `/api/landing/images/${id}`;
}
