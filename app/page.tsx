import { MarketBrowse } from "@/components/market-browse";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; status?: string }>;
}) {
  const { category, q, status } = await searchParams;
  return <MarketBrowse category={category} q={q} status={status} />;
}
