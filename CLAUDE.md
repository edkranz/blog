# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal site for Eddie Kranz at **kranz.au**, reimagined as **Eddie OS** — a browser-based desktop
environment (window manager) built with Next.js 16 (App Router) + React 19. The whole site is a single
client-side "OS": it boots, auto-opens a Welcome window, and lets you drag/resize/focus windows for
apps like About, Blog, Projects, Terminal, Contact, Settings and Minesweeper/Tetris games.

TinaCMS has been removed. Blog content is plain Markdown/MDX read from the filesystem at build time.

## Commands

```bash
pnpm dev          # Dev server (Next.js + Turbopack) → http://localhost:3001
pnpm build        # Production build: next build + next-sitemap
pnpm build-local  # Same as build (no cloud checks)
pnpm lint         # Run Biome linter
pnpm start        # Production server (next start)
```

- Node version: v22 (see `.nvmrc`). Package manager: **pnpm** (Homebrew pnpm v9 is fine — the old
  `pnpm-workspace.yaml`, which used a v10-only key and broke v9, has been removed).
- `pnpm dev` / `pnpm start` use **port 3001** because a local .NET Aspire `dcp` process squats port 3000.
- Open `http://localhost:3001` — use `localhost`, not `127.0.0.1`, so Next's `allowedDevOrigins` lets the
  client bundle hydrate (`127.0.0.1` is also allow-listed in `next.config.ts`).

## Code Style (Biome)

- 2-space indentation, 160-char line width, LF line endings
- Single quotes (JS and JSX), trailing commas (ES5), always semicolons
- Run `pnpm lint`; Biome handles linting and formatting

## Architecture

### The OS (everything is client-side under `components/os/`)

- `desktop.tsx` — the shell: wallpaper, boot splash, menu bar, dock, desktop icons, window layer.
  Gates dynamic content behind a mounted flag; reads a `?post=`/`?app=` deep-link to auto-open.
- `window.tsx` — draggable (title-bar) + resizable (edges/corners) window chrome with macOS traffic
  lights, focus-to-front, maximize/minimize. Pointer-event based; `motion` only for enter/exit.
- `window-manager.tsx` — renders open windows from the store; on mobile shows one maximized window.
- `menu-bar.tsx`, `dock.tsx`, `desktop-icons.tsx`, `boot-screen.tsx` — chrome pieces.
- `apps/` — one component per app + `registry.tsx` (maps `AppId` → content) and `meta` lives in
  `lib/os/apps-meta.ts` (pure data: title, icon, accent, default size, dock/desktop flags).

### State (`lib/os/`)

- `store.ts` — Zustand window-manager store (open/close/focus/move/resize/min/max, z-order). Action
  `openApp(appId, opts)` focuses an existing single-instance window or spawns a cascaded one.
- `prefs.ts` — persisted Zustand store (wallpaper per theme, reduce-motion).
- `types.ts`, `constants.ts`, `hooks.ts` (useMounted / useIsMobile / useViewportSize / reduced-motion).

### Content (`lib/posts.ts`, `lib/eddie.ts`)

- `lib/posts.ts` reads `content/posts/*.mdx` with `gray-matter` (fs, build time). The Blog app renders
  the raw Markdown with `react-markdown` + `remark-gfm`. Frontmatter: title, date, excerpt, tags,
  heroImg, hideFromBlogList.
- `lib/eddie.ts` — single source of truth for profile, socials, technologies, skills, projects, hobbies.

### Routing

- `/` — server component (`app/page.tsx`) loads published posts and renders `<EddieOS posts>`.
- `/[...segments]` — catch-all (`app/[...segments]/page.tsx`) prerenders deep-link routes (`/about`, `/blog`,
  `/blog/<slug>`, `/projects`, `/tetris`, …) via `generateStaticParams`, rendering the same OS with an
  `initialPath` so the right app opens. `lib/os/routes.ts` maps app↔path; the Desktop keeps the address bar
  synced to the focused window via `history.replaceState` (no history spam).
