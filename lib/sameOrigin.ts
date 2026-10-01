const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Reject cross-site POSTs that include an Origin that does not match Host.
 * Requests with no Origin (curl, ESP32 devices, the SMS gateway) are allowed —
 * they carry no ambient browser cookies, so they cannot be CSRF.
 */
export function isAllowedRequestOrigin(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** True for state-changing requests that a browser sent from another site. */
export function isCrossSiteMutation(req: Request) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false;
  return !isAllowedRequestOrigin(req);
}
