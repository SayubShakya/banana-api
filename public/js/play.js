// Placeholder game screen. Shows the complete loop:
// start -> fetch puzzle -> answer -> feedback -> next / end -> score saved.
// UI updates are driven by events on the event bus, not by the game logic directly.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

import { api } from './api.js';
import { on, emit } from './eventBus.js';
import { requireUser, renderNav } from './session.js';

const $ = id => document.getElementById(id);
let currentPuzzleId = null;

// ---------- game actions (talk to the server, then emit events) ----------

async function startGame() {
  const { game } = await api.post('/api/game/start');
  emit('game:started', game);
  await loadPuzzle();
}

async function loadPuzzle() {
  emit('puzzle:loading');
  try {
    const { puzzleId, imageUrl } = await api.get('/api/game/puzzle');
    currentPuzzleId = puzzleId;
    emit('puzzle:loaded', { imageUrl });
  } catch (err) {
    emit('error', err.message);
  }
}

async function submitAnswer(answer) {
  try {
    const result = await api.post('/api/game/answer', { puzzleId: currentPuzzleId, answer });
    currentPuzzleId = null;
    emit(result.correct ? 'answer:correct' : 'answer:wrong', result);
    emit('game:updated', result.game);
  } catch (err) {
    emit('error', err.message);
  }
}

async function endGame() {
  try {
    const { game } = await api.post('/api/game/end');
    emit('game:ended', game);
  } catch (err) {
    emit('error', err.message);
  }
}

// ---------- event subscribers (update the page) ----------

on('game:started', game => {
  emit('game:updated', game);
  $('start-btn').hidden = true;
  $('end-btn').hidden = false;
});

on('game:updated', game => {
  $('score').textContent = game.score;
  $('solved').textContent = game.solved;
  $('attempted').textContent = game.attempted;
});

on('puzzle:loading', () => {
  $('status').textContent = 'Loading puzzle...';
  $('status').hidden = false;
  $('puzzle-image').hidden = true;
  $('answer-form').hidden = true;
  $('next-btn').hidden = true;
  $('message').textContent = '';
});

on('puzzle:loaded', ({ imageUrl }) => {
  $('puzzle-image').src = imageUrl; // the 'load' event below reveals it
});

on('answer:correct', () => {
  $('message').textContent = 'Correct! 🎉';
  $('answer-form').hidden = true;
  $('next-btn').hidden = false;
});

on('answer:wrong', ({ solution }) => {
  $('message').textContent = `Not quite - the answer was ${solution}.`;
  $('answer-form').hidden = true;
  $('next-btn').hidden = false;
});

on('game:ended', game => {
  $('status').textContent = `Game over. Final score: ${game.score}. Saved to the leaderboard.`;
  $('status').hidden = false;
  $('puzzle-image').hidden = true;
  $('answer-form').hidden = true;
  $('next-btn').hidden = true;
  $('end-btn').hidden = true;
  $('start-btn').hidden = false;
  $('start-btn').textContent = 'Play again';
});

on('error', text => {
  $('message').textContent = text;
});

// ---------- DOM event listeners (user and browser events) ----------

$('start-btn').addEventListener('click', startGame);
$('next-btn').addEventListener('click', loadPuzzle);
$('end-btn').addEventListener('click', endGame);

$('answer-form').addEventListener('submit', event => {
  event.preventDefault(); // Enter key or button click both land here
  const value = $('answer').value.trim();
  if (value === '') return;
  submitAnswer(value);
});

$('puzzle-image').addEventListener('load', () => {
  $('status').hidden = true;
  $('puzzle-image').hidden = false;
  $('answer-form').hidden = false;
  $('answer').value = '';
  $('answer').focus();
});

$('puzzle-image').addEventListener('error', () => {
  emit('error', 'The puzzle image failed to load. Try the next one.');
  $('next-btn').hidden = false;
});

// ---------- page start ----------

const user = await requireUser();
if (user) {
  renderNav(user);
  // Resume a game that is still running on the server (e.g. after a page refresh).
  const { game } = await api.get('/api/game/state');
  if (game) {
    emit('game:started', game);
    await loadPuzzle();
  }
}
