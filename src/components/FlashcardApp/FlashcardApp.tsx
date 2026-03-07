import { createSignal, Show, onMount, onCleanup, createMemo, For } from "solid-js";
import type { FlashcardItem } from "./types";
import { Flashcard } from "./Flashcard";

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

export function FlashcardApp() {
    const [data, setData] = createSignal<{ items: FlashcardItem[] } | null>(null);
    const [loading, setLoading] = createSignal(true);
    const [currentIndex, setCurrentIndex] = createSignal(0);

    // Drag state for swipe interactions
    const [dragX, setDragX] = createSignal(0);
    const [isDragging, setIsDragging] = createSignal(false);
    const [wasDragging, setWasDragging] = createSignal(false);

    // Track flip stat cleanly to not leak to subsequent cards
    const [currentlyFlipped, setCurrentlyFlipped] = createSignal(false);
    const [prevFlippedState, setPrevFlippedState] = createSignal<{ index: number, flipped: boolean } | null>(null);

    const [announcement, setAnnouncement] = createSignal("");

    let touchStartX = 0;
    let touchStartY = 0;
    let hasMoved = false;

    const currentCard = createMemo((): FlashcardItem | null => {
        const d = data();
        if (!d) return null;
        return d.items[currentIndex()] || null;
    });

    const visibleItems = createMemo(() => {
        const d = data();
        if (!d) return [];
        const items = d.items;
        const ci = currentIndex();
        const arr = [];
        // Always render an array of cards physically in the DOM around the current target.
        // They are absolutely positioned and will be translated together by the track container,
        // which eliminates clipping, jitter, and flicker when rendering new cards.
        for (let i = Math.max(0, ci - 2); i <= Math.min(items.length - 1, ci + 2); i++) {
            arr.push({ i, item: items[i] });
        }
        return arr;
    });

    const progress = createMemo(() => {
        const d = data();
        if (!d) return { current: 0, total: 0, percent: 0 };
        const total = d.items.length;
        return {
            current: currentIndex() + 1,
            total,
            percent: ((currentIndex() + 1) / total) * 100,
        };
    });

    const isCardFlipped = (i: number) => {
        if (i === currentIndex()) return currentlyFlipped();
        const prev = prevFlippedState();
        if (prev && prev.index === i) return prev.flipped;
        return false;
    };

    const toggleFlip = (i?: number) => {
        if (i === undefined) i = currentIndex();
        if (wasDragging() || dragX() !== 0) return; // Ignore click when a swipe is occurring or just released
        if (i !== currentIndex()) return;
        if (currentCard()?.type === "component") return;
        setCurrentlyFlipped(prev => !prev);
    };

    const nextCard = () => {
        const d = data();
        if (!d || currentIndex() >= d.items.length - 1) {
            setDragX(0); // Bounded at right
            return;
        }

        // Cache the previous card's flip state and clear current focus back to front face
        setPrevFlippedState({ index: currentIndex(), flipped: currentlyFlipped() });
        setCurrentlyFlipped(false);

        const nextIdx = currentIndex() + 1;
        setCurrentIndex(nextIdx);
        setStoredProgress(nextIdx);
        setDragX(0);

        const nextItem = d.items[nextIdx];
        setAnnouncement(nextItem?.type === "component" ? "New component" : "Next card");
    };

    const prevCard = () => {
        if (currentIndex() <= 0) {
            setDragX(0); // Bounded at left
            return;
        }

        setPrevFlippedState({ index: currentIndex(), flipped: currentlyFlipped() });
        setCurrentlyFlipped(false);

        const nextIdx = currentIndex() - 1;
        setCurrentIndex(nextIdx);
        setStoredProgress(nextIdx);
        setDragX(0);
    };

    const resetProgress = () => {
        setCurrentIndex(0);
        setCurrentlyFlipped(false);
        setPrevFlippedState(null);
        setStoredProgress(0);
        setDragX(0);
        setAnnouncement("Progress reset");
    };

    const handlePointerDown = (e: PointerEvent) => {
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        setIsDragging(true);
        hasMoved = false;
        setDragX(0);

        if (e.target instanceof Element) {
            e.target.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (!isDragging()) return;
        const deltaX = e.clientX - touchStartX;
        const deltaY = e.clientY - touchStartY;

        if (!hasMoved) {
            // Determine if predominant horizontal swipe
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
            }
        }

        if (hasMoved) {
            setDragX(deltaX);
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (!isDragging()) return;
        setIsDragging(false);

        if (e.target instanceof Element && e.target.hasPointerCapture(e.pointerId)) {
            e.target.releasePointerCapture(e.pointerId);
        }

        const deltaX = dragX();
        const isSwipe = Math.abs(deltaX) > 10;
        setWasDragging(isSwipe);

        const SWIPE_THRESHOLD = 60;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            if (deltaX > 0) prevCard();
            else nextCard();
        } else {
            setDragX(0);
        }
    };

    onMount(async () => {
        try {
            const response = await fetch("/api/flashcards.json");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            setData(json);
            const stored = getStoredProgress();
            setCurrentIndex(Math.min(stored, json.items.length - 1));
        } catch (e) {
            console.error("Failed to load flashcards:", e);
        } finally {
            setLoading(false);
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept global modifiers 
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggleFlip();
            } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault(); nextCard();
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault(); prevCard();
            }
        };

        const preventDefault = (e: TouchEvent) => {
            // Crucial: Keeps native vertical scrolling when moving purely horizontal over card component.
            if (isDragging() && hasMoved) e.preventDefault();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("touchmove", preventDefault, { passive: false });

        onCleanup(() => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("touchmove", preventDefault);
        });
    });

    return (
        <div class="overflow-x-hidden w-full touch-none">
            <Show when={!loading()} fallback={<div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">Loading flashcards...</div>}>
                <Show when={data()} fallback={<div class="text-center py-12 text-brown-600 dark:text-beige-400 font-ui">No flashcards available.</div>}>
                    <>
                        <div role="status" aria-live="polite" class="sr-only">{announcement()}</div>

                        {/* Progress */}
                        <div class="mb-6 px-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-ui text-sm text-brown-700 dark:text-beige-300">Card {progress().current} of {progress().total}</span>
                                <button onClick={resetProgress} class="font-ui text-sm text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100 underline">Reset progress</button>
                            </div>
                            <div class="h-2 bg-brown-200 dark:bg-brown-700 rounded-full overflow-hidden">
                                <div class="h-full bg-brown-900 dark:bg-beige-100 transition-all duration-300" style={{ width: `${progress().percent}%` }} />
                            </div>
                        </div>

                        {/* Main Carousel Area */}
                        <div class="relative overflow-visible px-4 mb-6">
                            <div
                                class="relative perspective-1000 w-full aspect-[3/2] select-none touch-none"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                            >
                                {/* A track wrapper mapping offset translation horizontally */}
                                <div
                                    class="absolute top-0 bottom-0 w-full z-10"
                                    style={{
                                        transform: `translateX(calc(${-currentIndex() * 110}% + ${dragX()}px))`,
                                        transition: isDragging() ? "none" : "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)"
                                    }}
                                >
                                    <For each={visibleItems()}>
                                        {({ i, item }) => (
                                            <div
                                                class="absolute inset-0 w-full h-full"
                                                style={{
                                                    transform: `translateX(${i * 110}%)`
                                                }}
                                            >
                                                <Flashcard
                                                    item={item}
                                                    isFlipped={isCardFlipped(i)}
                                                    onClick={() => toggleFlip(i)}
                                                />
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </div>

                        <style>{`
              .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
              .perspective-1000 { perspective: 1000px; }
            `}</style>

                        {/* Controls */}
                        <div class="flex justify-center gap-4 px-4 relative z-20">
                            <button
                                onClick={prevCard}
                                disabled={currentIndex() === 0}
                                class="font-ui text-sm px-6 py-2 min-w-[10rem] border-2 border-brown-900 dark:border-beige-100 bg-beige-100 dark:bg-brown-800 text-brown-900 dark:text-beige-100 hover:bg-brown-200 dark:hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
                            >
                                ← Previous
                            </button>

                            <Show when={currentCard()?.type === "character" && !currentlyFlipped()}>
                                <button
                                    onClick={() => toggleFlip()}
                                    class="font-ui text-sm px-6 py-2 min-w-[10rem] bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 transition-colors rounded"
                                >
                                    Show Answer
                                </button>
                            </Show>

                            <Show when={currentCard()?.type === "component" || currentlyFlipped()}>
                                <button
                                    onClick={nextCard}
                                    class="font-ui text-sm px-6 py-2 min-w-[10rem] bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 transition-colors rounded"
                                >
                                    Next →
                                </button>
                            </Show>
                        </div>

                        {/* Completion View */}
                        <Show when={currentIndex() === progress().total - 1 && (currentCard()?.type === "character" ? currentlyFlipped() : true)}>
                            <div class="mt-8 text-center pb-8">
                                <p class="font-ui text-lg text-brown-700 dark:text-beige-300">Congratulations! You've completed all flashcards.</p>
                                <button onClick={resetProgress} class="mt-4 font-ui text-sm px-4 py-2 bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 rounded transition-colors">Start Over</button>
                            </div>
                        </Show>
                    </>
                </Show>
            </Show>
        </div>
    );
}
