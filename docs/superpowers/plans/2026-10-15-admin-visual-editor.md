# Admin Visual Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign in with GitHub at `/admin`, edit site copy in place inside Eddie OS and blog posts in a WYSIWYG/Markdown editor, and save to `main` or a draft branch that can be published to `main`.

**Architecture:** Editable copy moves to `content/profile.json`. Pure, dependency-light modules in `lib/admin/` (session crypto, JSON paths, post files, change validation, a `ContentBackend` with GitHub and in-memory fake implementations) are unit-tested with Node's built-in test runner. Thin Next route handlers under `app/api/admin/` expose them. On the client, a Zustand admin store holds the remote snapshot plus pending changes; `useContent()` overlays them so the existing apps render drafts, `<Editable>` makes strings click-to-edit, and a new `editor` app hosts MDXEditor.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, `@mdxeditor/editor` 4.x, `gray-matter`, Web Crypto (AES-GCM), GitHub REST (Git Data API), Node 22.18+/26 `node --test` with native type stripping, Playwright (Python via `uv`) for E2E.

**Spec:** `docs/superpowers/specs/2026-10-15-admin-visual-editor-design.md`

## Global Constraints

- Voice: no tips, hints, onboarding or explanatory copy anywhere in the UI; errors terse (`Save failed: branch moved`).
- No em dashes in any user-facing copy, JSON content or UI strings (code comments excepted).
- Biome style: 2 spaces, single quotes (JS and JSX), trailing commas (ES5), semicolons, 160-char lines. Run `./node_modules/.bin/biome lint .` before each commit.
- `pnpm` v11 in a non-TTY: call binaries directly (`./node_modules/.bin/next`, `./node_modules/.bin/biome`, `./node_modules/.bin/tsc`), and use `CI=true pnpm add …` for installs.
- Modules under `lib/admin/` that the Node test runner loads must not import `@/…` paths, must import siblings with an explicit `.ts` extension, and must avoid TS-only runtime syntax (no `enum`, no parameter properties, no namespaces).
- `ADMIN_FAKE_GITHUB=1` is honoured only when `NODE_ENV !== 'production'`.
- Login allowlist env `ADMIN_GITHUB_USERS` (comma-separated, default `edkranz`); OAuth scope `public_repo`; cookie `eos_admin`, httpOnly, SameSite=Lax, Secure on https, 7-day expiry.
- Env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_SESSION_SECRET` (32+ chars), optional `ADMIN_GITHUB_USERS`, optional `ADMIN_REPO` (default `edkranz/blog`).
- Visitors never load MDXEditor or admin UI code; the admin layer and editor are `next/dynamic` chunks.
- Dev server for E2E runs on port **3011** (`localhost`, not `127.0.0.1`) so it never collides with other worktrees on 3001.

## Review Focus

1. **Fake mode in production:** `ADMIN_FAKE_GITHUB=1` set on Vercel must not create sessions; expect `adminConfig()` to report `fake: false` when `NODE_ENV=production` (test in Task 3).
2. **Someone else's GitHub account:** completing OAuth as a login not on the allowlist must not set a session; expect `isAllowed` to reject it and the callback to redirect to `/admin?denied=1` (unit test in Task 3, manual check in Task 12).
3. **Stale branch head:** saving after the branch moved must fail with 409 `branch moved`, keep pending edits, and write nothing (tests in Task 4 for both backends, E2E in Task 11).
4. **Hostile paths:** upload paths or slugs like `../.github/workflows/x.yml`, `content/posts/../../package.json` or `public/uploads/posts/a/b.sh` must be rejected with 400 before any GitHub call (tests in Task 2, E2E in Task 11).
5. **Markdown the rich editor cannot parse** (raw JSX in an `.mdx` post): the editor must keep the source intact and let it be saved from source mode, never dropping content (E2E in Task 11).

---

## File Structure

**Create**
- `content/profile.json`: all editable profile/about/contact copy.
- `lib/admin/types.ts`: shared types and constants (no imports).
- `lib/admin/json-path.ts`: immutable get/set/remove/append by dotted path.
- `lib/admin/post-meta.ts`: `tagLabel`, `readingMinutes`, `slugify`, `isValidSlug`, `isValidBranch`, `draftBranchName`, `draftMeta`, `byDateDesc` (pure, client-safe).
- `lib/admin/post-file.ts`: `parsePostFile`, `serializePostFile` (gray-matter, server only).
- `lib/admin/changes.ts`: `toFileChanges` validation, `InvalidChangeError` (server only).
- `lib/admin/messages.ts`: `defaultMessage` (client-safe).
- `lib/admin/overlay.ts`: `overlay(remote, pending)` (client-safe).
- `lib/admin/session.ts`: `seal`/`unseal` AES-GCM session.
- `lib/admin/config.ts`: `adminConfig(env)`, `isAllowed`.
- `lib/admin/backend.ts`: `ContentBackend` interface + error classes.
- `lib/admin/fake-backend.ts`: in-memory backend.
- `lib/admin/github-backend.ts`: GitHub REST backend.
- `lib/admin/server.ts`: Next-only glue (`getSession`, `setSessionCookie`, `backendFor`, `adminRoute`).
- `app/api/admin/{login,callback,session,logout,content,post,branches,commit,publish,preview}/route.ts`
- `app/admin/page.tsx`
- `lib/os/admin/store.ts`: client admin store.
- `lib/os/admin/dialog-store.ts`: promise-based prompt/confirm.
- `lib/os/admin/open-editor.ts`: open/focus an editor window per slug.
- `lib/os/content.ts`: `useContent()`, `useEditablePosts()`.
- `components/os/editable.tsx`: `<Editable>`, `<AddItem>`.
- `components/os/inline-markdown-parse.ts`: `parseInline` (import-free, Node-testable).
- `components/os/inline-markdown.tsx`: `*em*`/`**strong**` renderer for bio paragraphs.
- `components/os/admin/{admin-layer,login-screen,save-bar,admin-menus,dialog}.tsx`
- `components/os/apps/editor/{editor-app,markdown-editor}.tsx`
- `tests/admin/*.test.ts`, `tests/content.test.ts`, `tests/inline-markdown.test.ts`, `tests/e2e/admin.py`

**Modify**
- `lib/eddie.ts` (re-export JSON), `lib/posts.ts` (reuse `tagLabel`/`readingMinutes`), `tsconfig.json`, `package.json`, `.env.example`, `styles.css`, `CLAUDE.md`
- `components/os/eddie-os.tsx`, `desktop.tsx`, `menu-bar.tsx`
- `components/os/apps/{about,welcome,contact,projects,blog}-app.tsx`, `registry.tsx`, `terminal/commands.ts`
- `lib/os/types.ts`, `lib/os/apps-meta.ts`, `app/[...segments]/page.tsx`

**Delete**
- `content/pages/`, `content/global/`, `content/authors/`, `content/tags/` (unused TinaCMS leftovers).

---

### Task 1: Test runner and `content/profile.json`

**Files:**
- Create: `content/profile.json`, `tests/content.test.ts`
- Modify: `tsconfig.json`, `package.json`, `lib/eddie.ts`
- Delete: `content/pages`, `content/global`, `content/authors`, `content/tags`

**Interfaces:**
- Produces: `content/profile.json` with top-level keys `profile`, `about`, `contact`, `socials`, `technologies`, `skills`, `education`, `hobbies`; `lib/eddie.ts` exports `type SiteContent = typeof siteData`, `siteContent: SiteContent`, and the existing names `profile` (with `repo`), `socials`, `technologies`, `skills`, `education`, `hobbies`, `projects`, types `Social`, `Skill`, `Project`. New exports `about` and `contact`.

- [ ] **Step 1: Enable `.ts` imports and add the test script**

In `tsconfig.json` `compilerOptions` add `"allowImportingTsExtensions": true` (allowed because `noEmit` is already true). In `package.json` `scripts` add:

```json
"test": "node --test \"tests/**/*.test.ts\"",
```

- [ ] **Step 2: Write the failing content test**

Create `tests/content.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
  return out;
}

test('profile.json has every section the apps read', () => {
  const site = read('content/profile.json');
  for (const key of ['profile', 'about', 'contact', 'socials', 'technologies', 'skills', 'education', 'hobbies']) assert.ok(key in site, key);
  for (const key of ['name', 'role', 'company', 'location', 'email', 'avatar', 'intro', 'blurb']) assert.ok(key in site.profile, key);
  assert.equal(site.about.bio.length, 2);
  for (const key of ['heading', 'lead', 'availability']) assert.equal(typeof site.contact[key], 'string', key);
});

