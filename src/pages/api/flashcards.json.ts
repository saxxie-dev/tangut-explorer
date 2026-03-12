import { getCollection } from "astro:content";

export async function GET(): Promise<Response> {
  const flashcardsEntries = await getCollection("flashcards");

  const data = {
    items: flashcardsEntries.map((entry) => entry.data),
  };

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
