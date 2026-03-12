import { NextResponse } from 'next/server';

import { extractTitlesFromLetterboxdHtml, getNextLetterboxdPageUrl } from '@/lib/letterboxd';

async function collectTitlesFromUrl(startUrl: string, maxPages: number): Promise<string[]> {
  const titles = new Set<string>();
  let nextUrl: string | null = startUrl;

  for (let i = 0; i < maxPages && nextUrl; i += 1) {
    const res = await fetch(nextUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'StreamList/1.0'
      }
    });

    if (!res.ok) {
      break;
    }

    const html = await res.text();
    extractTitlesFromLetterboxdHtml(html).forEach((title) => titles.add(title));
    nextUrl = getNextLetterboxdPageUrl(html, nextUrl);
  }

  return Array.from(titles);
}

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').replace(/\/+$/, '');
}

function isLetterboxdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'letterboxd.com' || parsed.hostname.endsWith('.letterboxd.com');
  } catch {
    return false;
  }
}

function likelyPrivateOrUnavailable(url: string, titles: string[]): string | null {
  if (titles.length) {
    return null;
  }

  const lower = url.toLowerCase();
  if (lower.includes('/list/') || lower.includes('/watchlist')) {
    return 'This Letterboxd page appears private or unavailable to public scraping. Use a public list/profile URL.';
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = (searchParams.get('url') || '').trim();
  const username = normalizeUsername(searchParams.get('username') || '');

  try {
    if (url) {
      if (!isLetterboxdUrl(url)) {
        return NextResponse.json({ error: 'URL must be from letterboxd.com' }, { status: 400 });
      }
      const titles = await collectTitlesFromUrl(url, 4);
      const privateMessage = likelyPrivateOrUnavailable(url, titles);
      return NextResponse.json({
        mode: 'public-list-url',
        titles,
        message:
          privateMessage ||
          (titles.length
            ? null
            : 'Couldn’t read enough public data from this profile. Try a public list URL or search a movie instead.')
      });
    }

    if (username) {
      const base = `https://letterboxd.com/${username}/`;
      const [films, watchlist, likes] = await Promise.all([
        collectTitlesFromUrl(`${base}films/`, 2),
        collectTitlesFromUrl(`${base}watchlist/`, 2),
        collectTitlesFromUrl(`${base}likes/films/`, 1)
      ]);

      const merged = Array.from(new Set([...films, ...watchlist, ...likes]));
      return NextResponse.json({
        mode: 'public-profile',
        titles: merged,
        message: merged.length
          ? null
          : 'Couldn’t read enough public data from this profile. Try a public list URL or search a movie instead.'
      });
    }

    return NextResponse.json({ error: 'Provide username or url' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read public Letterboxd data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