test('editable content has no em dashes', () => {
  for (const file of ['content/profile.json', 'content/projects.json']) {
    const bad = strings(read(file)).filter((s) => s.includes('—'));
    assert.deepEqual(bad, [], file);
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL, `ENOENT ... content/profile.json`.

- [ ] **Step 4: Create `content/profile.json`**

Values are copied verbatim from the current `lib/eddie.ts`, `about-app.tsx` and `contact-app.tsx`:

```json
{
  "profile": {
    "name": "Eddie Kranz",
    "firstName": "Eddie",
    "role": "Software Engineer",
    "company": { "name": "SSW", "url": "https://www.ssw.com.au/people/eddie-kranz/" },
    "location": "Sydney, Australia",
    "email": "ed@kranz.au",
    "avatar": "/uploads/authors/eddie.jpg",
    "tagline": "Building high-quality, efficient software with a keen eye for detail.",
    "intro": "Hi, I'm Eddie",
    "blurb": "I'm a Software Engineer at SSW with a passion for crafting precise, high-quality solutions. I work across .NET, TypeScript and AI, and I once fixed a bug on this very site from my motorbike."
  },
  "about": {
    "bio": [
      "Eddie is a Software Developer with a keen eye for detail and a passion for creating high-quality, efficient solutions. He holds a Bachelor of Advanced Computing (Software Development) from the University of Sydney, where he wrote his thesis on *“Portal Redirection in Virtual Reality using Impossible Spaces”*.",
      "At SSW he works on projects that use AI to supercharge existing applications, and headless CMS to streamline content management. His focus is on delivering solutions that precisely meet client requirements."
    ]
  },
  "contact": {
    "heading": "Get in touch",
    "lead": "Got a project, a question, or just want to say hi? I'd love to hear from you.",
    "availability": "usually replies within a day"
  },
  "socials": [
    { "id": "github", "label": "GitHub", "handle": "@edkranz", "url": "https://github.com/edkranz", "color": "#1d1f27" },
    { "id": "linkedin", "label": "LinkedIn", "handle": "in/kranz", "url": "https://www.linkedin.com/in/kranz", "color": "#0a66c2" },
    { "id": "youtube", "label": "YouTube", "handle": "@eddiekranz", "url": "https://www.youtube.com/@eddiekranz", "color": "#ff0033" },
    { "id": "email", "label": "Email", "handle": "ed@kranz.au", "url": "mailto:ed@kranz.au", "color": "#f54e00" },
    { "id": "ssw", "label": "SSW Profile", "handle": "ssw.com.au", "url": "https://www.ssw.com.au/people/eddie-kranz/", "color": "#cc4141" }
  ],
  "technologies": [".NET", "C#", "Web APIs", "TypeScript", "JavaScript", "Angular", "Next.js", "React", "Python", "FastAPI", "Azure", "Azure OpenAI", "SQL", "EF Core", "Docker", "GitHub Actions"],
  "skills": [
    { "title": "Frontend Development", "body": "Responsive, accessible UIs in Angular, React and Next.js with a focus on UX design principles.", "accent": "var(--brand-blue)" },
    { "title": "Backend Development", "body": "Robust, secure services across the .NET ecosystem: Web APIs, EF Core, SQL and IdentityServer.", "accent": "var(--brand-red)" },
    { "title": "AI & Machine Learning", "body": "Shipping AI features with Azure OpenAI and the OpenAI API, plus LLM application fundamentals.", "accent": "var(--brand-purple)" },
    { "title": "Cloud & DevOps", "body": "Azure services, Docker containerisation and CI/CD pipelines via GitHub Actions.", "accent": "var(--brand-green)" }
  ],
  "education": [
    "Bachelor of Advanced Computing (Software Development), The University of Sydney",
    "Thesis: “Portal Redirection in Virtual Reality using Impossible Spaces”",
    "SSW FireBootCamp graduate (Scrum · .NET · Angular · Azure · OpenAI)"
  ],
  "hobbies": [
    "Fixing, building & maintaining motorcycles 🏍️",
    "Tinkering with bicycles 🚲",
    "3D printing & woodworking 🪚",
    "Reading & crossword puzzles 🧩",
    "Cycling & bouldering 🧗"
  ]
}
```

Before writing, diff against `lib/eddie.ts` (`git show HEAD:lib/eddie.ts`) and copy any string that differs from the above verbatim from the source file.

- [ ] **Step 5: Re-export from `lib/eddie.ts`**

Replace everything above `export type Project` with:

```ts
/**
 * Single source of truth for Eddie's profile, used across the OS apps.
 * Copy is content: edit `content/profile.json` (or /admin), not this file.
 */

import projectsData from '@/content/projects.json';
import siteData from '@/content/profile.json';

export type SiteContent = typeof siteData;
export const siteContent: SiteContent = siteData;

export const profile = {
  ...siteData.profile,
  /** The GitHub repo this site is built from; the Todo app lists its issues. */
  repo: 'edkranz/blog',
};

export type Social = {
  id: 'github' | 'linkedin' | 'youtube' | 'email' | 'ssw';
  label: string;
  handle: string;
  url: string;
  color: string; // brand color for hover
};

export const socials = siteData.socials as Social[];
export const technologies: string[] = siteData.technologies;

export type Skill = { title: string; body: string; accent: string };
export const skills: Skill[] = siteData.skills;
export const education: string[] = siteData.education;
export const hobbies: string[] = siteData.hobbies;
export const about = siteData.about;
export const contact = siteData.contact;
```

Keep the existing `Project` type and `projects` export below it unchanged.

- [ ] **Step 6: Delete the TinaCMS leftovers**

```bash
git rm -r content/pages content/global content/authors content/tags
```

Leave the `author: content/authors/eddie.md` frontmatter in the post as is: it is now an opaque string that the editor preserves.

- [ ] **Step 7: Run tests, typecheck, lint**

Run: `pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .`
Expected: 2 tests pass; tsc and biome clean.

- [ ] **Step 8: Commit**

```bash
git add -A content tests tsconfig.json package.json lib/eddie.ts
git commit -m "Move profile copy to content/profile.json; add node test runner (#97)"
```

---

### Task 2: Pure content helpers (JSON paths, post files, change validation, overlay)

**Files:**
- Create: `lib/admin/types.ts`, `lib/admin/json-path.ts`, `lib/admin/post-meta.ts`, `lib/admin/post-file.ts`, `lib/admin/changes.ts`, `lib/admin/messages.ts`, `lib/admin/overlay.ts`
- Create: `tests/admin/json-path.test.ts`, `tests/admin/post-file.test.ts`, `tests/admin/changes.test.ts`, `tests/admin/overlay.test.ts`
- Modify: `lib/posts.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `types.ts`: `PROFILE_FILE`, `PROJECTS_FILE`, `JSON_FILES`, `POSTS_DIR`, `type JsonFile`, `type PostDraft`, `type AdminPostMeta`, `type PendingChange`, `type CommitRequest`, `type FileChange`, `type AdminSnapshot`, `type AdminUser`.
  - `json-path.ts`: `getPath(obj, path): unknown`, `setPath<T>(obj: T, path, value): T`, `removeAt<T>(obj: T, path): T`, `appendAt<T>(obj: T, path, value): T`.
  - `post-meta.ts`: `tagLabel(raw): string`, `readingMinutes(body): number`, `slugify(title): string`, `isValidSlug(s): boolean`, `isValidBranch(s): boolean`, `draftBranchName(input): string`, `draftMeta(d: PostDraft, path: string): AdminPostMeta`, `byDateDesc(a, b): number`.
  - `post-file.ts`: `parsePostFile(slug, raw): PostDraft`, `serializePostFile(d: PostDraft): string`.
  - `changes.ts`: `class InvalidChangeError`, `toFileChanges(changes: PendingChange[]): FileChange[]`, `MAX_UPLOAD_BYTES`.
  - `messages.ts`: `defaultMessage(changes: PendingChange[]): string`.
  - `overlay.ts`: `type Remote = { profile: unknown; projects: unknown[]; posts: AdminPostMeta[] }`, `overlay(remote: Remote, pending: Record<string, PendingChange>): Remote`, `pendingKey(change: PendingChange): string`.

- [ ] **Step 1: Write the shared types**

Create `lib/admin/types.ts`:

```ts
// Shared by the admin API routes and the in-OS editor. Keep this file import-free:
// Node's test runner loads it directly.

export const PROFILE_FILE = 'content/profile.json';
export const PROJECTS_FILE = 'content/projects.json';
export type JsonFile = typeof PROFILE_FILE | typeof PROJECTS_FILE;
export const JSON_FILES: readonly string[] = [PROFILE_FILE, PROJECTS_FILE];
export const POSTS_DIR = 'content/posts';

export type PostDraft = {
  slug: string;
  title: string;
  date: string; // ISO
  excerpt: string;
  tags: string[];
  heroImg: string | null;
  hideFromBlogList: boolean;
  body: string; // markdown, trimmed
  /** Frontmatter keys the editor does not manage (e.g. `author`), written back untouched. */
  extra: Record<string, unknown>;
};

export type AdminPostMeta = Omit<PostDraft, 'body' | 'extra'> & { path: string; readingMinutes: number };

export type PendingChange =
  | { kind: 'json'; file: JsonFile; value: unknown }
  | { kind: 'post'; draft: PostDraft; path: string; isNew: boolean }
  | { kind: 'delete-post'; slug: string; path: string }
  | { kind: 'upload'; path: string; base64: string };

export type CommitRequest = { branch: string; head: string; message: string; changes: PendingChange[] };

export type FileChange = { path: string; content: string; encoding: 'utf-8' | 'base64' } | { path: string; delete: true };

export type AdminSnapshot = { branch: string; head: string; profile: unknown; projects: unknown[]; posts: AdminPostMeta[] };

export type AdminUser = { login: string; avatarUrl: string };
```

- [ ] **Step 2: Write failing tests for json-path**

Create `tests/admin/json-path.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendAt, getPath, removeAt, setPath } from '../../lib/admin/json-path.ts';

const doc = { profile: { name: 'Eddie', company: { name: 'SSW' } }, skills: [{ title: 'A' }, { title: 'B' }], hobbies: ['x', 'y', 'z'] };

test('getPath reads nested keys and array indexes', () => {
  assert.equal(getPath(doc, 'profile.company.name'), 'SSW');
  assert.equal(getPath(doc, 'skills.1.title'), 'B');
  assert.equal(getPath(doc, 'nope.deeper'), undefined);
});

test('setPath is immutable and keeps arrays as arrays', () => {
  const next = setPath(doc, 'skills.0.title', 'Z');
  assert.equal(next.skills[0].title, 'Z');
  assert.ok(Array.isArray(next.skills));
  assert.equal(doc.skills[0].title, 'A');
  assert.equal(next.profile, doc.profile); // untouched branches are shared
});

test('removeAt splices an array item', () => {
  assert.deepEqual(removeAt(doc, 'hobbies.1').hobbies, ['x', 'z']);
  assert.deepEqual(doc.hobbies, ['x', 'y', 'z']);
});

test('removeAt and appendAt work on a top-level array', () => {
  assert.deepEqual(removeAt(['a', 'b'], '0'), ['b']);
  assert.deepEqual(appendAt(doc, 'hobbies', 'w').hobbies, ['x', 'y', 'z', 'w']);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `node --test tests/admin/json-path.test.ts`
Expected: FAIL, cannot find module `lib/admin/json-path.ts`.

- [ ] **Step 4: Implement json-path**

Create `lib/admin/json-path.ts`:

```ts
// Immutable reads/writes by dotted path ("skills.0.title"); numeric segments index arrays.

type Key = string | number;
type Tree = Record<string | number, unknown>;

export function parsePath(path: string): Key[] {
  return path === '' ? [] : path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}

export function getPath(obj: unknown, path: string): unknown {
  let cur = obj;
  for (const k of parsePath(path)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Tree)[k];
  }
  return cur;
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = parsePath(path);
  const write = (node: unknown, i: number): unknown => {
    if (i === keys.length) return value;
    const k = keys[i];
    const base: Tree = Array.isArray(node) ? ([...node] as unknown as Tree) : node && typeof node === 'object' ? { ...(node as Tree) } : typeof k === 'number' ? ([] as unknown as Tree) : {};
    base[k] = write(base[k], i + 1);
    return base;
  };
  return write(obj, 0) as T;
}

export function removeAt<T>(obj: T, path: string): T {
  const keys = parsePath(path);
  const idx = keys.pop();
  const parentPath = keys.join('.');
  const parent = parentPath ? getPath(obj, parentPath) : obj;
  if (!Array.isArray(parent) || typeof idx !== 'number') throw new Error(`not an array item: ${path}`);
  const next = parent.filter((_, i) => i !== idx);
  return parentPath ? setPath(obj, parentPath, next) : (next as T);
}

export function appendAt<T>(obj: T, path: string, value: unknown): T {
  const list = getPath(obj, path);
  return setPath(obj, path, [...(Array.isArray(list) ? list : []), value]);
}
```

- [ ] **Step 5: Run json-path tests**

Run: `node --test tests/admin/json-path.test.ts`
Expected: 4 pass.

- [ ] **Step 6: Write failing tests for post-meta and post-file**

Create `tests/admin/post-file.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePostFile, serializePostFile } from '../../lib/admin/post-file.ts';
import { draftBranchName, isValidBranch, isValidSlug, slugify, tagLabel } from '../../lib/admin/post-meta.ts';

const raw = readFileSync(new URL('../../content/posts/introducing-eddie-os.mdx', import.meta.url), 'utf8');

test('parses the real post, normalising Tina tag refs and keeping unknown keys', () => {
  const d = parsePostFile('introducing-eddie-os', raw);
  assert.equal(d.title, 'Introducing Eddie OS');
  assert.equal(d.date, '2026-06-14T00:00:00.000Z');
  assert.deepEqual(d.tags, ['eddie-os', 'nextjs', 'design']);
  assert.equal(d.extra.author, 'content/authors/eddie.md');
  assert.ok(d.body.startsWith('i’ve been meaning'));
  assert.equal((d.body.match(/::sketch\{/g) ?? []).length, 3);
});

test('serialize then parse round-trips every field', () => {
  const d = parsePostFile('introducing-eddie-os', raw);
  const out = serializePostFile(d);
  assert.ok(out.startsWith('---\n'));
  assert.ok(out.endsWith('\n'));
  assert.deepEqual(parsePostFile('introducing-eddie-os', out), d);
});

test('hideFromBlogList is only written when true', () => {
  const d = { ...parsePostFile('x', raw), hideFromBlogList: false };
  assert.ok(!serializePostFile(d).includes('hideFromBlogList'));
  assert.ok(serializePostFile({ ...d, hideFromBlogList: true }).includes('hideFromBlogList: true'));
});

test('slug and branch helpers', () => {
  assert.equal(slugify('  Hello, World! Ünïcode  '), 'hello-world-unicode');
  assert.ok(isValidSlug('hello-world-2'));
  for (const bad of ['', '-a', 'a-', 'A', 'a/b', '../x', 'a..b']) assert.ok(!isValidSlug(bad), bad);
  assert.equal(draftBranchName('My Draft'), 'drafts/my-draft');
  assert.ok(isValidBranch('main') && isValidBranch('drafts/my-draft'));
  for (const bad of ['', '../main', 'a..b', 'a b', '/x', 'x/', 'refs/heads/x;rm']) assert.ok(!isValidBranch(bad), bad);
  assert.equal(tagLabel({ tag: 'content/tags/ai.mdx' }), 'ai');
  assert.equal(tagLabel('ai'), 'ai');
});
```

- [ ] **Step 7: Run to verify failure**

Run: `node --test tests/admin/post-file.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 8: Implement post-meta**

Create `lib/admin/post-meta.ts`:

```ts
import type { AdminPostMeta, PostDraft } from './types.ts';

/** Tina stored tags as { tag: 'content/tags/ai.mdx' }; normalise to "ai". */
export function tagLabel(raw: unknown): string {
  const value = typeof raw === 'string' ? raw : ((raw as { tag?: string })?.tag ?? '');
  const base = value.split('/').pop() ?? value;
  return base.replace(/\.mdx?$/, '');
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

export function isValidBranch(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(s) && !s.includes('..') && !s.endsWith('.lock');
}

export function draftBranchName(input: string): string {
  return `drafts/${slugify(input) || 'draft'}`;
}

export function draftMeta(d: PostDraft, path: string): AdminPostMeta {
  return {
    slug: d.slug,
    title: d.title,
    date: d.date,
    excerpt: d.excerpt,
    tags: d.tags,
    heroImg: d.heroImg,
    hideFromBlogList: d.hideFromBlogList,
    path,
    readingMinutes: readingMinutes(d.body),
  };
}

export function byDateDesc(a: { date: string }, b: { date: string }): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}
```

- [ ] **Step 9: Implement post-file**

Create `lib/admin/post-file.ts`:

```ts
import matter from 'gray-matter';
import { tagLabel } from './post-meta.ts';
import type { PostDraft } from './types.ts';

const MANAGED = new Set(['title', 'date', 'excerpt', 'tags', 'heroImg', 'hideFromBlogList']);

export function parsePostFile(slug: string, raw: string): PostDraft {
  // gray-matter caches by input string and returns a shared object; copy before use.
  const { data, content } = matter(raw);
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!MANAGED.has(k)) extra[k] = v;
  return {
    slug,
    title: typeof data.title === 'string' ? data.title : slug,
    date: data.date ? new Date(data.date).toISOString() : new Date(0).toISOString(),
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    tags: Array.isArray(data.tags) ? data.tags.map(tagLabel).filter(Boolean) : [],
    heroImg: typeof data.heroImg === 'string' && data.heroImg ? data.heroImg : null,
    hideFromBlogList: data.hideFromBlogList === true,
    body: content.trim(),
    extra,
  };
}

export function serializePostFile(d: PostDraft): string {
  const data: Record<string, unknown> = {
    title: d.title,
    date: d.date,
    excerpt: d.excerpt,
    tags: d.tags,
    heroImg: d.heroImg,
    ...(d.hideFromBlogList ? { hideFromBlogList: true } : {}),
    ...d.extra,
  };
  const out = matter.stringify(`\n${d.body.trim()}\n`, data);
  return out.endsWith('\n') ? out : `${out}\n`;
}
```

- [ ] **Step 10: Run post-file tests**

Run: `node --test tests/admin/post-file.test.ts`
Expected: 4 pass. If the round-trip test fails on `date`, js-yaml re-parsed an unquoted timestamp: confirm `parsePostFile` normalises it with `new Date(...).toISOString()` (it does), so the deep-equal must hold; fix the serializer, not the test.

- [ ] **Step 11: Make `lib/posts.ts` reuse the helpers**

In `lib/posts.ts` delete the local `tagLabel` and `readingMinutes` functions and add:

```ts
import { readingMinutes, tagLabel } from './admin/post-meta';
```

- [ ] **Step 12: Write failing tests for changes, messages and overlay**

Create `tests/admin/changes.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidChangeError, toFileChanges } from '../../lib/admin/changes.ts';
import { defaultMessage } from '../../lib/admin/messages.ts';
import type { PendingChange, PostDraft } from '../../lib/admin/types.ts';

const draft: PostDraft = { slug: 'hello', title: 'Hello', date: '2026-10-15T00:00:00.000Z', excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, body: 'Hi', extra: {} };
const png = Buffer.from('fake').toString('base64');

test('converts each change kind to a file change', () => {
  const out = toFileChanges([
    { kind: 'json', file: 'content/profile.json', value: { a: 1 } },
    { kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: true },
    { kind: 'delete-post', slug: 'old', path: 'content/posts/old.md' },
    { kind: 'upload', path: 'public/uploads/posts/hello/shot-1.png', base64: png },
  ]);
  assert.deepEqual(out[0], { path: 'content/profile.json', content: '{\n  "a": 1\n}\n', encoding: 'utf-8' });
  assert.equal(out[1].path, 'content/posts/hello.mdx');
  assert.deepEqual(out[2], { path: 'content/posts/old.md', delete: true });
  assert.deepEqual(out[3], { path: 'public/uploads/posts/hello/shot-1.png', content: png, encoding: 'base64' });
});

test('rejects hostile or malformed changes', () => {
  const bad: PendingChange[][] = [
    [],
    [{ kind: 'json', file: 'package.json' as never, value: {} }],
    [{ kind: 'json', file: 'content/projects.json', value: { not: 'an array' } }],
    [{ kind: 'json', file: 'content/profile.json', value: [] }],
    [{ kind: 'post', draft: { ...draft, slug: '../x' }, path: 'content/posts/../x.mdx', isNew: true }],
    [{ kind: 'post', draft, path: 'content/posts/../../package.json', isNew: false }],
    [{ kind: 'post', draft, path: 'content/posts/other.mdx', isNew: false }],
    [{ kind: 'delete-post', slug: 'x', path: '.github/workflows/x.yml' }],
    [{ kind: 'upload', path: '../.github/workflows/x.yml', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/b.sh', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/../../x.png', base64: png }],
    [{ kind: 'upload', path: 'public/uploads/posts/a/big.png', base64: 'A'.repeat(5_000_000) }],
    [{ kind: 'nope' } as never],
  ];
  for (const changes of bad) assert.throws(() => toFileChanges(changes), InvalidChangeError, JSON.stringify(changes).slice(0, 80));
});

test('default commit messages', () => {
  assert.equal(defaultMessage([{ kind: 'json', file: 'content/profile.json', value: {} }]), 'Edit profile');
  assert.equal(defaultMessage([{ kind: 'json', file: 'content/projects.json', value: [] }]), 'Edit projects');
  assert.equal(defaultMessage([{ kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: true }]), 'Add post: Hello');
  assert.equal(defaultMessage([{ kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: false }]), 'Edit post: Hello');
  assert.equal(defaultMessage([{ kind: 'delete-post', slug: 'old', path: 'content/posts/old.mdx' }]), 'Delete post: old');
  assert.equal(
    defaultMessage([
      { kind: 'post', draft, path: 'content/posts/hello.mdx', isNew: false },
      { kind: 'upload', path: 'public/uploads/posts/hello/a.png', base64: png },
    ]),
    'Edit post: Hello'
  );
  assert.equal(
    defaultMessage([
      { kind: 'json', file: 'content/profile.json', value: {} },
      { kind: 'json', file: 'content/projects.json', value: [] },
    ]),
    'Edit site content'
  );
});
```

Create `tests/admin/overlay.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Remote, overlay, pendingKey } from '../../lib/admin/overlay.ts';
import type { PendingChange, PostDraft } from '../../lib/admin/types.ts';

const meta = (slug: string, date: string) => ({ slug, title: slug, date, excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, path: `content/posts/${slug}.mdx`, readingMinutes: 1 });
const remote: Remote = { profile: { profile: { name: 'A' } }, projects: [{ id: 'p' }], posts: [meta('old', '2026-01-01'), meta('mid', '2026-05-01')] };
const draft: PostDraft = { slug: 'new', title: 'New', date: '2026-09-01', excerpt: '', tags: [], heroImg: null, hideFromBlogList: true, body: 'x', extra: {} };

test('overlay applies json, post and delete changes, newest post first', () => {
  const pending: Record<string, PendingChange> = {};
  for (const c of [
    { kind: 'json', file: 'content/profile.json', value: { profile: { name: 'B' } } },
    { kind: 'post', draft, path: 'content/posts/new.mdx', isNew: true },
    { kind: 'delete-post', slug: 'old', path: 'content/posts/old.mdx' },
  ] as PendingChange[])
    pending[pendingKey(c)] = c;
  const out = overlay(remote, pending);
  assert.deepEqual(out.profile, { profile: { name: 'B' } });
  assert.deepEqual(out.projects, remote.projects);
  assert.deepEqual(
    out.posts.map((p) => p.slug),
    ['new', 'mid']
  );
  assert.equal(out.posts[0].hideFromBlogList, true);
  assert.deepEqual(overlay(remote, {}), remote);
});

test('pendingKey is stable per target', () => {
  assert.equal(pendingKey({ kind: 'json', file: 'content/profile.json', value: 1 }), 'json:content/profile.json');
  assert.equal(pendingKey({ kind: 'post', draft, path: 'x', isNew: true }), 'post:new');
  assert.equal(pendingKey({ kind: 'delete-post', slug: 'new', path: 'x' }), 'post:new');
  assert.equal(pendingKey({ kind: 'upload', path: 'public/a.png', base64: '' }), 'upload:public/a.png');
});
```

Note that a post edit and a delete of the same slug share one key, so deleting a post replaces its pending edit.

- [ ] **Step 13: Run to verify failure**

Run: `node --test tests/admin/changes.test.ts tests/admin/overlay.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 14: Implement changes, messages and overlay**

Create `lib/admin/changes.ts`:

```ts
import { serializePostFile } from './post-file.ts';
import { isValidSlug } from './post-meta.ts';
import { JSON_FILES, POSTS_DIR, PROJECTS_FILE, type FileChange, type PendingChange } from './types.ts';

/** Vercel caps request bodies at 4.5 MB, so keep a single image comfortably under it. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const UPLOAD_RE = /^public\/uploads\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:[-_.][a-z0-9]+)*\.(?:png|jpe?g|gif|webp|avif|svg)$/;

export class InvalidChangeError extends Error {
  name = 'InvalidChangeError';
}

function postPath(slug: string, path: string): string {
  if (!isValidSlug(slug)) throw new InvalidChangeError(`invalid slug: ${slug}`);
  if (path !== `${POSTS_DIR}/${slug}.mdx` && path !== `${POSTS_DIR}/${slug}.md`) throw new InvalidChangeError(`invalid post path: ${path}`);
  return path;
}

export function toFileChanges(changes: PendingChange[]): FileChange[] {
  if (!Array.isArray(changes) || changes.length === 0) throw new InvalidChangeError('nothing to commit');
  return changes.map((c): FileChange => {
    switch (c?.kind) {
      case 'json': {
        if (!JSON_FILES.includes(c.file)) throw new InvalidChangeError(`not editable: ${c.file}`);
        const isList = Array.isArray(c.value);
        if (c.file === PROJECTS_FILE ? !isList : isList || typeof c.value !== 'object' || c.value === null) throw new InvalidChangeError(`invalid value for ${c.file}`);
        return { path: c.file, content: `${JSON.stringify(c.value, null, 2)}\n`, encoding: 'utf-8' };
      }
      case 'post':
        return { path: postPath(c.draft?.slug, c.path), content: serializePostFile(c.draft), encoding: 'utf-8' };
      case 'delete-post':
        return { path: postPath(c.slug, c.path), delete: true };
      case 'upload':
        if (!UPLOAD_RE.test(c.path)) throw new InvalidChangeError(`invalid upload path: ${c.path}`);
        if (Math.floor((c.base64.length * 3) / 4) > MAX_UPLOAD_BYTES) throw new InvalidChangeError('image too large');
        return { path: c.path, content: c.base64, encoding: 'base64' };
      default:
        throw new InvalidChangeError('unknown change');
    }
  });
}
```

Create `lib/admin/messages.ts`:

```ts
import { PROFILE_FILE, type PendingChange } from './types.ts';

export function defaultMessage(changes: PendingChange[]): string {
  const posts = changes.filter((c) => c.kind === 'post');
  if (posts.length === 1 && changes.every((c) => c.kind === 'post' || c.kind === 'upload')) {
    const { draft, isNew } = posts[0];
    return `${isNew ? 'Add' : 'Edit'} post: ${draft.title || draft.slug}`;
  }
  if (changes.length === 1) {
    const c = changes[0];
    if (c.kind === 'json') return c.file === PROFILE_FILE ? 'Edit profile' : 'Edit projects';
    if (c.kind === 'delete-post') return `Delete post: ${c.slug}`;
    if (c.kind === 'upload') return 'Add image';
  }
  return 'Edit site content';
}
```

Create `lib/admin/overlay.ts`:

```ts
import { byDateDesc, draftMeta } from './post-meta.ts';
import { PROFILE_FILE, type AdminPostMeta, type PendingChange } from './types.ts';

export type Remote = { profile: unknown; projects: unknown[]; posts: AdminPostMeta[] };

export function pendingKey(c: PendingChange): string {
  if (c.kind === 'json') return `json:${c.file}`;
  if (c.kind === 'post') return `post:${c.draft.slug}`;
  if (c.kind === 'delete-post') return `post:${c.slug}`;
  return `upload:${c.path}`;
}

/** The remote snapshot as it will look once the pending changes are committed. */
export function overlay(remote: Remote, pending: Record<string, PendingChange>): Remote {
  const changes = Object.values(pending);
  if (changes.length === 0) return remote;
  let { profile, projects, posts } = remote;
  for (const c of changes) {
    if (c.kind === 'json') {
      if (c.file === PROFILE_FILE) profile = c.value;
      else projects = c.value as unknown[];
    } else if (c.kind === 'post') {
      posts = [...posts.filter((p) => p.slug !== c.draft.slug), draftMeta(c.draft, c.path)];
    } else if (c.kind === 'delete-post') {
      posts = posts.filter((p) => p.slug !== c.slug);
    }
  }
  return { profile, projects, posts: [...posts].sort(byDateDesc) };
}
```

- [ ] **Step 15: Run all tests, typecheck, lint**

Run: `pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .`
Expected: all pass, clean.

- [ ] **Step 16: Commit**

```bash
git add lib/admin lib/posts.ts tests/admin
git commit -m "Admin: content helpers for JSON paths, post files and change validation (#97)"
```

---

### Task 3: Session crypto, config and auth routes

**Files:**
- Create: `lib/admin/session.ts`, `lib/admin/config.ts`, `tests/admin/session.test.ts`
- Create: `lib/admin/server.ts` (auth half; backend half added in Task 5)
- Create: `app/api/admin/login/route.ts`, `app/api/admin/callback/route.ts`, `app/api/admin/session/route.ts`, `app/api/admin/logout/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `AdminUser` from `lib/admin/types.ts`.
- Produces:
  - `session.ts`: `type Session = { token: string; login: string; avatarUrl: string; exp: number }`, `SESSION_COOKIE = 'eos_admin'`, `SESSION_TTL_S`, `seal(s, secret): Promise<string>`, `unseal(value, secret, now?): Promise<Session | null>`.
  - `config.ts`: `type AdminConfig`, `adminConfig(env?): AdminConfig`, `isAllowed(login, cfg): boolean`.
  - `server.ts`: `getSession(): Promise<Session | null>`, `setSessionCookie(s: Session, req: Request): Promise<void>`, `clearSessionCookie(): Promise<void>`, `isSameOrigin(req: Request): boolean`.
  - Routes: `GET /api/admin/login`, `GET /api/admin/callback`, `GET /api/admin/session` → `AdminUser` | 401, `POST /api/admin/logout` → 204.

- [ ] **Step 1: Write failing tests**

Create `tests/admin/session.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminConfig, isAllowed } from '../../lib/admin/config.ts';
import { type Session, seal, unseal } from '../../lib/admin/session.ts';

