export interface FlashcardItem {
    unicode: string;
    unicode_string: string;
    gong_huangcheng_reading?: string;
    rhyme_class?: string;
    english_definition?: string;
    ids_sequence?: string;
    type: "character" | "component";
    componentName?: string;
}

export interface FlashcardProps {
    item: FlashcardItem | null;
    isFlipped?: boolean;
    onClick?: () => void;
}
