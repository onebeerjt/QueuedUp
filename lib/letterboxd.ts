function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/^\/film\//, '')
    .split('-')
    .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
    .trim();
}

export function extractTitlesFromLetterboxdHtml(html: string): string[] {
  const titles = new Set<string>();

  const slugRegex = /data-film-slug\s*=\s*"([^"]+)"/g;
  let slugMatch: RegExpExecArray | null = slugRegex.exec(html);
  while (slugMatch) {
    const raw = decodeHtml(slugMatch[1]).trim();
    if (raw) {
      titles.add(slugToTitle(raw));
    }
    slugMatch = slugRegex.exec(html);
  }

  const imgAltRegex = /<div[^>]*class="[^"]*film-poster[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"/g;
  let altMatch: RegExpExecArray | null = imgAltRegex.exec(html);
  while (altMatch) {
    const title = decodeHtml(altMatch[1]).trim();
    if (title) {
      titles.add(title);
    }
    altMatch = imgAltRegex.exec(html);
  }

  return Array.from(titles);
}

export function getNextLetterboxdPageUrl(html: string, currentUrl: string): string | null {
  const nextRegex = /<a[^>]*class="[^"]*next[^"]*"[^>]*href="([^"]+)"/i;
  const match = html.match(nextRegex);
  if (!match) {
    return null;
  }

  try {
    return new URL(match[1], currentUrl).toString();
  } catch {
    return null;
  }
}
