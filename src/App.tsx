import { useEffect, useMemo, useState } from 'react';
import type { Anime, Count, Data, SeiyuuData, Stats } from './data.js';
import { loadData } from './data.js';
import { monthYear, names, num, year } from './format.js';

export function App() {
	const [data, setData] = useState<Data | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		loadData().then(setData).catch(() => setFailed(true));
	}, []);

	if (failed) return <main className="wrap"><p className="loading">Couldn’t load the data.</p></main>;
	if (!data) return <main className="wrap"><p className="loading">Rolling the OP…</p></main>;

	return (
		<main className="wrap">
			<Hero stats={data.stats} />
			<FunFacts data={data} />
			<Voices seiyuu={data.seiyuu} />
			<ScoreDist stats={data.stats} />
			<BestByYear data={data} />
			<AlmostDone data={data} />
			<TopLists stats={data.stats} />
			<Library data={data} />
			<Wrapped data={data} />
			<Footer stats={data.stats} />
		</main>
	);
}

function FunFacts({ data }: { data: Data }) {
	const cards = useMemo(() => {
		const s = data.stats;
		const anime = data.anime;

		// Single biggest time sink (one show), from runtime × episodes watched.
		let sink = { title: '', hours: 0 };
		for (const x of anime) {
			if (x.epMin && x.epMin > 0 && x.watched > 0) {
				const h = (x.epMin * x.watched) / 60;
				if (h > sink.hours) sink = { title: x.title, hours: h };
			}
		}
		// Record year, by shows finished.
		let peak = { year: '', n: 0 };
		for (const [y, n] of Object.entries(s.byYear)) if (n > peak.n) peak = { year: y, n };
		// Release-year span across the shelf.
		const relYears = anime.map((x) => x.year).filter((y): y is number => !!y);
		const minY = Math.min(...relYears);
		const maxY = Math.max(...relYears);
		// Score extremes.
		const tens = anime.filter((x) => x.score === 10).length;
		const lows = anime.filter((x) => x.score > 0 && x.score <= 2).length;

		const hours = s.totals.hours;
		const days = s.totals.days;
		const ftYears = hours / (40 * 52); // "full-time job" years at 40h/week

		return [
			{
				big: num(Math.round(hours)),
				unit: 'hrs',
				label: 'Watched, all in',
				fx: `About ${ftYears.toFixed(1)} years of a full-time job — and worth every minute.`,
			},
			{
				big: num(s.totals.episodes),
				label: 'Episodes',
				fx: `Back to back that's ${num(days)} days straight — no sleep, no breaks.`,
			},
			{
				big: num(Math.round(sink.hours)),
				unit: 'hrs',
				label: `On ${sink.title}`,
				fx: `Your single biggest commitment — ${Math.round(sink.hours / 24)} full days on one show.`,
			},
			{
				big: num(peak.n),
				unit: `in ${peak.year}`,
				label: 'Record year',
				fx: `Roughly ${Math.round(peak.n / 52)} shows finished every week, all year long.`,
			},
			{
				big: String(maxY - minY),
				unit: 'yrs',
				label: 'Of anime, spanned',
				fx: `From ${minY} classics to ${maxY} premieres — your taste time-travels.`,
			},
			{
				big: num(tens),
				label: 'Perfect 10s',
				fx:
					lows === 0
						? 'And not a single 1 or 2 on the whole list — you bail before you hate.'
						: 'The ones that earned full marks.',
			},
		];
	}, [data]);

	return (
		<section className="section" aria-labelledby="facts">
			<p className="section-label">By the numbers</p>
			<h2 id="facts">Fun facts, fully earned</h2>
			<p className="intro">
				What all that watching actually adds up to — the receipts, pulled straight from my history.
			</p>
			<div className="factgrid">
				{cards.map((c) => (
					<div className="fact" key={c.label}>
						<div className="fn">
							{c.big}
							{c.unit ? <small>{c.unit}</small> : null}
						</div>
						<div className="fl">{c.label}</div>
						<div className="fx">{c.fx}</div>
					</div>
				))}
			</div>
		</section>
	);
}

