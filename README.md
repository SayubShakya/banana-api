# banana-api

CIS046-3 Software for Enterprise, Assignment 1 (University of Bedfordshire). Author: Sayub Shakya.

A web game built with Node.js on top of the [Banana API](https://marcconrad.com/uob/banana/doc.php) by Marc Conrad.
The project demonstrates four themes: version control, event-driven programming, interoperability and virtual identity.

> **Game concept: to be decided.** `public/play.html` is a placeholder screen that proves the whole
> flow works (login → puzzle → answer → score → leaderboard). It will be replaced by the real game.

## Requirements

- Node.js 22 or later
- npm

## Setup

```bash
npm install
cp .env.example .env            # then set SESSION_SECRET
npm start                       # http://localhost:3000
npm run dev                     # same, but restarts when files change
npm test                        # run the automated tests
npm run create-admin -- <username> <password>   # create (or promote) an admin
```

## Architecture

```
Browser (HTML/CSS/JS)  ──HTTP + JSON──▶  Node.js / Express server  ──HTTPS + JSON──▶  Banana API
  public/                                 server/                                    marcconrad.com
                                            │
                                            ▼
                                          SQLite (data/banana.db)
```

The browser never talks to the Banana API directly. The server fetches each puzzle, keeps the
solution in the player's session, and sends only the image URL to the browser. That way the answer
cannot be read in the browser's developer tools, and scores are counted on the server.

## Project structure

| Path | Purpose |
|---|---|
| `server/index.js` | Entry point: reads `.env`, opens the database, starts the server |
| `server/app.js` | Express app: JSON parsing, session cookie settings, routes |
| `server/services/bananaApi.js` | **All** calls to the Banana API (timeout, retry, JSON/CSV parsing) |
| `server/routes/auth.js` | Register, login, logout, `/me` (bcrypt + sessions) |
| `server/routes/game.js` | Start game, get puzzle, answer, skip, end game |
| `server/routes/scores.js` | Leaderboard and personal score history |
| `server/routes/admin.js` | Admin-only user list and score reset |
| `server/middleware/auth.js` | `requireLogin` and `requireAdmin` guards |
| `server/db/` | SQLite schema and all SQL queries |
| `public/` | Pages, styles and browser JavaScript (`eventBus.js` = publish/subscribe) |
| `tests/` | Automated tests (`node --test`) |
| `scripts/create-admin.js` | Command-line tool to create an admin |

## REST API

| Method | Path | Login | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{ username, password }` → creates account and logs in |
| POST | `/api/auth/login` | – | `{ username, password }` → logs in |
| POST | `/api/auth/logout` | – | Ends the session |
| GET | `/api/auth/me` | – | Current user or `null` |
| POST | `/api/game/start` | ✔ | Starts a new game |
| GET | `/api/game/puzzle` | ✔ | `{ puzzleId, imageUrl }` (solution stays on the server) |
| POST | `/api/game/answer` | ✔ | `{ puzzleId, answer }` → `{ correct, solution, game }` |
| POST | `/api/game/skip` | ✔ | Gives up the current puzzle (e.g. timer ran out) |
| POST | `/api/game/end` | ✔ | Saves the score |
| GET | `/api/game/state` | ✔ | Current game or `null` |
| GET | `/api/scores/leaderboard` | – | Top scores (`?limit=10`) |
| GET | `/api/scores/me` | ✔ | Your last 10 games |
| GET | `/api/admin/users` | admin | All users with stats |
| DELETE | `/api/admin/users/:id/scores` | admin | Deletes a user's scores |

## References and credits

- Banana API by Marc Conrad: https://marcconrad.com/uob/banana/doc.php
- Libraries: [Express](https://expressjs.com/), [express-session](https://github.com/expressjs/session),
  [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- The initial project scaffolding was written with help from Claude (Anthropic), October 2026.
  Every file it produced says so in a comment at the top, as the assignment brief requires.
