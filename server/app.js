// The Banana Brigade web server: serves the screens and gives them Banana API puzzles.
//
//   GET  /api/puzzle?purpose=deploy|respawn|crate   -> { puzzleId, image, purpose, source }
//   POST /api/puzzle/answer  { puzzleId, answer }   -> { correct, solution, purpose }
//   GET  /api/status                                -> { online, ready, reserve, ... }
//
// The browser never calls the Banana API itself: the server fetches the puzzle,
// keeps the solution and only sends the picture, so the answer cannot be read in
// the browser's developer tools.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

const path = require('node:path');
const express = require('express');
const { createPuzzleStore } = require('./puzzles');
const { createPuzzlePool } = require('./pool');

const PURPOSES = ['deploy', 'respawn', 'crate'];

function createApp({ bananaApi, puzzleStore = createPuzzleStore(), pool = createPuzzlePool({ fetchPuzzle: bananaApi.fetchPuzzle }) }) {
  const app = express();
  app.use(express.json({ limit: '2kb' }));

  app.get('/api/puzzle', async (req, res) => {
    const purpose = PURPOSES.includes(req.query.purpose) ? req.query.purpose : 'deploy';
    try {
      const { image, solution, source } = await pool.take();
      const puzzleId = puzzleStore.add(solution, purpose);
      res.set('Cache-Control', 'no-store');
      res.json({ puzzleId, image, purpose, source });
    } catch (err) {
      console.error('Banana API error:', err.message);
      res.status(502).json({ error: 'The Banana API is not responding. Try again in a moment.' });
    }
  });

  app.post('/api/puzzle/answer', (req, res) => {
    const { puzzleId, answer } = req.body ?? {};
    if (typeof puzzleId !== 'string' || !Number.isInteger(answer)) {
      return res.status(400).json({ error: 'Send { puzzleId, answer } with a whole-number answer' });
    }
    const result = puzzleStore.answer(puzzleId, answer);
    if (!result) return res.status(404).json({ error: 'That puzzle has expired or was already answered' });
    res.json(result);
  });

  app.get('/api/status', (req, res) => res.json(pool.status()));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
