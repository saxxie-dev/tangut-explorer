import { createSignal, createEffect, For, Show, onMount, onCleanup } from 'solid-js';

interface Character {
  unicode: string;
  unicode_string: string;
  ids_sequence: string;
  xhzd_index?: number;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  initial_class?: string;
  pronunciation_warning?: boolean;
  english_definition?: string;
  variant_warning?: boolean;
}

interface IndexData {
  characters: Character[];
  initialClasses: string[];
  rhymeClasses: string[];
}

const COMMON_DEFINITIONS = [
  'a surname',
  'a transliteration',
  'a word',
  'a name',
  'a place name',
  'a personal name',
];

type DataQualityFilter = '' | 'missing' | 'review' | 'place-name' | 'surname' | 'transliteration';

const DEFINITION_FILTERS: Record<string, string> = {
  'place-name': 'a place name',
  'surname': 'a surname',
  'transliteration': 'a transliteration',
};

function getTone(rhymeClass?: string): string {
  if (!rhymeClass) return '';
  if (rhymeClass.startsWith('1')) return '¹';
  if (rhymeClass.startsWith('2')) return '²';
  return '';
}

function parseUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function buildUrl(params: {
  q?: string;
  initial?: string;
  rhyme?: string;
  quality?: string;
}): string {
  const searchParams = new URLSearchParams();
  
  if (params.q) searchParams.set('q', params.q);
  if (params.initial) searchParams.set('initial', params.initial);
  if (params.rhyme) searchParams.set('rhyme', params.rhyme);
  if (params.quality) searchParams.set('quality', params.quality);
  
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  return searchParams.toString() ? `${path}?${searchParams.toString()}` : path;
}

