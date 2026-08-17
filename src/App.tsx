import { useEffect, useMemo, useState } from 'react';
import type { Anime, Count, Data, Stats } from './data.js';
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
			<ScoreDist stats={data.stats} />
			<BestByYear data={data} />
			<TopLists stats={data.stats} />
			<Library data={data} />
			<Footer stats={data.stats} />
		</main>
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
				<span className="dot" aria-hidden="true" /> eyeshot
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

function ScoreDist({ stats }: { stats: Stats }) {
	const max = Math.max(1, ...Object.values(stats.scoreDist));
	return (
		<section className="section" aria-labelledby="scores">
			<p className="section-label">My verdicts</p>
			<h2 id="scores">How I score</h2>
			<p className="intro">
				{num(stats.totals.scored)} rated — a real curve now, not a pile of blanks. A generous 7 is my
				center of gravity.
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
		return anime.filter(match).sort((x, y) => {
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
					<Card key={a.id} a={a} />
				))}
			</div>
		</section>
	);
}

function Card({ a }: { a: Anime }) {
	const cls = a.score >= 8 ? 's-hi' : a.score >= 6 ? 's-mid' : 's-lo';
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
			</a>
			<div className="t">{a.title}</div>
			<div className="m">{[a.type, a.year, names(a.studios, 1)].filter(Boolean).join(' · ')}</div>
		</article>
	);
}

function Footer({ stats }: { stats: Stats }) {
	return (
		<footer className="foot">
			<strong style={{ color: 'var(--muted)' }}>eyeshot</strong> — my anime life, from a MyAnimeList
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
