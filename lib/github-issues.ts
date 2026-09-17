'use client';

import { profile } from '@/lib/eddie';

/**
 * The site's own GitHub issues, read straight from the public REST API in the browser.
 * Unauthenticated requests get 60/hour per IP, so results are cached per session.
 */
export type Issue = {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  createdAt: string;
  closedAt: string | null;
};

export const ISSUES_URL = `https://github.com/${profile.repo}/issues`;
export const NEW_ISSUE_URL = `https://github.com/${profile.repo}/issues/new?labels=enhancement&title=`;

const API = `https://api.github.com/repos/${profile.repo}/issues?state=all&per_page=100&sort=updated`;
const KEY = 'eddie-os-issues';
const TTL = 10 * 60 * 1000;

type Cached = { at: number; issues: Issue[] };

function readCache(): Cached | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(issues: Issue[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), issues } satisfies Cached));
  } catch {}
}

type ApiIssue = {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  created_at: string;
  closed_at: string | null;
  pull_request?: unknown;
};

/** Fetch issues (PRs excluded). Falls back to the session cache when GitHub is unreachable or rate-limited. */
export async function fetchIssues(): Promise<Issue[]> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < TTL) return cached.issues;
  try {
    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as ApiIssue[];
    const issues = data
      .filter((i) => !i.pull_request)
      .map<Issue>((i) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        state: i.state,
        labels: i.labels.map((l) => ({ name: l.name, color: l.color })),
        createdAt: i.created_at,
        closedAt: i.closed_at,
      }));
    writeCache(issues);
    return issues;
  } catch (e) {
    if (cached) return cached.issues;
    throw e;
  }
}
