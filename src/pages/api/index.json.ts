import { getAllCharacterData } from '../../utils/database';
import { sortInitialClasses, INITIAL_CLASS_LABELS } from '../../utils/tangut';

export async function GET() {
  const allCharacters = await getAllCharacterData();
  
  const characters = Array.from(allCharacters.values()).map((char: any) => ({
    unicode: char.unicode,
    unicode_string: char.unicode_string,
    ids_sequence: char.ids_sequence,
    xhzd_index: char.xhzd_index,
    gong_huangcheng_reading: char.gong_huangcheng_reading,
    rhyme_class: char.rhyme_class,
    initial_class: char.initial_class,
    pronunciation_warning: char.pronunciation_warning,
    english_definition: char.english_definition,
    variant_warning: char.variant_warning,
  }));

  const initialClasses = sortInitialClasses([...new Set(characters.map((c: any) => c.initial_class).filter(Boolean))]);
  const rhymeClasses = [...new Set(characters.map((c: any) => c.rhyme_class).filter(Boolean))].sort();

  return new Response(JSON.stringify({
    characters,
    initialClasses,
    initialClassLabels: INITIAL_CLASS_LABELS,
    rhymeClasses,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
