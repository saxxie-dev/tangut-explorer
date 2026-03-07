# Project Instructions & Agent Guidelines

This document outlines project-specific conventions and "gotchas" discovered during development. All future agent invocations should follow these guidelines.

## Package Management & Commands
- **Use Bun**: This project exclusively uses `bun` and `bunx`. Never use `npm` or `npx`.
  - Check for `bun.lock` to confirm.
  - Commands: `bun install`, `bun run dev`, `bunx astro check`.

## Development Stack
- **Framework**: Astro 5.x
- **UI Components**: Solid.js (Note: NOT React)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Analytics**: PostHog (inline script in `Layout.astro`)

## Project Conventions
- **Exports**: Avoid using `export default`. Prefer exporting constants and functions as named exports, turning to default exports only when absolutely necessitated by build system requirements (e.g. Astro pages). 
- **Imports**: Import explicitly by file path, avoiding `index.ts` files that exist only to re-export and "clean up" imports.

## Known Issues & Past Mistakes
- **Astro Check & TypeScript**: 
  - Ensure `tsconfig.json` is correctly configured for Solid.js JSX (`jsx: "preserve"`, `jsxImportSource: "solid-js"`).
  - Do not assume UI code is broken if TypeScript reports errors; check the config first.
- **JSX Syntax (Solid.js)**:
  - Solid.js `<Show>` and other components often require children/fallbacks to be single elements or wrapped in Fragments (`<>...</>`).
  - Be precise with closing tags when refactoring large JSX blocks.
- **Solid.js DOM Identity vs React VDOM**:
  - Never mutate an `index` state internally on a single DOM element to swap out content like in React (this causes flickering/content switching before animations).
  - Always use `<For>` to map data arrays to permanent physical DOM nodes, and translate them via CSS block-wise for carousels.
- **Animation & Interaction Physics**:
  - Do not rely on ad-hoc JS timeouts, global transition states, and cross-fading "ghosts" for gestures (e.g. swipes). 
  - Map drag offsets exactly to tracking CSS transforms (`transform: translateX(...)`), and CSS-transition to indices when released for natural robust interactions. 
  - Localize internal state (like `isFlipped`) so navigating back and forth doesn't cause phantom states on new data.

## Design Principles
- Maintain the "premium" aesthetic: use the existing color palette (beige, brown), Noto fonts, and smooth transitions.
- Ensure accessibility: use skip links and proper ARIA labels as seen in `FlashcardApp.tsx`.
