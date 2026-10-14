// Integration tests: start the real Express app on a random port with an in-memory
// database and a fake Banana API, then call it over HTTP like a browser would.
// Run with: npm test
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createApp } = require('../server/app');
const { openDatabase } = require('../server/db/database');

const SOLUTION = 6;
const fakeBananaApi = {
  fetchPuzzle: async () => ({ imageUrl: 'https://example.com/puzzle.png', solution: SOLUTION }),
};

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase(':memory:');
  db.createUser('boss', bcrypt.hashSync('adminpass1', 4), 'admin');
  const app = createApp({ db, bananaApi: fakeBananaApi, sessionSecret: 'test-secret' });
  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

// A tiny "browser" that remembers its session cookie between requests.
function client() {
  let cookie = '';
  return async function call(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, body: await res.json(), setCookie };
  };
}

test('register sets an HttpOnly session cookie and /me knows the user', async () => {
  const call = client();
  const reg = await call('POST', '/api/auth/register', { username: 'alice', password: 'password123' });
  assert.equal(reg.status, 201);
  assert.match(reg.setCookie, /HttpOnly/i);
  assert.match(reg.setCookie, /SameSite=Lax/i);

  const me = await call('GET', '/api/auth/me');
  assert.equal(me.body.user.username, 'alice');
  assert.equal(me.body.user.role, 'player');
});

test('passwords are stored hashed, never in plain text', () => {
  const row = db.findUserByUsername('alice');
  assert.notEqual(row.password_hash, 'password123');
  assert.ok(bcrypt.compareSync('password123', row.password_hash));
});

test('register validates input and rejects duplicate usernames', async () => {
  const call = client();
  assert.equal((await call('POST', '/api/auth/register', { username: 'a', password: 'password123' })).status, 400);
  assert.equal((await call('POST', '/api/auth/register', { username: 'bob', password: 'short' })).status, 400);
  assert.equal((await call('POST', '/api/auth/register', { username: 'ALICE', password: 'password123' })).status, 409);
});

test('login fails with the same message for wrong password and unknown user', async () => {
  const call = client();
  const wrongPass = await call('POST', '/api/auth/login', { username: 'alice', password: 'nope-nope' });
  const noUser = await call('POST', '/api/auth/login', { username: 'ghost', password: 'nope-nope' });
  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  assert.equal(wrongPass.body.error, noUser.body.error);
});

test('game routes need a login', async () => {
  const call = client();
  assert.equal((await call('POST', '/api/game/start')).status, 401);
});

test('full game: solution stays on the server, score is counted and saved', async () => {
  const call = client();
  await call('POST', '/api/auth/login', { username: 'alice', password: 'password123' });
  await call('POST', '/api/game/start');

  const p1 = await call('GET', '/api/game/puzzle');
  assert.equal(p1.status, 200);
  assert.ok(p1.body.puzzleId);
  assert.equal(p1.body.solution, undefined, 'solution must not be sent before answering');

  const right = await call('POST', '/api/game/answer', { puzzleId: p1.body.puzzleId, answer: SOLUTION });
  assert.equal(right.body.correct, true);

  const again = await call('POST', '/api/game/answer', { puzzleId: p1.body.puzzleId, answer: SOLUTION });
  assert.equal(again.status, 409, 'cannot answer the same puzzle twice');

  const p2 = await call('GET', '/api/game/puzzle');
  const wrong = await call('POST', '/api/game/answer', { puzzleId: p2.body.puzzleId, answer: SOLUTION + 1 });
  assert.equal(wrong.body.correct, false);

  const end = await call('POST', '/api/game/end');
  assert.deepEqual(
    { score: end.body.game.score, solved: end.body.game.solved, attempted: end.body.game.attempted },
    { score: 10, solved: 1, attempted: 2 },
  );

  const board = await call('GET', '/api/scores/leaderboard');
  assert.equal(board.body.scores[0].username, 'alice');
  assert.equal(board.body.scores[0].score, 10);
});

test('requesting a new puzzle without answering counts as an attempt', async () => {
  const call = client();
  await call('POST', '/api/auth/login', { username: 'alice', password: 'password123' });
  await call('POST', '/api/game/start');
  await call('GET', '/api/game/puzzle');
  await call('GET', '/api/game/puzzle');
  const state = await call('GET', '/api/game/state');
  assert.equal(state.body.game.attempted, 1);
});

test('admin routes: 401 logged out, 403 for players, 200 for admins', async () => {
  const anon = client();
  assert.equal((await anon('GET', '/api/admin/users')).status, 401);

  const player = client();
  await player('POST', '/api/auth/login', { username: 'alice', password: 'password123' });
  assert.equal((await player('GET', '/api/admin/users')).status, 403);

  const admin = client();
  await admin('POST', '/api/auth/login', { username: 'boss', password: 'adminpass1' });
  const users = await admin('GET', '/api/admin/users');
  assert.equal(users.status, 200);
  assert.ok(users.body.users.some(u => u.username === 'alice'));
});

test('logout ends the session', async () => {
  const call = client();
  await call('POST', '/api/auth/login', { username: 'alice', password: 'password123' });
  await call('POST', '/api/auth/logout');
  assert.equal((await call('GET', '/api/auth/me')).body.user, null);
});