const secret = 'x'.repeat(40);
const s: Session = { token: 'gho_abc', login: 'edkranz', avatarUrl: 'https://a/b.png', exp: Math.floor(Date.now() / 1000) + 60 };

test('seal/unseal round-trips', async () => {
  assert.deepEqual(await unseal(await seal(s, secret), secret), s);
});

test('unseal rejects tampering, wrong secret, expiry and junk', async () => {
  const v = await seal(s, secret);
  const [iv, ct] = v.split('.');
  // Flip a middle character: the last base64 char can carry only padding bits.
  const i = Math.floor(ct.length / 2);
  const flipped = `${iv}.${ct.slice(0, i)}${ct[i] === 'A' ? 'B' : 'A'}${ct.slice(i + 1)}`;
  assert.equal(await unseal(flipped, secret), null);
  assert.equal(await unseal(v, 'y'.repeat(40)), null);
  assert.equal(await unseal(await seal({ ...s, exp: 1 }, secret), secret), null);
  for (const junk of [undefined, '', 'abc', 'a.b.c', '..']) assert.equal(await unseal(junk, secret), null);
});

test('seal never contains the token in plain text', async () => {
  assert.ok(!(await seal(s, secret)).includes('gho_abc'));
});

test('fake mode is impossible in production', () => {
  assert.equal(adminConfig({ NODE_ENV: 'production', ADMIN_FAKE_GITHUB: '1' }).fake, false);
  assert.equal(adminConfig({ NODE_ENV: 'development', ADMIN_FAKE_GITHUB: '1' }).fake, true);
  assert.equal(adminConfig({ NODE_ENV: 'development' }).fake, false);
  assert.equal(adminConfig({ NODE_ENV: 'production' }).sessionSecret, '');
});

test('allowlist defaults to edkranz and ignores case', () => {
  const cfg = adminConfig({});
  assert.ok(isAllowed('EdKranz', cfg));
  assert.ok(!isAllowed('someone-else', cfg));
  const multi = adminConfig({ ADMIN_GITHUB_USERS: ' a , B ' });
  assert.ok(isAllowed('b', multi) && isAllowed('A', multi) && !isAllowed('edkranz', multi));
  assert.equal(cfg.repo, 'edkranz/blog');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/admin/session.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement session and config**

Create `lib/admin/session.ts`:

```ts
// The admin session is the GitHub token sealed with AES-GCM into an httpOnly cookie,
// so the token never reaches client JS and needs no server-side store.

export type Session = { token: string; login: string; avatarUrl: string; exp: number };

export const SESSION_COOKIE = 'eos_admin';
export const SESSION_TTL_S = 7 * 24 * 60 * 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

async function key(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(s: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), enc.encode(JSON.stringify(s)));
  return `${Buffer.from(iv).toString('base64url')}.${Buffer.from(ct).toString('base64url')}`;
}

export async function unseal(value: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!value || !secret) return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(parts[0], 'base64url') }, await key(secret), Buffer.from(parts[1], 'base64url'));
    const s = JSON.parse(dec.decode(pt)) as Session;
    if (typeof s.token !== 'string' || typeof s.login !== 'string' || typeof s.exp !== 'number') return null;
    return s.exp * 1000 > now ? s : null;
  } catch {
    return null;
  }
}
```

Create `lib/admin/config.ts`:

```ts
export type AdminConfig = {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  allowedUsers: string[];
  /** In-memory GitHub stand-in for local E2E. Never on in production. */
  fake: boolean;
  repo: string;
};

const FAKE_SECRET = 'eddie-os-fake-admin-session-secret-dev-only';

export function adminConfig(env: Record<string, string | undefined> = process.env): AdminConfig {
  const fake = env.ADMIN_FAKE_GITHUB === '1' && env.NODE_ENV !== 'production';
  return {
    clientId: env.GITHUB_CLIENT_ID ?? '',
    clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
    sessionSecret: env.ADMIN_SESSION_SECRET ?? (fake ? FAKE_SECRET : ''),
    allowedUsers: (env.ADMIN_GITHUB_USERS ?? 'edkranz')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    fake,
    repo: env.ADMIN_REPO ?? 'edkranz/blog',
  };
}

export function isAllowed(login: string, cfg: AdminConfig): boolean {
  return cfg.allowedUsers.includes(login.toLowerCase());
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/admin/session.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Server glue (auth half)**

Create `lib/admin/server.ts`:

```ts
import { cookies } from 'next/headers';
import { adminConfig } from './config';
import { SESSION_COOKIE, SESSION_TTL_S, type Session, seal, unseal } from './session';

export async function getSession(): Promise<Session | null> {
  return unseal((await cookies()).get(SESSION_COOKIE)?.value, adminConfig().sessionSecret);
}

export async function setSessionCookie(s: Session, req: Request): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await seal(s, adminConfig().sessionSecret), {
    httpOnly: true,
    secure: new URL(req.url).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Mutations must come from this site: compare the Origin header with the host serving the request. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function newSession(token: string, login: string, avatarUrl: string): Session {
  return { token, login, avatarUrl, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S };
}
```

- [ ] **Step 6: Auth routes**

Create `app/api/admin/login/route.ts`:

```ts
import { adminConfig } from '@/lib/admin/config';
import { newSession, setSessionCookie } from '@/lib/admin/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cfg = adminConfig();
  const url = new URL(req.url);
  if (cfg.fake) {
    await setSessionCookie(newSession('fake', cfg.allowedUsers[0] ?? 'edkranz', '/uploads/authors/eddie.jpg'), req);
    return NextResponse.redirect(new URL('/admin', url));
  }
  if (!cfg.clientId || !cfg.sessionSecret) return new Response('Admin is not configured', { status: 500 });
  const state = crypto.randomUUID();
  (await cookies()).set('eos_oauth_state', state, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/api/admin', maxAge: 600 });
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.searchParams.set('client_id', cfg.clientId);
  gh.searchParams.set('redirect_uri', new URL('/api/admin/callback', url).toString());
  gh.searchParams.set('scope', 'public_repo');
  gh.searchParams.set('state', state);
  gh.searchParams.set('allow_signup', 'false');
  return NextResponse.redirect(gh);
}
```

Create `app/api/admin/callback/route.ts`:

```ts
import { adminConfig, isAllowed } from '@/lib/admin/config';
import { newSession, setSessionCookie } from '@/lib/admin/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cfg = adminConfig();
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get('eos_oauth_state')?.value;
  jar.set('eos_oauth_state', '', { path: '/api/admin', maxAge: 0 });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== expected) return new Response('Invalid OAuth state', { status: 400 });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code, redirect_uri: new URL('/api/admin/callback', url).toString() }),
    cache: 'no-store',
  });
  const { access_token: token } = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!token) return new Response('GitHub sign-in failed', { status: 502 });

  const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  const user = (await userRes.json().catch(() => ({}))) as { login?: string; avatar_url?: string };
  if (!user.login || !isAllowed(user.login, cfg)) return NextResponse.redirect(new URL('/admin?denied=1', url));

  await setSessionCookie(newSession(token, user.login, user.avatar_url ?? ''), req);
  return NextResponse.redirect(new URL('/admin', url));
}
```

Create `app/api/admin/session/route.ts`:

```ts
import { getSession } from '@/lib/admin/server';
import type { AdminUser } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ login: s.login, avatarUrl: s.avatarUrl } satisfies AdminUser);
}
```

Create `app/api/admin/logout/route.ts`:

```ts
import { clearSessionCookie, isSameOrigin } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
  await clearSessionCookie();
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 7: Replace `.env.example`**

```bash
# GitHub OAuth app for /admin (callback: https://kranz.au/api/admin/callback).
# A second OAuth app with callback http://localhost:3001/api/admin/callback is needed for local sign-in.
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# 32+ random characters, e.g. `openssl rand -base64 48`
ADMIN_SESSION_SECRET=
# Comma-separated GitHub logins allowed to sign in (default: edkranz)
ADMIN_GITHUB_USERS=edkranz
# Local only: an in-memory GitHub stand-in for E2E. Ignored in production builds.
# ADMIN_FAKE_GITHUB=1
```

- [ ] **Step 8: Smoke-test the routes**

Start: `ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011` (run in the background).
Run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3011/api/admin/session
curl -s -c /tmp/eos.jar -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3011/api/admin/login
curl -s -b /tmp/eos.jar http://localhost:3011/api/admin/session
curl -s -b /tmp/eos.jar -X POST -o /dev/null -w '%{http_code}\n' http://localhost:3011/api/admin/logout
curl -s -b /tmp/eos.jar -X POST -H 'Origin: http://localhost:3011' -o /dev/null -w '%{http_code}\n' http://localhost:3011/api/admin/logout
```

Expected: `401`; `307 http://localhost:3011/admin`; `{"login":"edkranz","avatarUrl":"/uploads/authors/eddie.jpg"}`; `403`; `204`. Stop the server.

- [ ] **Step 9: Tests, typecheck, lint, commit**

Run: `pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .`

```bash
git add lib/admin app/api/admin tests/admin .env.example
git commit -m "Admin: GitHub sign-in with a sealed session cookie (#97)"
```

---

### Task 4: Content backends (fake and GitHub)

**Files:**
- Create: `lib/admin/backend.ts`, `lib/admin/fake-backend.ts`, `lib/admin/github-backend.ts`
- Create: `tests/admin/fake-backend.test.ts`, `tests/admin/github-backend.test.ts`

**Interfaces:**
- Consumes: `FileChange` from `types.ts`.
- Produces:
  - `backend.ts`: `interface ContentBackend { listBranches(): Promise<string[]>; head(branch: string): Promise<string>; readFile(branch: string, path: string): Promise<string | null>; listDir(branch: string, dir: string): Promise<string[]>; createBranch(name: string, from: string): Promise<void>; commit(branch: string, expectedHead: string, message: string, changes: FileChange[]): Promise<{ sha: string }>; publish(branch: string, title: string): Promise<void>; previewUrl(branch: string): Promise<string | null> }`, `class BranchMovedError`, `class MergeConflictError`, `class GitHubError { status: number }`.
  - `fake-backend.ts`: `createFakeBackend(seed: Record<string, string>): ContentBackend & { files(branch: string): Record<string, string> }`.
  - `github-backend.ts`: `createGithubBackend(token: string, repo: string, fetchImpl?: typeof fetch): ContentBackend`.

- [ ] **Step 1: Write the interface**

Create `lib/admin/backend.ts`:

```ts
import type { FileChange } from './types.ts';

/** Everything the admin needs from git. Implemented by GitHub (prod) and an in-memory fake (local E2E). */
export interface ContentBackend {
  listBranches(): Promise<string[]>;
  head(branch: string): Promise<string>;
  /** UTF-8 contents, or null when the file does not exist on that branch. */
  readFile(branch: string, path: string): Promise<string | null>;
  /** File names (not paths) directly inside `dir`. */
  listDir(branch: string, dir: string): Promise<string[]>;
  createBranch(name: string, from: string): Promise<void>;
  /** One commit with every change; throws BranchMovedError unless the branch is still at `expectedHead`. */
  commit(branch: string, expectedHead: string, message: string, changes: FileChange[]): Promise<{ sha: string }>;
  /** Squash-merge `branch` into main via a PR, then delete the branch. */
  publish(branch: string, title: string): Promise<void>;
  previewUrl(branch: string): Promise<string | null>;
}

export class BranchMovedError extends Error {
  name = 'BranchMovedError';
  constructor() {
    super('branch moved');
  }
}

export class MergeConflictError extends Error {
  name = 'MergeConflictError';
  constructor() {
    super('merge conflict');
  }
}

export class GitHubError extends Error {
  name = 'GitHubError';
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
```

- [ ] **Step 2: Write failing fake-backend tests**

