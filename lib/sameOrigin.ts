/**
 * Reject cross-site POSTs that include an Origin that does not match Host.
 * Requests with no Origin (curl, some non-browser clients) are allowed.
 */
export function isAllowedRequestOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
