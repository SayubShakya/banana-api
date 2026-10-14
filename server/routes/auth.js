// Register, log in, log out, and "who am I?".
// Passwords are hashed with bcrypt (salted, slow on purpose); plain text is never stored.
// After login the server keeps the user's id in a session; the browser only holds
// a random session id in an HttpOnly cookie. This adds state to stateless HTTP.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const express = require('express');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;

// express-session uses callbacks; wrap them so routes can use await.
const regenerate = req => new Promise((ok, fail) => req.session.regenerate(e => (e ? fail(e) : ok())));
const destroy = req => new Promise((ok, fail) => req.session.destroy(e => (e ? fail(e) : ok())));

// A fresh session id on login stops "session fixation" attacks.
async function startSession(req, user) {
  await regenerate(req);
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
}

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function createAuthRouter({ db }) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 letters, numbers or _' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    if (db.findUserByUsername(username)) {
      return res.status(409).json({ error: 'That username is taken' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = db.createUser(username, hash);
    const user = { id: Number(id), username, role: 'player' };
    await startSession(req, user);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    const user = typeof username === 'string' ? db.findUserByUsername(username) : undefined;
    const ok = user && typeof password === 'string' && (await bcrypt.compare(password, user.password_hash));

    // Same message for "no such user" and "wrong password" so attackers
    // cannot find out which usernames exist.
    if (!ok) return res.status(401).json({ error: 'Wrong username or password' });

    await startSession(req, user);
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', async (req, res) => {
    await destroy(req);
    res.clearCookie(req.app.get('sessionCookieName'));
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const user = db.findUserById(req.session.userId);
    res.json({ user: user ? publicUser(user) : null });
  });

  return router;
}

module.exports = { createAuthRouter };
