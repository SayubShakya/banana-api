// Entry point: reads settings from the environment (.env), opens the database
// and starts the web server.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const crypto = require('node:crypto');
const path = require('node:path');
const { createApp } = require('./app');
const { openDatabase } = require('./db/database');
const { createBananaApi } = require('./services/bananaApi');

const PORT = Number(process.env.PORT) || 3000;
const production = process.env.NODE_ENV === 'production';
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'banana.db');

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'change-me') {
  if (production) {
    console.error('SESSION_SECRET must be set in production. See .env.example');
    process.exit(1);
  }
  // Fine for local development; everyone is logged out when the server restarts.
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET not set - using a random one for this run.');
}

const db = openDatabase(DB_FILE);
const bananaApi = createBananaApi();
const app = createApp({ db, bananaApi, sessionSecret, production });

app.listen(PORT, () => {
  console.log(`Banana game running at http://localhost:${PORT}`);
});
