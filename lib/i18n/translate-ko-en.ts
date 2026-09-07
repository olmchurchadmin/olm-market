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
};

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
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
    .slice(0, 500);
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

/**
 * Translate free-form Korean notice text for English locale display.
 * Keeps natural sentence casing (not category Title Case).
 */
export async function translateKoreanSentenceToEnglish(
  text: string,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (/^[\x00-\x7F]+$/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) {
    return sentenceCase(cleanEnglishSentence(trimmed));
  }

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
      const translated = cleanEnglishSentence(
        data.responseData?.translatedText || "",
      );
      if (looksUsableEnglish(translated)) {
        return sentenceCase(translated);
      }
    }
  } catch {
    // Fall through.
  }

  // Prefer showing Korean over a broken romanization for full sentences.
  return trimmed;
}

export function slugifyEnglishLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
