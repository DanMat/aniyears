export type Anime = {
	id: number;
	title: string;
	type: string;
	eps: number;
	watched: number;
	score: number;
	status: string;
	finish: string | null;
	year: number | null;
	season: string | null;
	studios: string[];
	genres: string[];
	epMin: number | null;
	picture: string | null;
	community: number | null;
};

export type Count = { name: string; count: number };

export type Stats = {
	totals: {
		library: number;
		completed: number;
		watching: number;
		planToWatch: number;
		episodes: number;
		days: number;
		hours: number;
		scored: number;
	};
	span: { first: string | null; last: string | null };
	meanScore: number;
	scoreDist: Record<string, number>;
	byYear: Record<string, number>;
	bestByYear: Record<string, { title: string; score: number; id: number }>;
	topStudios: Count[];
	topGenres: Count[];
	typeMix: Count[];
	topRated: { title: string; id: number }[];
	longest: { title: string; eps: number }[];
	enrichedPct: number;
};

export type Data = { anime: Anime[]; stats: Stats; byId: Map<number, Anime> };

export async function loadData(): Promise<Data> {
	const base = import.meta.env.BASE_URL;
	const [anime, stats] = await Promise.all([
		fetch(`${base}data/anime.json`).then((r) => r.json() as Promise<Anime[]>),
		fetch(`${base}data/stats.json`).then((r) => r.json() as Promise<Stats>),
	]);
	return { anime, stats, byId: new Map(anime.map((a) => [a.id, a])) };
}