Create `tests/admin/fake-backend.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BranchMovedError } from '../../lib/admin/backend.ts';
import { createFakeBackend } from '../../lib/admin/fake-backend.ts';

const seed = { 'content/profile.json': '{}', 'content/posts/a.mdx': 'A', 'content/posts/b.mdx': 'B', 'public/x.png': 'p' };

test('reads, lists and commits', async () => {
  const be = createFakeBackend(seed);
  assert.deepEqual((await be.listDir('main', 'content/posts')).sort(), ['a.mdx', 'b.mdx']);
  assert.equal(await be.readFile('main', 'missing'), null);
  const h = await be.head('main');
  const { sha } = await be.commit('main', h, 'm', [
    { path: 'content/posts/a.mdx', content: 'A2', encoding: 'utf-8' },
    { path: 'content/posts/b.mdx', delete: true },
  ]);
  assert.notEqual(sha, h);
  assert.equal(await be.head('main'), sha);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A2');
  assert.equal(await be.readFile('main', 'content/posts/b.mdx'), null);
});

test('stale head throws BranchMovedError and writes nothing', async () => {
  const be = createFakeBackend(seed);
  await assert.rejects(be.commit('main', 'stale', 'm', [{ path: 'content/posts/a.mdx', content: 'X', encoding: 'utf-8' }]), BranchMovedError);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A');
});

test('branch, commit, publish', async () => {
  const be = createFakeBackend(seed);
  await be.createBranch('drafts/x', 'main');
  await assert.rejects(be.createBranch('drafts/x', 'main'));
  await be.commit('drafts/x', await be.head('drafts/x'), 'm', [{ path: 'content/posts/a.mdx', content: 'Draft', encoding: 'utf-8' }]);
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'A');
  assert.match((await be.previewUrl('drafts/x')) ?? '', /^https:\/\//);
  await be.publish('drafts/x', 'Publish');
  assert.equal(await be.readFile('main', 'content/posts/a.mdx'), 'Draft');
  assert.deepEqual(await be.listBranches(), ['main']);
  await assert.rejects(be.publish('main', 'x'));
});
```

- [ ] **Step 3: Run to verify failure**

Run: `node --test tests/admin/fake-backend.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 4: Implement the fake**

Create `lib/admin/fake-backend.ts`:

```ts
import { BranchMovedError, type ContentBackend } from './backend.ts';
import type { FileChange } from './types.ts';

type Branch = { head: string; files: Map<string, string>; touched: Set<string> };

let counter = 0;
const nextSha = () => `fake${(++counter).toString(16).padStart(8, '0')}`;

export function createFakeBackend(seed: Record<string, string>): ContentBackend & { files(branch: string): Record<string, string> } {
  const branches = new Map<string, Branch>([['main', { head: nextSha(), files: new Map(Object.entries(seed)), touched: new Set() }]]);
  const get = (name: string): Branch => {
    const b = branches.get(name);
    if (!b) throw new Error(`no such branch: ${name}`);
    return b;
  };

  return {
    async listBranches() {
      return [...branches.keys()];
    },
    async head(name) {
      return get(name).head;
    },
    async readFile(name, path) {
      return get(name).files.get(path) ?? null;
    },
    async listDir(name, dir) {
      const prefix = `${dir}/`;
      return [...get(name).files.keys()].filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')).map((p) => p.slice(prefix.length));
    },
    async createBranch(name, from) {
      if (branches.has(name)) throw new Error(`branch exists: ${name}`);
      const src = get(from);
      branches.set(name, { head: src.head, files: new Map(src.files), touched: new Set() });
    },
    async commit(name, expectedHead, _message, changes: FileChange[]) {
      const b = get(name);
      if (b.head !== expectedHead) throw new BranchMovedError();
      for (const c of changes) {
        if ('delete' in c) b.files.delete(c.path);
        else b.files.set(c.path, c.content);
        b.touched.add(c.path);
      }
      b.head = nextSha();
      return { sha: b.head };
    },
    async publish(name) {
      if (name === 'main') throw new Error('cannot publish main');
      const b = get(name);
      const main = get('main');
      for (const p of b.touched) {
        const v = b.files.get(p);
        if (v === undefined) main.files.delete(p);
        else main.files.set(p, v);
      }
      main.head = nextSha();
      branches.delete(name);
    },
    async previewUrl(name) {
      get(name);
      return name === 'main' ? null : `https://blog-git-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-edkranz.vercel.app`;
    },
    files(name) {
      return Object.fromEntries(get(name).files);
    },
  };
}
```

- [ ] **Step 5: Run fake tests**

Run: `node --test tests/admin/fake-backend.test.ts`
Expected: 3 pass.

- [ ] **Step 6: Write failing GitHub backend tests (fake fetch)**

Create `tests/admin/github-backend.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BranchMovedError, MergeConflictError } from '../../lib/admin/backend.ts';
import { createGithubBackend } from '../../lib/admin/github-backend.ts';

type Call = { method: string; path: string; body?: unknown };
type Route = (call: Call) => Response | undefined;

function fakeFetch(routes: Route[]) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { method: init?.method ?? 'GET', path: url.pathname.replace('/repos/edkranz/blog', '') + url.search, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    for (const r of routes) {
      const res = r(call);
      if (res) return res;
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { impl, calls };
}

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
const on = (method: string, path: string | RegExp, res: () => Response): Route => (c) => (c.method === method && (typeof path === 'string' ? c.path === path : path.test(c.path)) ? res() : undefined);

const headRoute = (sha: string) => on('GET', '/git/ref/heads/drafts/x', () => json({ object: { sha } }));

test('commit builds blobs, a tree on the base tree, a commit, then a non-forced ref update', async () => {
  const { impl, calls } = fakeFetch([
    headRoute('h1'),
    on('GET', '/git/commits/h1', () => json({ tree: { sha: 't1' } })),
    on('POST', '/git/blobs', () => json({ sha: 'b1' })),
    on('POST', '/git/trees', () => json({ sha: 't2' })),
    on('POST', '/git/commits', () => json({ sha: 'c2' })),
    on('PATCH', '/git/refs/heads/drafts/x', () => json({})),
  ]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  const res = await be.commit('drafts/x', 'h1', 'msg', [
    { path: 'content/profile.json', content: '{}', encoding: 'utf-8' },
    { path: 'content/posts/old.mdx', delete: true },
  ]);
  assert.equal(res.sha, 'c2');
  const tree = calls.find((c) => c.path === '/git/trees')?.body as { base_tree: string; tree: { path: string; sha: string | null }[] };
  assert.equal(tree.base_tree, 't1');
  assert.deepEqual(
    tree.tree.map((t) => [t.path, t.sha]),
    [
      ['content/profile.json', 'b1'],
      ['content/posts/old.mdx', null],
    ]
  );
  assert.deepEqual(calls.find((c) => c.path === '/git/commits' && c.method === 'POST')?.body, { message: 'msg', tree: 't2', parents: ['h1'] });
  assert.deepEqual(calls.find((c) => c.method === 'PATCH')?.body, { sha: 'c2', force: false });
});

test('commit on a moved branch throws before writing anything', async () => {
  const { impl, calls } = fakeFetch([headRoute('h2')]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  await assert.rejects(be.commit('drafts/x', 'h1', 'm', [{ path: 'a', content: 'b', encoding: 'utf-8' }]), BranchMovedError);
  assert.ok(calls.every((c) => c.method === 'GET'));
});

test('a 422 on the ref update (race) is BranchMovedError', async () => {
  const { impl } = fakeFetch([
    headRoute('h1'),
    on('GET', '/git/commits/h1', () => json({ tree: { sha: 't1' } })),
    on('POST', '/git/blobs', () => json({ sha: 'b1' })),
    on('POST', '/git/trees', () => json({ sha: 't2' })),
    on('POST', '/git/commits', () => json({ sha: 'c2' })),
    on('PATCH', '/git/refs/heads/drafts/x', () => json({ message: 'Update is not a fast forward' }, 422)),
  ]);
  await assert.rejects(createGithubBackend('tok', 'edkranz/blog', impl).commit('drafts/x', 'h1', 'm', [{ path: 'a', content: 'b', encoding: 'utf-8' }]), BranchMovedError);
});

test('readFile returns null on 404 and raw text otherwise', async () => {
  const { impl, calls } = fakeFetch([on('GET', '/contents/content/profile.json?ref=main', () => new Response('{"a":1}'))]);
  const be = createGithubBackend('tok', 'edkranz/blog', impl);
  assert.equal(await be.readFile('main', 'content/profile.json'), '{"a":1}');
  assert.equal(await be.readFile('main', 'content/nope.json'), null);
  assert.ok(calls.length === 2);
});

test('publish opens a PR when none exists, squash-merges, deletes the branch', async () => {
  const { impl, calls } = fakeFetch([
    on('GET', /^\/pulls\?/, () => json([])),
    on('POST', '/pulls', () => json({ number: 7 })),
    on('PUT', '/pulls/7/merge', () => json({ merged: true })),
    on('DELETE', '/git/refs/heads/drafts/x', () => new Response(null, { status: 204 })),
  ]);
  await createGithubBackend('tok', 'edkranz/blog', impl).publish('drafts/x', 'Publish drafts/x');
  assert.deepEqual(calls.find((c) => c.method === 'POST')?.body, { title: 'Publish drafts/x', head: 'drafts/x', base: 'main', body: '' });
  assert.deepEqual(calls.find((c) => c.method === 'PUT')?.body, { merge_method: 'squash', commit_title: 'Publish drafts/x' });
  assert.ok(calls.some((c) => c.method === 'DELETE'));
});

test('publish maps a 405 merge refusal to MergeConflictError and keeps the branch', async () => {
  const { impl, calls } = fakeFetch([on('GET', /^\/pulls\?/, () => json([{ number: 3 }])), on('PUT', '/pulls/3/merge', () => json({}, 405))]);
  await assert.rejects(createGithubBackend('tok', 'edkranz/blog', impl).publish('drafts/x', 't'), MergeConflictError);
  assert.ok(!calls.some((c) => c.method === 'DELETE'));
});

test('previewUrl returns the first successful deployment for the branch head', async () => {
  const { impl } = fakeFetch([
    headRoute('h1'),
    on('GET', '/deployments?sha=h1&per_page=5', () => json([{ id: 1 }, { id: 2 }])),
    on('GET', '/deployments/1/statuses?per_page=1', () => json([{ state: 'pending' }])),
    on('GET', '/deployments/2/statuses?per_page=1', () => json([{ state: 'success', environment_url: 'https://p.vercel.app' }])),
  ]);
  assert.equal(await createGithubBackend('tok', 'edkranz/blog', impl).previewUrl('drafts/x'), 'https://p.vercel.app');
});
```

- [ ] **Step 7: Run to verify failure**

Run: `node --test tests/admin/github-backend.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 8: Implement the GitHub backend**

Create `lib/admin/github-backend.ts`:

```ts
import { BranchMovedError, type ContentBackend, GitHubError, MergeConflictError } from './backend.ts';
import type { FileChange } from './types.ts';

const encPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export function createGithubBackend(token: string, repo: string, fetchImpl: typeof fetch = fetch): ContentBackend {
  const call = (path: string, init: { method?: string; body?: unknown; accept?: string } = {}) =>
    fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: init.accept ?? 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });

  const json = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
    const res = await call(path, init);
    if (!res.ok) throw new GitHubError(res.status, `${init.method ?? 'GET'} ${path}: ${res.status}`);
    return (await res.json()) as T;
  };

  const head = async (branch: string) => (await json<{ object: { sha: string } }>(`/git/ref/heads/${encPath(branch)}`)).object.sha;

  const readFile = async (branch: string, path: string) => {
    const res = await call(`/contents/${encPath(path)}?ref=${encodeURIComponent(branch)}`, { accept: 'application/vnd.github.raw+json' });
    if (res.status === 404) return null;
    if (!res.ok) throw new GitHubError(res.status, `read ${path}: ${res.status}`);
    return res.text();
  };

  const listDir = async (branch: string, dir: string) => {
    const res = await call(`/contents/${encPath(dir)}?ref=${encodeURIComponent(branch)}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new GitHubError(res.status, `list ${dir}: ${res.status}`);
    return ((await res.json()) as { name: string; type: string }[]).filter((e) => e.type === 'file').map((e) => e.name);
  };

  const commit = async (branch: string, expectedHead: string, message: string, changes: FileChange[]) => {
    if ((await head(branch)) !== expectedHead) throw new BranchMovedError();
    const base = await json<{ tree: { sha: string } }>(`/git/commits/${expectedHead}`);
    const tree = [];
    for (const c of changes) {
      if ('delete' in c) {
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await json<{ sha: string }>('/git/blobs', { method: 'POST', body: { content: c.content, encoding: c.encoding } });
      tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await json<{ sha: string }>('/git/trees', { method: 'POST', body: { base_tree: base.tree.sha, tree } });
    const created = await json<{ sha: string }>('/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [expectedHead] } });
    const res = await call(`/git/refs/heads/${encPath(branch)}`, { method: 'PATCH', body: { sha: created.sha, force: false } });
    if (res.status === 422) throw new BranchMovedError();
    if (!res.ok) throw new GitHubError(res.status, `update ${branch}: ${res.status}`);
    return { sha: created.sha };
  };

  const publish = async (branch: string, title: string) => {
    if (branch === 'main') throw new Error('cannot publish main');
    const owner = repo.split('/')[0];
    const open = await json<{ number: number }[]>(`/pulls?state=open&base=main&head=${encodeURIComponent(`${owner}:${branch}`)}`);
    const pr = open[0] ?? (await json<{ number: number }>('/pulls', { method: 'POST', body: { title, head: branch, base: 'main', body: '' } }));
    const merged = await call(`/pulls/${pr.number}/merge`, { method: 'PUT', body: { merge_method: 'squash', commit_title: title } });
    if (merged.status === 405 || merged.status === 409) throw new MergeConflictError();
    if (!merged.ok) throw new GitHubError(merged.status, `merge: ${merged.status}`);
    await call(`/git/refs/heads/${encPath(branch)}`, { method: 'DELETE' });
  };

  const previewUrl = async (branch: string) => {
    const sha = await head(branch);
    const deployments = await json<{ id: number }[]>(`/deployments?sha=${sha}&per_page=5`);
    for (const d of deployments) {
      const [status] = await json<{ state: string; environment_url?: string }[]>(`/deployments/${d.id}/statuses?per_page=1`);
      if (status?.state === 'success' && status.environment_url) return status.environment_url;
    }
    return null;
  };

  return {
    listBranches: async () => (await json<{ name: string }[]>('/branches?per_page=100')).map((b) => b.name),
    head,
    readFile,
    listDir,
    createBranch: async (name, from) => {
      await json('/git/refs', { method: 'POST', body: { ref: `refs/heads/${name}`, sha: await head(from) } });
    },
    commit,
    publish,
    previewUrl,
  };
}
```

Blobs are created sequentially (not `Promise.all`) to stay inside GitHub's secondary rate limits and keep test call order deterministic.

- [ ] **Step 9: Run tests, typecheck, lint**

Run: `pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add lib/admin tests/admin
git commit -m "Admin: GitHub and in-memory content backends (#97)"
```

---

### Task 5: Admin content API

**Files:**
- Modify: `lib/admin/server.ts`
- Create: `app/api/admin/content/route.ts`, `app/api/admin/post/route.ts`, `app/api/admin/branches/route.ts`, `app/api/admin/commit/route.ts`, `app/api/admin/publish/route.ts`, `app/api/admin/preview/route.ts`

**Interfaces:**
- Consumes: Task 2 (`toFileChanges`, `parsePostFile`, `draftMeta`, `byDateDesc`, `isValidBranch`, `isValidSlug`, `draftBranchName`, `defaultMessage`, types), Task 3 (`getSession`, `isSameOrigin`, `adminConfig`), Task 4 (backends, errors).
- Produces (HTTP, all 401 without a session, mutations 403 without same origin):
  - `GET /api/admin/content?branch=` → `AdminSnapshot`
  - `GET /api/admin/post?branch=&slug=` → `{ draft: PostDraft; path: string }` | 404
  - `GET /api/admin/branches` → `{ branches: string[] }`; `POST {name, from}` → `{ branch: string }`
  - `POST /api/admin/commit` body `CommitRequest` → `{ head: string }` | 400 | 409 `{error:'branch moved'}`
  - `POST /api/admin/publish` body `{ branch }` → `{ ok: true }` | 409 `{error:'merge conflict'}`
  - `GET /api/admin/preview?branch=` → `{ url: string | null }`
  - `server.ts`: `adminRoute(handler)`, `branchParam(url): string`.

- [ ] **Step 1: Add the backend half of `lib/admin/server.ts`**

Append to `lib/admin/server.ts` (and add the imports at the top):

```ts
import fs from 'node:fs';
import path from 'node:path';
import { BranchMovedError, type ContentBackend, GitHubError, MergeConflictError } from './backend';
import { InvalidChangeError } from './changes';
import { createFakeBackend } from './fake-backend';
import { createGithubBackend } from './github-backend';
import { isValidBranch } from './post-meta';
import { POSTS_DIR, PROFILE_FILE, PROJECTS_FILE } from './types';

function seedFromDisk(): Record<string, string> {
  const root = process.cwd();
  const files: Record<string, string> = {};
  for (const f of [PROFILE_FILE, PROJECTS_FILE]) files[f] = fs.readFileSync(path.join(root, f), 'utf8');
  for (const f of fs.readdirSync(path.join(root, POSTS_DIR))) files[`${POSTS_DIR}/${f}`] = fs.readFileSync(path.join(root, POSTS_DIR, f), 'utf8');
  return files;
}

// One fake per dev-server process, so edits survive between requests (and HMR).
const g = globalThis as { __eosFakeBackend?: ContentBackend };

function backendFor(session: Session): ContentBackend {
  const cfg = adminConfig();
  if (cfg.fake) {
    g.__eosFakeBackend ??= createFakeBackend(seedFromDisk());
    return g.__eosFakeBackend;
  }
  return createGithubBackend(session.token, cfg.repo);
}

export class BadRequestError extends Error {}

export function branchParam(url: URL, name = 'branch'): string {
  const b = url.searchParams.get(name) ?? 'main';
  if (!isValidBranch(b)) throw new BadRequestError(`invalid branch: ${b}`);
  return b;
}

type Ctx = { req: Request; url: URL; session: Session; backend: ContentBackend };

export function adminRoute(handler: (ctx: Ctx) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'GET' && !isSameOrigin(req)) return Response.json({ error: 'forbidden' }, { status: 403 });
    const session = await getSession();
    if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 });
    try {
      return await handler({ req, url: new URL(req.url), session, backend: backendFor(session) });
    } catch (e) {
      if (e instanceof BranchMovedError || e instanceof MergeConflictError) return Response.json({ error: e.message }, { status: 409 });
      if (e instanceof InvalidChangeError || e instanceof BadRequestError) return Response.json({ error: e.message }, { status: 400 });
      if (e instanceof GitHubError && e.status === 401) return Response.json({ error: 'unauthorized' }, { status: 401 });
      console.error('[admin]', e);
      return Response.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 502 });
    }
  };
}
```

- [ ] **Step 2: Read routes**

Create `app/api/admin/content/route.ts`:

```ts
import { parsePostFile } from '@/lib/admin/post-file';
import { byDateDesc, draftMeta } from '@/lib/admin/post-meta';
import { adminRoute, branchParam } from '@/lib/admin/server';
import { type AdminSnapshot, POSTS_DIR, PROFILE_FILE, PROJECTS_FILE } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => {
  const branch = branchParam(url);
  const head = await backend.head(branch);
  const [profile, projects, names] = await Promise.all([backend.readFile(branch, PROFILE_FILE), backend.readFile(branch, PROJECTS_FILE), backend.listDir(branch, POSTS_DIR)]);
  const posts = await Promise.all(
    names
      .filter((n) => /\.mdx?$/.test(n))
      .map(async (name) => {
        const path = `${POSTS_DIR}/${name}`;
        return draftMeta(parsePostFile(name.replace(/\.mdx?$/, ''), (await backend.readFile(branch, path)) ?? ''), path);
      })
  );
  const snapshot: AdminSnapshot = { branch, head, profile: JSON.parse(profile ?? '{}'), projects: JSON.parse(projects ?? '[]'), posts: posts.sort(byDateDesc) };
  return Response.json(snapshot);
});
```

Create `app/api/admin/post/route.ts`:

```ts
import { parsePostFile } from '@/lib/admin/post-file';
import { isValidSlug } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute, branchParam } from '@/lib/admin/server';
import { POSTS_DIR } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => {
  const branch = branchParam(url);
  const slug = url.searchParams.get('slug') ?? '';
  if (!isValidSlug(slug)) throw new BadRequestError(`invalid slug: ${slug}`);
  for (const ext of ['mdx', 'md']) {
    const path = `${POSTS_DIR}/${slug}.${ext}`;
    const raw = await backend.readFile(branch, path);
    if (raw !== null) return Response.json({ draft: parsePostFile(slug, raw), path });
  }
  return Response.json({ error: 'not found' }, { status: 404 });
});
```

Create `app/api/admin/preview/route.ts`:

```ts
import { adminRoute, branchParam } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ url, backend }) => Response.json({ url: await backend.previewUrl(branchParam(url)) }));
```

- [ ] **Step 3: Mutation routes**

Create `app/api/admin/branches/route.ts`:

```ts
import { draftBranchName, isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ backend }) => Response.json({ branches: (await backend.listBranches()).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b))) }));

