import { createSignal, createEffect, For, Show, onMount } from 'solid-js';

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

function FilterDropdown(props: { 
  label: string; 
  options: string[]; 
  selected: string[]; 
  onToggle: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  
  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class="flex items-center gap-2 px-3 py-1.5 text-sm font-ui border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800 text-brown-900 dark:text-beige-100 hover:bg-brown-200 dark:hover:bg-brown-700 transition-colors"
      >
        <span>{props.label}</span>
        <span class="text-xs opacity-70">
          {props.selected.length > 0 ? `(${props.selected.length})` : '▼'}
        </span>
      </button>
      
      <Show when={isOpen()}>
        <div 
          class="absolute z-10 mt-1 max-h-60 overflow-auto p-2 border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800"
          style={{ "min-width": "150px" }}
        >
          <For each={props.options}>
            {(opt) => (
              <button
                onClick={() => props.onToggle(opt)}
                class:list={[
                  "block w-full text-left px-2 py-1 text-xs font-mono transition-colors",
                  props.selected.includes(opt)
                    ? "bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900"
                    : "text-brown-700 dark:text-beige-300 hover:bg-brown-200 dark:hover:bg-brown-700"
                ]}
              >
                {opt}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function SearchableIndex() {
  const [data, setData] = createSignal<IndexData | null>(null);
  const [loading, setLoading] = createSignal(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedInitials, setSelectedInitials] = createSignal<string[]>([]);
  const [selectedRhymes, setSelectedRhymes] = createSignal<string[]>([]);
  const [showErrataOnly, setShowErrataOnly] = createSignal(false);
  const [selectedCommonDefs, setSelectedCommonDefs] = createSignal<string[]>([]);
  
  const [filteredCount, setFilteredCount] = createSignal(0);
  const [visibleCharacters, setVisibleCharacters] = createSignal<Character[]>([]);
  const [page, setPage] = createSignal(0);
  const PAGE_SIZE = 48;

  onMount(async () => {
    try {
      const response = await fetch('/api/index.json');
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load index:', e);
    } finally {
      setLoading(false);
    }
  });

  // Filter logic
  createEffect(() => {
    const d = data();
    if (!d) return;
    
    const query = searchQuery().toLowerCase().trim();
    const initials = selectedInitials();
    const rhymes = selectedRhymes();
    const errataOnly = showErrataOnly();
    const commonDefs = selectedCommonDefs();
    
    let filtered = d.characters;
    
    if (query) {
      filtered = filtered.filter(c => {
        const matchChar = c.unicode.includes(query) || c.unicode_string.toLowerCase().includes(query);
        const matchDef = c.english_definition?.toLowerCase().includes(query);
        const matchReading = c.gong_huangcheng_reading?.toLowerCase().includes(query);
        return matchChar || matchDef || matchReading;
      });
    }
    
    if (initials.length > 0) {
      filtered = filtered.filter(c => c.initial_class && initials.includes(c.initial_class));
    }
    
    if (rhymes.length > 0) {
      filtered = filtered.filter(c => c.rhyme_class && rhymes.includes(c.rhyme_class));
    }
    
    if (errataOnly) {
      filtered = filtered.filter(c => 
        c.pronunciation_warning || 
        !c.english_definition?.trim() || 
        !c.gong_huangcheng_reading?.trim()
      );
    }
    
    if (commonDefs.length > 0) {
      filtered = filtered.filter(c => {
        const def = c.english_definition?.toLowerCase();
        if (!def) return true;
        return !commonDefs.includes(def);
      });
    }
    
    setFilteredCount(filtered.length);
    setVisibleCharacters(filtered.slice(0, (page() + 1) * PAGE_SIZE));
  });

  const loadMore = () => {
    setPage(p => p + 1);
  };

  const toggleInitial = (val: string) => {
    setSelectedInitials(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setPage(0);
  };

  const toggleRhyme = (val: string) => {
    setSelectedRhymes(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setPage(0);
  };

  const toggleCommonDef = (val: string) => {
    setSelectedCommonDefs(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setPage(0);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedInitials([]);
    setSelectedRhymes([]);
    setShowErrataOnly(false);
    setSelectedCommonDefs([]);
    setPage(0);
  };

  const hasActiveFilters = () => 
    searchQuery() || selectedInitials().length > 0 || selectedRhymes().length > 0 || 
    showErrataOnly() || selectedCommonDefs().length > 0;

  return (
    <div>
      <Show when={!loading()} fallback={
        <div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">
          Loading index...
        </div>
      }>
        {/* Search Bar */}
        <div class="mb-4">
          <input
            type="text"
            placeholder="Search characters, readings, or definitions..."
            value={searchQuery()}
            onInput={(e) => { setSearchQuery(e.currentTarget.value); setPage(0); }}
            class="w-full px-4 py-2 text-base font-ui bg-beige-50 dark:bg-brown-900 border-2 border-brown-900 dark:border-beige-100 text-brown-900 dark:text-beige-100 placeholder-brown-500 dark:placeholder-beige-500 focus:outline-none focus:ring-2 focus:ring-brown-900 dark:focus:ring-beige-100"
          />
        </div>

        {/* Filters - compact row */}
        <div class="mb-4 flex flex-wrap gap-2 items-center">
          {/* Data quality toggle */}
          <label class="flex items-center gap-2 font-ui text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showErrataOnly()}
              onChange={(e) => { setShowErrataOnly(e.currentTarget.checked); setPage(0); }}
              class="w-4 h-4 accent-brown-900 dark:accent-beige-100"
            />
            <span class="text-brown-700 dark:text-beige-300">Errata</span>
          </label>
          
          <span class="text-brown-500 dark:text-beige-500">|</span>
          
          {/* Exclude dropdown */}
          <div class="relative">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('exclude-menu');
                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
              }}
              class="flex items-center gap-1 px-2 py-1 text-sm font-ui text-brown-700 dark:text-beige-300 hover:text-brown-900 dark:hover:text-beige-100"
            >
              Exclude {selectedCommonDefs().length > 0 && `(${selectedCommonDefs().length})`}
              <span class="text-xs">▼</span>
            </button>
            <div 
              id="exclude-menu"
              class="hidden absolute z-10 mt-1 left-0 p-2 border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800"
              style={{ "min-width": "180px" }}
            >
              <For each={COMMON_DEFINITIONS}>
                {(def) => (
                  <label class="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-brown-200 dark:hover:bg-brown-700">
                    <input
                      type="checkbox"
                      checked={selectedCommonDefs().includes(def)}
                      onChange={() => toggleCommonDef(def)}
                      class="w-3 h-3 accent-brown-900 dark:accent-beige-100"
                    />
                    <span class="text-xs font-ui text-brown-700 dark:text-beige-300">{def}</span>
                  </label>
                )}
              </For>
            </div>
          </div>

          <span class="text-brown-500 dark:text-beige-500">|</span>
          
          {/* Initial class dropdown */}
          <FilterDropdown 
            label="Initial"
            options={data()?.initialClasses || []}
            selected={selectedInitials()}
            onToggle={toggleInitial}
          />
          
          {/* Rhyme class dropdown */}
          <FilterDropdown 
            label="Rhyme"
            options={data()?.rhymeClasses || []}
            selected={selectedRhymes()}
            onToggle={toggleRhyme}
          />
          
          {/* Clear filters */}
          <Show when={hasActiveFilters()}>
            <button
              onClick={clearFilters}
              class="ml-auto font-ui text-sm text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100 underline"
            >
              Clear
            </button>
          </Show>
        </div>

        {/* Results count */}
        <div class="mb-3 font-ui text-xs text-brown-500 dark:text-beige-500">
          {filteredCount()} characters
        </div>

        {/* Results grid */}
        <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
          <For each={visibleCharacters()}>
            {(char) => (
              <a
                href={`/character/${char.unicode_string}`}
                class="flex flex-col items-center justify-center p-2 aspect-square bg-beige-100 dark:bg-brown-800 border border-brown-900 dark:border-beige-100 hover:bg-brown-900 dark:hover:bg-beige-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100"
              >
                <span class="font-tangut text-xl text-brown-900 dark:text-beige-100">{char.unicode}</span>
                <span class="font-mono text-[10px] text-brown-600 dark:text-beige-400">{char.unicode_string.slice(2)}</span>
              </a>
            )}
          </For>
        </div>

        {/* Load more */}
        <Show when={visibleCharacters().length < filteredCount()}>
          <div class="text-center mt-4">
            <button
              onClick={loadMore}
              class="font-ui text-sm px-4 py-2 border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800 text-brown-900 dark:text-beige-100 hover:bg-brown-900 hover:text-beige-100 dark:hover:bg-beige-100 dark:hover:text-brown-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100"
            >
              Load more ({filteredCount() - visibleCharacters().length} remaining)
            </button>
          </div>
        </Show>

        {/* No results */}
        <Show when={filteredCount() === 0}>
          <div class="text-center py-8">
            <p class="font-ui text-brown-700 dark:text-beige-300">
              No characters match your search.
            </p>
            <button
              onClick={clearFilters}
              class="mt-2 font-ui text-sm text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100 underline"
            >
              Clear filters
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
