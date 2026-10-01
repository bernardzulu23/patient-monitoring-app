/**
 * Content-Security-Policy with a per-request nonce. Next.js reads the nonce from the
 * request's CSP header and stamps it on its own inline scripts.
 *
 * style-src keeps 'unsafe-inline': React `style={...}` attributes and Next's injected
 * style tags need it, and inline CSS cannot execute script.
 */
export function buildCsp(nonce: string, opts: { dev: boolean; https: boolean }) {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(opts.dev ? ["'unsafe-eval'"] : []),
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(opts.dev ? ["ws:"] : [])],
    "frame-src": ["https://www.openstreetmap.org"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`,
  );
  if (opts.https) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
