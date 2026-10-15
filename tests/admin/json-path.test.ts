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

test('appendAt with an empty path appends to a top-level array', () => {
  assert.deepEqual(appendAt([1], '', 2), [1, 2]);
});
