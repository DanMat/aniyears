# AniYears 🎬

My **anime years** — a retrospective built from a MyAnimeList export. 253 days of anime,
1,029 completed across 14 years, my score for every one.

**Live:** https://aniyears.danmat.workers.dev

- Hero eartime-style figures (days / episodes / completed / backlog)
- My score distribution, my anime-of-the-year for 10+ years, top studios & genres
- The full library as a poster wall, filterable, sorted by my score

Sibling to [earshot](https://github.com/DanMat/earshot) (audiobooks) — same idea, eyes
instead of ears.

## Data

`scripts/process.mjs` merges a MyAnimeList XML export with the
[anime-offline-database](https://github.com/manami-project/anime-offline-database) (studios,
genres, seasons, runtimes, covers — all offline, no API hammering) into a curated,
copyright-safe dataset (`public/data/`). Metadata + my own scores only.

```bash
pnpm process   # export + offline-db -> public/data
pnpm dev       # run the site
pnpm run deploy
```
