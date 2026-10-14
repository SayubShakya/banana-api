// SQLite database access. All SQL lives here so routes never build queries.
// Uses prepared statements (? placeholders), which prevents SQL injection.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// file can be ':memory:' for tests.
function openDatabase(file) {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const stmt = {
    createUser: db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    userById: db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?'),
    listUsers: db.prepare(`
      SELECT u.id, u.username, u.role, u.created_at,
             COUNT(s.id) AS games_played, COALESCE(MAX(s.score), 0) AS best_score
      FROM users u LEFT JOIN scores s ON s.user_id = u.id
      GROUP BY u.id ORDER BY u.id`),
    setRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
    insertScore: db.prepare(
      'INSERT INTO scores (user_id, score, puzzles_solved, puzzles_attempted) VALUES (?, ?, ?, ?)'),
    leaderboard: db.prepare(`
      SELECT u.username, s.score, s.puzzles_solved, s.puzzles_attempted, s.created_at
      FROM scores s JOIN users u ON u.id = s.user_id
      ORDER BY s.score DESC, s.created_at ASC LIMIT ?`),
    scoresForUser: db.prepare(`
      SELECT score, puzzles_solved, puzzles_attempted, created_at
      FROM scores WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`),
    deleteScoresForUser: db.prepare('DELETE FROM scores WHERE user_id = ?'),
  };

  return {
    raw: db,
    createUser: (username, passwordHash, role = 'player') =>
      stmt.createUser.run(username, passwordHash, role).lastInsertRowid,
    findUserByUsername: username => stmt.userByName.get(username),
    findUserById: id => stmt.userById.get(id),
    listUsers: () => stmt.listUsers.all(),
    setRole: (id, role) => stmt.setRole.run(role, id).changes,
    insertScore: (userId, { score, solved, attempted }) =>
      stmt.insertScore.run(userId, score, solved, attempted).lastInsertRowid,
    leaderboard: (limit = 10) => stmt.leaderboard.all(limit),
    scoresForUser: (userId, limit = 10) => stmt.scoresForUser.all(userId, limit),
    deleteScoresForUser: userId => stmt.deleteScoresForUser.run(userId).changes,
    close: () => db.close(),
  };
}

module.exports = { openDatabase };
