// Keeps Banana API puzzles ready before anyone asks for one.
//
// - `ready`: a few fresh puzzles fetched in the background, so the puzzle screen
//   opens instantly instead of waiting for the API.
// - `reserve`: recently fetched puzzles kept for emergencies. The Banana API notes
//   that it "may be discontinued without notice"; if it stops answering, the game
//   keeps working from the reserve and the menu shows the API as offline.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

function createPuzzlePool({ fetchPuzzle, size = 3, reserveSize = 25 }) {
  const ready = [];
  const reserve = [];
  let inFlight = 0;
  let online = null;       // unknown until the first call
  let lastError = null;
  let lastSuccess = null;

  function remember(puzzle) {
    reserve.push(puzzle);
    if (reserve.length > reserveSize) reserve.shift();
  }

  async function fetchLive() {
    try {
      const puzzle = await fetchPuzzle();
      online = true;
      lastError = null;
      lastSuccess = new Date().toISOString();
      remember(puzzle);
      return puzzle;
    } catch (err) {
      online = false;
      lastError = err.message;
      throw err;
    }
  }

  function refill() {
    while (ready.length + inFlight < size) {
      inFlight += 1;
      fetchLive()
        .then((p) => ready.push(p))
        .catch(() => { /* recorded in lastError; the next take() tries again */ })
        .finally(() => { inFlight -= 1; });
      if (online === false) break; // do not hammer an API that is down
    }
  }

  return {
    // Returns { image, solution, source } where source is 'live' or 'reserve'.
    async take() {
      let puzzle = ready.shift();
      let source = 'live';
      if (!puzzle) {
        try {
          puzzle = await fetchLive();
        } catch (err) {
          if (!reserve.length) { refill(); throw err; }
          puzzle = reserve[Math.floor(Math.random() * reserve.length)];
          source = 'reserve';
        }
      }
      refill();
      return { ...puzzle, source };
    },
    warmUp: refill,
    status: () => ({ online, ready: ready.length, reserve: reserve.length, lastError, lastSuccess }),
  };
}

module.exports = { createPuzzlePool };