function Hero({ stats }: { stats: Stats }) {
	const t = stats.totals;
	const years = stats.span.first && stats.span.last
		? Number(year(stats.span.last)) - Number(year(stats.span.first)) + 1
		: 0;
	return (
		<header className="hero">
			<div className="brand">
				<span className="dot" aria-hidden="true" /> AniYears
			</div>
			<h1>
				<em>{num(t.days)} days</em> of anime,
				<br />
				and counting.
			</h1>
			<p className="lede">
				Since {monthYear(stats.span.first)} I’ve finished <strong>{num(t.completed)} anime</strong> —
				{' '}{num(t.episodes)} episodes across {years} years, at a mean score of{' '}
				<strong>{stats.meanScore}</strong>. Here’s the tape, rewound.
			</p>
			<div className="figures">
				<Figure n={num(t.days)} sub="days" k="Watched, back to back" />
				<Figure n={num(t.completed)} k="Anime completed" />
				<Figure n={num(t.episodes)} k="Episodes" />
				<Figure n={num(t.planToWatch)} k="Plan-to-watch backlog" />
			</div>
		</header>
	);
}

function Figure({ n, sub, k }: { n: string; sub?: string; k: string }) {
	return (
		<div className="figure">
			<div className="n">{n}{sub ? <small>{sub}</small> : null}</div>
			<div className="k">{k}</div>
		</div>
	);
}

