export interface Post {
	id: string;
	data: {
		title: string;
		slug: string;
		tags: string[];
		category?: string;
		published: Date;
		updated?: Date;
		description?: string;
		image?: string;
		draft?: boolean;
		lang?: string;
		words: number;
		minutes: number;
		excerpt?: string;
	};
}

interface ApiTag { id: string; name: string; slug: string; }
interface ApiPostItem {
	id: string;
	title: string;
	slug: string;
	summary: string;
	tags: ApiTag[];
	publishedAt: string;
	lang?: string;
	categoryName?: string;
}
interface ApiNeighbor { id: string; title: string; }

interface ApiDetailPost {
	id: string;
	title: string;
	slug: string;
	content: string;
	summary: string;
	image: string;
	author: string;
	viewCount: number;
	categoryId?: string;
	categoryName?: string;
	tags: ApiTag[];
	publishedAt: string;
	pinned: boolean;
	lang?: string;
	hasPassword: boolean;
	password?: string;
	passwordHint?: string;
}

interface ApiNeighborItem {
	id: string;
	title: string;
	slug: string;
	publishedAt?: string;
}

function countWords(text: string): number {
	return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function normalizePost(p: ApiPostItem): Post {
	const words = countWords(p.summary ?? '');
	return {
		id: p.id,
		data: {
			title: p.title,
			slug: p.slug,
			tags: (p.tags ?? []).map(t => t.name),
			category: p.categoryName,
			published: new Date(p.publishedAt),
			description: p.summary,
			lang: p.lang,
			words,
			minutes: Math.max(1, Math.ceil(words / 200)),
			excerpt: p.summary,
		},
	};
}

function apiBase(): string {
	try {
		return (process as NodeJS.Process & { env: Record<string, string> }).env?.API_BASE_URL ?? '';
	} catch {
		return '';
	}
}

export async function fetchPostList(page = 1, size = 8): Promise<{ total: number; items: Post[] }> {
	const res = await fetch(`${apiBase()}/api/v1/posts?page=${page}&page_size=${size}`);
	const json = await res.json();
	return {
		total: json.data.total,
		items: (json.data.items as ApiPostItem[]).map(normalizePost),
	};
}

export async function fetchPostById(id: string): Promise<Post & { content: string }> {
	const res = await fetch(`${apiBase()}/api/v1/posts/${id}`);
	const json = await res.json();
	const p = json.data.post as ApiPostItem & { content: string };
	const content = p.content ?? '';
	const words = countWords(content);
	const base = normalizePost(p);
	return {
		...base,
		content,
		data: { ...base.data, words, minutes: Math.max(1, Math.ceil(words / 200)) },
	};
}

export async function fetchPostNeighbors(id: string): Promise<{
	prevId?: string; prevTitle?: string;
	nextId?: string; nextTitle?: string;
}> {
	const res = await fetch(`${apiBase()}/api/v1/posts/${id}/neighbors`);
	const json = await res.json();
	const prev = json.data.prev as ApiNeighbor | undefined;
	const next = json.data.next as ApiNeighbor | undefined;
	return {
		prevId: prev?.id,
		prevTitle: prev?.title,
		nextId: next?.id,
		nextTitle: next?.title,
	};
}

export interface ApiTagItem {
	id: string;
	name: string;
	slug: string;
	articleCount: number;
}

export async function fetchConfigKey<T extends object>(key: string, fallback: T): Promise<T> {
	try {
		const res = await fetch(`${apiBase()}/api/v1/config/${key}`);
		if (!res.ok) return fallback;
		const json = await res.json();
		const value = json.data?.value;
		if (value == null || typeof value !== 'object') return fallback;
		return { ...fallback, ...(value as T) };
	} catch {
		return fallback;
	}
}

export async function fetchTagList(): Promise<ApiTagItem[]> {
	const res = await fetch(`${apiBase()}/api/v1/tags`);
	const json = await res.json();
	return json.data.items as ApiTagItem[];
}

export interface ApiCategoryItem {
	id: string;
	name: string;
	slug: string;
	articleCount: number;
}

export async function fetchCategoryList(): Promise<ApiCategoryItem[]> {
	const res = await fetch(`${apiBase()}/api/v1/categories`);
	const json = await res.json();
	return json.data.items as ApiCategoryItem[];
}

export async function fetchPostBySlug(slug: string): Promise<{ post: ApiDetailPost; extensions: Record<string, unknown> }> {
	const res = await fetch(`${apiBase()}/api/v1/posts/slug/${encodeURIComponent(slug)}`);
	if (!res.ok) throw new Error(`post not found: ${slug}`);
	const json = await res.json();
	return json.data as { post: ApiDetailPost; extensions: Record<string, unknown> };
}

export async function fetchPostNeighborsBySlug(slug: string): Promise<{ prev?: ApiNeighborItem; next?: ApiNeighborItem }> {
	const res = await fetch(`${apiBase()}/api/v1/posts/slug/${encodeURIComponent(slug)}/neighbors`);
	if (!res.ok) return {};
	const json = await res.json();
	return (json.data ?? {}) as { prev?: ApiNeighborItem; next?: ApiNeighborItem };
}

