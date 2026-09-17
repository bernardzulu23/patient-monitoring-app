"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publicImageUrl } from "@/lib/landing-shared";

type ImageMeta = {
  id: string;
  slot: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

export function LandingImagesManager({
  initial,
}: {
  initial: ImageMeta[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [slot, setSlot] = useState<"HERO" | "GALLERY">("HERO");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/landing/images", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { images: ImageMeta[] };
    setImages(data.images);
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image first");
      return;
    }
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("slot", slot);
    body.set("file", file);
    const res = await fetch("/api/landing/images", {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Upload failed");
      return;
    }
    setFile(null);
    await refresh();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this image from the landing page?")) return;
    const res = await fetch(`/api/landing/images/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert((data as { error?: string }).error || "Delete failed");
      return;
    }
    await refresh();
    router.refresh();
  }

  const hero = images.filter((i) => i.slot === "HERO");
  const gallery = images.filter((i) => i.slot === "GALLERY");

  return (
    <div className="space-y-8">
      <form
        onSubmit={onUpload}
        className="rounded-xl border border-line bg-surface p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Upload image
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Slot</label>
            <select
              value={slot}
              onChange={(e) =>
                setSlot(e.target.value === "GALLERY" ? "GALLERY" : "HERO")
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
            >
              <option value="HERO">Hero (full-bleed background)</option>
              <option value="GALLERY">Gallery (below the fold)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">File</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-deep"
            />
            <p className="mt-1 text-xs text-ink-muted">
              JPEG, PNG, WebP, or GIF · max 1.5 MB
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>

      <ImageGroup
        title="Hero"
        hint="Only one hero is kept — a new upload replaces the previous."
        images={hero}
        onDelete={onDelete}
      />
      <ImageGroup
        title="Gallery"
        hint="Shown in a row under the hero on the public landing page."
        images={gallery}
        onDelete={onDelete}
      />
    </div>
  );
}

function ImageGroup({
  title,
  hint,
  images,
  onDelete,
}: {
  title: string;
  hint: string;
  images: ImageMeta[];
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      {images.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No images yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <li
              key={img.id}
              className="overflow-hidden rounded-xl border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicImageUrl(img.id)}
                alt={img.fileName}
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="truncate text-xs text-ink-muted">{img.fileName}</p>
                <button
                  type="button"
                  onClick={() => onDelete(img.id)}
                  className="shrink-0 text-xs font-medium text-alert hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
