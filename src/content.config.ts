import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import fs from 'node:fs/promises';

const flashcardsCollection = defineCollection({
    loader: async () => {
        const rawData = await fs.readFile('src/data/flashcards.json', 'utf-8');
        const parsedData = JSON.parse(rawData);
        // Return array of entries; Astro content collection loaders expect an array of objects
        // Each object must ideally have an `id`, if not Astro might generate one or it might fail
        // Looking at the schema, let's map it to an array
        return parsedData.items.map((item: any, i: number) => ({
            id: item.unicode_string || `flashcard - ${i} `,
            ...item
        }));
    },
    schema: z.object({
        unicode: z.string().optional(),
        unicode_string: z.string().optional(),
        english_definition: z.string().optional(),
        type: z.enum(['character', 'component', 'concept', 'rhyme']).optional(),
        character: z.string().optional(),
        gong_huangcheng_reading: z.string().optional(),
        rhyme_class: z.string().optional(),
        xhzd_index: z.number().optional(),
        ids_sequence: z.string().optional(),
        reading: z.string().optional(),
        meaning: z.string().optional(),
        notes: z.string().optional(),
        components: z.array(z.string()).optional(),
        status: z.string().optional(),
        difficulty: z.number().optional()
    })
});

export const collections = {
    'flashcards': flashcardsCollection,
};
