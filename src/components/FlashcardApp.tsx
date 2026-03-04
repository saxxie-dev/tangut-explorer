import { createSignal, createEffect, Show, onMount, onCleanup } from "solid-js";

interface FlashcardItem {
  unicode: string;
  unicode_string: string;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  english_definition?: string;
  ids_sequence?: string;
  type: "character" | "component";
  componentName?: string;
}

function getTone(rhymeClass?: string): string {
  if (!rhymeClass) return "";
  if (rhymeClass.startsWith("1")) return "¹";
  if (rhymeClass.startsWith("2")) return "²";
  return "";
}

const STORAGE_KEY = "tangut-flashcard-progress";

function getStoredProgress(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function setStoredProgress(progress: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(progress));
}

export default function FlashcardApp() {
  const [data, setData] = createSignal<{ items: FlashcardItem[] } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [isFlipped, setIsFlipped] = createSignal(false);
  const [announcement, setAnnouncement] = createSignal("");
  const [flipKey, setFlipKey] = createSignal(0);
  const [noTransition, setNoTransition] = createSignal(false);

  let cardRef: HTMLDivElement | undefined;
  let cardContainer: HTMLDivElement | undefined;
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  const SWIPE_THRESHOLD = 50;

  const handlePointerDown = (e: PointerEvent) => {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    isSwiping = true;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isSwiping) return;
    
    const deltaX = e.clientX - touchStartX;
    const deltaY = e.clientY - touchStartY;
    
    // If horizontal swipe exceeds threshold, prevent default to stop scroll
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isSwiping) return;
    isSwiping = false;

    const deltaX = e.clientX - touchStartX;
    const deltaY = e.clientY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        prevCard();
      } else {
        if (currentCard()?.type === "character" && !isFlipped()) {
          flipCard();
        } else {
          nextCard();
        }
      }
    }
  };

  const handlePointerCancel = () => {
    isSwiping = false;
  };

  onMount(async () => {
    try {
      const response = await fetch("/api/flashcards.json");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (!json.items) {
        throw new Error("Invalid response: missing items");
      }
      setData(json);

      const stored = getStoredProgress();
      const total = json.items.length;
      setCurrentIndex(Math.min(stored, total));
    } catch (e) {
      console.error("Failed to load flashcards:", e);
    } finally {
      setLoading(false);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextCard();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevCard();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));

    const initSwipe = () => {
      if (cardContainer) {
        cardContainer.addEventListener("pointerdown", handlePointerDown);
        cardContainer.addEventListener("pointermove", handlePointerMove);
        cardContainer.addEventListener("pointerup", handlePointerUp);
        cardContainer.addEventListener("pointercancel", handlePointerCancel);
        cardContainer.addEventListener("pointerleave", handlePointerCancel);
        cardContainer.addEventListener("pointerleave", handlePointerUp);
        cardContainer.addEventListener("touchstart", (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          isSwiping = true;
        }, { passive: true });
        cardContainer.addEventListener("touchmove", (e) => {
          if (!isSwiping) return;
          const deltaX = e.touches[0].clientX - touchStartX;
          const deltaY = e.touches[0].clientY - touchStartY;
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            e.preventDefault();
          }
        }, { passive: false });
        cardContainer.addEventListener("touchend", (e: Event) => {
          const touchEvent = e as TouchEvent;
          if (!isSwiping) return;
          isSwiping = false;

          const deltaX = touchEvent.changedTouches[0].clientX - touchStartX;
          const deltaY = touchEvent.changedTouches[0].clientY - touchStartY;

          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) {
              prevCard();
            } else {
              if (currentCard()?.type === "character" && !isFlipped()) {
                flipCard();
              } else {
                nextCard();
              }
            }
          }
        });
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(initSwipe));
  });

  const flipCard = () => {
    setFlipKey(k => k + 1);
    setIsFlipped(!isFlipped());
  };

  const nextCard = () => {
    const d = data();
    if (!d) return;

    const total = d.items.length;
    if (currentIndex() < total - 1) {
      const nextIdx = currentIndex() + 1;
      const item = d.items[nextIdx];
      
      setNoTransition(true);
      setIsFlipped(false);
      setFlipKey(k => k + 1);
      setCurrentIndex(nextIdx);
      setStoredProgress(nextIdx);

      setTimeout(() => setNoTransition(false), 50);

      setAnnouncement(
        item?.type === "component" ? "New component" : "Next card",
      );
    }
  };

  const prevCard = () => {
    if (currentIndex() > 0) {
      const prevIdx = currentIndex() - 1;
      setNoTransition(true);
      setIsFlipped(false);
      setFlipKey(k => k + 1);
      setCurrentIndex(prevIdx);
      setStoredProgress(prevIdx);

      setTimeout(() => setNoTransition(false), 50);
    }
  };

  const resetProgress = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStoredProgress(0);
    setAnnouncement("Progress reset");
  };

  const currentCard = (): FlashcardItem | null => {
    const d = data();
    if (!d) return null;

    const idx = currentIndex();
    return d.items[idx] || null;
  };

  const progress = () => {
    const d = data();
    if (!d) return { current: 0, total: 0, percent: 0 };
    const total = d.items.length;
    return {
      current: currentIndex() + 1,
      total,
      percent: ((currentIndex() + 1) / total) * 100,
    };
  };

  return (
    <div>
      <Show
        when={!loading()}
        fallback={
          <div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">
            Loading flashcards...
          </div>
        }
      >
        <Show
          when={data()}
          fallback={
            <div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">
              No flashcards available.
            </div>
          }
        >
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="sr-only"
          >
            {announcement()}
          </div>

          {/* Progress */}
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <span class="font-ui text-sm text-brown-700 dark:text-beige-300">
                Card {progress().current} of {progress().total}
              </span>
              <button
                onClick={resetProgress}
                class="font-ui text-sm text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100 underline"
              >
                Reset progress
              </button>
            </div>
            <div class="h-2 bg-brown-200 dark:bg-brown-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-brown-900 dark:bg-beige-100 transition-all duration-300"
                style={{ width: `${progress().percent}%` }}
              />
            </div>
          </div>

          {/* Component - transparent, same dimensions as character card */}
          <Show when={currentCard()?.type === "component"}>
            <div class="mb-6 aspect-[3/2] flex flex-col items-center justify-center">
              <div class="text-center">
                <div class="font-ui text-xs uppercase tracking-widest text-brown-500 dark:text-beige-500 mb-2">
                  Component
                </div>
                <div class="font-tangut text-7xl text-brown-900 dark:text-beige-100">
                  {currentCard()?.unicode}
                </div>
              </div>
            </div>
          </Show>

          {/* Character Flashcard */}
          <Show when={currentCard()?.type === "character"}>
            <div ref={cardContainer} class="perspective-1000 mb-6 select-none" key={flipKey()}>
              <div
                ref={cardRef}
                onClick={flipCard}
                class="relative w-full aspect-[3/2] cursor-pointer"
                style={{ perspective: "1000px" }}
              >
                <div
                  class={"absolute inset-0 " + (noTransition() ? "" : "transition-transform duration-500 ") + "preserve-3d"}
                  style={{
                    "transform-style": "preserve-3d",
                    transform: isFlipped()
                      ? "rotateY(180deg)"
                      : "rotateY(0deg)",
                  }}
                >
                  {/* Front */}
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-beige-100 dark:bg-brown-800 border-2 border-brown-900 dark:border-beige-100 rounded-lg backface-hidden"
                    style={{ "backface-visibility": "hidden" }}
                  >
                    <div class="font-reading text-2xl text-brown-700 dark:text-beige-300 mb-2">
                      {currentCard()?.gong_huangcheng_reading}
                      {getTone(currentCard()?.rhyme_class)}
                    </div>
                    <div class="font-tangut text-7xl text-brown-900 dark:text-beige-100 mb-2">
                      {currentCard()?.unicode}
                    </div>
                    <div class="mt-4 font-ui text-sm text-brown-500 dark:text-beige-500">
                      Click or press Space to reveal
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-beige-100 dark:bg-brown-800 border-2 border-brown-900 dark:border-beige-100 rounded-lg backface-hidden"
                    style={{
                      "backface-visibility": "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div class="font-reading text-2xl text-brown-700 dark:text-beige-300 mb-2">
                      {currentCard()?.gong_huangcheng_reading}
                      {getTone(currentCard()?.rhyme_class)}
                    </div>
                    <div class="font-tangut text-7xl text-brown-900 dark:text-beige-100 mb-4">
                      {currentCard()?.unicode}
                    </div>
                    <div class="font-ui text-xl text-brown-900 dark:text-beige-100 text-center font-semibold">
                      {currentCard()?.english_definition}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* Controls */}
          <div class="flex justify-center gap-4">
            <button
              onClick={prevCard}
              disabled={currentIndex() === 0}
              class="font-ui text-sm px-6 py-2 min-w-[10rem] border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800 text-brown-900 dark:text-beige-100 hover:bg-brown-200 dark:hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100 rounded"
            >
              ← Previous
            </button>

            <Show when={currentCard()?.type === "character" && !isFlipped()}>
              <button
                onClick={flipCard}
                class="font-ui text-sm px-6 py-2 min-w-[10rem] bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100 rounded"
              >
                Show Answer
              </button>
            </Show>

            <Show when={currentCard()?.type === "component" || isFlipped()}>
              <button
                onClick={nextCard}
                class="font-ui text-sm px-6 py-2 min-w-[10rem] bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown-900 dark:focus-visible:ring-beige-100 rounded"
              >
                Next →
              </button>
            </Show>
          </div>

          {/* Completion message */}
          <Show
            when={
              currentIndex() === progress().total - 1 &&
              (currentCard()?.type === "character" ? isFlipped() : true)
            }
          >
            <div class="mt-8 text-center">
              <p class="font-ui text-lg text-brown-700 dark:text-beige-300">
                Congratulations! You've completed all flashcards.
              </p>
              <button
                onClick={resetProgress}
                class="mt-4 font-ui text-sm px-4 py-2 bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 rounded transition-colors"
              >
                Start Over
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
