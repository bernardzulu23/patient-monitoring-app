import { redirect } from "next/navigation";

export default async function WardIndexPage({
  params,
}: {
  params: Promise<{ wardId: string }>;
}) {
  const { wardId } = await params;
  redirect(`/dashboard/wards/${wardId}/rooms`);
}
