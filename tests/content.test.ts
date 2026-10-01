import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvCell, safeFileName } from "../lib/csv";
import { sniffImageType } from "../lib/imageSniff";

describe("CSV formula injection", () => {
  it("neutralises cells that spreadsheets would evaluate", () => {
    for (const payload of ["=HYPERLINK(\"http://evil\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd"]) {
      const out = csvCell(payload);
      assert.ok(out.startsWith("\"'"), `expected quoted+prefixed for ${payload}, got ${out}`);
    }
  });

  it("quotes commas, quotes and newlines", () => {
    assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
    assert.equal(csvCell("plain"), "plain");
    assert.equal(csvCell(72), "72");
    assert.equal(csvCell(null), "");
  });
});

describe("I12 header-safe filenames", () => {
  it("strips CRLF, quotes and path traversal", () => {
    const out = safeFileName('../../etc/"pass\r\nSet-Cookie: x.png');
    assert.doesNotMatch(out, /[\r\n"/\\]/);
    assert.doesNotMatch(out, /\.\./);
    assert.equal(safeFileName(""), "file");
  });
});

describe("U1 upload magic-byte validation", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const gif = new TextEncoder().encode("GIF89a....");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

  it("recognises real images", () => {
    assert.equal(sniffImageType(png), "image/png");
    assert.equal(sniffImageType(jpeg), "image/jpeg");
    assert.equal(sniffImageType(gif), "image/gif");
    assert.equal(sniffImageType(webp), "image/webp");
  });

  it("rejects HTML, SVG and PHP disguised with an image MIME type", () => {
    for (const text of [
      "<html><script>alert(1)</script>",
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
      "<?php system($_GET['c']); ?>",
    ]) {
      assert.equal(sniffImageType(new TextEncoder().encode(text)), null);
    }
  });
});
