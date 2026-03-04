import flashcardsData from '../../data/flashcards.json';

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify(flashcardsData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
