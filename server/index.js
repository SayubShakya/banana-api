// Entry point: reads settings from the environment and starts the server.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

const { createApp } = require('./app');
const { createPuzzlePool } = require('./pool');
const { createBananaApi, DEFAULT_BASE_URL } = require('./services/bananaApi');

const PORT = Number(process.env.PORT) || 3100;

// Point BANANA_API_URL at a broken address to demonstrate the error handling.
const baseUrl = process.env.BANANA_API_URL || DEFAULT_BASE_URL;
if (baseUrl !== DEFAULT_BASE_URL) console.warn(`Using Banana API at ${baseUrl}`);

const bananaApi = createBananaApi({ baseUrl, timeoutMs: Number(process.env.BANANA_API_TIMEOUT_MS) || 5000 });
const pool = createPuzzlePool({ fetchPuzzle: bananaApi.fetchPuzzle });
const app = createApp({ bananaApi, pool });

app.listen(PORT, () => {
  console.log(`Banana Brigade running at http://localhost:${PORT}`);
  pool.warmUp(); // have puzzles ready before the first player asks
});
