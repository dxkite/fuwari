<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { getPostUrlBySlug } from "@utils/url-utils.ts";

interface SearchPost {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
}

let keywordDesktop = "";
let keywordMobile = "";
let results: SearchPost[] = [];
let isSearching = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function highlight(text: string, keyword: string): string {
	if (!keyword.trim()) return text;
	const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.replace(new RegExp(escaped, "gi"), (m) => `<mark>${m}</mark>`);
}

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;
	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const doSearch = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword.trim()) {
		setPanelVisibility(false, isDesktop);
		results = [];
		return;
	}
	isSearching = true;
	try {
		const res = await fetch(
			`/api/v1/posts?search=${encodeURIComponent(keyword)}&page_size=8`,
		);
		const json = await res.json();
		results = (json.data?.items ?? []).map(
			(p: { id: string; slug: string; title: string; summary: string }) => ({
				id: p.id,
				slug: p.slug,
				title: p.title,
				excerpt: p.summary ?? "",
			}),
		);
		setPanelVisibility(results.length > 0, isDesktop);
	} catch (e) {
		console.error("Search error:", e);
		results = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		isSearching = false;
	}
};

const search = (keyword: string, isDesktop: boolean): void => {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => doSearch(keyword, isDesktop), 300);
};

$: search(keywordDesktop, true);
$: search(keywordMobile, false);
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} on:focus={() => search(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder="Search" bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#if isSearching}
        <div class="text-center text-sm text-50 py-4">Searching...</div>
    {:else}
        {#each results as item}
            <a href={getPostUrlBySlug(item.slug)}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
           rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
                <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                    {@html highlight(item.title, keywordDesktop || keywordMobile)}
                    <Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
                </div>
                {#if item.excerpt}
                    <div class="transition text-sm text-50">
                        {@html highlight(item.excerpt, keywordDesktop || keywordMobile)}
                    </div>
                {/if}
            </a>
        {/each}
    {/if}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
