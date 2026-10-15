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
