export const INITIAL_CLASS_LABELS: Record<string, string> = {
  I: "Labials",
  II: "Labiodentals",
  III: "Dentals",
  IV: "Cerebrals",
  V: "Velars",
  VI: "Sibilants",
  VII: "Palatals",
  VIII: "Gutturals",
  IX: "Laterals+Rhotics",
};

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
};

export function parseRomanNumeral(s: string): number {
  return ROMAN_VALUES[s] ?? 0;
}

export function sortInitialClasses(classes: string[]): string[] {
  return [...classes].sort(
    (a, b) => parseRomanNumeral(a) - parseRomanNumeral(b),
  );
}

export function getInitialClassLabel(cls: string): string | undefined {
  return INITIAL_CLASS_LABELS[cls];
}

export function generateTangutCharacters(): string[] {
  const characters: string[] = [];

  // First block: U+17000 to U+187F7 (6136 characters)
  for (let i = 0x17000; i <= 0x187f7; i++) {
    characters.push(String.fromCodePoint(i));
  }

  // Second block: U+18D00 to U+18D08 (9 characters)
  for (let i = 0x18d00; i <= 0x18d08; i++) {
    characters.push(String.fromCodePoint(i));
  }

  return characters;
}

export function getUnicodeString(char: string): string {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return "";
  return "u+" + codePoint.toString(16).toLowerCase().padStart(4, "0");
}

export function isValidTangutCharacter(unicode: string): boolean {
  const codePoint = parseInt(unicode.replace(/[Uu]\+/, ""), 16);
  return (
    (codePoint >= 0x17000 && codePoint <= 0x187f7) ||
    (codePoint >= 0x18d00 && codePoint <= 0x18d08)
  );
}
