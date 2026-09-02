import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; status?: string }>;
}) {
  const { category, q, status } = await searchParams;
  const sp = new URLSearchParams();
  if (status === "sold") sp.set("status", "sold");
  else if (category) sp.set("category", category);
  if (q) sp.set("q", q);
  const qs = sp.toString();
  redirect(qs ? `/?${qs}` : "/");
}
