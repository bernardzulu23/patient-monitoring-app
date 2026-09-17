import { redirect } from "next/navigation";
import { LandingImagesManager } from "@/components/landing-images-manager";
import { isAdmin } from "@/lib/authz";
import { listLandingImagesMeta } from "@/lib/landing";
import { requireSession } from "@/lib/data";

export default async function SitePage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/dashboard");

  const images = await listLandingImagesMeta();

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Landing page images
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Upload photos shown on the public home page. Hero replaces the
          full-bleed background; gallery images appear below.
        </p>
      </div>
      <LandingImagesManager
        initial={images.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
