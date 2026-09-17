# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal site for Eddie Kranz at **kranz.au**, reimagined as **Eddie OS** — a browser-based desktop
environment (window manager) built with Next.js 16 (App Router) + React 19. The whole site is a single
client-side "OS": it boots, auto-opens a Welcome window, and lets you drag/resize/focus windows for
apps like About, Blog, Projects, Terminal, Contact, Settings and Minesweeper/Tetris games.

TinaCMS has been removed. Blog content is plain Markdown/MDX read from the filesystem at build time.

## Working agreements

- **Track requests as GitHub issues.** When Eddie asks for a feature, or reports a bug that is more than a
  one-line fix, create an issue for it on `edkranz/blog` (`gh issue create`, with the topic labels: `app`,
  `terminal`, `games`, `zeppelin`, `seo`, `easter-egg`, `design`, `performance`, plus `enhancement`/`bug`)
  before or while building it, and close it (`--reason completed`) once it ships. The Todo app on the site
  lists these issues, so they are user-visible: imperative titles, 1-3 line bodies, no chatter. Trivial
  tweaks (copy, a colour, a one-liner) do not need an issue. `gh` may need `gh auth switch --user edkranz`
  (the work account is read-only on this repo); switch back afterwards.
- **Deploys** are Vercel's GitHub integration: every push to `main` is a production deployment. "Deploy"
  means commit in logical groups and push `main`.
- **Verify in the browser** (Playwright via `uv run --with playwright python …`) before calling anything
  done; there is no unit-test suite. `pnpm` v11 needs the direct `./node_modules/.bin/*` calls in a non-TTY.

## Voice & copy — it has to feel like a real OS

- **No tips, hints, onboarding or "try X" copy anywhere.** No "Tip:" boxes, no "Type 'help' to get
  started", no "click here to…", no "(see ps)" tails on usage errors, no motd. People discover features
  by poking around — that is the point of the site.
- **Real-terminal tone.** The terminal opens with `Last login: …` and a prompt, nothing else. Errors read
  like coreutils (`rm: x: No such file or directory`, `eksh: command not found: x`). Jokes are fine as
  *easter eggs* (`sudo`, `sl`, `rm -rf /`), never as guidance.
- **No AI-fluff.** No taglines under app titles, no explanatory paragraphs, no "this loads a 6.5 MB
  build on demand" notes, no wordmarks/branding sprinkled in corners. If a sentence exists to explain
  the UI rather than to *be* the UI, delete it.
- **Less is more on screens like the kernel panic**: glyph, the four "restart your computer" lines, the
  dog. Nothing below the fold.
