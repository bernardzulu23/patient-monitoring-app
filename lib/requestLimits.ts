const DEFAULT_MAX_BODY_BYTES = 100 * 1024;
const UPLOAD_MAX_BODY_BYTES = 2 * 1024 * 1024;

export function maxBodyBytesFor(pathname: string) {
  if (pathname === "/api/landing/images") return UPLOAD_MAX_BODY_BYTES;
  return DEFAULT_MAX_BODY_BYTES;
}

/** Rejects declared oversize bodies before any route handler buffers them. */
export function isBodyTooLarge(req: Request, pathname: string) {
  const declared = req.headers.get("content-length");
  if (!declared) return false;
  const size = Number(declared);
  if (!Number.isFinite(size) || size < 0) return true;
  return size > maxBodyBytesFor(pathname);
}
