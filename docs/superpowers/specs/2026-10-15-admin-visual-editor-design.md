# Admin: visual editing inside Eddie OS

Date: 2026-10-15. Status: approved design, pending implementation plan.

## Goal

Eddie can sign in at `/admin`, edit any content on the site in place inside the OS (profile copy, About,
Welcome, Contact, Projects) and write blog posts in a WYSIWYG editor with a Markdown source toggle. Saves
commit to GitHub, either straight to `main` (a production deploy via Vercel) or to a draft branch (a Vercel
preview), and a draft branch can be published to `main` from inside the OS.

## Decisions

- **No TinaCMS.** Tina Cloud auth only grants access to Tina's own GraphQL content API (schema, indexing,
  build wrapper); it does not yield a GitHub write token for a custom editor. Self-hosted Tina needs a
  database and custom auth anyway. The repo already removed Tina after its editor broke.
- **Auth: hand-rolled GitHub OAuth.** No new dependency. Single user.
- **Editor: MDXEditor** (`@mdxeditor/editor`, MIT, Lexical + remark). Markdown-native round-trip, built-in
  rich/source/diff toggle, GFM, code blocks, directive support for `:::sketch{…}` blocks.
- **Editing surface: inside the OS** (not a separate dashboard).
- **Branch flow: branch switcher + "Publish to main"** from the OS, implemented as PR + squash merge.

## 1. Auth

- Routes (all `runtime = 'nodejs'`, dynamic):
  - `GET /api/admin/login` redirects to GitHub authorize with `scope=public_repo` and a random `state`
    stored in a short-lived httpOnly cookie.
  - `GET /api/admin/callback` verifies `state`, exchanges the code, fetches `/user`, rejects logins not in
    `ADMIN_GITHUB_USERS` (comma-separated, default `edkranz`), and sets the session cookie, then redirects
    to `/admin`.
  - `GET /api/admin/session` returns `{ login, avatarUrl }` or 401.
  - `POST /api/admin/logout` clears the cookie.
- Session cookie `eos_admin`: AES-GCM (Web Crypto) encryption of `{ token, login, avatarUrl, exp }` keyed
  from `ADMIN_SESSION_SECRET`. httpOnly, Secure (outside dev), SameSite=Lax, 7-day expiry. The token never
  reaches client JS.
- Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_SESSION_SECRET`, optional `ADMIN_GITHUB_USERS`.
  Documented in `.env.example`.
- Mutating admin routes require `POST` plus a same-origin check (`Origin` header) on top of the cookie.

## 2. Content as data

- New `content/profile.json` holds everything currently hard-coded as editable copy: `profile` (name, role,
  company, location, email, avatar, tagline, intro, blurb), `about` (the two bio paragraphs, as Markdown
  strings so the thesis title keeps its emphasis), `socials`, `technologies`, `skills`, `education`,
  `hobbies`, `contact` (heading and lead copy from `contact-app.tsx`).
- `lib/eddie.ts` imports and re-exports it with the existing types, as it already does for
  `content/projects.json`. Consumers keep their imports.
- `profile.repo` stays in code (it is config, not copy).
- Delete unused Tina leftovers: `content/pages`, `content/global`, `content/authors`, `content/tags`. The
  posts loader keeps accepting the old `{ tag: 'content/tags/x.mdx' }` shape; the editor writes plain
  string tags.

## 3. Edit mode

- `app/admin/page.tsx` renders the OS with `editMode` (metadata `robots: noindex`, excluded from the
  sitemap and from the catch-all's `generateStaticParams`).
- Login screen (`components/os/admin/login-screen.tsx`): macOS-style lock screen over the wallpaper, avatar,
  name, one "Sign in with GitHub" button. No explanatory copy.
- `lib/os/admin/store.ts` (Zustand): `session`, `branch`, `remote` (content loaded for the branch, with
  the file SHAs and the branch head SHA it was read at), `pending` (map of path to new contents, or
  deletion), selectors for "dirty".
- `useContent()` (`lib/os/content.ts`): returns build-time `content/profile.json` + `projects.json` for
  visitors; in edit mode returns `remote` overlaid with `pending`. About, Welcome, Contact, Projects read
  through it.
- `<Editable path="profile.blurb" as="p" multiline? markdown?>`: renders the value normally; in edit mode a
  hover outline and click-to-edit (contentEditable plain text, Enter commits for single-line, Esc reverts).
  Writes a JSON-path update into `pending` for the owning file.
- Projects in edit mode: per-card delete, an "add project" card, and `<Editable>` on every string field;
  `tech` edits as a comma list.
- Menu bar in edit mode: a branch menu (current branch, list of branches, "New Branch…") and the account
  (avatar, Sign Out).

## 4. Blog editing

- In edit mode the Blog app shows New Post, and Edit / Delete per post (including `hideFromBlogList`
  posts).
- New app id `editor` (single window per slug) hosts `components/os/apps/editor/post-editor.tsx`:
  frontmatter fields (title, slug for new posts only, date, excerpt, tags, hero image, hidden), then
  MDXEditor with toolbar, `diffSourcePlugin` for rich/source/diff, GFM tables, code blocks, links, images,
  and a directive descriptor rendering `:::sketch{…}` as an editable embedded block.
- MDXEditor is loaded with `next/dynamic` (`ssr: false`) only in edit mode, so visitors never download it.
- Serialization: `gray-matter` `stringify` preserves unknown frontmatter keys (e.g. `author`).
- Images: paste/drop stages the file into `pending` as base64 at `public/uploads/posts/<slug>/<name>` and
  inserts `/uploads/posts/<slug>/<name>`; the editor shows it from an object URL until saved.

## 5. Saving and publishing

- All GitHub access goes through one server module `lib/admin/github.ts` behind `/api/admin/*` routes.
  Reads are `GET`: `content?branch=` (profile, projects, posts list, branch head SHA), `post?branch=&slug=`,
  `branches`, `preview?branch=`. Mutations are `POST`: `branches` (create), `commit`, `publish`.
- Save bar (bottom of the screen in edit mode when `pending` is non-empty): change count, commit message
  (prefilled, e.g. `Edit about copy`), Save. Commit = Git Data API: create blobs, tree on the base tree,
  commit with parent = the head SHA the content was loaded at, then `PATCH ref` with `force: false`. A
  non-fast-forward fails with "branch moved" and offers reload; nothing is overwritten.
- On a draft branch the bar also shows the Vercel preview link (latest GitHub deployment status
  `environment_url` for the branch head, polled after save until it appears) and **Publish to main**:
  create or reuse a PR branch→main, squash-merge it, delete the branch, switch to `main`.
- New Branch… creates `drafts/<name>` from the current branch head.

## 6. Error handling

- 401 from any admin route returns to the login screen with pending changes kept in memory.
- GitHub errors surface as a terse OS alert (`Save failed: branch moved`, `Publish failed: merge conflict`).
- Unsaved changes trigger `beforeunload`.

## 7. Testing

- `lib/admin/github.ts` has a dev-only in-memory fake (enabled by `ADMIN_FAKE_GITHUB=1` in development)
  seeded from the working tree, so Playwright can drive login → edit → save → branch → publish without real
  pushes.
- Playwright (`uv run --with playwright python …`) checks: visitors see no admin UI or MDXEditor chunk;
  `/admin` shows the login screen; with the fake, in-place edits, a post edit round-trip (Markdown
  unchanged except the edit, `:::sketch` intact), branch save and publish.
- One real smoke test against a throwaway branch on `edkranz/blog`, then deleted.

## Out of scope

Multiple users or roles, comments/review, scheduled posts, editing terminal/game/filesystem seed copy,
media library beyond per-post uploads, and renaming existing post slugs.
