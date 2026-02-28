# StreamList

StreamList is a premium dark-mode movie browser built with Next.js 14. Paste movie titles or import a public Letterboxd list, then browse metadata and direct streaming links in a cinematic grid.

## Setup

1. Clone this repo.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` in the project root:
   ```bash
   TMDB_API_KEY=your_tmdb_key
   WATCHMODE_API_KEY=your_watchmode_key
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## API Keys

- TMDB API key: [https://developer.themoviedb.org/docs/getting-started](https://developer.themoviedb.org/docs/getting-started)
- Watchmode API key: [https://api.watchmode.com/](https://api.watchmode.com/)

## How To Use

1. Open StreamList.
2. Choose `Paste Titles` or `Letterboxd URL`.
3. Load your movie list.
4. Filter by streaming service, sort results, and click service badges to open direct title links.
5. Use the share button in the filter bar to copy a shareable URL with titles + active service filters.
