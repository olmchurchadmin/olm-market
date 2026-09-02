import { cache } from "react";
import { cookies } from "next/headers";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const value = jar.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
});

export const getI18n = cache(async (): Promise<{ locale: Locale; t: Dictionary }> => {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
});
