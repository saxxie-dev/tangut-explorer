import fs from "fs";
import path from "path";

export interface CharacterData {
  unicode: string; // The character, e.g. '𗀀'
  unicode_string: string; // The derived 'U+XXXX' string
  ids_sequence: string;
  xhzd_index?: number;
  variant?: string;
  variant_warning?: boolean;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  initial_class?: string;
  pronunciation_warning?: boolean;
  english_definition?: string;
}

// Cache for the parsed TSV data
let characterCache: Map<string, CharacterData> | null = null;

function getUnicodeString(char: string): string {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return "";
  return "U+" + codePoint.toString(16).toUpperCase().padStart(4, "0");
}

async function parseTsvAndCache(): Promise<Map<string, CharacterData>> {
  if (characterCache) {
    return characterCache;
  }

  const tsvPath = path.join(process.cwd(), "data", "consolidated_tangut.tsv");
  const tsvContent = fs.readFileSync(tsvPath, "utf-8");
  const lines = tsvContent.split("\n");
  const headers = lines[0].split("\t").map((h) => h.trim());
  const data = new Map<string, CharacterData>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = line.split("\t");
    const row = headers.reduce((obj, header, index) => {
      const value = values[index]?.trim();
      if (value) {
        obj[header] = value;
      }
      return obj;
    }, {} as { [key: string]: string });

    if (!row.unicode || !row.ids_sequence) {
      continue; // Skip rows missing required fields
    }

    const unicode_string = getUnicodeString(row.unicode);

    const charData: CharacterData = {
      unicode: row.unicode,
      unicode_string: unicode_string,
      ids_sequence: row.ids_sequence,
      xhzd_index: row.xhzd_index ? parseInt(row.xhzd_index, 10) : undefined,
      variant: row.variant,
      variant_warning: !!row.variant_warning,
      gong_huangcheng_reading: row.gong_huangcheng_reading,
      rhyme_class: row.rhyme_class,
      initial_class: row.initial_class,
      pronunciation_warning: !!row.pronunciation_warning,
      english_definition: row.english_definition,
    };

    data.set(unicode_string, charData);
  }

  console.log(`Loaded and cached ${data.size} character records from TSV.`);
  characterCache = data;
  return characterCache;
}

export async function initDatabase(): Promise<void> {
  await parseTsvAndCache();
}

export async function getCharacterData(
  unicode_string: string
): Promise<CharacterData | null> {
  const cache = await parseTsvAndCache();
  return cache.get(unicode_string) || null;
}

export async function getAllCharacterData(): Promise<
  Map<string, CharacterData>
> {
  return await parseTsvAndCache();
}

export async function getPaginatedCharacters(
  page: number,
  limit: number
): Promise<CharacterData[]> {
  const cache = await parseTsvAndCache();
  const allCharacters = Array.from(cache.values());
  // Ensure consistent order
  allCharacters.sort((a, b) =>
    a.unicode_string.localeCompare(b.unicode_string)
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return allCharacters.slice(startIndex, endIndex);
}

// closeDatabase is no longer needed with this implementation, but we keep it for compatibility with the facade.
export async function closeDatabase(): Promise<void> {
  // No-op
}
