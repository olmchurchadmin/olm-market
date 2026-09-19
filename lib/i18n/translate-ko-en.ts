/** Common Korean category names → English display labels. */
const KO_EN_DICTIONARY: Record<string, string> = {
  성물: "Sacred items",
  가구: "Furniture",
  가전: "Electronics",
  의류: "Clothing",
  도서: "Books",
  생활용품: "Household",
  "유아/아동": "Kids",
  스포츠용품: "Sports equipment",
  기타: "Other",
  음료수: "Drinks",
  음료: "Drinks",
  식품: "Food",
  주방: "Kitchen",
  뷰티: "Beauty",
  잡화: "General goods",
  톰브라운: "Thom Browne",
};

/** Proper nouns that machine translation often mangles (longer keys first). */
const KO_EN_PROPER_NOUNS: Array<[string, string]> = [
  ["톰 브라운", "Thom Browne"],
  ["톰브라운", "Thom Browne"],
];

const THOM_BROWNE_KO = /톰\s*브라운/g;
const THOM_BROWNE_KO_TEST = /톰\s*브라운/;
const THOM_BROWNE_EN_OK = /Thom\s+Browne/;
const THOM_BROWNE_EN_WRONG =
  /\bThom\s*Brown\b|\bTom\s*Browne?\b|\bTombraun\b|\bThumbrown\b|\bThome\s*Browne?\b/gi;

/** Apply known brand/proper-noun fixes for listing display or storage. */
export function polishListingProperNouns(
  text: string,
  direction: "ko|en" | "en|ko" = "ko|en",
): string {
  let out = text;
  for (const [ko, en] of KO_EN_PROPER_NOUNS) {
    if (direction === "ko|en") {
      out = out.split(ko).join(en);
    } else {
      out = out.replace(
        new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        "톰브라운",
      );
      out = out.replace(THOM_BROWNE_KO, "톰브라운");
    }
  }
  if (direction === "ko|en") {
    out = out.replace(THOM_BROWNE_KO, "Thom Browne");
    out = out.replace(THOM_BROWNE_EN_WRONG, "Thom Browne");
  }
  return out;
}

export function sourceHasThomBrowneKo(text: string) {
  return THOM_BROWNE_KO_TEST.test(text);
}

export function englishHasCorrectThomBrowne(text: string) {
  return THOM_BROWNE_EN_OK.test(text);
}

export function listingNeedsBrandRepair(
  sourceKo: string,
  english: string | null | undefined,
) {
  if (!sourceHasThomBrowneKo(sourceKo)) return false;
  return !englishHasCorrectThomBrowne(english || "");
}

function applyProperNouns(
  text: string,
  direction: "ko|en" | "en|ko",
): string {
  return polishListingProperNouns(text, direction);
}

const CHOSEONG = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const JUNGSEONG = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const JONGSEONG = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "p",
  "l",
  "l",
  "p",
  "l",
  "m",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

/** Rough Revised Romanization for Hangul syllables (slug fallback). */
export function romanizeHangul(text: string) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0xac00 || code > 0xd7a3) {
      out += /[a-zA-Z0-9]/.test(ch) ? ch.toLowerCase() : "-";
      continue;
    }
    const syllable = code - 0xac00;
    const cho = Math.floor(syllable / 588);
    const jung = Math.floor((syllable % 588) / 28);
    const jong = syllable % 28;
    out += `${CHOSEONG[cho] || ""}${JUNGSEONG[jung] || ""}${JONGSEONG[jong] || ""}`;
  }
  return out.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function cleanEnglishLabel(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
    .slice(0, 60);
}

function cleanEnglishSentence(raw: string) {
  return raw
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
    .slice(0, 2000);
}

function cleanKoreanSentence(raw: string) {
  return raw
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
    .slice(0, 2000);
}

/** Guess whether text is primarily Korean or English. */
export function detectTextLocale(text: string): "ko" | "en" | "unknown" {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";
  const hangul = (trimmed.match(/[가-힣]/g) || []).length;
  const latin = (trimmed.match(/[A-Za-z]/g) || []).length;
  if (hangul === 0 && latin === 0) return "unknown";
  if (hangul >= latin * 0.4 && hangul > 0) return "ko";
  if (latin > hangul) return "en";
  if (hangul > 0) return "ko";
  return "unknown";
}

function looksUsableKorean(text: string) {
  if (!text) return false;
  if (/QUERY LENGTH|INVALID|MYMEMORY/i.test(text)) return false;
  return /[가-힣]/.test(text);
}