export const POST = adminRoute(async ({ req, backend }) => {
  const { name, from } = (await req.json()) as { name?: string; from?: string };
  const branch = draftBranchName(name ?? '');
  if (!from || !isValidBranch(from)) throw new BadRequestError('invalid source branch');
  if ((await backend.listBranches()).includes(branch)) throw new BadRequestError(`${branch} already exists`);
  await backend.createBranch(branch, from);
  return Response.json({ branch });
});
```

Create `app/api/admin/commit/route.ts`:

```ts
import { toFileChanges } from '@/lib/admin/changes';
import { defaultMessage } from '@/lib/admin/messages';
import { isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';
import type { CommitRequest } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export const POST = adminRoute(async ({ req, backend }) => {
  const body = (await req.json()) as Partial<CommitRequest>;
  if (!body.branch || !isValidBranch(body.branch)) throw new BadRequestError('invalid branch');
  if (!body.head || typeof body.head !== 'string') throw new BadRequestError('missing head');
  const files = toFileChanges(body.changes ?? []);
  const message = (typeof body.message === 'string' && body.message.trim()) || defaultMessage(body.changes ?? []);
  const { sha } = await backend.commit(body.branch, body.head, message, files);
  return Response.json({ head: sha });
});
```

Create `app/api/admin/publish/route.ts`:

```ts
import { isValidBranch } from '@/lib/admin/post-meta';
import { BadRequestError, adminRoute } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';

export const POST = adminRoute(async ({ req, backend }) => {
  const { branch } = (await req.json()) as { branch?: string };
  if (!branch || branch === 'main' || !isValidBranch(branch)) throw new BadRequestError('invalid branch');
  await backend.publish(branch, `Publish ${branch}`);
  return Response.json({ ok: true });
});
```

- [ ] **Step 4: Exercise the API with curl against the fake**

Start: `ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011` (background). Then:

```bash
B=http://localhost:3011; J=/tmp/eos.jar; O="Origin: $B"
curl -s -c $J -o /dev/null $B/api/admin/login
curl -s -b $J "$B/api/admin/content?branch=main" | head -c 300; echo
HEAD=$(curl -s -b $J "$B/api/admin/content?branch=main" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).head))')
curl -s -b $J "$B/api/admin/post?slug=introducing-eddie-os" | head -c 200; echo
curl -s -b $J -H "$O" -H 'Content-Type: application/json' -d "{\"branch\":\"main\",\"head\":\"stale\",\"message\":\"\",\"changes\":[{\"kind\":\"json\",\"file\":\"content/projects.json\",\"value\":[]}]}" -w ' %{http_code}\n' $B/api/admin/commit
curl -s -b $J -H "$O" -H 'Content-Type: application/json' -d "{\"branch\":\"main\",\"head\":\"$HEAD\",\"message\":\"\",\"changes\":[{\"kind\":\"upload\",\"path\":\"../.github/workflows/x.yml\",\"base64\":\"AA==\"}]}" -w ' %{http_code}\n' $B/api/admin/commit
curl -s -b $J -H "$O" -H 'Content-Type: application/json' -d '{"name":"Curl Test","from":"main"}' -w ' %{http_code}\n' $B/api/admin/branches
curl -s -b $J "$B/api/admin/preview?branch=drafts/curl-test"; echo
curl -s -b $J "$B/api/admin/content?branch=../main" -w ' %{http_code}\n'
```

Expected: content JSON with `branch`, `head`, `profile`, `projects`, `posts`; a `draft` JSON; `{"error":"branch moved"} 409`; `{"error":"invalid upload path: …"} 400`; `{"branch":"drafts/curl-test"} 200`; `{"url":"https://blog-git-drafts-curl-test-edkranz.vercel.app"}`; `400`. Stop the server.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .`

```bash
git add lib/admin/server.ts app/api/admin
git commit -m "Admin: content, post, branch, commit, publish and preview endpoints (#97)"
```

---

### Task 6: `/admin` route, admin store, login screen

**Files:**
- Create: `app/admin/page.tsx`, `lib/os/admin/store.ts`, `lib/os/admin/dialog-store.ts`, `components/os/admin/admin-layer.tsx`, `components/os/admin/login-screen.tsx`, `components/os/admin/dialog.tsx`
- Modify: `components/os/eddie-os.tsx`, `components/os/desktop.tsx`

**Interfaces:**
- Consumes: Task 2 (`overlay`, `pendingKey`, `setPath`, `removeAt`, `appendAt`, types), Task 5 HTTP API.
- Produces:
  - `useAdminStore` (Zustand) with state `{ enabled: boolean; session: AdminUser | null | undefined; branch: string; head: string | null; branches: string[]; remote: Remote | null; pending: Record<string, PendingChange>; drafts: Record<string, { draft: PostDraft; path: string }>; busy: null | 'loading' | 'saving' | 'publishing'; error: string | null }` and actions `init(): Promise<void>`, `load(branch: string): Promise<void>`, `editJson(file: JsonFile, path: string, value: unknown): void`, `removeJsonItem(file: JsonFile, path: string): void`, `appendJsonItem(file: JsonFile, path: string, value: unknown): void`, `loadPost(slug: string): Promise<{ draft: PostDraft; path: string } | null>`, `stagePost(draft: PostDraft, path: string, isNew: boolean, prevSlug?: string): void`, `deletePost(meta: AdminPostMeta): void`, `stageUpload(path: string, base64: string): void`, `discard(): void`, `save(message: string): Promise<boolean>`, `createBranch(name: string): Promise<void>`, `publish(): Promise<void>`, `signOut(): Promise<void>`.
  - Selector helper `isEditing(s): boolean` (`s.enabled && !!s.session && !!s.remote`).
  - `dialog-store.ts`: `promptText(title: string, okLabel: string, initial?: string): Promise<string | null>`, `confirmAction(title: string, okLabel: string): Promise<boolean>`, `useDialogStore`.
  - `<EddieOS admin />`, `<Desktop admin />`.

- [ ] **Step 1: The route**

Create `app/admin/page.tsx`:

```tsx
import { EddieOS } from '@/components/os/eddie-os';
import { getPublishedPosts, toMeta } from '@/lib/posts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <EddieOS posts={getPublishedPosts().map(toMeta)} admin />;
}
```

`next-sitemap.config.js` already excludes `/admin` and robots disallows it; no change needed.

- [ ] **Step 2: The dialog store**

Create `lib/os/admin/dialog-store.ts`:

```ts
'use client';

import { create } from 'zustand';

export type DialogRequest = {
  kind: 'prompt' | 'confirm';
  title: string;
  okLabel: string;
  initial: string;
  resolve: (value: string | boolean | null) => void;
};

export const useDialogStore = create<{ req: DialogRequest | null }>(() => ({ req: null }));

export function promptText(title: string, okLabel: string, initial = ''): Promise<string | null> {
  return new Promise((resolve) => useDialogStore.setState({ req: { kind: 'prompt', title, okLabel, initial, resolve: (v) => resolve(typeof v === 'string' ? v : null) } }));
}

export function confirmAction(title: string, okLabel: string): Promise<boolean> {
  return new Promise((resolve) => useDialogStore.setState({ req: { kind: 'confirm', title, okLabel, initial: '', resolve: (v) => resolve(v === true) } }));
}
```

- [ ] **Step 3: The admin store**

Create `lib/os/admin/store.ts`:

```ts
'use client';

import { appendAt, removeAt, setPath } from '@/lib/admin/json-path';
import { type Remote, overlay, pendingKey } from '@/lib/admin/overlay';
import { type AdminPostMeta, type AdminSnapshot, type AdminUser, type JsonFile, PROFILE_FILE, type PendingChange, type PostDraft } from '@/lib/admin/types';
import { create } from 'zustand';

type Busy = null | 'loading' | 'saving' | 'publishing';
type LoadedPost = { draft: PostDraft; path: string };

export type AdminState = {
  enabled: boolean;
  session: AdminUser | null | undefined; // undefined while checking
  branch: string;
  head: string | null;
  branches: string[];
  remote: Remote | null;
  pending: Record<string, PendingChange>;
  drafts: Record<string, LoadedPost>;
  busy: Busy;
  error: string | null;

  init: () => Promise<void>;
  load: (branch: string) => Promise<void>;
  editJson: (file: JsonFile, path: string, value: unknown) => void;
  removeJsonItem: (file: JsonFile, path: string) => void;
  appendJsonItem: (file: JsonFile, path: string, value: unknown) => void;
  loadPost: (slug: string) => Promise<LoadedPost | null>;
  stagePost: (draft: PostDraft, path: string, isNew: boolean, prevSlug?: string) => void;
  deletePost: (meta: AdminPostMeta) => void;
  stageUpload: (path: string, base64: string) => void;
  discard: () => void;
  save: (message: string) => Promise<boolean>;
  createBranch: (name: string) => Promise<void>;
  publish: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const isEditing = (s: AdminState) => s.enabled && !!s.session && !!s.remote;

const BRANCH_KEY = 'eos-admin-branch';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) useAdminStore.setState({ session: null });
  if (!res.ok) throw new ApiError(res.status, data.error ?? (res.status === 413 ? 'too large' : `HTTP ${res.status}`));
  return data;
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'failed');

function jsonValue(s: AdminState, file: JsonFile): unknown {
  const p = s.pending[`json:${file}`];
  if (p?.kind === 'json') return p.value;
  return file === PROFILE_FILE ? s.remote?.profile : s.remote?.projects;
}

export const useAdminStore = create<AdminState>((set, get) => {
  const stageJson = (file: JsonFile, value: unknown) => set((s) => ({ pending: { ...s.pending, [`json:${file}`]: { kind: 'json', file, value } } }));

  return {
    enabled: false,
    session: undefined,
    branch: 'main',
    head: null,
    branches: ['main'],
    remote: null,
    pending: {},
    drafts: {},
    busy: null,
    error: null,

    init: async () => {
      set({ enabled: true });
      try {
        const session = await api<AdminUser>('session');
        set({ session });
        let branch = 'main';
        try {
          branch = sessionStorage.getItem(BRANCH_KEY) ?? 'main';
        } catch {}
        await get()
          .load(branch)
          .catch(() => get().load('main'));
      } catch {
        set({ session: null });
      }
    },

    load: async (branch) => {
      set({ busy: 'loading', error: null });
      try {
        const [snap, list] = await Promise.all([api<AdminSnapshot>(`content?branch=${encodeURIComponent(branch)}`), api<{ branches: string[] }>('branches')]);
        set({ branch: snap.branch, head: snap.head, remote: { profile: snap.profile, projects: snap.projects, posts: snap.posts }, branches: list.branches, drafts: {} });
        try {
          sessionStorage.setItem(BRANCH_KEY, snap.branch);
        } catch {}
      } catch (e) {
        set({ error: `Load failed: ${message(e)}` });
        throw e;
      } finally {
        set({ busy: null });
      }
    },

    editJson: (file, path, value) => stageJson(file, setPath(jsonValue(get(), file), path, value)),
    removeJsonItem: (file, path) => stageJson(file, removeAt(jsonValue(get(), file), path)),
    appendJsonItem: (file, path, value) => stageJson(file, appendAt(jsonValue(get(), file), path, value)),

    loadPost: async (slug) => {
      const s = get();
      const staged = s.pending[`post:${slug}`];
      if (staged?.kind === 'post') return { draft: staged.draft, path: staged.path };
      if (s.drafts[slug]) return s.drafts[slug];
      try {
        const loaded = await api<LoadedPost>(`post?branch=${encodeURIComponent(s.branch)}&slug=${encodeURIComponent(slug)}`);
        set((st) => ({ drafts: { ...st.drafts, [slug]: loaded } }));
        return loaded;
      } catch (e) {
        set({ error: `Open failed: ${message(e)}` });
        return null;
      }
    },

    stagePost: (draft, path, isNew, prevSlug) =>
      set((s) => {
        const pending = { ...s.pending };
        if (prevSlug && prevSlug !== draft.slug) delete pending[`post:${prevSlug}`];
        const change: PendingChange = { kind: 'post', draft, path, isNew };
        pending[pendingKey(change)] = change;
        return { pending };
      }),

    deletePost: (meta) =>
      set((s) => {
        const pending = { ...s.pending };
        const staged = pending[`post:${meta.slug}`];
        // Deleting a post that only exists as an unsaved draft just drops the draft.
        if (staged?.kind === 'post' && staged.isNew) delete pending[`post:${meta.slug}`];
        else pending[`post:${meta.slug}`] = { kind: 'delete-post', slug: meta.slug, path: meta.path };
        return { pending };
      }),

    stageUpload: (path, base64) => set((s) => ({ pending: { ...s.pending, [`upload:${path}`]: { kind: 'upload', path, base64 } } })),

    discard: () => set({ pending: {}, error: null }),

    save: async (msg) => {
      const s = get();
      const changes = Object.values(s.pending);
      if (!s.head || changes.length === 0 || !s.remote) return false;
      set({ busy: 'saving', error: null });
      try {
        const res = await api<{ head: string }>('commit', { branch: s.branch, head: s.head, message: msg, changes });
        const drafts = { ...s.drafts };
        for (const c of changes) {
          if (c.kind === 'post') drafts[c.draft.slug] = { draft: c.draft, path: c.path };
          if (c.kind === 'delete-post') delete drafts[c.slug];
        }
        set({ head: res.head, remote: overlay(s.remote, s.pending), pending: {}, drafts });
        return true;
      } catch (e) {
        set({ error: `Save failed: ${message(e)}` });
        return false;
      } finally {
        set({ busy: null });
      }
    },

    createBranch: async (name) => {
      set({ error: null });
      try {
        const { branch } = await api<{ branch: string }>('branches', { name, from: get().branch });
        await get().load(branch); // pending edits carry over to the new branch
      } catch (e) {
        set({ error: `Branch failed: ${message(e)}` });
      }
    },

    publish: async () => {
      const { branch } = get();
      set({ busy: 'publishing', error: null });
      try {
        await api('publish', { branch });
        await get().load('main');
      } catch (e) {
        set({ error: `Publish failed: ${message(e)}` });
      } finally {
        set({ busy: null });
      }
    },

    signOut: async () => {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      set({ session: null, remote: null });
    },
  };
});
```