- `/feed.xml` — static RSS route (`app/feed.xml/route.ts`), reads the same posts loader.
- `app/layout.tsx` — fonts (Open Runde local + JetBrains Mono), `ThemeProvider` (next-themes), analytics.

### SEO: dual static + dynamic rendering

Every route serves **two layers at the same URL**: a server-rendered, crawlable static page _and_ the dynamic OS.

- **Static/SEO layer** (`components/seo/`): both pages (`app/page.tsx`, `app/[...segments]/page.tsx`) render
  `<StaticSite>` (semantic HTML per route: home, about, blog list, full blog post via `<StaticMarkdown>`,
  projects, contact — with real `<a href>` links) and `<RouteJsonLd>` (schema.org `Person` / `BlogPosting` /
  `BreadcrumbList`) **before** `<EddieOS>`. So `curl <url>` and crawlers get readable content.
- **Overlay gating**: the OS root is `<div class="os-root">` (`desktop.tsx`), `position: fixed` and opaque, so
  it covers the static layer for browser users. A `<noscript>` rule in `layout.tsx` sets `.os-root{display:none}`
  + restores body scroll, so no-JS/crawlers see the static page. The static content is **never `display:none`**,
  so Googlebot (which runs JS) still indexes it under the overlay.
- **Metadata**: `generateMetadata` in `app/[...segments]/page.tsx` sets per-route self-referential `canonical`,
  `openGraph`, and `twitter` (each must re-declare `images: ['/og.png']` — Next does not merge OG images when a
  route overrides `openGraph`). Default share image: `public/og.png` (1200×630).
- **Payload**: the client OS receives post _metadata only_ (`toMeta` in `lib/posts.ts`) — post bodies are **not**
  shipped in any page's hydration payload. The Blog reader lazy-loads a body from the static route handler
  `app/api/post/[slug]/route.ts` (one prerendered JSON per slug) when a post is opened. The static SEO layer
  still server-renders full bodies on `/blog/<slug>` for crawlers.

**Adding content — do I update both layers?** Mostly no:
- **Blog posts** (`content/posts/*.mdx`) and **profile/projects data** (`lib/eddie.ts`) are read by _both_ the OS
  apps and the static layer → edit once, both update. No extra work.
- **A brand-new top-level route/section** is the only exception: add a `case` to `components/seo/static-site.tsx`
  (and `json-ld.tsx` if you want structured data) so it gets static content instead of falling back to the home overview.

### Styling (`styles.css`)

Tailwind CSS v4. PostHog-inspired palette (cream `#EEEFE9`, red `#F54E00`, blue `#1D4AFF`, yellow
`#F9BD2B`, charcoal `#1D1F27`) as CSS vars + shadcn-style semantic tokens. Light/dark via `next-themes`.
Fonts: **Open Runde** (`app/fonts/`, self-hosted) for UI, **JetBrains Mono** for code/terminal.
OS-specific utilities (`wp-*` wallpapers, `os-window-shadow`, `btn-chunky`, `crt`, animations) live here.

### Assets

App icons are generated **retro pixel-art PNGs** at `public/icons/<iconId>.png`, rendered by `AppIcon`
(`components/os/icons.tsx`); the SVG glyphs in that file are now an unused fallback. Pixel-art wallpapers
live in `public/wallpapers/` (`wp-retro` / `wp-retro-night`, the defaults). The favicon is the mascot
(`/icons/face.png`). Regenerate via the `generate-image` skill (Nano Banana Pro) — keep icons **full-bleed
square** (rounded in CSS), then downsize/optimize (`mogrify -resize 256x256 -strip`, wallpapers → jpg).

### Adding an app

1. Add the id to `AppId` in `lib/os/types.ts` and an entry in `lib/os/apps-meta.ts`.
2. Build the component in `components/os/apps/` and register it in `apps/registry.tsx`.
3. Optionally add it to `DOCK_ORDER` / `DESKTOP_ORDER` in `apps-meta.ts`.

## Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).
