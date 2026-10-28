// The Banana API puzzle screen. It opens when you deploy into a mode, ask for a
// Banana respawn or open a banana crate. The image comes from the Banana API through
// our server, and answers are checked on the server, so the solution is never in
// the browser. Each puzzle has a countdown; running out of time counts as a miss.
//
// openPuzzle(purpose, options) resolves to 'solved', 'failed' or 'cancelled'.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

import { emit } from '../eventBus.js';
import { PUZZLE_RULES } from './config.js';

const $ = (id) => document.getElementById(id);
const RING = 2 * Math.PI * 26; // circumference of the timer ring (r = 26)

async function requestPuzzle(purpose) {
  const res = await fetch(`/api/puzzle?purpose=${encodeURIComponent(purpose)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
  return body;
}

async function sendAnswer(puzzleId, answer) {
  const res = await fetch('/api/puzzle/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzleId, answer }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
  return body;
}

let active = false;
export const isPuzzleOpen = () => active;

export function openPuzzle(purpose, { title, subtitle, modeLabel = '', cancelText = 'Cancel', stats = null } = {}) {
  if (active) return Promise.resolve('cancelled');
  active = true;
  const { seconds: PUZZLE_SECONDS, retry: allowRetry, rule } = PUZZLE_RULES[purpose];

  const el = {
    box: $('puzzle'), card: $('puzzle-card'), mode: $('puzzle-mode'), title: $('puzzle-title'), sub: $('puzzle-sub'),
    img: $('puzzle-img'), wrap: $('puzzle-img-wrap'), status: $('puzzle-status'), digits: $('puzzle-digits'),
    retry: $('puzzle-new'), cancel: $('puzzle-cancel'), ring: $('puzzle-ring'), time: $('puzzle-time'),
    solved: $('puzzle-stat-solved'), streak: $('puzzle-stat-streak'), rules: $('puzzle-rules'), source: $('puzzle-source'),
  };
  el.rules.textContent = `${rule} · ${PUZZLE_SECONDS} s`;
  el.source.hidden = true;
  el.mode.textContent = modeLabel;
  el.mode.hidden = !modeLabel;
  el.title.textContent = title;
  el.sub.textContent = subtitle;
  el.cancel.textContent = cancelText;
  el.box.dataset.purpose = purpose;
  el.ring.style.strokeDasharray = `${RING}`;
  const showStats = () => {
    if (!stats) return;
    el.solved.textContent = stats.solved;
    el.streak.textContent = stats.streak;
  };
  showStats();
  el.box.hidden = false;

  return new Promise((resolve) => {
    let puzzle = null;
    let busy = false;
    let timer = null;
    let deadline = 0;

    const setStatus = (text, kind = '') => { el.status.textContent = text; el.status.dataset.kind = kind; };
    const setDigits = (on) => el.digits.querySelectorAll('button').forEach((b) => { b.disabled = !on; });
    const flash = (cls) => { el.card.classList.remove('good', 'bad'); void el.card.offsetWidth; el.card.classList.add(cls); };

    function stopTimer() { clearInterval(timer); timer = null; }
    function startTimer() {
      stopTimer();
      deadline = performance.now() + PUZZLE_SECONDS * 1000;
      const tick = () => {
        const left = Math.max(0, (deadline - performance.now()) / 1000);
        el.time.textContent = Math.ceil(left);
        el.ring.style.strokeDashoffset = `${RING * (1 - left / PUZZLE_SECONDS)}`;
        el.ring.dataset.low = left < 8 ? 'true' : 'false';
        if (left <= 0) { stopTimer(); answer(-1, true); }
      };
      tick();
      timer = setInterval(tick, 200);
    }

    function finish(result) {
      stopTimer();
      document.removeEventListener('keydown', onKey, true);
      el.digits.onclick = el.retry.onclick = el.cancel.onclick = null;
      el.card.classList.remove('good', 'bad');
      el.box.hidden = true;
      active = false;
      resolve(result);
    }

    async function load() {
      busy = true;
      puzzle = null;
      stopTimer();
      setDigits(false);
      el.retry.hidden = true;
      el.img.removeAttribute('src');
      el.wrap.dataset.state = 'loading';
      el.time.textContent = PUZZLE_SECONDS;
      el.ring.style.strokeDashoffset = '0';
      setStatus('Fetching a puzzle from the Banana API…');
      emit('banana:requested', { purpose });
      try {
        puzzle = await requestPuzzle(purpose);
        await new Promise((ok, fail) => {
          el.img.onload = ok;
          el.img.onerror = () => fail(new Error('The puzzle image could not be loaded.'));
          el.img.src = puzzle.image;
        });
        el.wrap.dataset.state = 'ready';
        el.source.hidden = puzzle.source !== 'reserve';
        setStatus('Enter the missing digit hidden by the banana.');
        setDigits(true);
        startTimer();
        emit('banana:loaded', { purpose });
      } catch (err) {
        el.wrap.dataset.state = 'error';
        setStatus(err.message, 'bad');
        el.retry.textContent = 'Try again';
        el.retry.hidden = false;
        emit('banana:error', { purpose, message: err.message });
      } finally {
        busy = false;
      }
    }

    async function answer(n, timedOut = false) {
      if (!puzzle || (busy && !timedOut)) return;
      busy = true;
      stopTimer();
      setDigits(false);
      const key = el.digits.querySelector(`[data-digit="${n}"]`);
      key?.classList.add('picked');
      try {
        const result = await sendAnswer(puzzle.puzzleId, n);
        emit('banana:answered', { purpose, correct: result.correct, timedOut });
        showStats();
        if (result.correct) {
          flash('good');
          setStatus('Correct! Banana power unlocked.', 'good');
          setTimeout(() => { key?.classList.remove('picked'); finish('solved'); }, 900);
          return;
        }
        flash('bad');
        const why = timedOut ? 'Time is up' : 'Not quite';
        if (allowRetry) {
          setStatus(`${why}: it was ${result.solution}. Here comes another one.`, 'bad');
          setTimeout(() => { key?.classList.remove('picked'); load(); }, 1500);
        } else {
          setStatus(`${why}: it was ${result.solution}.`, 'bad');
          setTimeout(() => { key?.classList.remove('picked'); finish('failed'); }, 1500);
        }
      } catch (err) {
        key?.classList.remove('picked');
        setStatus(err.message, 'bad');
        el.retry.textContent = 'New puzzle';
        el.retry.hidden = false;
        busy = false;
      }
    }

    function onKey(e) {
      if (/^(Digit|Numpad)[0-9]$/.test(e.code)) answer(Number(e.code.slice(-1)));
      else if (e.code === 'Escape') finish('cancelled');
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    document.addEventListener('keydown', onKey, true);
    el.digits.onclick = (e) => { const b = e.target.closest('button[data-digit]'); if (b && !b.disabled) answer(Number(b.dataset.digit)); };
    el.retry.onclick = load;
    el.cancel.onclick = () => finish('cancelled');
    load();
  });
}
