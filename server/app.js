// Builds the Express application. Kept separate from index.js so tests can create
// an app with an in-memory database and a fake Banana API.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const path = require('node:path');
const express = require('express');
const session = require('express-session');

const { createAuthRouter } = require('./routes/auth');
const { createGameRouter } = require('./routes/game');
const { createScoresRouter } = require('./routes/scores');
const { createAdminRouter } = require('./routes/admin');

const SESSION_COOKIE = 'banana.sid';

function createApp({ db, bananaApi, sessionSecret, production = false }) {
  const app = express();
  app.set('sessionCookieName', SESSION_COOKIE);
  if (production) app.set('trust proxy', 1);

  // Only JSON bodies are accepted. Together with SameSite cookies this blocks
  // simple cross-site form posts (CSRF).
  app.use(express.json({ limit: '10kb' }));

  app.use(session({
    name: SESSION_COOKIE,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false, // no cookie until the user logs in
    cookie: {
      httpOnly: true,         // JavaScript in the page cannot read it (protects against XSS theft)
      sameSite: 'lax',        // not sent on cross-site POSTs (CSRF protection)
      secure: production,     // HTTPS only in production
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
    },
  }));

  app.use('/api/auth', createAuthRouter({ db }));
  app.use('/api/game', createGameRouter({ db, bananaApi }));
  app.use('/api/scores', createScoresRouter({ db }));
  app.use('/api/admin', createAdminRouter({ db }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Last-resort error handler: log the detail, send a generic message.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}

module.exports = { createApp, SESSION_COOKIE };
