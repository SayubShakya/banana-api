// Admin-only endpoints. Shows authorisation: a logged-in player gets 403 here.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const express = require('express');
const { requireAdmin } = require('../middleware/auth');

function createAdminRouter({ db }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/users', (req, res) => {
    res.json({ users: db.listUsers() });
  });

  router.delete('/users/:id/scores', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad user id' });
    if (!db.findUserById(id)) return res.status(404).json({ error: 'No such user' });
    res.json({ deleted: db.deleteScoresForUser(id) });
  });

  return router;
}

module.exports = { createAdminRouter };
