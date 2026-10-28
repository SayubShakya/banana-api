// Tests for the puzzle API, using a fake Banana API so they run without the network.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/app');
const { createPuzzleStore } = require('../server/puzzles');
const { parsePuzzle, BananaApiError } = require('../server/services/bananaApi');
const { createPuzzlePool } = require('../server/pool');

const IMAGE = 'https://www.sanfoh.com/uob/banana/data/t1.png';

async function withServer(bananaApi, fn) {
  const server = createApp({ bananaApi }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://localhost:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

const fakeApi = (solution = 7) => ({ fetchPuzzle: async () => ({ image: IMAGE, solution }) });
const post = (base, body) => fetch(`${base}/api/puzzle/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GET /api/puzzle returns the image but never the solution', async () => {
  await withServer(fakeApi(7), async (base) => {
    const res = await fetch(`${base}/api/puzzle?purpose=crate`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.image, IMAGE);
    assert.equal(body.purpose, 'crate');
    assert.equal(body.source, 'live');
    assert.equal(typeof body.puzzleId, 'string');
    assert.equal('solution' in body, false);
  });
});

test('a correct answer is accepted and the puzzle cannot be reused', async () => {
  await withServer(fakeApi(7), async (base) => {
    const { puzzleId } = await (await fetch(`${base}/api/puzzle`)).json();
    const first = await (await post(base, { puzzleId, answer: 7 })).json();
    assert.deepEqual(first, { correct: true, solution: 7, purpose: 'deploy' });
    const again = await post(base, { puzzleId, answer: 7 });
    assert.equal(again.status, 404);
  });
});

test('a wrong answer is rejected and the solution is revealed', async () => {
  await withServer(fakeApi(3), async (base) => {
    const { puzzleId } = await (await fetch(`${base}/api/puzzle?purpose=respawn`)).json();
    const body = await (await post(base, { puzzleId, answer: 5 })).json();
    assert.deepEqual(body, { correct: false, solution: 3, purpose: 'respawn' });
  });
});

test('bad answers are refused with 400', async () => {
  await withServer(fakeApi(), async (base) => {
    assert.equal((await post(base, { puzzleId: 'x', answer: '7' })).status, 400);
    assert.equal((await post(base, { answer: 7 })).status, 400);
  });
});

test('an unknown purpose falls back to deploy', async () => {
  await withServer(fakeApi(), async (base) => {
    const body = await (await fetch(`${base}/api/puzzle?purpose=hack`)).json();
    assert.equal(body.purpose, 'deploy');
  });
});

test('a Banana API failure becomes a 502 with a friendly message', async () => {
  const broken = { fetchPuzzle: async () => { throw new BananaApiError('Banana API is unreachable'); } };
  await withServer(broken, async (base) => {
    const res = await fetch(`${base}/api/puzzle`);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /not responding/);
  });
});

test('puzzles expire after the time limit', () => {
  let clock = 0;
  const store = createPuzzleStore({ ttlMs: 1000, now: () => clock });
  const id = store.add(4, 'deploy');
  clock = 2000;
  assert.equal(store.answer(id, 4), null);
});

test('the Banana API response is parsed from JSON, CSV and base64', () => {
  const png = 'iVBORw0KGgo' + 'A'.repeat(120);
  assert.deepEqual(parsePuzzle(JSON.stringify({ question: IMAGE, solution: 2 }), 'json'), { image: IMAGE, solution: 2 });
  assert.deepEqual(parsePuzzle(`${IMAGE},9`, 'csv'), { image: IMAGE, solution: 9 });
  assert.deepEqual(parsePuzzle(JSON.stringify({ question: png, solution: 0 }), 'json', true), { image: `data:image/png;base64,${png}`, solution: 0 });
  assert.throws(() => parsePuzzle('{"question":"nope","solution":1}', 'json'), BananaApiError);
  assert.throws(() => parsePuzzle(JSON.stringify({ question: IMAGE, solution: 12 }), 'json'), BananaApiError, 'the answer must be one digit');
  assert.throws(() => parsePuzzle(JSON.stringify({ question: 'not base64!', solution: 1 }), 'json', true), BananaApiError);
});

test('the pool keeps puzzles ready so the next one is instant', async () => {
  let calls = 0;
  const pool = createPuzzlePool({ fetchPuzzle: async () => ({ image: `${IMAGE}?n=${++calls}`, solution: 1 }), size: 2 });
  pool.warmUp();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(pool.status().ready, 2);
  const p = await pool.take();
  assert.equal(p.source, 'live');
  assert.equal(pool.status().online, true);
});

test('when the Banana API goes down the pool serves reserve puzzles', async () => {
  let up = true;
  const pool = createPuzzlePool({
    fetchPuzzle: async () => { if (!up) throw new BananaApiError('Banana API is unreachable'); return { image: IMAGE, solution: 4 }; },
    size: 0,
  });
  await pool.take();          // one live puzzle goes into the reserve
  up = false;
  const p = await pool.take();
  assert.equal(p.source, 'reserve');
  assert.equal(p.solution, 4);
  assert.equal(pool.status().online, false);
  assert.match(pool.status().lastError, /unreachable/);
});

test('with no reserve, an outage is reported as an error', async () => {
  const pool = createPuzzlePool({ fetchPuzzle: async () => { throw new BananaApiError('down'); }, size: 0 });
  await assert.rejects(pool.take(), BananaApiError);
});

test('GET /api/status reports the API state', async () => {
  await withServer(fakeApi(), async (base) => {
    await fetch(`${base}/api/puzzle`);
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.online, true);
    assert.equal(typeof status.reserve, 'number');
  });
});