Because a failed save leaves `pending` untouched, pending edits survive a `branch moved` error and a 401 (the 401 shows the login screen; signing back in returns to the same page state only if the tab was not reloaded, which is acceptable).

- [ ] **Step 4: Dialog component**

Create `components/os/admin/dialog.tsx`:

```tsx
'use client';

import { useDialogStore } from '@/lib/os/admin/dialog-store';
import { useEffect, useRef, useState } from 'react';

export function AdminDialog() {
  const req = useDialogStore((s) => s.req);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!req) return;
    setValue(req.initial);
    requestAnimationFrame(() => input.current?.focus());
  }, [req]);

  if (!req) return null;
  const close = (result: string | boolean | null) => {
    useDialogStore.setState({ req: null });
    req.resolve(result);
  };
  const ok = () => close(req.kind === 'prompt' ? value.trim() || null : true);

  return (
    <div className='fixed inset-0 grid place-items-center bg-black/25' style={{ zIndex: 9900 }} onPointerDown={() => close(req.kind === 'prompt' ? null : false)}>
      <form
        role='dialog'
        aria-label={req.title}
        className='os-panel w-[320px] rounded-2xl border p-4 shadow-2xl'
        onPointerDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
        onKeyDown={(e) => e.key === 'Escape' && close(req.kind === 'prompt' ? null : false)}
      >
        <h2 className='text-[14px] font-bold'>{req.title}</h2>
        {req.kind === 'prompt' ? (
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className='mt-3 w-full rounded-lg border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary'
          />
        ) : null}
        <div className='mt-4 flex justify-end gap-2 text-[13px]'>
          <button type='button' onClick={() => close(req.kind === 'prompt' ? null : false)} className='rounded-lg border px-3 py-1 font-semibold hover:bg-secondary'>
            Cancel
          </button>
          <button type='submit' className='rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground'>
            {req.okLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Login screen**

Create `components/os/admin/login-screen.tsx`:

```tsx
'use client';

import { profile } from '@/lib/eddie';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Chunky, Squircle } from '../ui';

export function LoginScreen() {
  const [denied, setDenied] = useState(false);
  useEffect(() => setDenied(new URLSearchParams(window.location.search).has('denied')), []);

  return (
    <div className='fixed inset-0 grid place-items-center bg-black/30 backdrop-blur-2xl' style={{ zIndex: 9800 }}>
      <div className='flex flex-col items-center gap-3 text-white'>
        <Squircle src={profile.avatar} alt={profile.name} size={96} />
        <div className='text-lg font-semibold drop-shadow'>{profile.name}</div>
        <Chunky variant='primary' href='/api/admin/login'>
          <Github size={16} /> Sign in with GitHub
        </Chunky>
        {denied ? <div className='text-sm font-medium text-red-200'>Access denied.</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Admin layer**

Create `components/os/admin/admin-layer.tsx` (the save bar is added in Task 8; leave the import out until then):

```tsx
'use client';

import { useAdminStore } from '@/lib/os/admin/store';
import { useEffect } from 'react';
import { AdminDialog } from './dialog';
import { LoginScreen } from './login-screen';

export function AdminLayer() {
  const session = useAdminStore((s) => s.session);
  const dirty = useAdminStore((s) => Object.keys(s.pending).length > 0);

  useEffect(() => {
    void useAdminStore.getState().init();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  if (session === undefined) return null;
  if (session === null) return <LoginScreen />;
  return <AdminDialog />;
}
```

- [ ] **Step 7: Wire it into the OS**

`components/os/eddie-os.tsx`: add an `admin?: boolean` prop and pass it through: `<Desktop initialPath={initialPath} admin={admin} />`.

`components/os/desktop.tsx`:
- Add below the other `dynamic` imports: `const AdminLayer = dynamic(() => import('./admin/admin-layer').then((m) => m.AdminLayer), { ssr: false });`
- Change the signature to `export function Desktop({ initialPath, admin }: { initialPath?: string[]; admin?: boolean })`.
- In the address-bar sync effect, add `if (admin) return;` as the first line after `if (!mounted) return;` and add `admin` to its dependency array.
- Render `{mounted && admin ? <AdminLayer /> : null}` directly after `<Dock />`.

- [ ] **Step 8: Check in the browser**

Start `ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011`. With Playwright (`uv run --with playwright python`), open `http://localhost:3011/admin` in a fresh context: the login screen shows avatar, name and "Sign in with GitHub"; clicking it lands back on `/admin` with no login screen and the URL stays `/admin`. Open `http://localhost:3011/admin?denied=1` in a fresh context: "Access denied." shows. Open `/`: no login screen, no request to `/api/admin/*`.

- [ ] **Step 9: Typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .
git add app/admin lib/os/admin components/os/admin components/os/eddie-os.tsx components/os/desktop.tsx
git commit -m "Admin: /admin route, login screen and admin store (#97)"
```

---

### Task 7: Content hook and in-place editing

**Files:**
- Create: `lib/os/content.ts`, `components/os/editable.tsx`, `components/os/inline-markdown.tsx`, `tests/inline-markdown.test.ts`
- Modify: `components/os/apps/about-app.tsx`, `welcome-app.tsx`, `contact-app.tsx`, `projects-app.tsx`, `styles.css`

**Interfaces:**
- Consumes: `useAdminStore`, `isEditing` (Task 6), `overlay` (Task 2), `siteContent`, `projects`, `SiteContent`, `Project` (Task 1).
- Produces:
  - `useContent(): { site: SiteContent; projects: Project[]; editing: boolean }`
  - `useEditablePosts(): AdminPostMeta[] | null` (null when not editing)
  - `<Editable file path value as? className? multiline? removable? parse?>{children?}</Editable>`
  - `<AddItem file path value label />` (appends `value` to the array at `path`)
  - `parseInline(text): { text: string; em?: boolean; strong?: boolean }[]`, `<InlineMarkdown text />`

- [ ] **Step 1: Failing test for the inline parser**

Create `tests/inline-markdown.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInline } from '../components/os/inline-markdown-parse.ts';

test('parses *em* and **strong**, leaves the rest as text', () => {
  assert.deepEqual(parseInline('a *b* c **d** e'), [{ text: 'a ' }, { text: 'b', em: true }, { text: ' c ' }, { text: 'd', strong: true }, { text: ' e' }]);
  assert.deepEqual(parseInline('no marks'), [{ text: 'no marks' }]);
  assert.deepEqual(parseInline('dangling *star'), [{ text: 'dangling *star' }]);
});
```

The parser lives in its own import-free file so Node can load it; the React component imports it.

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/inline-markdown.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 3: Implement the parser and component**

Create `components/os/inline-markdown-parse.ts`:

```ts
export type InlinePart = { text: string; em?: boolean; strong?: boolean };

/** Just enough Markdown for one-paragraph copy: *em* and **strong**. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push(m[1] !== undefined ? { text: m[1], strong: true } : { text: m[2], em: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
```

Create `components/os/inline-markdown.tsx`:

```tsx
import { parseInline } from './inline-markdown-parse';

export function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.strong ? <strong key={i}>{p.text}</strong> : p.em ? <em key={i}>{p.text}</em> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}
```

Run: `node --test tests/inline-markdown.test.ts` → PASS.

- [ ] **Step 4: Content hooks**

Create `lib/os/content.ts`:

```ts
'use client';

import { overlay } from '@/lib/admin/overlay';
import type { AdminPostMeta } from '@/lib/admin/types';
import { type Project, type SiteContent, projects as staticProjects, siteContent } from '@/lib/eddie';
import { useMemo } from 'react';
import { isEditing, useAdminStore } from './admin/store';

/** Build-time content for visitors; in /admin, the branch's content with unsaved edits applied. */
export function useContent(): { site: SiteContent; projects: Project[]; editing: boolean } {
  const editing = useAdminStore(isEditing);
  const remote = useAdminStore((s) => s.remote);
  const pending = useAdminStore((s) => s.pending);
  return useMemo(() => {
    if (!editing || !remote) return { site: siteContent, projects: staticProjects, editing: false };
    const o = overlay(remote, pending);
    return { site: o.profile as SiteContent, projects: o.projects as Project[], editing: true };
  }, [editing, remote, pending]);
}

/** Every post on the branch (hidden ones too) with unsaved edits applied, or null outside /admin. */
export function useEditablePosts(): AdminPostMeta[] | null {
  const editing = useAdminStore(isEditing);
  const remote = useAdminStore((s) => s.remote);
  const pending = useAdminStore((s) => s.pending);
  return useMemo(() => (editing && remote ? overlay(remote, pending).posts : null), [editing, remote, pending]);
}
```

- [ ] **Step 5: Editable**

Create `components/os/editable.tsx`:

```tsx
'use client';

import type { JsonFile } from '@/lib/admin/types';
import { isEditing, useAdminStore } from '@/lib/os/admin/store';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

type EditableProps = {
  file: JsonFile;
  path: string;
  value: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  /** Committing an empty value removes the array item at `path`. */
  removable?: boolean;
  parse?: (text: string) => unknown;
  /** What visitors see; defaults to `value`. */
  children?: ReactNode;
};

export function Editable({ file, path, value, as: Tag = 'span', className, multiline, removable, parse, children }: EditableProps) {
  const editing = useAdminStore(isEditing);
  if (!editing) return <Tag className={className}>{children ?? value}</Tag>;
  return (
    <Tag
      key={value}
      contentEditable='plaintext-only'
      suppressContentEditableWarning
      spellCheck
      data-editable={path}
      className={cn(className, 'eos-editable', multiline && 'whitespace-pre-wrap')}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape') {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        } else if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.textContent ?? '').trim();
        if (text === value) return;
        const store = useAdminStore.getState();
        if (!text && removable) store.removeJsonItem(file, path);
        else store.editJson(file, path, parse ? parse(text) : text);
      }}
    >
      {value}
    </Tag>
  );
}

export function AddItem({ file, path, value, label }: { file: JsonFile; path: string; value: unknown; label: string }) {
  const editing = useAdminStore(isEditing);
  if (!editing) return null;
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={() => useAdminStore.getState().appendJsonItem(file, path, value)}
      className='inline-grid h-7 w-7 place-items-center rounded-full border border-dashed text-muted-foreground transition hover:border-primary hover:text-primary'
    >
      <Plus size={14} />
    </button>
  );
}
```

Add to `styles.css`:

```css
/* /admin: everything click-to-edit wears a dashed outline. */
.eos-editable {
  outline: 1.5px dashed color-mix(in oklab, var(--brand-blue) 45%, transparent);
  outline-offset: 3px;
  border-radius: 4px;
  cursor: text;
}
.eos-editable:hover {
  outline-color: var(--brand-blue);
}
.eos-editable:focus {
  outline: 2px solid var(--brand-blue);
  background: color-mix(in oklab, var(--brand-blue) 6%, transparent);
}
```

- [ ] **Step 6: About app**

In `components/os/apps/about-app.tsx`:
- Replace the `@/lib/eddie` import with `import { PROFILE_FILE } from '@/lib/admin/types';`, `import { useContent } from '@/lib/os/content';`, `import { AddItem, Editable } from '../editable';`, `import { InlineMarkdown } from '../inline-markdown';`.
- First line of the component: `const { site } = useContent(); const { profile, about, technologies, skills, education, hobbies } = site;`
- Name: `<Editable file={PROFILE_FILE} path='profile.name' value={profile.name} as='h1' className='text-2xl font-bold tracking-tight' />`
- Role line: `<Editable … path='profile.role' value={profile.role} /> · <Editable … path='profile.company.name' value={profile.company.name} />` inside the existing `<p>`.
- Location: `<Editable … path='profile.location' value={profile.location} />` after the `MapPin`.
- Replace the two hard-coded bio `<p>` elements with:

```tsx
{about.bio.map((para, i) => (
  <Editable key={i} file={PROFILE_FILE} path={`about.bio.${i}`} value={para} as='p' multiline className={cn('text-[15px] leading-relaxed text-foreground/85', i === 0 ? 'mt-6' : 'mt-3')}>
    <InlineMarkdown text={para} />
  </Editable>
))}
```

(import `cn` from `@/lib/utils`).
- Technologies: `<Chip key={t}><Editable … path={`technologies.${i}`} value={t} removable /></Chip>` (map with index), then `<AddItem file={PROFILE_FILE} path='technologies' value='untitled' label='Add technology' />`.
- Skills: `title` → `<Editable as='h4' … path={`skills.${i}.title`} … />`, `body` → `<Editable as='p' multiline … path={`skills.${i}.body`} … />`.
- Education: `<Editable … path={`education.${i}`} value={e} removable />` inside the existing `<span>` position, plus `<AddItem … path='education' value='untitled' label='Add education' />` after the list.
- Hobbies: same pattern with `path={`hobbies.${i}`}` and an `AddItem`.
- Change list `key`s from the string value to the index (`key={i}`) so editing a value does not remount siblings.

- [ ] **Step 7: Welcome and Contact**

`welcome-app.tsx`: use `const { site: { profile } } = useContent();` instead of the static import, and wrap `profile.intro` (`as='span'`), `profile.role`, `profile.company.name` (inside the `<a>`, the `onClick` in `Editable` stops navigation while editing) and `profile.blurb` (`as='p'`, `multiline`) in `Editable` with paths `profile.intro`, `profile.role`, `profile.company.name`, `profile.blurb`.

`contact-app.tsx`: use `const { site: { profile, contact, socials } } = useContent();`. Wrap `contact.heading` (`as='h1'`), `contact.lead` (`as='p'`, multiline), `profile.email` (inside the card), each social's `label` and `handle` (`path={`socials.${i}.label`}` / `.handle`, using the index from the unfiltered `socials` array: compute `const idx = socials.indexOf(s)`), and `contact.availability` in the footer (`Based in {profile.location} · <Editable … path='contact.availability' …/>`).

- [ ] **Step 8: Projects**

In `projects-app.tsx`:
- `const { projects, editing } = useContent();`, imports `PROJECTS_FILE`, `Editable`, `AddItem`, `useAdminStore`, `X` from lucide.
- Wrap `title` (`as='h2'`), `subtitle`, `year`, `description` (`as='p'`, multiline), and `emoji` with `Editable` (`file={PROJECTS_FILE}` and paths `${i}.title`, `${i}.subtitle`, `${i}.year`, `${i}.description`, `${i}.emoji`).
- Tech chips: when editing, replace the chip row with one `<Editable file={PROJECTS_FILE} path={`${i}.tech`} value={p.tech.join(', ')} parse={(t) => t.split(',').map((x) => x.trim()).filter(Boolean)} className='text-[12px]' />`; otherwise render the chips as now.
- Link button: when editing, render `<div className='mt-4 text-[13px] font-bold' style={{ color: p.accent }}><Editable file={PROJECTS_FILE} path={`${i}.link.label`} value={p.link.label} /></div>` instead of the `<button>` (contentEditable inside a `<button>` is not editable in Chrome).
- Delete control, top-right of each card when editing:

```tsx
{editing ? (
  <button
    type='button'
    aria-label={`Delete ${p.title}`}
    onClick={() => useAdminStore.getState().removeJsonItem(PROJECTS_FILE, String(i))}
    className='absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground'
  >
    <X size={14} />
  </button>
) : null}
```

(add `relative` to the card's className).
- After the grid items, when editing, an add card:

```tsx
{editing ? (
  <div className='grid min-h-40 place-items-center rounded-2xl border border-dashed'>
    <AddItem
      file={PROJECTS_FILE}
      path=''
      label='Add project'
      value={{ id: `project-${Date.now()}`, title: 'Untitled', subtitle: 'Untitled', description: 'Untitled', tech: [], emoji: '✨', accent: 'var(--brand-blue)', year: String(new Date().getFullYear()) }}
    />
  </div>
) : null}
```

`appendAt(list, '', value)` appends to the top-level array because `getPath(list, '')` returns the list itself and `setPath(list, '', next)` returns `next`; confirm by adding to `tests/admin/json-path.test.ts`:

```ts
test('appendAt with an empty path appends to a top-level array', () => {
  assert.deepEqual(appendAt([1], '', 2), [1, 2]);
});
```

Run `node --test tests/admin/json-path.test.ts` and make it pass (it does with the Task 2 implementation since `parsePath('')` is `[]`).

- Use `key={p.id}` on cards (already) so deleting does not shuffle state.

- [ ] **Step 9: Check in the browser**

With the fake dev server on 3011 and a signed-in Playwright context at `/admin`: Welcome shows dashed outlines on intro, role, company and blurb; clicking the blurb, selecting all and typing changes it; blur keeps the new text; About shows the bio paragraphs with the thesis title in italics for visitors (check `/about` in a fresh context: `em` element present, no `.eos-editable`) and raw `*…*` text in admin; deleting a hobby by clearing it removes the chip; Projects shows delete buttons and an add card. Take a screenshot of `/admin` About for the record.

- [ ] **Step 10: Tests, typecheck, lint, commit**

```bash
pnpm test && ./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .
git add lib/os/content.ts components/os tests styles.css
git commit -m "Admin: click-to-edit copy in About, Welcome, Contact and Projects (#97)"
```

---

### Task 8: Branch menu, account menu and save bar

**Files:**
- Create: `components/os/admin/admin-menus.tsx`, `components/os/admin/save-bar.tsx`
- Modify: `components/os/menu-bar.tsx`, `components/os/admin/admin-layer.tsx`

**Interfaces:**
- Consumes: `useAdminStore` actions (Task 6), `promptText`, `confirmAction`, `defaultMessage` (Task 2), `Dropdown`, `MenuEntry` (`components/os/menu.tsx`).
- Produces: `<AdminMenus openId setOpenId />`, `<SaveBar />`.

- [ ] **Step 1: Menus**

Create `components/os/admin/admin-menus.tsx`:

```tsx
'use client';

