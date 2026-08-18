#!/usr/bin/env node
/**
 * Turn a MyAnimeList XML export + the anime-offline-database into a curated,
 * copyright-safe dataset for the retrospective. Facts about my own watching
 * (titles, my scores, dates) + public metadata (studios, genres, season,
 * runtime, cover). No book/episode content — just metadata + my stats.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const list = JSON.parse(readFileSync('scripts/mal-list.json', 'utf8'));
const aod = JSON.parse(readFileSync('scripts/aod.json', 'utf8')).data;

// Index the offline DB by MAL id.
const idx = new Map();
for (const a of aod) {
	for (const u of a.sources) {
		const m = u.match(/myanimelist\.net\/anime\/(\d+)/);
		if (m) {
			idx.set(Number(m[1]), a);
			break;
		}
	}
}

// Clean genres out of the noisy crowd-tags via a whitelist.
const GENRES = {
	action: 'Action', adventure: 'Adventure', 'avant garde': 'Avant Garde',
	'award winning': 'Award Winning', comedy: 'Comedy', drama: 'Drama', ecchi: 'Ecchi',
	fantasy: 'Fantasy', gourmet: 'Gourmet', horror: 'Horror', mystery: 'Mystery',
	romance: 'Romance', 'sci-fi': 'Sci-Fi', 'science fiction': 'Sci-Fi',
	'slice of life': 'Slice of Life', sports: 'Sports', supernatural: 'Supernatural',
	suspense: 'Suspense', thriller: 'Suspense', psychological: 'Psychological',
	mecha: 'Mecha', isekai: 'Isekai', music: 'Music', school: 'School',
	historical: 'Historical', military: 'Military', shounen: 'Shounen', shoujo: 'Shoujo',
	seinen: 'Seinen', josei: 'Josei', iyashikei: 'Iyashikei', harem: 'Harem',
};
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Studio names in the data are messy ("J.C.Staff Co., Ltd." vs "J.C. Staff").
// Strip legal suffixes, normalise, then canonicalise the common ones.
const STUDIO_CANON = {
	'j.c.staff': 'J.C. Staff', 'a-1 pictures': 'A-1 Pictures', 'production i.g': 'Production I.G.',
	bones: 'Bones', 'tms entertainment': 'TMS Entertainment', madhouse: 'Madhouse', mappa: 'MAPPA',
	'wit studio': 'Wit Studio', ufotable: 'ufotable', 'kyoto animation': 'Kyoto Animation',
	sunrise: 'Sunrise', 'toei animation': 'Toei Animation', 'studio pierrot': 'Studio Pierrot',
	pierrot: 'Studio Pierrot', shaft: 'Shaft', trigger: 'Trigger', cloverworks: 'CloverWorks',
	'doga kobo': 'Doga Kobo', 'silver link': 'Silver Link', 'david production': 'David Production',
	'p.a.works': 'P.A. Works', lerche: 'Lerche', 'white fox': 'White Fox', '8bit': '8bit',
	'8-bit': '8bit', 'brains base': 'Brain’s Base', gonzo: 'Gonzo', 'studio deen': 'Studio Deen',
};
function normStudio(raw) {
	let s = raw.toLowerCase().trim();
	s = s.replace(/[\s,]*(co\.?\s*,?\s*ltd\.?|inc\.?|ltd\.?|llc)\.?\s*$/i, '').trim();
	s = s.replace(/\s*\.\s*/g, '.').replace(/\s+/g, ' ').trim();
	return STUDIO_CANON[s] ?? titleCase(s);
}

// Preserve finish dates across refreshes: a public MAL-API read may not expose
// per-title dates, so never lose the timeline we already have.
let prevFinish = {};
try {
	const prev = JSON.parse(readFileSync('public/data/anime.json', 'utf8'));
	prevFinish = Object.fromEntries(prev.filter((a) => a.finish).map((a) => [a.id, a.finish]));
} catch {}

