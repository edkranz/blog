import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// Vercel's Ignored Build Step: exit 0 skips the build, exit 1 builds.
const builds = (ref: string, message: string) =>
  spawnSync('sh', ['scripts/vercel-ignore.sh'], { env: { ...process.env, VERCEL_GIT_COMMIT_REF: ref, VERCEL_GIT_COMMIT_MESSAGE: message } }).status === 1;

test('draft saves skip the Vercel build unless they ask for a preview', () => {
  assert.equal(builds('drafts/x', 'Edit profile'), false);
  assert.equal(builds('drafts/x', 'Deploy preview [preview]'), true);
});

test('main and other branches always build', () => {
  assert.equal(builds('main', 'Edit profile'), true);
  assert.equal(builds('claude/feature', 'Anything'), true);
});
