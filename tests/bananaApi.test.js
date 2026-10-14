// Unit tests for the Banana API client, using a fake fetch (no network needed).
// Run with: npm test
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBananaApi, parsePuzzle, BananaApiError } = require('../server/services/bananaApi');

const IMG = 'https://www.sanfoh.com/uob/banana/data/abc.png';

test('parses a JSON response', () => {
  const body = `{ "question" : "${IMG}" , "solution" : 7 }`;
  assert.deepEqual(parsePuzzle(body, 'json'), { imageUrl: IMG, solution: 7 });
});

test('parses a CSV response', () => {
  assert.deepEqual(parsePuzzle(`${IMG},3\n`, 'csv'), { imageUrl: IMG, solution: 3 });
});

test('rejects invalid responses', () => {
  assert.throws(() => parsePuzzle('not json', 'json'), BananaApiError);
  assert.throws(() => parsePuzzle('{"question":"x","solution":1}', 'json'), BananaApiError);
  assert.throws(() => parsePuzzle(`{"question":"${IMG}","solution":"one"}`, 'json'), BananaApiError);
});

test('retries once after a network failure, then succeeds', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('fetch failed');
    return new Response(JSON.stringify({ question: IMG, solution: 4 }));
  };
  const api = createBananaApi({ fetchImpl, retries: 1 });
  assert.deepEqual(await api.fetchPuzzle(), { imageUrl: IMG, solution: 4 });
  assert.equal(calls, 2);
});

test('gives up with BananaApiError when the service keeps failing', async () => {
  const fetchImpl = async () => new Response('down', { status: 500 });
  const api = createBananaApi({ fetchImpl, retries: 1 });
  await assert.rejects(api.fetchPuzzle(), BananaApiError);
});
