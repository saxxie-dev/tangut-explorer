import { getAllCharacterData } from '../../utils/database';

interface FlashcardItem {
  unicode: string;
  unicode_string: string;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  english_definition?: string;
  xhzd_index?: number;
  ids_sequence?: string;
  type: 'character' | 'component';
}

const TANGUT_COMPONENTS_START = 0x18000;
const TANGUT_COMPONENTS_END = 0x18AFF;

function isComponentCodePoint(cp: number): boolean {
  return cp >= TANGUT_COMPONENTS_START && cp <= TANGUT_COMPONENTS_END;
}

function getAllComponentsInIds(ids: string): string[] {
  const positional = ['⿰', '⿱', '⿲', '⿳', '⿴', '⿵', '⿶', '⿷', '⿸', '⿹', '⿺', '⿾', '⿿'];
  const deps: string[] = [];
  for (const char of ids) {
    if (!positional.includes(char)) {
      const cp = char.codePointAt(0);
      if (cp && isComponentCodePoint(cp)) {
        deps.push(char);
      }
    }
  }
  return deps;
}

export async function GET(): Promise<Response> {
  const allCharacters = await getAllCharacterData();
  
  const hasGoodData = (char: any): boolean => {
    return Boolean(
      char.english_definition && char.english_definition.trim() &&
      char.gong_huangcheng_reading && char.gong_huangcheng_reading.trim() &&
      !char.pronunciation_warning && !char.variant_warning && !char.variant
    );
  };

  const goodCharacters = new Map<string, any>();
  for (const [key, char] of allCharacters) {
    if (hasGoodData(char)) {
      goodCharacters.set(key, char);
    }
  }

  const charDependencies = new Map<string, string[]>();
  const componentCharCount = new Map<string, number>();
  
  for (const [key, char] of goodCharacters) {
    if (char.ids_sequence) {
      const deps = getAllComponentsInIds(char.ids_sequence);
      if (deps.length > 0) {
        charDependencies.set(key, deps);
        for (const dep of deps) {
          componentCharCount.set(dep, (componentCharCount.get(dep) || 0) + 1);
        }
      }
    }
  }

  const introducedComponents = new Set<string>();
  const result: FlashcardItem[] = [];
  const remainingChars = new Set<string>(goodCharacters.keys());

  while (remainingChars.size > 0) {
    let bestComp: string | null = null;
    let bestScore = -1;
    
    for (const [comp, count] of componentCharCount) {
      if (introducedComponents.has(comp)) continue;
      
      let usableCount = 0;
      for (const charKey of remainingChars) {
        const deps = charDependencies.get(charKey);
        if (deps && deps.every(d => introducedComponents.has(d) || d === comp)) {
          usableCount++;
        }
      }
      
      if (usableCount > bestScore) {
        bestScore = usableCount;
        bestComp = comp;
      }
    }
    
    if (!bestComp) {
      break;
    }
    
    introducedComponents.add(bestComp);
    const cp = bestComp.codePointAt(0);
    if (!cp) continue;
    const compStr = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
    const compChar = allCharacters.get(compStr);
    
    result.push({
      unicode: bestComp,
      unicode_string: compStr,
      english_definition: compChar?.english_definition || "Component",
      type: 'component',
    });
    
    const newlyAvailable: any[] = [];
    for (const charKey of remainingChars) {
      const deps = charDependencies.get(charKey);
      if (!deps || deps.every(d => introducedComponents.has(d))) {
        const char = goodCharacters.get(charKey);
        if (char) {
          newlyAvailable.push(char);
        }
      }
    }
    
    newlyAvailable.sort((a, b) => (a.xhzd_index || 0) - (b.xhzd_index || 0));
    
    for (const char of newlyAvailable) {
      remainingChars.delete(char.unicode_string);
      result.push({
        unicode: char.unicode,
        unicode_string: char.unicode_string,
        gong_huangcheng_reading: char.gong_huangcheng_reading,
        rhyme_class: char.rhyme_class,
        english_definition: char.english_definition,
        xhzd_index: char.xhzd_index,
        ids_sequence: char.ids_sequence,
        type: 'character',
      });
    }
  }

  return new Response(JSON.stringify({ items: result }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
