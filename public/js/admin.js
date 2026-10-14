// Admin page: list users and reset a user's scores.
// The page hides itself from non-admins, but the real protection is on the server
// (requireAdmin) - hiding a button is not security.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

import { api } from './api.js';
import { requireUser, renderNav } from './session.js';

const rows = document.getElementById('rows');
const message = document.getElementById('message');

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

async function loadUsers() {
  const { users } = await api.get('/api/admin/users');
  rows.replaceChildren();
  for (const u of users) {
    const tr = document.createElement('tr');
    const actions = document.createElement('td');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'secondary small';
    reset.textContent = 'Reset scores';
    reset.dataset.userId = u.id;
    reset.dataset.username = u.username;
    reset.disabled = u.games_played === 0;
    actions.append(reset);

    tr.append(cell(u.id), cell(u.username), cell(u.role), cell(u.games_played), cell(u.best_score), actions);
    rows.append(tr);
  }
}

// Event delegation: one click listener on the table body handles every row's button.
rows.addEventListener('click', async event => {
  const button = event.target.closest('button[data-user-id]');
  if (!button) return;
  if (!confirm(`Delete all scores for ${button.dataset.username}?`)) return;

  try {
    const { deleted } = await api.delete(`/api/admin/users/${button.dataset.userId}/scores`);
    message.textContent = `Deleted ${deleted} score(s) for ${button.dataset.username}.`;
    await loadUsers();
  } catch (err) {
    message.textContent = err.message;
  }
});

const user = await requireUser({ admin: true });
if (user) {
  renderNav(user);
  loadUsers().catch(err => { message.textContent = err.message; });
}