function initials(name: string): string {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function Voices({ seiyuu }: { seiyuu: SeiyuuData | null }) {
	if (!seiyuu || seiyuu.topSeiyuu.length === 0) return null;
	const lead = seiyuu.topSeiyuu[0];
	const leadRoles = lead.roles.slice(0, 3).map((r) => r.character).filter(Boolean);
	return (
		<section className="section" aria-labelledby="voices">
			<p className="section-label">Behind the anime</p>
			<h2 id="voices">Seiyuu, not just studios</h2>
			<p className="intro">
				Every show has a cast behind it — subbed or dubbed. These are the seiyuu who kept turning up:
				the most main roles across the anime I’ve finished.
			</p>
			<div className="seiyuu-lead">
				<div className="seiyuu-photo lead">
					{lead.image ? <img src={lead.image} alt="" /> : <span>{initials(lead.name)}</span>}
				</div>
				<div>
					<div className="who">{lead.name}</div>
					<div className="sub">
						Shows up in more of my anime than anyone — <b>{lead.mainRoles} main roles</b> across{' '}
						<b>{lead.animeCount}</b> titles{leadRoles.length ? ` — ${leadRoles.join(', ')}…` : ''}
					</div>
				</div>
			</div>
			<div className="seiyuu-grid">
				{seiyuu.topSeiyuu.slice(1, 13).map((s) => (
					<div className="seiyuu-card" key={s.id}>
						<div className="seiyuu-photo">
							{s.image ? <img src={s.image} alt="" loading="lazy" /> : <span>{initials(s.name)}</span>}
						</div>
						<div className="sname">{s.name}</div>
						<div className="scount">{s.mainRoles} roles · {s.animeCount} anime</div>
						{s.roles[0]?.character ? <div className="srole">as {s.roles[0].character}</div> : null}
					</div>
				))}
			</div>
		</section>
	);
}

function ScoreDist({ stats }: { stats: Stats }) {
	const max = Math.max(1, ...Object.values(stats.scoreDist));
	return (
		<section className="section" aria-labelledby="scores">
			<p className="section-label">My verdicts</p>
			<h2 id="scores">The shape of my taste</h2>
			<p className="intro">
				I camp in the 6-to-8 range, rarely dip below 5, and save my 10s for the ones that wrecked me.
			</p>
			<div className="scoredist" role="img" aria-label="Score distribution">
				{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => {
					const c = stats.scoreDist[s] ?? 0;
					return (
						<div className="sd-col" key={s} title={`${c} rated ${s}`}>
							<span className="sd-n">{c || ''}</span>
							<div className="sd-bar" style={{ height: `${(c / max) * 100}%` }} />
							<span className="sd-s">{s}</span>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function BestByYear({ data }: { data: Data }) {
	const years = useMemo(
		() => Object.keys(data.stats.bestByYear).sort(),
		[data.stats.bestByYear],
	);
	return (
		<section className="section" aria-labelledby="best">
			<p className="section-label">Year by year</p>
			<h2 id="best">My anime of the year</h2>
			<p className="intro">
				The highest-scored show I finished each year — {years.length} years of favorites, in a row.
			</p>
			<div className="reel">
				{years.map((y) => {
					const best = data.stats.bestByYear[y];
					const a = data.byId.get(best.id);
					return (
						<div className="year-card" key={y}>
							<div className="yr">{y}</div>
							<div className="poster">
								{a?.picture ? <img src={a.picture} alt="" loading="lazy" /> : null}
								<span className="score">{best.score}</span>
							</div>
							<div className="t">{best.title}</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

const ALMOST_LEFT = 5; // "a few episodes to go" — within this many of the finale

function AlmostDone({ data }: { data: Data }) {
	const shows = useMemo(
		() =>
			data.anime
				.filter(
					(a) =>
						a.status === 'Watching' &&
						a.eps > 0 &&
						a.watched > 0 &&
						a.watched < a.eps &&
						a.eps - a.watched <= ALMOST_LEFT,
				)
				.sort((x, y) => {
					const rx = x.eps - x.watched;
					const ry = y.eps - y.watched;
					if (rx !== ry) return rx - ry; // fewest episodes left first
					return y.watched / y.eps - x.watched / x.eps; // then furthest along
				})
				.slice(0, 24),
		[data.anime],
	);
	if (shows.length === 0) return null;
	return (
		<section className="section" aria-labelledby="almost">
			<p className="section-label">One more push</p>
			<h2 id="almost">Almost done</h2>
			<p className="intro">
				Shows I’m within {ALMOST_LEFT} episodes of finishing — closest to the finish line first.
				Time to close these out.
			</p>
			<div className="reel">
				{shows.map((a) => {
					const left = a.eps - a.watched;
					return (
						<div className="year-card almost-card" key={a.id}>
							<a
								className="poster"
								href={`https://myanimelist.net/anime/${a.id}`}
								target="_blank"
								rel="noreferrer"
								title={a.title}
							>
								{a.picture ? <img src={a.picture} alt="" loading="lazy" /> : null}
								<span className="left">{left} left</span>
								<div className="poster-progress" aria-hidden="true">
									<i style={{ width: `${(a.watched / a.eps) * 100}%` }} />
								</div>
							</a>
							<div className="t">{a.title}</div>
							<div className="cap">{a.watched}/{a.eps} eps</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function TopLists({ stats }: { stats: Stats }) {
	return (
		<section className="section" aria-labelledby="tops">
			<p className="section-label">On heavy rotation</p>
			<h2 id="tops">Studios &amp; genres I keep coming back to</h2>
			<div className="cols">
				<div className="col">
					<h3>Most-watched studios</h3>
					<Ranked items={stats.topStudios.slice(0, 10)} />
				</div>
				<div className="col">
					<h3>Top genres</h3>
					<Ranked items={stats.topGenres.slice(0, 10)} />
				</div>
			</div>
		</section>
	);
}

function Ranked({ items }: { items: Count[] }) {
	const max = items[0]?.count ?? 1;
	return (
		<div className="rank">
			{items.map((it) => (
				<div className="rrow" key={it.name}>
					<span className="lab">{it.name}</span>
					<span className="c">{it.count}</span>
					<span className="track" aria-hidden="true">
						<i style={{ width: `${(it.count / max) * 100}%` }} />
					</span>
				</div>
			))}
		</div>
	);
}

type Filter = 'completed' | 'watching' | 'plantowatch' | 'all';

function Library({ data }: { data: Data }) {
	const [filter, setFilter] = useState<Filter>('completed');
	const { anime } = data;

	const counts = useMemo(() => ({
		all: anime.length,
		completed: anime.filter((a) => a.status === 'Completed').length,
		watching: anime.filter((a) => a.status === 'Watching').length,
		plantowatch: anime.filter((a) => a.status === 'Plan to Watch').length,
	}), [anime]);

	const shown = useMemo(() => {
		const match = (a: Anime) =>
			filter === 'all' ||
			(filter === 'completed' && a.status === 'Completed') ||
			(filter === 'watching' && a.status === 'Watching') ||
			(filter === 'plantowatch' && a.status === 'Plan to Watch');
		const left = (a: Anime) => (a.eps > 0 && a.watched < a.eps ? a.eps - a.watched : Infinity);
		return anime.filter(match).sort((x, y) => {
			// On the Watching tab, surface what I'm closest to finishing first.
			if (filter === 'watching') {
				const lx = left(x);
				const ly = left(y);
				if (lx !== ly) return lx - ly; // fewest episodes remaining first (unknown totals last)
			}
			if (x.score !== y.score) return y.score - x.score;
			return (y.finish ?? '').localeCompare(x.finish ?? '');
		});
	}, [anime, filter]);

	const tabs: { id: Filter; label: string }[] = [
		{ id: 'completed', label: 'Completed' },
		{ id: 'watching', label: 'Watching' },
		{ id: 'plantowatch', label: 'Plan to watch' },
		{ id: 'all', label: 'Everything' },
	];

	return (
		<section className="section" aria-labelledby="library">
			<p className="section-label">The whole shelf</p>
			<h2 id="library">Every anime</h2>
			<div className="filters">
				{tabs.map((t) => (
					<button
						type="button"
						key={t.id}
						className={filter === t.id ? 'filter active' : 'filter'}
						onClick={() => setFilter(t.id)}
					>
						{t.label}
						<span className="c">{counts[t.id]}</span>
					</button>
				))}
			</div>
			<div className="grid">
				{shown.slice(0, 600).map((a) => (
					<Card key={a.id} a={a} watching={filter === 'watching'} />
				))}
			</div>
		</section>
	);
}

function Card({ a, watching }: { a: Anime; watching?: boolean }) {
	const cls = a.score >= 8 ? 's-hi' : a.score >= 6 ? 's-mid' : 's-lo';
	const inProgress = watching && a.eps > 0 && a.watched < a.eps;
	return (
		<article className="card">
			<a
				className="poster"
				href={`https://myanimelist.net/anime/${a.id}`}
				target="_blank"
				rel="noreferrer"
				title={a.title}
			>
				{a.picture ? <img src={a.picture} alt="" loading="lazy" /> : null}
				{a.score > 0 ? <span className={`badge-score ${cls}`}>{a.score}</span> : null}
				{inProgress ? <span className="left">{a.eps - a.watched} left</span> : null}
			</a>
			<div className="t">{a.title}</div>
			{inProgress ? (
				<>
					<div className="progress" title={`${a.watched} / ${a.eps} episodes`}>
						<i style={{ width: `${(a.watched / a.eps) * 100}%` }} />
					</div>
					<div className="m">{a.watched}/{a.eps} eps · {names(a.studios, 1)}</div>
				</>
			) : (
				<div className="m">{[a.type, a.year, names(a.studios, 1)].filter(Boolean).join(' · ')}</div>
			)}
		</article>
	);
}

const GENRE_BLOCK = new Set(['Award Winning']); // MAL meta-tag, not a flavor genre

function Wrapped({ data }: { data: Data }) {
	const w = useMemo(() => {
		const anime = data.anime;
		const s = data.stats;
		const scored = anime.filter((x) => x.status === 'Completed' && x.score > 0);

		// Top pick: a perfect 10, most acclaimed by the crowd (tie-break).
		const top = scored
			.filter((x) => x.score === 10 && (x.community ?? 0) > 0)
			.sort((p, q) => (q.community ?? 0) - (p.community ?? 0))[0]
			?? scored.slice().sort((p, q) => q.score - p.score)[0];

		// Hottest take: where the crowd most disagreed with you (they loved, you didn't).
		let hot = { title: '', me: 0, crowd: 0, gap: -Infinity };
		for (const x of scored) {
			const c = x.community ?? 0;
			if (c > 0 && c - x.score > hot.gap) hot = { title: x.title, me: x.score, crowd: c, gap: c - x.score };
		}

		// Favorite genre: highest average score among genres you've watched a lot of.
		const buckets: Record<string, number[]> = {};
		for (const x of scored) for (const g of x.genres ?? []) {
			if (!GENRE_BLOCK.has(g)) (buckets[g] ??= []).push(x.score);
		}
		let fav = { name: '', avg: 0 };
		for (const [name, arr] of Object.entries(buckets)) {
			if (arr.length >= 20) {
				const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
				if (avg > fav.avg) fav = { name, avg: Math.round(avg * 100) / 100 };
			}
		}

		const seiyuu = data.seiyuu?.topSeiyuu?.[0] ?? null;
		return { top, hot, fav, seiyuu, s };
	}, [data]);

	const { s } = w;
	const tens = s.scoreDist['10'] ?? 0;
	const rows = [
		w.top ? { k: 'Top pick', v: w.top.title, m: `scored ${w.top.score}` } : null,
		w.hot.title ? { k: 'Hottest take', v: w.hot.title, m: `you ${w.hot.me} · crowd ${w.hot.crowd}` } : null,
		w.fav.name ? { k: 'Favorite genre', v: w.fav.name, m: `${w.fav.avg} avg` } : null,
		w.seiyuu ? { k: 'Most-heard voice', v: w.seiyuu.name, m: `${w.seiyuu.mainRoles} roles` } : null,
		{ k: 'Perfect 10s', v: `${num(tens)} shows`, m: 'flawless' },
	].filter((r): r is { k: string; v: string; m: string } => r !== null);

	return (
		<section className="section" aria-labelledby="wrapped">
			<p className="section-label">The whole thing, one card</p>
			<h2 id="wrapped">AniYears, wrapped</h2>
			<p className="intro">Every year of watching, distilled onto a single card. Screenshot it, share it.</p>
			<div className="wrapped">
				<div className="wrapped-head">
					<span className="wbrand"><span className="dot" aria-hidden="true" /> AniYears Wrapped</span>
					<span className="wspan">{monthYear(s.span.first)} – {monthYear(s.span.last)}</span>
				</div>
				<div className="whero">
					<div className="wbig">{num(s.totals.days)}<small>days of anime</small></div>
					<div className="wsub">
						{num(s.totals.completed)} finished · {num(s.totals.episodes)} episodes · {num(s.totals.hours)} hours
					</div>
				</div>
				<div className="wrows">
					{rows.map((r) => (
						<div className="wrow" key={r.k}>
							<div className="wl">
								<div className="wk">{r.k}</div>
								<div className="wv">{r.v}</div>
							</div>
							<div className="wm">{r.m}</div>
						</div>
					))}
				</div>
				<div className="wfoot">aniyears.danmat.workers.dev</div>
			</div>
		</section>
	);
}

function Footer({ stats }: { stats: Stats }) {
	return (
		<footer className="foot">
			<strong style={{ color: 'var(--muted)' }}>AniYears</strong> — my anime life, from a MyAnimeList
			export. {num(stats.totals.completed)} completed · {num(stats.totals.days)} days ·{' '}
			{monthYear(stats.span.first)}–{monthYear(stats.span.last)}.
			<br />
			Metadata + my own scores only. Studios, genres, seasons and runtimes via the{' '}
			<a href="https://github.com/manami-project/anime-offline-database" target="_blank" rel="noreferrer">
				anime-offline-database
			</a>
			. Covers link to MyAnimeList.
		</footer>
	);
}
