export const num = (n: number): string => n.toLocaleString('en-US');

export function year(iso: string | null): string {
	return iso ? iso.slice(0, 4) : '';
}

export function monthYear(iso: string | null): string {
	if (!iso) return '';
	const [y, m] = iso.split('-').map(Number);
	return new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, 1)).toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

/** join up to n names with commas */
export const names = (list: string[], n = 3): string => list.slice(0, n).join(', ');