import { confirmAction, promptText } from '@/lib/os/admin/dialog-store';
import { useAdminStore } from '@/lib/os/admin/store';
import { GitBranch } from 'lucide-react';
import { Dropdown, type MenuEntry } from '../menu';

type MenuProps = { openId: string | null; setOpenId: (id: string | null) => void };

export function BranchMenu(menu: MenuProps) {
  const branch = useAdminStore((s) => s.branch);
  const branches = useAdminStore((s) => s.branches);
  const session = useAdminStore((s) => s.session);
  if (!session) return null;

  const switchTo = async (b: string) => {
    const st = useAdminStore.getState();
    if (b === st.branch) return;
    if (Object.keys(st.pending).length > 0) {
      if (!(await confirmAction('Discard unsaved changes?', 'Discard'))) return;
      st.discard();
    }
    await st.load(b).catch(() => {});
  };

  const entries: MenuEntry[] = [
    ...branches.map<MenuEntry>((b) => ({ label: b, checked: b === branch, onSelect: () => void switchTo(b) })),
    'sep',
    {
      label: 'New Branch…',
      onSelect: async () => {
        const name = await promptText('New Branch', 'Create');
        if (name) await useAdminStore.getState().createBranch(name);
      },
    },
  ];

  return (
    <Dropdown
      id='branch'
      title={
        <span className='inline-flex items-center gap-1'>
          <GitBranch size={13} /> {branch}
        </span>
      }
      entries={entries}
      {...menu}
    />
  );
}

export function AccountMenu(menu: MenuProps) {
  const session = useAdminStore((s) => s.session);
  if (!session) return null;
  const entries: MenuEntry[] = [{ label: session.login, disabled: true }, 'sep', { label: 'Sign Out', onSelect: () => void useAdminStore.getState().signOut() }];
  return (
    <Dropdown
      id='account'
      align='right'
      title={<img src={session.avatarUrl} alt={session.login} className='h-[18px] w-[18px] rounded-full' />}
      titleClassName='grid h-[22px] place-items-center px-1 py-0'
      entries={entries}
      {...menu}
    />
  );
}
```

- [ ] **Step 2: Mount them in the menu bar**

In `components/os/menu-bar.tsx`:
- Add `import dynamic from 'next/dynamic';` and `import { useAdminStore } from '@/lib/os/admin/store';`.
- At module level: `const BranchMenu = dynamic(() => import('./admin/admin-menus').then((m) => m.BranchMenu), { ssr: false });` and the same for `AccountMenu`.
- In `MenuBar`: `const adminEnabled = useAdminStore((s) => s.enabled);`
- After the Window `Dropdown` inside `<nav>`: `{adminEnabled ? <BranchMenu {...menu} /> : null}`.
- In the right cluster, before `<ThemeToggle />`: `{adminEnabled ? <AccountMenu {...menu} /> : null}`.

- [ ] **Step 3: Save bar**

Create `components/os/admin/save-bar.tsx`:

```tsx
'use client';

import { defaultMessage } from '@/lib/admin/messages';
import { confirmAction } from '@/lib/os/admin/dialog-store';
import { useAdminStore } from '@/lib/os/admin/store';
import { ExternalLink, GitBranch } from 'lucide-react';
import { useEffect, useState } from 'react';

function usePreviewUrl(branch: string, head: string | null, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!enabled || !head) return;
    let stopped = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/preview?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' });
        const data = (await res.json()) as { url?: string | null };
        if (!stopped && data.url) return setUrl(data.url);
      } catch {}
      if (!stopped && ++tries < 40) timer = setTimeout(tick, 15_000);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [branch, head, enabled]);
  return url;
}

export function SaveBar() {
  const pending = useAdminStore((s) => s.pending);
  const branch = useAdminStore((s) => s.branch);
  const head = useAdminStore((s) => s.head);
  const busy = useAdminStore((s) => s.busy);
  const error = useAdminStore((s) => s.error);
  const [message, setMessage] = useState('');

  const changes = Object.values(pending);
  const count = changes.length;
  const onDraft = branch !== 'main';
  const preview = usePreviewUrl(branch, head, onDraft && count === 0);
  if (count === 0 && !onDraft && !error) return null;

  const { save, discard, load, publish } = useAdminStore.getState();
  const suggested = count ? defaultMessage(changes) : '';
  const btn = 'rounded-lg px-2.5 py-1 font-semibold transition disabled:opacity-50';

  return (
    <div
      className='os-panel fixed bottom-[92px] left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border px-3 py-2 text-[13px] shadow-xl'
      style={{ zIndex: 9400 }}
    >
      <GitBranch size={14} className='shrink-0 text-muted-foreground' />
      <span className='font-semibold'>{branch}</span>
      {count > 0 ? (
        <>
          <span className='whitespace-nowrap text-muted-foreground'>
            {count} change{count === 1 ? '' : 's'}
          </span>
          <input
            aria-label='Commit message'
            value={message}
            placeholder={suggested}
            onChange={(e) => setMessage(e.target.value)}
            className='w-56 min-w-0 rounded-lg border bg-card px-2 py-1 outline-none focus:border-primary'
          />
          <button type='button' disabled={!!busy} onClick={discard} className={`${btn} border hover:bg-secondary`}>
            Discard
          </button>
          <button
            type='button'
            disabled={!!busy}
            onClick={async () => {
              if (await save(message.trim() || suggested)) setMessage('');
            }}
            className={`${btn} bg-primary text-primary-foreground`}
          >
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </>
      ) : onDraft ? (
        <>
          {preview ? (
            <a href={preview} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'>
              Preview <ExternalLink size={12} />
            </a>
          ) : (
            <span className='text-muted-foreground'>Building…</span>
          )}
          <button
            type='button'
            disabled={!!busy}
            onClick={async () => {
              if (await confirmAction(`Publish ${branch} to main?`, 'Publish')) await publish();
            }}
            className={`${btn} bg-primary text-primary-foreground`}
          >
            {busy === 'publishing' ? 'Publishing…' : 'Publish to main'}
          </button>
        </>
      ) : null}
      {error ? (
        <span className='flex items-center gap-2 text-destructive'>
          {error}
          {error.endsWith('branch moved') ? (
            <button type='button' onClick={() => void load(branch)} className={`${btn} border text-foreground hover:bg-secondary`}>
              Reload
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
```

Reload re-reads the branch and keeps pending edits, so the next Save applies them on top of the new head (an explicit, user-initiated last-writer-wins at file level).

- [ ] **Step 4: Mount the save bar**

In `admin-layer.tsx` import `SaveBar` and return `<><SaveBar /><AdminDialog /></>` for a signed-in session.

- [ ] **Step 5: Check in the browser**

Fake dev server on 3011, signed in at `/admin`: editing the Welcome blurb shows the bar with `main`, `1 change`, placeholder `Edit profile`; Save clears it; `curl -b … /api/admin/content?branch=main` shows the new blurb. Menu bar: branch menu lists `main` and `New Branch…`; creating `Playwright Check` switches to `drafts/playwright-check`, the bar shows `Building…` then `Preview` (the fake returns a URL immediately) and `Publish to main`; publishing returns to `main`. Switching branches with a pending edit asks `Discard unsaved changes?`. Account menu shows the login and Sign Out, which returns to the login screen.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .
git add components/os
git commit -m "Admin: branch and account menus, save bar with preview and publish (#97)"
```

---

### Task 9: Editor app and MDXEditor

**Files:**
- Modify: `package.json` (dependency), `lib/os/types.ts`, `lib/os/apps-meta.ts`, `components/os/apps/registry.tsx`, `app/[...segments]/page.tsx`, `components/os/apps/terminal/commands.ts`, `styles.css`
- Create: `components/os/apps/editor/editor-app.tsx`, `components/os/apps/editor/markdown-editor.tsx`, `lib/os/admin/open-editor.ts`

**Interfaces:**
- Consumes: `useAdminStore` (`loadPost`, `stagePost`, `stageUpload`, `branch`, `remote`), `slugify`, `isValidSlug` (Task 2), `profile.repo`.
- Produces: AppId `'editor'` with window props `{ slug: string | null }`; `openEditor(slug: string | null, title: string): void`.

- [ ] **Step 1: Install MDXEditor**

```bash
CI=true pnpm add @mdxeditor/editor@^4.3.3
```

- [ ] **Step 2: Register the app id**

- `lib/os/types.ts`: add `| 'editor'` to `AppId`.
- `lib/os/apps-meta.ts`: add

```ts
editor: {
  id: 'editor',
  name: 'Editor',
  iconId: 'book',
  accent: 'var(--brand-purple)',
  defaultSize: { w: 920, h: 720 },
  minSize: { w: 520, h: 420 },
  single: false,
  dock: false,
  desktop: false,
},
```

- `app/[...segments]/page.tsx`: add `const HIDDEN_APPS = new Set(['welcome', 'editor']);` and use it in `generateStaticParams` (`.filter((id) => !HIDDEN_APPS.has(id))`) and `isKnownRoute` (`return !HIDDEN_APPS.has(first) && first in APP_META && !second;`).
- `components/os/apps/terminal/commands.ts` line 34: `const APP_IDS = (Object.keys(APP_META) as AppId[]).filter((id) => id !== 'editor');`
- `components/os/apps/registry.tsx`: `const EditorApp = dynamic(() => import('./editor/editor-app').then((m) => m.EditorApp), { ssr: false, loading });` and `editor: (p) => <EditorApp win={p.win} />,`.

- [ ] **Step 3: Open-or-focus helper**

Create `lib/os/admin/open-editor.ts`:

```ts
'use client';

import { useWindowStore } from '@/lib/os/store';

/** One editor window per post; `null` opens a new, untitled post. */
export function openEditor(slug: string | null, title: string) {
  const st = useWindowStore.getState();
  const existing = slug ? st.windows.find((w) => w.appId === 'editor' && w.props?.slug === slug) : undefined;
  if (existing) st.focusWindow(existing.id);
  else st.openApp('editor', { props: { slug }, title: title || 'Untitled' });
}
```

- [ ] **Step 4: Markdown editor component**

Create `components/os/apps/editor/markdown-editor.tsx`:

```tsx
'use client';

import '@mdxeditor/editor/style.css';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  type DirectiveDescriptor,
  DiffSourceToggleWrapper,
  GenericDirectiveEditor,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// `::sketch{name=particles height=320}` embeds a live canvas (components/os/sketches.tsx).
const SketchDirective: DirectiveDescriptor = {
  name: 'sketch',
  type: 'leafDirective',
  testNode: (node) => node.name === 'sketch',
  attributes: ['name', 'height'],
  hasChildren: false,
  Editor: GenericDirectiveEditor,
};

const CODE_LANGS: Record<string, string> = {
  '': 'Plain',
  txt: 'Text',
  ts: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  jsx: 'JSX',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  csharp: 'C#',
  cs: 'C#',
  python: 'Python',
  css: 'CSS',
  html: 'HTML',
  yaml: 'YAML',
  md: 'Markdown',
  mermaid: 'Mermaid',
  sql: 'SQL',
};

type Props = {
  markdown: string;
  original: string;
  dark: boolean;
  onChange: (markdown: string) => void;
  uploadImage: (file: File) => Promise<string>;
  previewImage: (src: string) => Promise<string>;
};

export default function MarkdownEditor({ markdown, original, dark, onChange, uploadImage, previewImage }: Props) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      imagePlugin({ imageUploadHandler: uploadImage, imagePreviewHandler: previewImage }),
      codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
      codeMirrorPlugin({ codeBlockLanguages: CODE_LANGS }),
      directivesPlugin({ directiveDescriptors: [SketchDirective] }),
      diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: original }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <DiffSourceToggleWrapper>
            <UndoRedo />
            <BlockTypeSelect />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <ListsToggle />
            <CreateLink />
            <InsertImage />
            <InsertTable />
            <InsertCodeBlock />
            <InsertThematicBreak />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [original, uploadImage, previewImage]
  );

  return (
    <MDXEditor
      className={cn('eos-mdx', dark && 'dark-theme')}
      contentEditableClassName='prose prose-eddie max-w-none'
      markdown={markdown}
      onChange={(md, initialNormalize) => {
        if (!initialNormalize) onChange(md);
      }}
      onError={({ error }) => console.warn('[editor]', error)}
      plugins={plugins}
    />
  );
}
```

If the TypeScript check reports a different `onChange`/`onError` signature for the installed version, adapt to the installed `MDXEditorProps` type (check `node_modules/@mdxeditor/editor/dist/index.d.ts`), keeping the rule: never stage on the initial normalisation pass.

- [ ] **Step 5: Editor window**

Create `components/os/apps/editor/editor-app.tsx`:

```tsx
'use client';

import { isValidSlug, slugify } from '@/lib/admin/post-meta';
import { type AdminPostMeta, POSTS_DIR, type PostDraft } from '@/lib/admin/types';
import { profile } from '@/lib/eddie';
import { isEditing, useAdminStore } from '@/lib/os/admin/store';
import { useWindowStore } from '@/lib/os/store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppScroll } from '../../ui';
import type { AppContentProps } from '../types';

const MarkdownEditor = dynamic(() => import('./markdown-editor'), { ssr: false, loading: () => <div className='py-10 text-center text-sm text-muted-foreground'>Loading…</div> });

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/;
const NO_POSTS: AdminPostMeta[] = [];

/** "My Photo (1).PNG" -> "my-photo-1.png": the shape `toFileChanges` accepts for uploads. */
function uploadName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-*\.+-*/g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');
}

const newDraft = (): PostDraft => ({ slug: '', title: '', date: new Date().toISOString(), excerpt: '', tags: [], heroImg: null, hideFromBlogList: false, body: '', extra: {} });

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const field = 'w-full rounded-lg border bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary';
const label = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

export function EditorApp({ win }: AppContentProps) {
  const editing = useAdminStore(isEditing);
  const branch = useAdminStore((s) => s.branch);
  // Select the array itself (a fresh `?? []` inside the selector would re-render forever).
  const existing = useAdminStore((s) => s.remote?.posts) ?? NO_POSTS;
  const { resolvedTheme } = useTheme();
  const updateProps = useWindowStore((s) => s.updateProps);
  const initialSlug = typeof win.props?.slug === 'string' ? (win.props.slug as string) : null;

  const [isNew] = useState(initialSlug === null);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [original, setOriginal] = useState('');
  const [path, setPath] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [missing, setMissing] = useState(false);
  const previews = useRef(new Map<string, string>());
  const draftRef = useRef<PostDraft | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    if (!editing) return;
    if (isNew) {
      setDraft(newDraft());
      return;
    }
    let cancelled = false;
    useAdminStore
      .getState()
      .loadPost(initialSlug as string)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) return setMissing(true);
        setDraft(loaded.draft);
        setOriginal(loaded.draft.body);
        setPath(loaded.path);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, isNew, initialSlug]);

  // A new post stops being "fresh" once it has been saved: its slug (and file) are then fixed.
  const fresh = isNew && !existing.some((p) => p.path === path);
  const slugTaken = (slug: string) => fresh && existing.some((p) => p.slug === slug);

  const update = useCallback(
    (patch: Partial<PostDraft>) => {
      const prev = draftRef.current;
      if (!prev) return;
      const next = { ...prev, ...patch };
      if (fresh && !slugTouched && patch.title !== undefined) next.slug = slugify(patch.title);
      const nextPath = fresh ? `${POSTS_DIR}/${next.slug}.mdx` : path;
      setDraft(next);
      if (fresh) setPath(nextPath);
      updateProps(win.id, { slug: fresh ? null : next.slug }, next.title || 'Untitled');
      if (isValidSlug(next.slug) && !slugTaken(next.slug)) useAdminStore.getState().stagePost(next, nextPath, fresh, prev.slug || undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fresh, slugTouched, path, win.id, existing]
  );

  const uploadImage = useCallback(async (file: File) => {
    const d = draftRef.current;
    const name = uploadName(file.name);
    if (!d || !isValidSlug(d.slug)) throw new Error('title required');
    if (!IMAGE_EXT.test(name)) throw new Error('unsupported image');
    const src = `/uploads/posts/${d.slug}/${name}`;
    useAdminStore.getState().stageUpload(`public${src}`, await fileToBase64(file));
    previews.current.set(src, URL.createObjectURL(file));
    return src;
  }, []);

  const previewImage = useCallback(
    async (src: string) => {
      const local = previews.current.get(src);
      if (local) return local;
      if (src.startsWith('/uploads/') && branch !== 'main') return `https://raw.githubusercontent.com/${profile.repo}/${branch}/public${src}`;
      return src;
    },
    [branch]
  );

  if (!editing) return null;
  if (missing) return <div className='grid h-full place-items-center text-sm text-muted-foreground'>No such post.</div>;
  if (!draft) return <div className='grid h-full place-items-center text-sm text-muted-foreground'>Loading…</div>;

  const slugError = fresh && draft.slug !== '' && (!isValidSlug(draft.slug) || slugTaken(draft.slug));

  return (
    <AppScroll className='bg-card'>
      <div className='mx-auto max-w-3xl px-6 py-5'>
        <input
          aria-label='Title'
          value={draft.title}
          placeholder='Untitled'
          onChange={(e) => update({ title: e.target.value })}
          className='w-full bg-transparent text-[28px] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50'
        />
        <div className='mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]'>
          <label className='block'>
            <span className={label}>Slug</span>
            <input
              aria-label='Slug'
              value={draft.slug}
              readOnly={!fresh}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value });
              }}
              className={cn(field, !fresh && 'text-muted-foreground', slugError && 'border-destructive')}
            />
          </label>
          <label className='block'>
            <span className={label}>Date</span>
            <input
              aria-label='Date'
              type='date'
              value={draft.date.slice(0, 10)}
              onChange={(e) => e.target.value && update({ date: new Date(`${e.target.value}T00:00:00.000Z`).toISOString() })}
              className={field}
            />
          </label>
          <label className='flex items-end gap-2 pb-1.5 text-[13px]'>
            <input type='checkbox' checked={draft.hideFromBlogList} onChange={(e) => update({ hideFromBlogList: e.target.checked })} />
            Hidden
          </label>
        </div>
        <label className='mt-3 block'>
          <span className={label}>Excerpt</span>
          <textarea aria-label='Excerpt' rows={2} value={draft.excerpt} onChange={(e) => update({ excerpt: e.target.value })} className={cn(field, 'resize-none')} />
        </label>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          <label className='block'>
            <span className={label}>Tags</span>
            <input
              aria-label='Tags'
              defaultValue={draft.tags.join(', ')}
              onBlur={(e) =>
                update({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className={field}
            />
          </label>
          <label className='block'>
            <span className={label}>Hero image</span>
            <input aria-label='Hero image' value={draft.heroImg ?? ''} onChange={(e) => update({ heroImg: e.target.value || null })} className={field} />
          </label>
        </div>
        <div className='mt-5 overflow-hidden rounded-xl border'>
          <MarkdownEditor
            key={`${branch}:${initialSlug ?? 'new'}`}
            markdown={draft.body}
            original={original}
            dark={resolvedTheme === 'dark'}
            onChange={(body) => update({ body })}
            uploadImage={uploadImage}
            previewImage={previewImage}
          />
        </div>
      </div>
    </AppScroll>
  );
}
```

The `markdown` prop of MDXEditor is only read on mount, so passing `draft.body` on each render does not reset the editor. The `key` remounts it when the branch changes underneath.

- [ ] **Step 6: Editor styles**

Append to `styles.css`:

```css
/* MDXEditor inside an OS window: let the window scroll, keep the toolbar pinned. */
.eos-mdx {
  --baseBg: var(--card);
  --basePageBg: var(--card);
  font-family: inherit;
}
.eos-mdx [role='toolbar'] {
  position: sticky;
  top: 0;
  z-index: 2;
  border-radius: 0;
}
.eos-mdx .prose {
  min-height: 320px;
  padding: 16px 20px;
}
```

- [ ] **Step 7: Check in the browser**

Nothing opens the editor yet (the Blog wiring is Task 10, which exercises it end to end). Here, with the fake dev server on 3011: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3011/editor` → `404`, and `/admin` still loads without console errors.

- [ ] **Step 8: Typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .
git add package.json pnpm-lock.yaml lib/os components/os app styles.css
git commit -m "Admin: post editor window with MDXEditor, rich text and Markdown source (#97)"
```

---

### Task 10: Blog app in edit mode

**Files:**
- Modify: `components/os/apps/blog-app.tsx`

**Interfaces:**
- Consumes: `useEditablePosts` (Task 7), `openEditor` (Task 9), `confirmAction` (Task 6), `useAdminStore().deletePost`.
- Produces: Blog list in `/admin` showing all posts (hidden included), New Post, per-post Delete; clicking a post opens its editor.

- [ ] **Step 1: Wire edit mode into `BlogApp`**

In `blog-app.tsx`:
- Imports: `useEditablePosts` from `@/lib/os/content`, `openEditor` from `@/lib/os/admin/open-editor`, `confirmAction` from `@/lib/os/admin/dialog-store`, `useAdminStore` from `@/lib/os/admin/store`, `type AdminPostMeta` from `@/lib/admin/types`, and `EyeOff, Plus, Trash2` from lucide.
- In `BlogApp`: `const editPosts = useEditablePosts();` then

```tsx
if (editPosts) return <PostList posts={editPosts} onOpen={(slug) => openEditor(slug, editPosts.find((p) => p.slug === slug)?.title ?? '')} editable />;
```

placed before the existing `active` logic (edit mode never shows the reader).
- `PostList` gets `editable?: boolean`. When editable:
  - Next to the RSS link, a New Post button:

```tsx
{editable ? (
  <button
    type='button'
    onClick={() => openEditor(null, 'Untitled')}
    className='grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground transition hover:text-primary'
    aria-label='New post'
    title='New post'
  >
    <Plus size={16} />
  </button>
) : null}
```

  - Wrap the header buttons in `<div className='flex gap-2'>`.
  - Each `<li>` becomes `className='group/post relative'`, and after the card button:

```tsx
{editable ? (
  <button
    type='button'
    aria-label={`Delete ${post.title}`}
    onClick={async () => {
      if (await confirmAction(`Delete “${post.title}”?`, 'Delete')) useAdminStore.getState().deletePost(post as AdminPostMeta);
    }}
    className='absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-destructive group-hover/post:opacity-100 focus:opacity-100'
  >
    <Trash2 size={14} />
  </button>
) : null}
```

  - Hidden posts show an `EyeOff` (size 13) before the title when `post.hideFromBlogList` is true.
- `PostList`'s `posts` prop type becomes `(PostData | AdminPostMeta)[]` (both have every field the list reads).

- [ ] **Step 2: Check in the browser (Blog + Editor)**

Fake dev server on 3011, signed in at `/admin`:
1. Open Blog from the dock (`[aria-label="Open Blog"]`): the list shows "Introducing Eddie OS", a `+` button and, on hover, a trash button.
2. Click the post: an Editor window titled "Introducing Eddie OS" opens; the rich editor renders headings and the three `::sketch` blocks as directive chips; no `1 change` appears without an edit.
3. Click at the end of the body and type ` E2E`: the save bar shows `1 change` with placeholder `Edit post: Introducing Eddie OS`; clicking the post again focuses the same window instead of opening a second one.
4. Toggle Source mode in the toolbar: the Markdown source shows `::sketch{name=particles height=320}` intact.
5. Click `+`: an Untitled editor opens; typing title `Hello World` sets slug `hello-world`; the Blog list shows "Hello World" immediately (from pending).
6. Paste an image (Playwright: `page.set_input_files` on the image dialog's file input after clicking Insert image): the save bar counts the upload; Save; `curl …/api/admin/content` lists `hello-world`.
7. Delete "Hello World" from the list and Save: it disappears from `/api/admin/content`.
8. Check `/blog` in a fresh (visitor) context: no `+`, no trash, posts open in the reader.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
./node_modules/.bin/tsc --noEmit -p . && ./node_modules/.bin/biome lint .
git add components/os/apps/blog-app.tsx
git commit -m "Admin: create, edit and delete posts from the Blog app (#97)"
```

---

### Task 11: End-to-end test and docs

**Files:**
- Create: `tests/e2e/admin.py`
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-15-admin-visual-editor-design.md` (testing note)

**Interfaces:**
- Consumes: everything above, through the browser and HTTP.

- [ ] **Step 1: Write the E2E script**

Create `tests/e2e/admin.py`:

```python
"""End-to-end check of /admin against the in-memory GitHub fake.

Run against a fresh server (the fake keeps state for the life of the process):
  ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011
  uv run --with playwright python tests/e2e/admin.py http://localhost:3011
"""

import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3011"
SLUG = "introducing-eddie-os"
ONE_CHANGE = re.compile(r"^1 change$")
ANY_CHANGES = re.compile(r"^\d+ changes?$")


def api(page, path):
    res = page.request.get(f"{BASE}/api/admin/{path}")
    assert res.ok, f"{path}: {res.status}"
    return res.json()


def post(page, path, data):
    return page.request.post(f"{BASE}/api/admin/{path}", data=data, headers={"Origin": BASE})


with sync_playwright() as p:
    browser = p.chromium.launch()

    # Visitors: no admin UI, no editor code, no admin API calls.
    visitor = browser.new_page(viewport={"width": 1400, "height": 900})
    urls = []
    visitor.on("request", lambda r: urls.append(r.url))
    visitor.goto(f"{BASE}/about")
    expect(visitor.get_by_role("heading", name="Eddie Kranz").first).to_be_visible(timeout=30_000)
    visitor.wait_for_timeout(1500)
    assert visitor.locator("[data-editable]").count() == 0
    assert not any("/api/admin/" in u or "mdxeditor" in u.lower() for u in urls), [u for u in urls if "admin" in u or "mdx" in u.lower()]
    assert visitor.request.get(f"{BASE}/api/admin/content").status == 401

    # Sign in.
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto(f"{BASE}/admin")
    page.get_by_role("link", name="Sign in with GitHub").click()
    page.wait_for_url(f"{BASE}/admin")

    # In-place edit on main.
    blurb = page.locator('[data-editable="profile.blurb"]')
    expect(blurb).to_be_visible(timeout=30_000)
    blurb.click()
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type("Edited by e2e.")
    blurb.evaluate("e => e.blur()")
    expect(page.get_by_text(ONE_CHANGE)).to_be_visible()
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0)
    assert api(page, "content?branch=main")["profile"]["profile"]["blurb"] == "Edited by e2e."

    # Stale head and hostile paths are rejected server-side.
    head = api(page, "content?branch=main")["head"]
    assert post(page, "commit", {"branch": "main", "head": "stale", "message": "", "changes": [{"kind": "json", "file": "content/projects.json", "value": []}]}).status == 409
    hostile = post(page, "commit", {"branch": "main", "head": head, "message": "", "changes": [{"kind": "upload", "path": "../.github/workflows/x.yml", "base64": "AA=="}]})
    assert hostile.status == 400, hostile.status
    assert page.request.post(f"{BASE}/api/admin/commit", data={}).status == 403  # no Origin header

    # Draft branch.
    page.locator("header").get_by_role("button", name="main").click()
    page.get_by_text("New Branch…").click()
    page.get_by_role("dialog").get_by_role("textbox").fill("E2E Test")
    page.get_by_role("button", name="Create").click()
    expect(page.locator("header").get_by_role("button", name="drafts/e2e-test")).to_be_visible()

    # Edit the real post in the rich editor.
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name="Introducing Eddie OS").first.click()
    body = page.locator(".eos-mdx [contenteditable='true']").first
    expect(body).to_be_visible(timeout=30_000)
    body.click()
    page.keyboard.press("ControlOrMeta+End")
    page.keyboard.type(" E2E line.")
    expect(page.get_by_text(ONE_CHANGE)).to_be_visible()
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0)
    draft = api(page, f"post?branch=drafts/e2e-test&slug={SLUG}")["draft"]
    assert "E2E line." in draft["body"]
    assert draft["body"].count("::sketch{") == 3, draft["body"]
    assert "E2E line." not in api(page, f"post?branch=main&slug={SLUG}")["draft"]["body"]

    # JSX the rich editor cannot parse survives a save from source mode.
    page.get_by_role("button", name="New post").click()
    page.get_by_role("textbox", name="Title").last.fill("E2E Raw")
    page.get_by_title("Source mode").last.click()
    source = page.locator(".eos-mdx .cm-content").last
    source.click()
    page.keyboard.type('<Foo bar="1" />\n\nplain text')
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0)
    raw = api(page, "post?branch=drafts/e2e-test&slug=e2e-raw")["draft"]["body"]
    assert '<Foo bar="1" />' in raw and "plain text" in raw, raw

    # Publish the branch.
    page.get_by_role("button", name="Publish to main").click()
    page.get_by_role("dialog").get_by_role("button", name="Publish").click()
    expect(page.locator("header").get_by_role("button", name="main")).to_be_visible()
    assert "E2E line." in api(page, f"post?branch=main&slug={SLUG}")["draft"]["body"]
    assert "drafts/e2e-test" not in api(page, "branches")["branches"]

    # Visitors still get the build-time content (edits deploy via git, not live).
    visitor.goto(f"{BASE}/")
    expect(visitor.get_by_text("Edited by e2e.")).to_have_count(0)

    browser.close()
    print("admin e2e: ok")
