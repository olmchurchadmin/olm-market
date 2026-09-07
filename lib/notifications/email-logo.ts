/**
 * Brand mark for HTML emails.
 * Prefer a hosted PNG (absolute URL) so clients that strip SVG still show it.
 * Falls back to a minimal inline SVG of the red mark + label if SITE_URL is unset.
 */
export function olmLogoSvgMarkup(width = 194) {
  const height = Math.round((width * 150) / 194);
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) {
    return `<img src="${site}/logo-olm.png" alt="나눔장터" width="${width}" height="${height}" style="display:block;width:${width}px;max-width:70%;height:auto;border:0;" />`;
  }

  // Minimal fallback when the site URL is not configured (dev / misconfig).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 194 150" width="${width}" height="${height}" style="display:block;width:${width}px;max-width:70%;height:auto;border:0;background:#000;" role="img" aria-label="나눔장터">
  <rect width="194" height="150" fill="#000"/>
  <g fill="none" stroke="#e11d2e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M52 28c8-10 28-12 36 0 6 9 4 22-4 30l-14 12"/>
    <path d="M54 70l-18 42h56L74 70"/>
    <path d="M48 88h40M42 104h52"/>
  </g>
  <text x="108" y="88" fill="#c8c8c8" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="28" font-weight="600">나눔장터</text>
</svg>`;
}
