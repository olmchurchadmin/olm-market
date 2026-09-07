/**
 * Brand mark for HTML emails.
 * Prefer a hosted PNG (absolute URL) so clients that strip SVG still show it.
 * Falls back to a minimal inline SVG of the red mark + label if SITE_URL is unset.
 */
export function olmLogoSvgMarkup(width = 280) {
  const height = Math.round((width * 281) / 900);
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) {
    return `<img src="${site}/logo-olm.png" alt="나눔장터" width="${width}" height="${height}" style="display:block;width:${width}px;max-width:70%;height:auto;border:0;" />`;
  }

  // Minimal fallback when the site URL is not configured (dev / misconfig).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 281" width="${width}" height="${height}" style="display:block;width:${width}px;max-width:70%;height:auto;border:0;background:#000;" role="img" aria-label="나눔장터">
  <rect width="900" height="281" fill="#000"/>
  <g fill="none" stroke="#e11d2e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 52c18-22 64-26 82 0 14 20 9 50-9 68l-32 27"/>
    <path d="M124 148l-40 95h126l-40-95"/>
    <path d="M110 188h92M98 224h116"/>
  </g>
  <text x="280" y="168" fill="#c8c8c8" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="72" font-weight="600">나눔장터</text>
</svg>`;
}
