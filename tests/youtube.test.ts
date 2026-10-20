import assert from 'node:assert/strict';
import { test } from 'node:test';
import { youtubeId } from '../lib/youtube.ts';

test('reads the id from every YouTube URL shape', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=JELkOCyqP0Q'), 'JELkOCyqP0Q');
  assert.equal(youtubeId('https://m.youtube.com/watch?v=JELkOCyqP0Q&t=30'), 'JELkOCyqP0Q');
  assert.equal(youtubeId('https://youtu.be/JELkOCyqP0Q'), 'JELkOCyqP0Q');
  assert.equal(youtubeId('https://www.youtube.com/shorts/JELkOCyqP0Q'), 'JELkOCyqP0Q');
  assert.equal(youtubeId('https://www.youtube-nocookie.com/embed/JELkOCyqP0Q'), 'JELkOCyqP0Q');
});

test('is null for channels, other sites and relative paths', () => {
  assert.equal(youtubeId('https://www.youtube.com/@eddiekranz'), null);
  assert.equal(youtubeId('https://github.com/edkranz/oxide'), null);
  assert.equal(youtubeId('/papers/expanding-reality-with-virtual-impossible-spaces.pdf'), null);
});
