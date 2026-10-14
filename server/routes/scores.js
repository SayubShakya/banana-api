// Leaderboard (public) and the logged-in player's own history.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const express = require('express');
const { requireLogin } = require('../middleware/auth');

function createScoresRouter({ db }) {
  const router = express.Router();

  router.get('/leaderboard', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    res.json({ scores: db.leaderboard(limit) });
  });

  router.get('/me', requireLogin, (req, res) => {
    res.json({ scores: db.scoresForUser(req.session.userId, 10) });
  });

  return router;
}

module.exports = { createScoresRouter };
