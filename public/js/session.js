// Shared page helpers: find out who is logged in and fill in the nav bar.
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

import { api } from './api.js';

export async function getCurrentUser() {
  const { user } = await api.get('/api/auth/me');
  return user;
}

// Sends the visitor to the login page if they are not logged in.
export async function requireUser({ admin = false } = {}) {
  const user = await getCurrentUser();
  if (!user || (admin && user.role !== 'admin')) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

export function renderNav(user) {
  const nav = document.getElementById('nav-user');
  if (!nav) return;
  nav.replaceChildren();

  if (!user) return;

  const name = document.createElement('span');
  name.textContent = `${user.username}${user.role === 'admin' ? ' (admin)' : ''}`;
  nav.append(name);

  if (user.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = '/admin.html';
    adminLink.textContent = 'Admin';
    nav.append(adminLink);
  }

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'link-button';
  logout.textContent = 'Log out';
  logout.addEventListener('click', async () => {
    await api.post('/api/auth/logout');
    window.location.href = '/index.html';
  });
  nav.append(logout);
}
