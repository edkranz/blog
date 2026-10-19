import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInline } from '../components/os/inline-markdown-parse.ts';

test('parses *em* and **strong**, leaves the rest as text', () => {
  assert.deepEqual(parseInline('a *b* c **d** e'), [{ text: 'a ' }, { text: 'b', em: true }, { text: ' c ' }, { text: 'd', strong: true }, { text: ' e' }]);
  assert.deepEqual(parseInline('no marks'), [{ text: 'no marks' }]);
  assert.deepEqual(parseInline('dangling *star'), [{ text: 'dangling *star' }]);
});
