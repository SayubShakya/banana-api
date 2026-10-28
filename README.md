# Banana Brigade

The user interface of a 2D jetpack shooter in the style of the classic doodle army games,
built for CIS046-3 Software for Enterprise by **Sayub Shakya**. Every mode is unlocked with a
puzzle from the [Banana API](https://marcconrad.com/uob/banana/doc.php) by Marc Conrad.

**Scope: UI only.** There is no gameplay. The battle screen shows the HUD over a posed
battlefield; its buttons respond (switch weapon, reload, grenades, zoom) so the interface can be
tried out, and the banana crate and respawn prompts open real Banana API puzzles.

Design preview links open a screen directly: `#puzzle-deploy`, `#puzzle-respawn`, `#puzzle-crate`,
`#battle-quick`, `#battle-team`, `#battle-down`, `#pause`, `#results-survival`, `#avatar`, `#controls`.

## Where the Banana API is used

| Moment | Puzzle | Reward |
|---|---|---|
| Pressing **Quick Play**, **Survival**, **Training** or **Multiplayer** | Deploy puzzle · 30 s · unlimited tries (new puzzle after a miss) | You drop into the match |
| You go down | Respawn puzzle (press **B** or tap the message) · 15 s · one try | Instant respawn; in Survival it is your only revive |
| You open a **banana crate** (press **E**) | Crate puzzle · 20 s · one try | Rocket Launcher, Sniper or Flamethrower, full health, +2 grenades; the crate refills after 25 s |

How the integration follows the [API documentation](https://marcconrad.com/uob/banana/doc.php):

- Each puzzle hides **one digit**, so answers are a 0–9 keypad ("Enter the missing digit", as in the official game).
- The server calls `api.php?out=json&base64=yes`, which returns the PNG itself instead of a link. One request
  instead of two, so the picture appears without waiting for the image host.
- The server keeps **3 puzzles ready** (fetched in the background), so the puzzle screen opens instantly.
- The documentation warns the service "may be discontinued without notice". The server keeps the last 25 puzzles as a
  **reserve**; if the API stops answering, the game keeps working from the reserve and the menu shows
  "Banana API offline". The status is also available at `GET /api/status`.
- The browser never talks to the Banana API. The server keeps each solution and checks answers, so the
  solution never reaches the browser; each puzzle can be answered once and expires after 5 minutes.

## Screens

- **Main menu**: logo, your soldier, puzzle record (solved, best streak, accuracy), four mode cards.
- **Banana puzzle**: Banana API image, 30-second timer, keypad (or keys 0–9), feedback, stats.
- **Battle HUD**: health and jetpack bars, timer, kill feed, score, weapon panel and buttons, banana crate prompt, respawn message, Tab scoreboard, touch sticks on phones.
- **Pause**, **Results** (puzzles solved, accuracy, best streak, time), **Avatar** (headgear, uniform, skin, goggles, beard), **Controls**.

## Run it

```bash
./run.sh            # installs packages on first run, then http://localhost:3100
./run.sh --dev      # restarts when files change
./run.sh --test     # automated tests
```

Demonstrate the error handling with a broken Banana API address:

```bash
BANANA_API_URL=https://marcconrad.com/uob/banana/does-not-exist.php ./run.sh
```

## Controls

On the battle screen: click to use ammo · Q switch weapon · R reload · G grenade · F melee · Z zoom ·
E open banana crate · B banana respawn · Tab scoreboard · Esc pause. Puzzles: keys 0–9 or the keypad.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/puzzle?purpose=deploy\|respawn\|crate` | `{ puzzleId, image, purpose, source }` (no solution; `image` is a data URL; `source` is `live` or `reserve`) |
| POST | `/api/puzzle/answer` | `{ puzzleId, answer }` → `{ correct, solution, purpose }`; each puzzle can be answered once |
| GET | `/api/status` | `{ online, ready, reserve, lastError, lastSuccess }` |

## Project structure

| Path | Purpose |
|---|---|
| `server/services/bananaApi.js` | All calls to the Banana API (timeout, retry, JSON/CSV parsing) |
| `server/pool.js` | Keeps puzzles ready and a reserve for when the Banana API is down |
| `server/puzzles.js` | Keeps puzzle solutions on the server; one answer each; expiry |
| `server/app.js` | Express routes and static files |
| `public/js/eventBus.js` | Publish/subscribe event bus used by every game module |
| `public/js/game/` | Screens: `main` (screen flow), `puzzle` (Banana puzzle screen), `hud` (battle HUD), `scene` (battlefield backdrop), `map`, `characters` (avatars), `config` |
| `tests/` | Automated tests (`node --test`) |

## Credits

- Banana API by Marc Conrad: https://marcconrad.com/uob/banana/doc.php
- Gameplay and screen layout inspired by Mini Militia Classic; all art, sounds and names in this project are original.
- Code written with help from a generative AI coding assistant; every file it produced says so in a comment at the top.
