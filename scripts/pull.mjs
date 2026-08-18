#!/usr/bin/env node
/**
 * Pull my anime list live from the official MyAnimeList API → scripts/mal-list.json
 * (the normalized shape process.mjs expects). Uses X-MAL-CLIENT-ID against a PUBLIC
 * list — no OAuth needed for reads. Replaces the manual XML export.
 *
 * Env: MAL_CLIENT_ID (required), MAL_USER (default "Spidrex").
 */
import { writeFileSync } from 'node:fs';

const USER = process.env.MAL_USER || 'Spidrex';
const CID = process.env.MAL_CLIENT_ID;
if (!CID) {
	console.error('✗ MAL_CLIENT_ID not set (from myanimelist.net/apiconfig).');
	process.exit(1);
}

const TYPE = {
	tv: 'TV', movie: 'Movie', ova: 'OVA', ona: 'ONA', special: 'Special',
	tv_special: 'TV Special', music: 'Music', cm: 'CM', pv: 'PV',
};
const STATUS = {
	completed: 'Completed', watching: 'Watching', plan_to_watch: 'Plan to Watch',
	on_hold: 'On Hold', dropped: 'Dropped',
};

const out = [];
let url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(USER)}/animelist?fields=list_status{start_date,finish_date},num_episodes,media_type&limit=1000&nsfw=true`;
while (url) {
	const r = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': CID } });
	if (!r.ok) {
		console.error(`✗ MAL API ${r.status}: ${await r.text()}`);
		console.error('  (Is the list public? Is the client id valid?)');
		process.exit(1);
	}
	const j = await r.json();
	for (const it of j.data ?? []) {
		const n = it.node;
		const ls = it.list_status ?? {};
		out.push({
			id: n.id,
			title: n.title,
			type: TYPE[n.media_type] ?? '',
			eps: n.num_episodes || 0,
			watched: ls.num_episodes_watched || 0,
			score: ls.score || 0,
			status: STATUS[ls.status] ?? ls.status ?? '',
			finish: ls.finish_date || null,
			start: ls.start_date || null,
		});
	}
	url = j.paging?.next || '';
}

writeFileSync('scripts/mal-list.json', JSON.stringify(out));
console.log(`✓ pulled ${out.length} anime from MyAnimeList for ${USER}`);
