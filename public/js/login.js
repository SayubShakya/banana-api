// Login / register page.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

import { api } from './api.js';
import { getCurrentUser } from './session.js';

const message = document.getElementById('message');

function showMessage(text) {
  message.textContent = text;
}

// Already logged in? Go straight to the game.
getCurrentUser().then(user => {
  if (user) window.location.href = '/play.html';
});

// Tab switching (click events on the tab buttons).
document.querySelector('.tabs').addEventListener('click', event => {
  const tab = event.target.closest('.tab');
  if (!tab) return; // event delegation: one listener for all tabs

  for (const t of document.querySelectorAll('.tab')) {
    const active = t === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  }
  for (const panel of document.querySelectorAll('.tab-panel')) {
    panel.hidden = panel.dataset.panel !== tab.dataset.tab;
  }
  showMessage('');
});

function handleSubmit(form, endpoint) {
  form.addEventListener('submit', async event => {
    event.preventDefault(); // stop the browser's normal page reload
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      await api.post(endpoint, data);
      window.location.href = '/play.html';
    } catch (err) {
      showMessage(err.message);
    } finally {
      button.disabled = false;
    }
  });
}

handleSubmit(document.getElementById('login-form'), '/api/auth/login');
handleSubmit(document.getElementById('register-form'), '/api/auth/register');
