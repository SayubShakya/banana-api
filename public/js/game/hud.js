// The battle-screen HUD. There is no gameplay behind it: the buttons and keys
// change what the HUD shows (switch weapon, reload, grenades, zoom) so the layout
// can be tried out, and the banana crate / respawn prompts open real Banana API
// puzzles through events on the bus.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

import { on, emit } from '../eventBus.js';
import { WEAPONS, MODES, CRATE_REFILL_SECONDS } from './config.js';
import { drawAvatarPreview } from './characters.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEYS = { KeyQ: 'swap', KeyR: 'reload', KeyG: 'grenade', KeyF: 'melee', KeyZ: 'zoom', KeyE: 'crate', KeyB: 'respawn', Escape: 'pause' };
const FEED = [['Rex', 'SMG', 'Ghost'], ['Viper', 'Grenade', 'Tank'], ['Blaze', 'Sniper', 'Ace'], ['Shadow', 'Rocket', 'Bolt'], ['Ghost', 'Melee', 'Viper']];

function ammoFor(key) {
  const w = WEAPONS[key];
  return { ammo: w.mag, spare: w.spare };
}

export function createHud() {
  const el = {
    hud: $('hud'), badge: $('hud-avatar'), hp: $('hp-fill'), hpText: $('hp-text'), fuel: $('fuel-fill'),
    timer: $('timer'), feed: $('killfeed'), score: $('score'), rank: $('rank'),
    weapon: $('weapon-name'), ammo: $('ammo'), reload: $('reload-fill'), reloadBar: $('reload-bar'),
    grenades: $('grenades'), zoom: $('zoom-label'), msg: $('center-msg'), crate: $('crate-prompt'),
    board: $('scoreboard'), boardBody: $('scoreboard-body'), flash: $('hit-flash'), toast: $('hud-toast'),
  };

  const state = {
    visible: false, mode: 'quick', down: false, crateOpen: false,
    health: 100, fuel: 100, zoom: 0, grenades: 3,
    slots: [], slot: 0, reloading: 0, feedTimer: 0, feedIndex: 0, crateRefill: 0,
  };

  const gun = () => state.slots[state.slot];

  function renderWeapon() {
    const g = gun();
    el.weapon.textContent = WEAPONS[g.key].name;
    el.ammo.textContent = `${g.ammo} / ${g.spare}`;
    el.grenades.textContent = state.grenades;
    el.zoom.textContent = ['1x', '2x', '3x'][state.zoom];
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
  }

  function pulse(action) {
    const b = el.hud.querySelector(`[data-action="${action}"]`);
    if (!b) return;
    b.classList.remove('pulse');
    void b.offsetWidth;
    b.classList.add('pulse');
  }

  function feed(html) {
    const row = document.createElement('div');
    row.className = 'feed-row';
    row.innerHTML = html;
    el.feed.prepend(row);
    while (el.feed.children.length > 4) el.feed.lastChild.remove();
    setTimeout(() => row.classList.add('fade'), 4000);
    setTimeout(() => row.remove(), 5000);
  }

  function act(action) {
    if (!state.visible) return;
    pulse(action);
    switch (action) {
      case 'swap':
        state.slot = (state.slot + 1) % state.slots.length;
        state.reloading = 0;
        if (state.zoom === 2 && gun().key !== 'sniper') state.zoom = 1;
        renderWeapon();
        break;
      case 'reload': {
        const g = gun();
        if (g.ammo < WEAPONS[g.key].mag && !state.reloading) state.reloading = 1.2;
        break;
      }
      case 'grenade':
        if (state.grenades > 0) { state.grenades -= 1; toast('Grenade out!'); } else toast('No grenades left');
        renderWeapon();
        break;
      case 'melee':
        toast('Melee!');
        break;
      case 'zoom':
        state.zoom = (state.zoom + 1) % (gun().key === 'sniper' ? 3 : 2);
        el.hud.dataset.zoom = state.zoom;
        renderWeapon();
        break;
      case 'fire': {
        const g = gun();
        if (state.reloading) break;
        if (g.ammo > 0) { g.ammo -= 1; renderWeapon(); } else act('reload');
        break;
      }
      case 'crate':
        if (!state.crateOpen && !state.down) emit('hud:crate');
        break;
      case 'respawn':
        if (state.down) emit('hud:respawn');
        break;
      case 'pause':
        emit('hud:pause');
        break;
    }
  }

  el.hud.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => act(b.dataset.action)));
  el.msg.addEventListener('click', () => act('respawn'));
  el.crate.addEventListener('click', () => act('crate'));
  window.addEventListener('keydown', (e) => {
    if (!state.visible || e.target.tagName === 'INPUT' || document.body.dataset.overlay) return;
    if (e.code === 'Tab') { e.preventDefault(); el.board.hidden = false; return; }
    if (KEYS[e.code] && !e.repeat) { e.preventDefault(); act(KEYS[e.code]); }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Tab') el.board.hidden = true; });
  $('battle-canvas').addEventListener('mousedown', (e) => { if (e.button === 0) act('fire'); });

  on('banana:answered', ({ purpose, correct }) => {
    if (purpose === 'respawn' && correct) toast('Banana respawn!');
  });

  function renderBoard(cast) {
    el.boardBody.innerHTML = cast.map((s, i) =>
      `<tr class="${s.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${esc(s.name)}${s.team === 'blue' || s.team === 'red' ? ` <small class="team-${s.team}">${s.team}</small>` : ''}</td><td>0</td><td>0</td></tr>`).join('');
  }

  return {
    show({ mode, player, cast }) {
      Object.assign(state, {
        visible: true, mode, down: false, crateOpen: false, crateRefill: 0, health: 100, fuel: 100, zoom: 0, grenades: 3,
        slots: [{ key: 'rifle', ...ammoFor('rifle') }, { key: 'magnum', ...ammoFor('magnum') }], slot: 0, reloading: 0, feedTimer: 1.5,
      });
      const m = MODES[mode];
      el.hud.hidden = false;
      el.hud.dataset.mode = mode;
      el.hud.dataset.zoom = 0;
      el.feed.innerHTML = '';
      el.timer.textContent = m.timer;
      el.score.textContent = 'Kills 0 · Deaths 0';
      el.rank.textContent = mode === 'quick' ? `#1 of ${cast.length} · ${m.goal}` : m.goal;
      el.msg.hidden = true;
      el.crate.hidden = false;
      el.crate.disabled = false;
      el.crate.classList.remove('empty');
      el.crate.innerHTML = '<svg class="ico"><use href="#i-banana"/></svg>Banana crate nearby · <b>E</b> to open';
      drawAvatarPreview(el.badge, player.avatar);
      renderBoard(cast);
      renderWeapon();
    },
    hide() { state.visible = false; el.hud.hidden = true; el.board.hidden = true; },
    get crateOpen() { return state.crateOpen; },
    get down() { return state.down; },
    // The player "goes down" so the Banana respawn prompt can be tried.
    setDown(down) {
      state.down = down;
      state.health = down ? 0 : 100;
      el.msg.hidden = !down;
      el.crate.hidden = down;
      el.msg.innerHTML = state.mode === 'survival'
        ? 'Killed by Viper — <b>solve a Banana puzzle to revive</b> (B)'
        : 'Killed by Viper — respawning soon · <b>Banana respawn now</b> (B)';
      if (down) { el.flash.classList.remove('on'); void el.flash.offsetWidth; el.flash.classList.add('on'); }
    },
    rewardCrate(weapon) {
      this.closeCrate();
      state.slots[0] = { key: weapon, ...ammoFor(weapon) };
      state.slot = 0;
      state.health = 100;
      state.grenades += 2;
      renderWeapon();
      toast(`Banana crate: ${WEAPONS[weapon].name}, full health, +2 grenades`);
    },
    // The crate is used up for a while, like a map pickup in the original game.
    closeCrate() {
      state.crateOpen = true;
      state.crateRefill = CRATE_REFILL_SECONDS;
      el.crate.disabled = true;
      el.crate.classList.add('empty');
      el.crate.innerHTML = '<svg class="ico"><use href="#i-banana"/></svg><span>Banana crate empty</span>';
    },
    update(dt) {
      if (!state.visible) return;
      // A little life in the bars so the HUD can be judged in motion.
      if (!state.down) state.fuel = 70 + Math.sin(performance.now() / 900) * 30;
      el.hp.style.width = `${state.health}%`;
      el.hp.className = state.health > 50 ? 'fill good' : state.health > 25 ? 'fill warn' : 'fill bad';
      el.hpText.textContent = Math.ceil(state.health);
      el.fuel.style.width = `${state.fuel}%`;
      if (state.reloading > 0) {
        state.reloading -= dt;
        el.reloadBar.style.visibility = 'visible';
        el.reload.style.width = `${(1 - state.reloading / 1.2) * 100}%`;
        if (state.reloading <= 0) {
          state.reloading = 0;
          const g = gun();
          g.ammo = WEAPONS[g.key].mag;
          renderWeapon();
        }
      } else el.reloadBar.style.visibility = 'hidden';
      if (state.crateRefill > 0) {
        state.crateRefill -= dt;
        el.crate.querySelector('span').textContent = `Banana crate refills in ${Math.ceil(Math.max(0, state.crateRefill))} s`;
        if (state.crateRefill <= 0) {
          state.crateOpen = false;
          el.crate.disabled = false;
          el.crate.classList.remove('empty');
          el.crate.innerHTML = '<svg class="ico"><use href="#i-banana"/></svg>Banana crate nearby · <b>E</b> to open';
        }
      }
      state.feedTimer -= dt;
      if (state.feedTimer <= 0 && state.mode !== 'training') {
        state.feedTimer = 3 + Math.random() * 3;
        const [a, w, b] = FEED[state.feedIndex++ % FEED.length];
        feed(`<span>${esc(a)}</span> <span class="weapon">[${w}]</span> <span>${esc(b)}</span>`);
      }
    },
  };
}
