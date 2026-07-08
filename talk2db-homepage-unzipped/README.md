# Talk2DB — Homepage

A pixel-matched recreation of the Talk2DB homepage mock, built for your
existing stack: Next.js 16 (App Router), React 19, TypeScript, and plain CSS.

## What's included

```
src/
  app/
    layout.tsx      Root layout — loads Inter + JetBrains Mono via next/font/google
    page.tsx         The homepage itself
    globals.css       All styling (no Tailwind, no CSS-in-JS)
  components/
    Sidebar.tsx        Left nav, "Pro Tip" card, user footer
    HeroVisual.tsx      Floating database + chat/SQL/results cards
    FeatureCard.tsx     Reusable card for the 5-feature grid
    icons.tsx           Small inline SVG icon set (no external icon lib)
```

## How to drop this into `sql-chat-app/nextjs-app`

1. Copy `src/components/*` into your existing `src/components/` folder.
2. Merge `src/app/page.tsx` and `src/app/layout.tsx` into your `src/app/`
   (overwrite if this is meant to be the new homepage).
3. Merge the contents of `src/app/globals.css` into your existing
   `globals.css` — it's additive and namespaced by class, so it's safe to
   append if you already have base resets.
4. Confirm your `tsconfig.json` has the `@/*` path alias pointing at `./src/*`
   (already the case per your project notes).
5. `npm run dev` and visit `/`.

## Notes

- **Fonts**: `layout.tsx` pulls Inter (UI) and JetBrains Mono (SQL code
  block) via `next/font/google`. Requires network access at build time; if
  your build runs offline, swap these for local font files or the system
  stack already defined in `globals.css`'s `--font-sans` / `--font-mono`
  fallbacks.
- **Interactivity**: `Sidebar.tsx` is a client component (`"use client"`) so
  the active-link state works; everything else is a server component.
- **No new dependencies**: only `next`, `react`, `react-dom` are required —
  nothing from `recharts` or `@gradio/client` is needed on this page, since
  it's a static marketing homepage. Wire those into `Query Studio` /
  `Data Visualizer` when you build those routes.
- **Accessibility**: visible focus states inherit from the browser default;
  add a `:focus-visible` rule in `globals.css` if your design system needs a
  custom one. Reduced-motion is respected (`prefers-reduced-motion` disables
  the floating database animation).
- Verified with `next build` — compiles and prerenders as static content.
