import { getAllCharacterData } from '../../utils/database';

interface FlashcardCharacter {
  unicode: string;
  unicode_string: string;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  english_definition?: string;
  xhzd_index?: number;
  ids_sequence?: string;
}

interface FlashcardData {
  components: FlashcardCharacter[];
  cards: FlashcardCharacter[];
}

const TANGUT_COMPONENTS_START = 0x18000;
const TANGUT_COMPONENTS_END = 0x18AFF;

function isComponentCodePoint(cp: number): boolean {
  return cp >= TANGUT_COMPONENTS_START && cp <= TANGUT_COMPONENTS_END;
}

export async function GET(): Promise<Response> {
  const allCharacters = await getAllCharacterData();
  
  const componentSet = new Set<string>();
  
  for (const char of allCharacters.values()) {
    if (char.ids_sequence) {
      for (const c of char.ids_sequence) {
        const cp = c.codePointAt(0);
        if (cp && isComponentCodePoint(cp)) {
          componentSet.add(c);
        }
      }
    }
  }

  const goodCards: FlashcardCharacter[] = [];
  const componentCards: FlashcardCharacter[] = [];
  
  for (const char of allCharacters.values()) {
    const cp = char.unicode.codePointAt(0);
    const isComponent = cp && isComponentCodePoint(cp);
    
    const hasGoodData = 
      char.english_definition &&
      char.english_definition.trim() &&
      char.gong_huangcheng_reading &&
      char.gong_huangcheng_reading.trim() &&
      !char.pronunciation_warning &&
      !char.variant_warning &&
      !char.variant;

      if (hasGoodData) {
        const cardData: FlashcardCharacter = {
          unicode: char.unicode,
          unicode_string: char.unicode_string,
          gong_huangcheng_reading: char.gong_huangcheng_reading,
          rhyme_class: char.rhyme_class,
          english_definition: char.english_definition,
          xhzd_index: char.xhzd_index,
          ids_sequence: char.ids_sequence,
        };
        
        if (isComponent && componentSet.has(char.unicode)) {
          componentCards.push(cardData);
        } else {
          goodCards.push(cardData);
        }
      }
  }

  componentCards.sort((a, b) => {
    const aCp = a.unicode.codePointAt(0) || 0;
    const bCp = b.unicode.codePointAt(0) || 0;
    return aCp - bCp;
  });

  goodCards.sort((a, b) => (a.xhzd_index || 0) - (b.xhzd_index || 0));

  const result: FlashcardData = {
    components: componentCards,
    cards: goodCards,
  };

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