/** Title Case so category labels always start with a capital letter. */
function toTitleCase(label: string) {
  return cleanEnglishLabel(label)
    .split(/([\s/-]+)/)
    .map((part) => {
      if (!part || /^[\s/-]+$/.test(part)) return part;
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function sentenceCase(text: string) {
  if (!text) return "";
  return text[0].toUpperCase() + text.slice(1);
}

function looksUsableEnglish(text: string) {
  if (!text) return false;
  if (/[가-힣]/.test(text)) return false;
  if (/QUERY LENGTH|INVALID|MYMEMORY/i.test(text)) return false;
  return /[a-zA-Z]/.test(text);
}

/**
 * Translate Korean category text to an English display name.
 * Uses a local dictionary first, then MyMemory (no API key).
 */
export async function translateKoreanToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Already Latin / ASCII — normalize to Title Case.
  if (/^[\x00-\x7F]+$/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
    return toTitleCase(trimmed);
  }

  const known = KO_EN_DICTIONARY[trimmed];
  if (known) return toTitleCase(known);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=ko|en`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const translated = cleanEnglishLabel(
        data.responseData?.translatedText || "",
      );
      if (looksUsableEnglish(translated)) {
        return toTitleCase(translated);
      }
    }
  } catch {
    // Fall through to romanization.
  }

  const romanized = romanizeHangul(trimmed);
  if (romanized) {
    return toTitleCase(romanized.replace(/-/g, " "));
  }
  return toTitleCase(trimmed);
}

async function translateOneLine(line: string): Promise<string> {
  const trimmed = line.trim();
  if (!trimmed) return "";

  if (/^[\x00-\x7F]+$/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
    return sentenceCase(cleanEnglishSentence(trimmed));
  }

  const { masked, restore } = maskProperNouns(trimmed, "ko|en");
  if (!masked.trim()) return restore(masked);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(masked)}&langpair=ko|en`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const translated = cleanEnglishSentence(
        data.responseData?.translatedText || "",
      );
      if (looksUsableEnglish(translated)) {
        return restore(sentenceCase(translated));
      }
    }
  } catch {
    // Fall through.
  }

  return restore(masked);
}

function maskProperNouns(
  text: string,
  direction: "ko|en" | "en|ko",
): { masked: string; restore: (translated: string) => string } {
  const tokens: string[] = [];
  let masked = text;

  for (const [ko, en] of KO_EN_PROPER_NOUNS) {
    if (direction === "ko|en") {
      if (!masked.includes(ko)) continue;
      const token = `__PN${tokens.length}__`;
      tokens.push(en);
      masked = masked.split(ko).join(token);
    } else {
      const pattern = new RegExp(
        en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      if (!pattern.test(masked)) continue;
      pattern.lastIndex = 0;
      const token = `__PN${tokens.length}__`;
      tokens.push("톰브라운");
      masked = masked.replace(pattern, token);
    }
  }

  return {
    masked,
    restore: (translated: string) => {
      let out = translated;
      tokens.forEach((value, index) => {
        out = out.split(`__PN${index}__`).join(value);
      });
      return applyProperNouns(out, direction);
    },
  };
}

async function myMemoryTranslate(
  text: string,
  langpair: "ko|en" | "en|ko",
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // MyMemory free endpoint is picky about very long queries.
  const chunk = trimmed.slice(0, 450);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langpair}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const raw = data.responseData?.translatedText || "";
    if (langpair === "ko|en") {
      const cleaned = cleanEnglishSentence(raw);
      return looksUsableEnglish(cleaned) ? cleaned : null;
    }
    const cleaned = cleanKoreanSentence(raw);
    return looksUsableKorean(cleaned) ? cleaned : null;
  } catch {
    return null;
  }
}

function splitForTranslation(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= 450) return [normalized];

  const parts: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    if (!paragraph.trim()) {
      parts.push("");
      continue;
    }
    if (paragraph.length <= 450) {
      parts.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > 450) {
      let cut = rest.lastIndexOf(" ", 450);
      if (cut < 200) cut = 450;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
  }
  return parts;
}

/**
 * Bidirectional KO↔EN translation for listing title/description.
 * Preserves blank lines; falls back to the original text on failure.
 */
export async function translateBetweenKoEn(
  text: string,
  from: "ko" | "en",
  to: "ko" | "en",
): Promise<string> {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";
  if (from === to) return trimmed.slice(0, 2000);

  const detected = detectTextLocale(trimmed);
  if (detected === to) return trimmed.slice(0, 2000);
  if (from === "en" && detected === "ko") {
    // Already Korean while asking EN→KO.
    return trimmed.slice(0, 2000);
  }
  if (from === "ko" && detected === "en") {
    return trimmed.slice(0, 2000);
  }

  const langpair = from === "ko" ? "ko|en" : "en|ko";
  const chunks = splitForTranslation(trimmed);
  const out: string[] = [];
  for (const chunk of chunks) {
    if (!chunk) {
      out.push("");
      continue;
    }
    const { masked, restore } = maskProperNouns(chunk, langpair);
    if (!masked.trim()) {
      out.push(restore(masked));
      continue;
    }
    const known =
      langpair === "ko|en" ? KO_EN_DICTIONARY[masked.trim()] : undefined;
    if (known) {
      out.push(restore(known));
      continue;
    }
    const translated = await myMemoryTranslate(masked, langpair);
    if (translated) {
      out.push(
        restore(langpair === "ko|en" ? sentenceCase(translated) : translated),
      );
    } else {
      out.push(restore(masked));
    }
  }
  return out.join("\n").slice(0, 2000);
}

/**
 * Translate free-form Korean notice text for English locale display.
 * Keeps natural sentence casing and preserves line breaks.
 */
export async function translateKoreanSentenceToEnglish(
  text: string,
): Promise<string> {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  const lines = trimmed.split("\n");
  const translated = await Promise.all(lines.map((line) => translateOneLine(line)));
  return translated.join("\n").slice(0, 2000);
}

export function slugifyEnglishLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
