// Game API: start a game, get a puzzle, answer it, end the game.
//
// Anti-cheat design: the server fetches the puzzle from the Banana API and keeps the
// solution in the user's session. The browser only receives the image URL, so the
// answer cannot be read in DevTools. The score is also counted on the server, so a
// player cannot just send "score: 9999".
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const crypto = require('node:crypto');
const express = require('express');
const { requireLogin } = require('../middleware/auth');

// Change these to fit your game design.
const POINTS_PER_CORRECT = 10;

function createGameRouter({ db, bananaApi }) {
  const router = express.Router();
  router.use(requireLogin);

  router.post('/start', (req, res) => {
    req.session.game = { score: 0, solved: 0, attempted: 0, startedAt: Date.now() };
    req.session.puzzle = null;
    res.json({ game: req.session.game });
  });

  router.get('/puzzle', async (req, res) => {
    if (!req.session.game) return res.status(409).json({ error: 'Start a game first' });

    // Asking for a new puzzle while one is unanswered (e.g. refreshing the page)
    // counts as a failed attempt, so players cannot skip hard puzzles for free.
    if (req.session.puzzle) {
      req.session.game.attempted += 1;
      req.session.puzzle = null;
    }

    let puzzle;
    try {
      puzzle = await bananaApi.fetchPuzzle();
    } catch (err) {
      console.error('[banana-api]', err.message);
      return res.status(503).json({ error: 'The puzzle service is not responding. Try again.' });
    }

    const puzzleId = crypto.randomUUID();
    req.session.puzzle = { id: puzzleId, solution: puzzle.solution, issuedAt: Date.now() };
    res.json({ puzzleId, imageUrl: puzzle.imageUrl });
  });

  router.post('/answer', (req, res) => {
    const { game, puzzle } = req.session;
    const { puzzleId, answer } = req.body ?? {};

    if (!game) return res.status(409).json({ error: 'Start a game first' });
    if (!puzzle || puzzle.id !== puzzleId) {
      return res.status(409).json({ error: 'This puzzle is no longer active' });
    }
    const guess = Number(answer);
    if (!Number.isInteger(guess)) return res.status(400).json({ error: 'Answer must be a whole number' });

    // One answer per puzzle: stops guessing 0-9 until one is right.
    req.session.puzzle = null;

    const correct = guess === puzzle.solution;
    game.attempted += 1;
    if (correct) {
      game.solved += 1;
      game.score += POINTS_PER_CORRECT;
    }
    res.json({ correct, solution: puzzle.solution, game });
  });

  // Used when the player runs out of time on a puzzle: counts as an attempt.
  router.post('/skip', (req, res) => {
    const { game, puzzle } = req.session;
    if (!game) return res.status(409).json({ error: 'Start a game first' });
    if (!puzzle) return res.status(409).json({ error: 'No active puzzle' });

    req.session.puzzle = null;
    game.attempted += 1;
    res.json({ solution: puzzle.solution, game });
  });

  router.post('/end', (req, res) => {
    const { game } = req.session;
    if (!game) return res.status(409).json({ error: 'No game in progress' });

    db.insertScore(req.session.userId, game);
    req.session.game = null;
    req.session.puzzle = null;
    res.json({ saved: true, game });
  });

  router.get('/state', (req, res) => {
    res.json({ game: req.session.game ?? null });
  });

  return router;
}

module.exports = { createGameRouter, POINTS_PER_CORRECT };