- Seed files in the virtual FS (`lib/os/filesystem.ts`) are in-universe documents, not tutorials.
- **No em dashes** in any user-facing copy (UI, metadata, JSON content, terminal output). Use a comma,
  colon, period or parentheses instead. Code comments are the only exception.

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
- `menu-bar.tsx` — real menus (logo, focused app, File/Edit/View/Window) built on `menu.tsx` (`Dropdown` +
  `MenuList`: click to open, hover to switch between siblings, never steals focus so Edit acts on the active
  input). With nothing focused the app is **Files** (this OS's Finder). `dock.tsx`, `desktop-icons.tsx` — chrome.
- `apps/` — one component per app + `registry.tsx` (maps `AppId` → content) and `meta` lives in
  `lib/os/apps-meta.ts` (pure data: title, icon, accent, default size, dock/desktop flags).

### State (`lib/os/`)

- `store.ts` — Zustand window-manager store (open/close/focus/move/resize/min/max, z-order). Action
  `openApp(appId, opts)` focuses an existing single-instance window or spawns a cascaded one.
- `prefs.ts` — persisted Zustand store (wallpaper per theme). Motion only respects the OS-level
  `prefers-reduced-motion` media query (`usePrefersReducedMotion`); there is no in-app toggle.
- `types.ts`, `constants.ts`, `hooks.ts` (useMounted / useIsMobile / useViewportSize / reduced-motion).

### Content (`lib/posts.ts`, `lib/eddie.ts`)

- `lib/posts.ts` reads `content/posts/*.mdx` with `gray-matter` (fs, build time). The Blog app renders
  the raw Markdown with `react-markdown` + `remark-gfm`. Frontmatter: title, date, excerpt, tags,
  heroImg, hideFromBlogList.
- `lib/eddie.ts` — single source of truth for profile, socials, technologies, skills, hobbies.
- `content/projects.json` — the Projects data (`Project[]`; `lib/eddie.ts` re-exports it as `projects`).
  Edit the JSON, not TypeScript. It is a static import, so both the client apps and the SEO layer see it.
- `lib/os/filesystem.ts` — a **writable virtual file system** (dirs / text / markdown / image / link /
  `.app` nodes, seeded from `lib/eddie.ts`). The live tree is persisted in `lib/os/fs-store.ts`
  (localStorage; bump `SEED_VERSION` when the seed changes). Shared by the **Terminal** and the **Files**
  app (`apps/files-app.tsx`, a Finder-style browser). Add seed content by editing the tree here.

### Terminal (`components/os/apps/terminal/`)

- `shell.ts` — the `eksh` interpreter: quoting, `$VAR`/`${VAR}`/`$?` expansion, globs, aliases,
  `VAR=value`, `;` `&&` `||`, `|` pipelines, `>`/`>>` redirection. Expansion happens per statement.
- `commands.ts` — the command registry (`{ name, usage, desc, group, run(ctx) }`). `help`, `man`, `which`
  and tab-completion all derive from it, so **add a command = add one entry**. Anything that touches
  the OS (windows, theme, wallpaper, posts, power) goes through `ctx.env.sys` (`ShellSys` in `types.ts`).
- `terminal-app.tsx` — UI only (lines, prompt, history, nano overlay, completion). Sources
  `~/.config/eksh.rc` on startup (aliases/exports), and prints only a `Last login:` line.
- **Easter egg**: `rm -rf /` (or `/*`, or the fork bomb) runs a meltdown in the terminal, then
  `usePower().panic()` (`lib/os/power.ts`) shows `components/os/kernel-panic.tsx` — a BSOD-blue Mac-style
  kernel panic with Zeppelin knocked out (`public/zeppelin/dead.png`). It is **sticky per browser session**
  (`sessionStorage`); a reload boots straight back into it, and the only way out is holding the on-screen
  power glyph (~2 s) or closing the tab, which factory-resets the disk. `shutdown` shows
  `shutdown-screen.tsx` (“It is now safe to turn off your computer”).

### Todo (`components/os/apps/todo-app.tsx`, `lib/github-issues.ts`)

The site's own GitHub issues (`profile.repo` in `lib/eddie.ts`), fetched in the browser from the public
REST API with no token (60 req/hour/IP, so results are cached in `sessionStorage` for 10 minutes and the
cache is served when GitHub is unreachable). Open issues are the todo list, closed ones the Done section;
PRs are filtered out. "Suggest a feature" is a prefilled `issues/new` link. Also `todo` in the terminal.

### Doom (`components/os/apps/doom-app.tsx`, `public/doom/`)

DOOM 1.9 **shareware** running under **js-dos v7** (DOSBox → WebAssembly, GPL-2.0) inside an isolated
`<iframe>` (`public/doom/index.html`). Nothing loads until the user presses **Play** — then the js-dos
runtime (`public/doom/js-dos/`) and `doom.jsdos` (~2 MB: `DOOM.EXE` + `DOOM1.WAD` + dosbox.conf) stream
in; closing the window unmounts the iframe. Provenance/licensing and the bundle recipe: `docs/doom.md`.
Never ship the registered `DOOM.WAD`.

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

1. Add the id to `AppId` in `lib/os/types.ts` and an entry in `lib/os/apps-meta.ts`. Add an `IconId` +
   `public/icons/<id>.png` (pixel art, see Assets) and an SVG fallback in `components/os/icons.tsx`.
2. Build the component in `components/os/apps/` and register it in `apps/registry.tsx`.
3. Optionally add it to `DOCK_ORDER` / `DESKTOP_ORDER` in `apps-meta.ts` (the desktop column fits 8 icons at
   ~800px tall), the `APPS` list in `lib/os/filesystem.ts` (so it appears in `/Applications`), and
   `NOINDEX_APPS` in `app/[...segments]/page.tsx` if it has no crawlable content.

## Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).
