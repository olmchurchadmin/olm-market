/** Must match the exact A2P Brand name in Twilio Trust Hub (case-sensitive). */
export function getRegisteredBrandName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_A2P_BRAND_NAME?.trim();
  if (fromEnv) return fromEnv;
  return "SKYFACE, LLC.";
}