```

If a locator does not match the installed MDXEditor's DOM (e.g. the source-mode toggle's title or the CodeMirror class), inspect it with `page.pause()`-free tooling (`page.locator(...).evaluate_all("els => els.map(e => e.outerHTML.slice(0, 200))")`) and adjust the locator, not the behaviour under test.

- [ ] **Step 2: Run it on a fresh server**

```bash
ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011   # background
uv run --with playwright python tests/e2e/admin.py http://localhost:3011
```

Expected: `admin e2e: ok`. Fix failures in the product code (or the locator, if the DOM differs) and re-run against a restarted server until green.

- [ ] **Step 3: Production build and visitor bundle check**

```bash
./node_modules/.bin/next build
```

Expected: success; the route table lists `/admin` and `/api/admin/*` as dynamic (`ƒ`) and no `/editor` page. Then `grep -l "mdxeditor" .next/static/chunks/*.js | head` and confirm none of those chunks is listed in the HTML of `/` (`curl -s localhost:3011/ | grep -o '/_next/static/chunks/[^"]*' | sort -u` against the grep result).

- [ ] **Step 4: Docs**

Add to `CLAUDE.md` under Architecture, after the Doom section:

```markdown
### Admin (`app/admin/`, `app/api/admin/`, `lib/admin/`, `components/os/admin/`)

`/admin` boots the OS in edit mode behind GitHub sign-in (allowlist `ADMIN_GITHUB_USERS`, default `edkranz`).
The GitHub token is AES-GCM sealed into the httpOnly `eos_admin` cookie (`lib/admin/session.ts`). Editable copy
lives in `content/profile.json` + `content/projects.json`; components read it through `useContent()` and wrap
strings in `<Editable file path value>`. Posts are edited in the `editor` app (MDXEditor, lazy-loaded). Pending
edits sit in `lib/os/admin/store.ts` until Save, which commits every change as one commit through the Git Data API
(`lib/admin/github-backend.ts`), refusing if the branch moved. Draft branches are `drafts/<name>`; Publish
squash-merges a PR into `main`. Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_SESSION_SECRET`.
Local E2E: `ADMIN_FAKE_GITHUB=1` swaps GitHub for an in-memory fake (ignored in production);
`pnpm test` runs the unit tests, `uv run --with playwright python tests/e2e/admin.py http://localhost:3011` the E2E.
```

In the "Working agreements" bullet about verification, append: "`pnpm test` runs the `node --test` unit tests for `lib/admin`."

In the spec's section 7, replace "a post edit round-trip (Markdown unchanged except the edit, `:::sketch` intact)" with "a post edit round-trip (MDXEditor may normalise Markdown formatting on the first edit; content and `::sketch` directives must survive)".

- [ ] **Step 5: Commit**

```bash
git add tests/e2e CLAUDE.md docs/superpowers/specs
git commit -m "Admin: end-to-end test against the GitHub fake; docs (#97)"
```

---

### Task 12: Real GitHub smoke test (with Eddie)

**Files:** none (configuration and a manual check).

- [ ] **Step 1: Eddie creates two GitHub OAuth apps**

At https://github.com/settings/developers → New OAuth App, signed in as `edkranz`:
- "kranz.au admin": homepage `https://kranz.au`, callback `https://kranz.au/api/admin/callback`.
- "kranz.au admin (local)": homepage `http://localhost:3001`, callback `http://localhost:3001/api/admin/callback`.

Eddie puts the local app's id/secret plus `ADMIN_SESSION_SECRET=$(openssl rand -base64 48)` in `.env.local` (git-ignored), and the production app's values plus a different session secret in Vercel → Project → Settings → Environment Variables (Production).

- [ ] **Step 2: Local smoke test against real GitHub**

```bash
./node_modules/.bin/next dev --turbopack -p 3001
```

Eddie signs in at `http://localhost:3001/admin`. Then, with Eddie watching: New Branch… `smoke test`, edit one hobby, Save. Confirm with `gh api repos/edkranz/blog/commits?sha=drafts/smoke-test -q '.[0].commit.message'` → `Edit profile`, and that Vercel posted a preview deployment (the save bar's Preview link appears within a few minutes). Do **not** publish: delete the branch with `gh api -X DELETE repos/edkranz/blog/git/refs/heads/drafts/smoke-test` and switch back to `main` in the UI.

- [ ] **Step 3: Allowlist check**

Set `ADMIN_GITHUB_USERS=nobody` in `.env.local`, restart, sign in: lands on `/admin?denied=1` with "Access denied." and `curl -s localhost:3001/api/admin/session` (no cookie) → 401. Restore the variable.

- [ ] **Step 4: Ship**

After Eddie approves: push the branch, open a PR referencing #97 (`Closes #97`), and merge to `main` (a production deploy). Close the issue if the PR did not.
