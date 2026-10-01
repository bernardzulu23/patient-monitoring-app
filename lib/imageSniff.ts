export type SniffedImageType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function startsWith(buf: Uint8Array, bytes: number[], offset = 0) {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Identify an image by magic bytes; the client-declared MIME type is not trusted. */
export function sniffImageType(buf: Uint8Array): SniffedImageType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWith(buf, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWith(buf, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }
  if (
    startsWith(buf, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}
