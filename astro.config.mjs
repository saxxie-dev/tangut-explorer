// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import solid from '@astrojs/solid-js';

// https://astro.build/config
import { envField } from 'astro/config';

export default defineConfig({
  integrations: [tailwind(), solid()],
  env: {
    schema: {
      PUBLIC_POSTHOG_KEY: envField.string({
        context: 'client',
        access: 'public'
      }),
    },
  },
});