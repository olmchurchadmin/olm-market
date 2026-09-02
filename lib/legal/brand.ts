/** Display name used on privacy / terms pages. */
export function getRegisteredBrandName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LEGAL_BRAND_NAME?.trim();
  if (fromEnv) return fromEnv;
  return "Our Lady of Mercy Parish";
}
