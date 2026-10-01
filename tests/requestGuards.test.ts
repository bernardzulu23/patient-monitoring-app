import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildCsp, generateNonce } from "../lib/csp";
import { clientIdentity, consumeRateLimit } from "../lib/rateLimit";
import { isBodyTooLarge } from "../lib/requestLimits";
import { isAllowedRequestOrigin, isCrossSiteMutation } from "../lib/sameOrigin";

function req(method: string, headers: Record<string, string>) {
  return new Request("http://ward.local/api/patients", { method, headers });
}

describe("C1 CSRF / cross-site mutation guard", () => {
  it("blocks a POST whose Origin is another site", () => {
    const r = req("POST", { host: "ward.local", origin: "https://evil.example" });
    assert.equal(isCrossSiteMutation(r), true);
  });

  it("blocks Sec-Fetch-Site: cross-site even without Origin", () => {
    const r = req("POST", { host: "ward.local", "sec-fetch-site": "cross-site" });
    assert.equal(isCrossSiteMutation(r), true);
  });

  it("blocks the opaque 'null' origin (sandboxed iframes, data: URLs)", () => {
    assert.equal(isAllowedRequestOrigin(req("POST", { host: "ward.local", origin: "null" })), false);
  });

  it("allows same-origin browser POSTs and origin-less device posts", () => {
    assert.equal(
      isCrossSiteMutation(req("POST", { host: "ward.local", origin: "http://ward.local" })),
      false,
    );
    assert.equal(isCrossSiteMutation(req("POST", { host: "ward.local" })), false);
  });

  it("never blocks safe methods", () => {
    assert.equal(
      isCrossSiteMutation(req("GET", { host: "ward.local", origin: "https://evil.example" })),
      false,
    );
  });
});

describe("A3/P1 client identity for rate limiting", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
    delete process.env.VERCEL;
  });

  it("ignores spoofable X-Forwarded-For without a trusted proxy", () => {
    const a = clientIdentity(req("POST", { "x-forwarded-for": "1.1.1.1" }));
    const b = clientIdentity(req("POST", { "x-forwarded-for": "2.2.2.2" }));
    assert.equal(a.trusted, false);
    assert.equal(a.ip, b.ip);
  });

  it("uses the forwarded client IP behind a trusted proxy", () => {
    process.env.TRUST_PROXY = "1";
    const id = clientIdentity(req("POST", { "x-forwarded-for": "10.0.0.7, 10.0.0.1" }));
    assert.deepEqual(id, { ip: "10.0.0.7", trusted: true });
  });

  it("consumeRateLimit returns limited after the threshold", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      assert.equal(consumeRateLimit(key, 3, 60_000).limited, false);
    }
    assert.equal(consumeRateLimit(key, 3, 60_000).limited, true);
  });
});

describe("H3/H4 Content-Security-Policy", () => {
  const nonce = generateNonce();
  const prod = buildCsp(nonce, { dev: false, https: true });

  it("uses a nonce and no unsafe-inline / unsafe-eval for scripts in production", () => {
    const scriptSrc = prod.split("; ").find((d) => d.startsWith("script-src"))!;
    assert.match(scriptSrc, new RegExp(`'nonce-${nonce.replace(/[+/=]/g, "\\$&")}'`));
    assert.doesNotMatch(scriptSrc, /unsafe-inline|unsafe-eval/);
  });

  it("forbids framing, plugins, wildcard sources and base-tag hijacking", () => {
    assert.match(prod, /frame-ancestors 'none'/);
    assert.match(prod, /object-src 'none'/);
    assert.match(prod, /base-uri 'self'/);
    assert.doesNotMatch(prod, /(^|\s)\*(\s|;|$)/);
  });

  it("generates unique nonces", () => {
    assert.notEqual(generateNonce(), generateNonce());
  });
});

describe("I11 body size limits", () => {
  it("rejects oversize JSON bodies and allows normal ones", () => {
    assert.equal(isBodyTooLarge(req("POST", { "content-length": "5000000" }), "/api/patients"), true);
    assert.equal(isBodyTooLarge(req("POST", { "content-length": "900" }), "/api/patients"), false);
    assert.equal(isBodyTooLarge(req("POST", { "content-length": "-1" }), "/api/patients"), true);
  });

  it("allows larger bodies only on the image upload route", () => {
    const r = req("POST", { "content-length": String(1_800_000) });
    assert.equal(isBodyTooLarge(r, "/api/landing/images"), false);
    assert.equal(isBodyTooLarge(r, "/api/contact"), true);
  });
});
