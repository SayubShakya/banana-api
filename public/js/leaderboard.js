// Leaderboard page: public, but shows the nav bar if someone is logged in.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

import { api } from './api.js';
import { getCurrentUser, renderNav } from './session.js';

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text; // textContent (not innerHTML) so usernames cannot inject HTML
  return td;
}

renderNav(await getCurrentUser());

try {
  const { scores } = await api.get('/api/scores/leaderboard?limit=10');
  const rows = document.getElementById('rows');
  if (scores.length === 0) {
    document.getElementById('message').textContent = 'No scores yet. Be the first!';
  }
  scores.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(i + 1),
      cell(s.username),
      cell(s.score),
      cell(`${s.puzzles_solved} / ${s.puzzles_attempted}`),
      cell(new Date(s.created_at + 'Z').toLocaleDateString()),
    );
    rows.append(tr);
  });
} catch (err) {
  document.getElementById('message').textContent = err.message;
}