const anime = list.map((it) => {
	const a = idx.get(it.id) ?? {};
	const durSec =
		a.duration?.unit === 'SECONDS' ? a.duration.value : a.duration?.value ? a.duration.value * 60 : null;
	const community =
		typeof a.score === 'object' ? (a.score.median ?? a.score.arithmeticMean ?? null) : (a.score ?? null);
	return {
		id: it.id,
		title: it.title,
		type: it.type,
		eps: it.eps || 0,
		watched: it.watched || 0,
		score: it.score || 0,
		status: it.status,
		finish: it.finish || prevFinish[it.id] || null,
		year: a.animeSeason?.year ?? null,
		season: a.animeSeason?.season ?? null,
		studios: [...new Set((a.studios ?? []).map(normStudio))],
		genres: [...new Set((a.tags ?? []).map((t) => GENRES[t]).filter(Boolean))],
		epMin: durSec ? Math.round(durSec / 60) : null,
		picture: a.picture ?? null,
		community: community ? Math.round(community * 100) / 100 : null,
	};
});

// ── aggregate ─────────────────────────────────────────────────────────────────
const completed = anime.filter((a) => a.status === 'Completed');
const scored = completed.filter((a) => a.score > 0);
const minutes = (arr) =>
	arr.reduce((s, a) => s + a.watched * (a.epMin || 24), 0);
const tally = (arr, keyFn) => {
	const m = new Map();
	for (const a of arr) for (const k of keyFn(a)) if (k) m.set(k, (m.get(k) ?? 0) + 1);
	return [...m.entries()].sort((x, y) => y[1] - x[1]).map(([name, count]) => ({ name, count }));
};

const totalMin = minutes(anime);
const finishes = completed.filter((a) => a.finish).map((a) => a.finish).sort();
const byYear = {};
for (const a of completed) if (a.finish) {
	const y = a.finish.slice(0, 4);
	byYear[y] = (byYear[y] ?? 0) + 1;
}
const scoreDist = {};
for (const a of scored) scoreDist[a.score] = (scoreDist[a.score] ?? 0) + 1;

// best (my highest score) per finish-year
const bestByYear = {};
for (const a of scored) if (a.finish) {
	const y = a.finish.slice(0, 4);
	if (!bestByYear[y] || a.score > bestByYear[y].score) bestByYear[y] = { title: a.title, score: a.score, id: a.id };
}

const stats = {
	totals: {
		library: anime.length,
		completed: completed.length,
		watching: anime.filter((a) => a.status === 'Watching').length,
		planToWatch: anime.filter((a) => a.status === 'Plan to Watch').length,
		episodes: anime.reduce((s, a) => s + a.watched, 0),
		days: Math.round(totalMin / 60 / 24),
		hours: Math.round(totalMin / 60),
		scored: scored.length,
	},
	span: { first: finishes[0] ?? null, last: finishes.at(-1) ?? null },
	meanScore: scored.length ? Math.round((scored.reduce((s, a) => s + a.score, 0) / scored.length) * 100) / 100 : 0,
	scoreDist,
	byYear,
	bestByYear,
	topStudios: tally(completed, (a) => a.studios).slice(0, 12),
	topGenres: tally(completed, (a) => a.genres).slice(0, 12),
	typeMix: tally(anime, (a) => [a.type]),
	topRated: scored.filter((a) => a.score === 10).map((a) => ({ title: a.title, id: a.id })),
	longest: completed.slice().sort((a, b) => b.watched - a.watched).slice(0, 6).map((a) => ({ title: a.title, eps: a.watched })),
	enrichedPct: Math.round((anime.filter((a) => a.studios.length || a.genres.length).length / anime.length) * 100),
};

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/anime.json', `${JSON.stringify(anime)}\n`);
writeFileSync('public/data/stats.json', `${JSON.stringify(stats, null, 2)}\n`);

console.log(`✓ ${anime.length} anime · ${stats.totals.completed} completed · ${stats.totals.days} days · enriched ${stats.enrichedPct}%`);
console.log('  span:', stats.span.first, '→', stats.span.last, '| mean score:', stats.meanScore);
console.log('  top studios:', stats.topStudios.slice(0, 6).map((s) => `${s.name}(${s.count})`).join(', '));
console.log('  top genres:', stats.topGenres.slice(0, 8).map((s) => `${s.name}(${s.count})`).join(', '));
console.log('  score dist:', [10,9,8,7,6,5,4,3,2,1].map((s) => `${s}:${scoreDist[s] || 0}`).join('  '));
