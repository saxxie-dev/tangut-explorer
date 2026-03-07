import { Show, type Component } from "solid-js";
import type { FlashcardProps } from "./types";

function getTone(rhymeClass?: string): string {
    if (!rhymeClass) return "";
    if (rhymeClass.startsWith("1")) return "¹";
    if (rhymeClass.startsWith("2")) return "²";
    return "";
}

export const Flashcard: Component<FlashcardProps> = (props) => {
    const isCharacter = () => props.item?.type === "character";

    return (
        <div
            onClick={() => props.onClick?.()}
            class={`relative w-full h-full ${isCharacter() ? "cursor-pointer" : ""} transition-transform duration-500`}
            style={{
                transform: props.isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                "transform-style": "preserve-3d"
            }}
        >
            {/* Front */}
            <div
                class={`absolute inset-0 flex flex-col items-center p-8 rounded-lg backface-hidden ${isCharacter() ? "bg-beige-100 dark:bg-brown-800 border-2 border-brown-900 dark:border-beige-100" : ""
                    }`}
                style={{ "backface-visibility": "hidden", "-webkit-backface-visibility": "hidden" }}
            >
                {/* Top (1/3) */}
                <div class="flex-1 w-full flex flex-col justify-between items-center">
                    <div class="h-8 flex items-center">
                        <Show when={props.item?.type === "component"}>
                            <div class="font-ui text-xs uppercase tracking-widest text-brown-500 dark:text-beige-500">
                                Component
                            </div>
                        </Show>
                    </div>
                    <div class="h-8 flex items-end">
                        <Show when={isCharacter()}>
                            <div class="font-reading text-2xl text-brown-700 dark:text-beige-300">
                                {props.item?.gong_huangcheng_reading}
                                {getTone(props.item?.rhyme_class)}
                            </div>
                        </Show>
                    </div>
                </div>

                {/* Center (Character) */}
                <div class="h-32 flex items-center justify-center">
                    <div class="font-tangut text-7xl text-brown-900 dark:text-beige-100">
                        {props.item?.unicode}
                    </div>
                </div>

                {/* Bottom (1/3) */}
                <div class="flex-1 w-full flex flex-col items-center">
                    <div class="h-8 flex items-center font-ui text-sm text-brown-500 dark:text-beige-500">
                        {isCharacter() ? "Click or press Space to reveal" : ""}
                    </div>
                </div>
            </div>

            {/* Back */}
            <Show when={isCharacter()}>
                <div
                    class="absolute inset-0 flex flex-col items-center p-8 bg-beige-100 dark:bg-brown-800 border-2 border-brown-900 dark:border-beige-100 rounded-lg backface-hidden"
                    style={{
                        "backface-visibility": "hidden",
                        "-webkit-backface-visibility": "hidden",
                        transform: "rotateY(180deg)",
                    }}
                >
                    {/* Top (1/3) */}
                    <div class="flex-1 w-full flex flex-col justify-end items-center">
                        <div class="h-8 flex items-end">
                            <div class="font-reading text-2xl text-brown-700 dark:text-beige-300">
                                {props.item?.gong_huangcheng_reading}
                                {getTone(props.item?.rhyme_class)}
                            </div>
                        </div>
                    </div>

                    {/* Center (Character) */}
                    <div class="h-32 flex items-center justify-center">
                        <div class="font-tangut text-7xl text-brown-900 dark:text-beige-100">
                            {props.item?.unicode}
                        </div>
                    </div>

                    {/* Bottom (1/3) */}
                    <div class="flex-1 w-full flex flex-col items-center">
                        <div class="font-ui text-xl text-brown-900 dark:text-beige-100 text-center font-semibold">
                            {props.item?.english_definition}
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
};
