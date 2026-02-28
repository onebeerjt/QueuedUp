import { NextResponse } from 'next/server';

import { extractTitlesFromLetterboxdHtml, getNextLetterboxdPageUrl } from '@/lib/letterboxd';

interface ResponsePayload {
  titles: string[];
}

function isValidLetterboxdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'letterboxd.com' || parsed.hostname.endsWith('.letterboxd.com');
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<NextResponse<ResponsePayload | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get('url')?.trim();

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  if (!isValidLetterboxdUrl(urlParam)) {
    return NextResponse.json({ error: 'URL must be from letterboxd.com' }, { status: 400 });
  }

  try {
    const titles = new Set<string>();
    let nextUrl: string | null = urlParam;

    for (let page = 0; page < 4 && nextUrl; page += 1) {
      const res = await fetch(nextUrl, {
        headers: {
          'User-Agent': 'StreamList/1.0'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch Letterboxd page: ${res.status}`);
      }

      const html = await res.text();
      const pageTitles = extractTitlesFromLetterboxdHtml(html);
      pageTitles.forEach((title) => titles.add(title));

      nextUrl = getNextLetterboxdPageUrl(html, nextUrl);
    }

    return NextResponse.json({ titles: Array.from(titles) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape Letterboxd';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
