import fs from "fs";
import path from "path";

export type CharacterData = {
  unicode: string; // The character, e.g. "𗀀"
  unicode_string: string; // The derived "U+XXXX" string
  ids_sequence: string;
  xhzd_index?: number;
  variant?: string;
  variant_warning?: boolean;
  gong_huangcheng_reading?: string;
  rhyme_class?: string;
  initial_class?: string;
  pronunciation_warning?: boolean;
  english_definition?: string;

  // New fields for relationships
  variants?: CharacterData[];
  synonyms?: CharacterData[];
  similar_ids_radical?: CharacterData[];
  similar_ids_rest?: CharacterData[];
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

  // --- Second pass: Calculate relationships ---
  const allCharactersArray = Array.from(data.values());

  // Grouping for efficiency
  const variantsByCanonical = new Map<string, CharacterData[]>(); // Key: canonical character (string)
  const synonymsByDefinition = new Map<string, CharacterData[]>(); // Key: english_definition (string)
  const idsRadicalGroups = new Map<string, CharacterData[]>(); // Key: first 2 IDS chars
  const idsRestGroups = new Map<string, CharacterData[]>(); // Key: rest of IDS chars

  for (const charData of allCharactersArray) {
    // Variants Grouping
    if (charData.variant) {
      const canonicalChar = charData.variant;
      if (!variantsByCanonical.has(canonicalChar)) {
        variantsByCanonical.set(canonicalChar, []);
      }
      variantsByCanonical.get(canonicalChar)!.push(charData);
    }

    // Synonyms Grouping
    if (charData.english_definition) {
      const definition = charData.english_definition;
      if (!synonymsByDefinition.has(definition)) {
        synonymsByDefinition.set(definition, []);
      }
      synonymsByDefinition.get(definition)!.push(charData);
    }

    // Similar IDS Grouping
    if (charData.ids_sequence) {
      const chars = Array.from(charData.ids_sequence);
      if (chars.length >= 2) {
        const radical = chars.slice(0, 2).join('');
        if (!idsRadicalGroups.has(radical)) {
          idsRadicalGroups.set(radical, []);
        }
        idsRadicalGroups.get(radical)!.push(charData);

        const rest = chars.slice(2).join('');
        if (rest) {
          if (!idsRestGroups.has(rest)) {
            idsRestGroups.set(rest, []);
          }
          idsRestGroups.get(rest)!.push(charData);
        }
      }
    }
  }

  // Populate relationship fields for each character
  for (const charData of allCharactersArray) {
    // Variants
    if (charData.variant) {
      // If this character is a variant of something
      const canonicalChar = charData.variant;
      const cluster = variantsByCanonical.get(canonicalChar) || [];
      // Also include the canonical character itself if it exists and is not this character
      const canonicalCharData = data.get(getUnicodeString(canonicalChar)); // Lookup by unicode_string
      const allVariantsInCluster = new Set<CharacterData>();
      if (canonicalCharData) {
        allVariantsInCluster.add(canonicalCharData);
      }
      cluster.forEach((v) => allVariantsInCluster.add(v));

      // Filter out itself
      charData.variants = Array.from(allVariantsInCluster).filter(
        (v) => v.unicode_string !== charData.unicode_string
      );
    } else {
      // If this character is canonical (has no variant field)
      const cluster = variantsByCanonical.get(charData.unicode) || []; // Check if other chars are variants of this one
      charData.variants = cluster.filter(
        (v) => v.unicode_string !== charData.unicode_string
      );
    }
    // Ensure variants are sorted for consistent display
    if (charData.variants) {
      charData.variants.sort((a, b) =>
        a.unicode_string.localeCompare(b.unicode_string)
      );
    }

    // Synonyms
    if (charData.english_definition) {
      const definition = charData.english_definition;
      const synonyms = synonymsByDefinition.get(definition) || [];
      charData.synonyms = synonyms.filter(
        (s) => s.unicode_string !== charData.unicode_string
      );
      // Ensure synonyms are sorted
      if (charData.synonyms) {
        charData.synonyms.sort((a, b) =>
          a.unicode_string.localeCompare(b.unicode_string)
        );
      }
    }

    // Similar IDS
    if (charData.ids_sequence) {
      const chars = Array.from(charData.ids_sequence);
      if (chars.length >= 2) {
        const radical = chars.slice(0, 2).join('');
        const similarRadical = idsRadicalGroups.get(radical) || [];
        charData.similar_ids_radical = similarRadical.filter(
          (s) => s.unicode_string !== charData.unicode_string
        );
        if (charData.similar_ids_radical) {
          charData.similar_ids_radical.sort((a, b) =>
            a.unicode_string.localeCompare(b.unicode_string)
          );
        }

        const rest = chars.slice(2).join('');
        if (rest) {
          const similarRest = idsRestGroups.get(rest) || [];
          charData.similar_ids_rest = similarRest.filter(
            (s) => s.unicode_string !== charData.unicode_string
          );
          if (charData.similar_ids_rest) {
            charData.similar_ids_rest.sort((a, b) =>
              a.unicode_string.localeCompare(b.unicode_string)
            );
          }
        }
      }
    }
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
