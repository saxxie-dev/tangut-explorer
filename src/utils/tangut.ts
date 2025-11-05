export function generateTangutCharacters(): string[] {
  const characters: string[] = [];
  
  // First block: U+17000 to U+187F7 (6136 characters)
  for (let i = 0x17000; i <= 0x187F7; i++) {
    characters.push(String.fromCodePoint(i));
  }
  
  // Second block: U+18D00 to U+18D08 (9 characters)  
  for (let i = 0x18D00; i <= 0x18D08; i++) {
    characters.push(String.fromCodePoint(i));
  }
  
  return characters;
}

export function getUnicodeString(char: string): string {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return '';
  return 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
}

export function isValidTangutCharacter(unicode: string): boolean {
  const codePoint = parseInt(unicode.replace('U+', ''), 16);
  return (codePoint >= 0x17000 && codePoint <= 0x187F7) || 
         (codePoint >= 0x18D00 && codePoint <= 0x18D08);
}