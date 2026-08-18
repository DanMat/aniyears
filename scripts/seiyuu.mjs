#!/usr/bin/env node
/**
 * Enrich completed anime with their MAIN-character seiyuu (Japanese voice actors)
 * from the AniList GraphQL API — reliable and character/VA-native (Jikan's
 * /characters endpoint rate-limits into failure at this volume).
 *
 * Batches 5 anime per request via query aliases, favorites-first (by my score),
 * cached + resumable, honors AniList's rate limit. Writes public/data/seiyuu.json
 * incrementally. Aggregates "the seiyuu behind the most of my anime."
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const anime = JSON.parse(readFileSync('public/data/anime.json', 'utf8'));
const byId = new Map(anime.map((a) => [a.id, a]));
const completed = anime.filter((a) => a.status === 'Completed').sort((x, y) => y.score - x.score);

const CACHE = 'scripts/seiyuu-cache.json';
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIELDS =
	'characters(role:MAIN,perPage:8,sort:RELEVANCE){edges{node{name{full}} voiceActors(language:JAPANESE){id name{full} image{medium}}}}';

async function fetchBatch(batch) {
	const query = `query{${batch.map((a, i) => `a${i}:Media(idMal:${a.id},type:ANIME){${FIELDS}}`).join(' ')}}`;
	for (let attempt = 0; attempt < 5; attempt++) {
		const r = await fetch('https://graphql.anilist.co', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ query }),
		});
		if (r.status === 429) {
			const wait = Number(r.headers.get('Retry-After') ?? '60');
			await sleep((wait + 1) * 1000);
			continue;
		}
		if (!r.ok) {
			await sleep(3000);
			continue;
		}
		const j = await r.json();
		return { data: j.data ?? {}, remaining: Number(r.headers.get('x-ratelimit-remaining') ?? '30') };
	}
	return null;
}

const edgesToEntries = (media) =>
	(media?.characters?.edges ?? [])
		.map((e) => {
			const va = (e.voiceActors ?? [])[0];
			return va
				? { seiyuuId: va.id, seiyuu: va.name.full, img: va.image?.medium ?? null, character: e.node?.name?.full ?? '' }
				: null;
		})
		.filter(Boolean);

function writeAggregate(done) {
	const m = new Map();
	for (const [aid, entries] of Object.entries(cache)) {
		if (!Array.isArray(entries)) continue;
		const a = byId.get(Number(aid));
		for (const e of entries) {
			let s = m.get(e.seiyuuId);
			if (!s) {
				s = { id: e.seiyuuId, name: e.seiyuu, image: e.img, roles: [] };
				m.set(e.seiyuuId, s);
			}
			if (!s.image && e.img) s.image = e.img;
			s.roles.push({ animeId: Number(aid), title: a?.title, character: e.character });
		}
	}
	const top = [...m.values()]
		.map((s) => ({
			id: s.id,
			name: s.name,
			image: s.image,
			mainRoles: s.roles.length,
			animeCount: new Set(s.roles.map((r) => r.animeId)).size,
			roles: s.roles.slice(0, 12),
		}))
		.sort((x, y) => y.mainRoles - x.mainRoles);
	writeFileSync(
		'public/data/seiyuu.json',
		`${JSON.stringify({ done, totalSeiyuu: m.size, topSeiyuu: top.slice(0, 40) })}\n`,
	);
}

const todo = completed.filter((a) => !cache[a.id]);
console.log(`AniList enrichment: ${todo.length} to fetch (${completed.length - todo.length} cached)`);
let done = completed.length - todo.length;

for (let i = 0; i < todo.length; i += 5) {
	const batch = todo.slice(i, i + 5);
	const res = await fetchBatch(batch);
	if (!res) {
		for (const a of batch) cache[a.id] = { err: true };
	} else {
		batch.forEach((a, k) => {
			const media = res.data[`a${k}`];
			cache[a.id] = media ? edgesToEntries(media) : [];
		});
	}
	done += batch.length;
	writeFileSync(CACHE, JSON.stringify(cache));
	writeAggregate(done);
	if (done % 50 < 5) console.log(`  …${done}/${completed.length}`);
	await sleep(2100); // ~30 req/min
}
console.log(`✓ done: ${done}/${completed.length}`);