export default function SearchableIndex() {
  const [data, setData] = createSignal<IndexData | null>(null);
  const [loading, setLoading] = createSignal(true);
  
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedInitial, setSelectedInitial] = createSignal('');
  const [selectedRhyme, setSelectedRhyme] = createSignal('');
  const [dataQuality, setDataQuality] = createSignal<DataQualityFilter>('');
  
  const [filteredCount, setFilteredCount] = createSignal(0);
  const [visibleCharacters, setVisibleCharacters] = createSignal<Character[]>([]);
  const [page, setPage] = createSignal(0);
  const PAGE_SIZE = 48;
  
  const [announcement, setAnnouncement] = createSignal('');
  let searchInputRef: HTMLInputElement | undefined;
  let sentinelRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;
  
  onMount(async () => {
    try {
      const response = await fetch('/api/index.json');
      const json = await response.json();
      setData(json);
      
      const params = parseUrlParams();
      if (params.get('q')) setSearchQuery(params.get('q')!);
      if (params.get('initial')) setSelectedInitial(params.get('initial')!);
      if (params.get('rhyme')) setSelectedRhyme(params.get('rhyme')!);
      if (params.get('quality')) setDataQuality(params.get('quality') as DataQualityFilter);
    } catch (e) {
      console.error('Failed to load index:', e);
    } finally {
      setLoading(false);
      
      requestAnimationFrame(() => {
        if (sentinelRef) {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting && visibleCharacters().length < filteredCount()) {
                setPage(p => p + 1);
              }
            },
            { rootMargin: '400px' }
          );
          observer.observe(sentinelRef);
        }
      });
    }
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        searchInputRef?.focus();
      }
    };
    
    const handlePopState = () => {
      isPopState = true;
      const params = parseUrlParams();
      setSearchQuery(params.get('q') || '');
      setSelectedInitial(params.get('initial') || '');
      setSelectedRhyme(params.get('rhyme') || '');
      setDataQuality((params.get('quality') as DataQualityFilter) || '');
      setPage(0);
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('popstate', handlePopState);
    onCleanup(() => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('popstate', handlePopState);
      observer?.disconnect();
    });
  });
  
  createEffect(() => {
    const d = data();
    if (!d) return;
    
    const query = searchQuery().toLowerCase().trim();
    const initial = selectedInitial();
    const rhyme = selectedRhyme();
    const quality = dataQuality();
    
    let filtered = d.characters;
    
    if (query) {
      filtered = filtered.filter(c => {
        const matchChar = c.unicode.includes(query) || c.unicode_string.toLowerCase().includes(query);
        const matchDef = c.english_definition?.toLowerCase().includes(query);
        const matchReading = c.gong_huangcheng_reading?.toLowerCase().includes(query);
        return matchChar || matchDef || matchReading;
      });
    }
    
    if (initial) {
      filtered = filtered.filter(c => c.initial_class === initial);
    }
    
    if (rhyme) {
      filtered = filtered.filter(c => c.rhyme_class === rhyme);
    }
    
    if (quality === 'missing') {
      filtered = filtered.filter(c => 
        !c.english_definition?.trim() || 
        !c.gong_huangcheng_reading?.trim()
      );
    } else if (quality === 'review') {
      filtered = filtered.filter(c => {
        const def = c.english_definition?.toLowerCase();
        const isCommonDef = def && COMMON_DEFINITIONS.includes(def);
        return c.pronunciation_warning || isCommonDef;
      });
    } else if (DEFINITION_FILTERS[quality]) {
      const targetDef = DEFINITION_FILTERS[quality];
      filtered = filtered.filter(c => 
        c.english_definition?.toLowerCase() === targetDef
      );
    }
    
    const prevCount = filteredCount();
    setFilteredCount(filtered.length);
    setVisibleCharacters(filtered.slice(0, (page() + 1) * PAGE_SIZE));
    
    if (prevCount !== filtered.length && !loading()) {
      setAnnouncement(`${filtered.length} characters found`);
    }
  });
  
  let isPopState = false;
  
  createEffect(() => {
    if (isPopState) {
      isPopState = false;
      return;
    }
    const newUrl = buildUrl({
      q: searchQuery(),
      initial: selectedInitial(),
      rhyme: selectedRhyme(),
      quality: dataQuality(),
    });
    window.history.replaceState({}, '', newUrl);
  });
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedInitial('');
    setSelectedRhyme('');
    setDataQuality('');
    setPage(0);
  };
  
  const hasActiveFilters = () => 
    searchQuery() || selectedInitial() || selectedRhyme() || dataQuality();
  
  return (
    <div>
      <Show when={!loading()} fallback={
        <div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">
          Loading index...
        </div>
      }>
        <div 
          role="status"
          aria-live="polite"
          aria-atomic="true"
          class="sr-only"
        >
          {announcement()}
        </div>
        
        <div class="mb-4">
          <label for="search-input" class="sr-only">Search characters, readings, or definitions</label>
          <div class="relative">
            <input
              ref={searchInputRef}
              id="search-input"
              type="text"
              placeholder="Search characters, readings, or definitions... (press / to focus)"
              value={searchQuery()}
              onInput={(e) => { setSearchQuery(e.currentTarget.value); setPage(0); }}
              class="w-full px-4 py-2.5 text-base font-ui bg-beige-100 dark:bg-brown-800 border-2 border-brown-900 dark:border-beige-100 text-brown-900 dark:text-beige-100 placeholder-brown-500 dark:placeholder-beige-500 focus:outline-none focus:ring-2 focus:ring-brown-900 dark:focus:ring-beige-100 focus:ring-offset-2"
            />
            <Show when={searchQuery()}>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPage(0); }}
                class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brown-500 dark:text-beige-500 hover:text-brown-900 dark:hover:text-beige-100"
                aria-label="Clear search"
              >
                ✕
              </button>
            </Show>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap gap-3 items-center">
          <div class="flex items-center gap-2">
            <label for="filter-quality" class="text-sm font-ui text-brown-700 dark:text-beige-400">
              Data:
            </label>
            <select
              id="filter-quality"
              value={dataQuality()}
              onChange={(e) => { setDataQuality(e.currentTarget.value as DataQualityFilter); setPage(0); }}
              class="px-2 py-1.5 text-sm font-ui bg-beige-100 dark:bg-brown-800 border border-brown-400 dark:border-brown-600 text-brown-900 dark:text-beige-100 focus:outline-none focus:ring-2 focus:ring-brown-900 dark:focus:ring-beige-100"
            >
              <option value="">All</option>
              <option value="missing">Missing data</option>
              <option value="review">Needs review</option>
              <option value="place-name">Place names</option>
              <option value="surname">Surnames</option>
              <option value="transliteration">Transliterations</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <label for="filter-initial" class="text-sm font-ui text-brown-700 dark:text-beige-400">
              Initial:
            </label>
            <select
              id="filter-initial"
              value={selectedInitial()}
              onChange={(e) => { setSelectedInitial(e.currentTarget.value); setPage(0); }}
              class="px-2 py-1.5 text-sm font-ui bg-beige-100 dark:bg-brown-800 border border-brown-400 dark:border-brown-600 text-brown-900 dark:text-beige-100 focus:outline-none focus:ring-2 focus:ring-brown-900 dark:focus:ring-beige-100"
            >
              <option value="">All</option>
              <For each={data()?.initialClasses || []}>
                {(cls) => <option value={cls}>{cls}</option>}
              </For>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <label for="filter-rhyme" class="text-sm font-ui text-brown-700 dark:text-beige-400">
              Rhyme:
            </label>
            <select
              id="filter-rhyme"
              value={selectedRhyme()}
              onChange={(e) => { setSelectedRhyme(e.currentTarget.value); setPage(0); }}
              class="px-2 py-1.5 text-sm font-ui bg-beige-100 dark:bg-brown-800 border border-brown-400 dark:border-brown-600 text-brown-900 dark:text-beige-100 focus:outline-none focus:ring-2 focus:ring-brown-900 dark:focus:ring-beige-100"
            >
              <option value="">All</option>
              <For each={data()?.rhymeClasses || []}>
                {(cls) => <option value={cls}>{cls}</option>}
              </For>
            </select>
          </div>
          
          <Show when={hasActiveFilters()}>
            <button
              onClick={clearFilters}
              class="ml-auto font-ui text-sm text-brown-700 dark:text-beige-300 hover:text-brown-900 dark:hover:text-beige-100 underline px-2 py-1"
            >
              Clear filters
            </button>
          </Show>
        </div>

        <div class="mb-3 font-ui text-sm text-brown-700 dark:text-beige-300">
          <span class="font-semibold">{filteredCount()}</span>
          <span class="ml-1">character{filteredCount() !== 1 ? 's' : ''}</span>
        </div>

        <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2" role="list" aria-label="Tangut characters">
          <For each={visibleCharacters()}>
            {(char) => {
              const tone = () => getTone(char.rhyme_class);
              return (
                <a 
                  href={`/character/${char.unicode_string}`}
                  role="listitem"
                  class="block p-3 border-2 border-transparent hover:border-brown-700 dark:hover:border-beige-300 bg-beige-50 dark:bg-brown-800 hover:bg-beige-200 dark:hover:bg-brown-700 text-center no-underline rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100"
                >
                  <div class="font-reading text-sm text-brown-600 dark:text-beige-400">
                    {char.gong_huangcheng_reading ? `${char.gong_huangcheng_reading}${tone()}` : '—'} 
                  </div>
                  <div class="font-tangut text-2xl text-brown-900 dark:text-beige-100 my-1">
                    {char.unicode}
                  </div>
                  <div 
                    class="font-ui text-xs text-brown-700 dark:text-beige-300 truncate"
                    title={char.english_definition || 'No definition data'}
                  >
                    {char.english_definition || '—'} 
                  </div>
                </a>
              );
            }}
          </For>
        </div>

        <div ref={sentinelRef} class="h-4" aria-hidden="true" />

        <Show when={filteredCount() === 0}>
          <div class="text-center py-8">
            <p class="font-ui text-brown-700 dark:text-beige-300">
              No characters match your search.
            </p>
            <button
              onClick={clearFilters}
              class="mt-3 font-ui text-sm px-4 py-2 bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 rounded transition-colors"
            >
              Clear filters
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
