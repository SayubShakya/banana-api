// The battlefield backdrop behind the HUD: sky, hills, terrain, crates and soldiers
// posed in place. Nothing here is gameplay; it only gives the HUD a realistic scene.
// Clouds drift and soldiers breathe so the screen does not look frozen.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

import { VIEW, TILE } from './config.js';
import { createMap } from './map.js';
import { drawSoldier } from './characters.js';

const map = createMap();

function label(ctx, text, x, y, size = 12, color = '#fff') {
  ctx.font = `bold ${size}px "Rubik", sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawSky(ctx, cam, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, '#6cb4e4');
  g.addColorStop(0.65, '#bfe3f0');
  g.addColorStop(1, '#d9eecf');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = 'rgba(255,248,200,0.9)';
  ctx.beginPath(); ctx.arc(VIEW.width - 170, 110, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 380 + time * 14) % (VIEW.width + 300)) - 150;
    const y = 80 + (i % 3) * 55;
    ctx.beginPath();
    ctx.ellipse(x, y, 60, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40, y - 10, 40, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const hills = (speed, base, amp, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    for (let x = 0; x <= VIEW.width; x += 20) {
      const wx = x + cam.x * speed;
      ctx.lineTo(x, base + Math.sin(wx / 230) * amp + Math.sin(wx / 97) * amp * 0.35);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.fill();
  };
  hills(0.15, 470, 50, '#9cc7a4');
  hills(0.3, 540, 40, '#7aa874');
}

function drawTerrain(ctx, cam, vw, vh) {
  const c0 = Math.floor(cam.x / TILE);
  const c1 = Math.min(map.cols - 1, Math.floor((cam.x + vw) / TILE));
  const r0 = Math.max(0, Math.floor(cam.y / TILE));
  const r1 = Math.min(map.rows - 1, Math.floor((cam.y + vh) / TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = Math.max(0, c0); c <= c1; c++) {
      if (map.grid[r][c] !== 1) continue;
      const x = c * TILE - cam.x;
      const y = r * TILE - cam.y;
      ctx.fillStyle = '#7b5435';
      ctx.fillRect(x, y, TILE + 0.5, TILE + 0.5);
      const h = (c * 73856093) ^ (r * 19349663);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + (h & 15) + 6, y + ((h >> 4) & 15) + 8, 6, 4);
      if (r > 0 && map.grid[r - 1][c] === 0) {
        ctx.fillStyle = '#5fae3b'; ctx.fillRect(x, y, TILE + 0.5, 9);
        ctx.fillStyle = '#4a8f2d'; ctx.fillRect(x, y + 7, TILE + 0.5, 3);
      }
    }
  }
}

function drawCrate(ctx, x, y, kind, text) {
  if (kind === 'health') {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.fillRect(x - 13, y - 13, 26, 22); ctx.strokeRect(x - 13, y - 13, 26, 22);
    ctx.fillStyle = '#e63946'; ctx.fillRect(x - 3, y - 10, 6, 16); ctx.fillRect(x - 8, y - 5, 16, 6);
    return;
  }
  const banana = kind === 'banana';
  ctx.fillStyle = banana ? '#ffe135' : '#b07d3a';
  ctx.strokeStyle = banana ? '#8a6d00' : '#5e3c14';
  ctx.lineWidth = 2.5;
  ctx.fillRect(x - 17, y - 17, 34, 27); ctx.strokeRect(x - 17, y - 17, 34, 27);
  if (banana) {
    ctx.strokeStyle = '#6b4f00'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 15, 12, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(x - 17, y - 17); ctx.lineTo(x + 17, y + 10); ctx.moveTo(x + 17, y - 17); ctx.lineTo(x - 17, y + 10); ctx.stroke();
  }
  label(ctx, text, x, y - 25, 11, banana ? '#ffe135' : '#fff');
}

// cast: [{ name, avatar, x, y (feet, world px), facing, weapon, flying, team }]
export function drawScene(canvas, { cast, focus, time, crateOpen = false, zoom = 1 }) {
  const ctx = canvas.getContext('2d');
  const dpr = canvas.width / VIEW.width;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vw = VIEW.width / zoom;
  const vh = VIEW.height / zoom;
  const cam = {
    x: Math.max(0, Math.min(map.width - vw, focus.x - vw / 2)),
    y: Math.max(0, Math.min(map.height - vh, focus.y - vh / 2)),
  };
  drawSky(ctx, cam, time);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  drawTerrain(ctx, cam, vw, vh);

  const bob = (k) => Math.sin(time * 3 + k) * 3;
  for (const p of map.healthSpots) drawCrate(ctx, p.x - cam.x, p.y + 6 - cam.y + bob(p.x), 'health');
  map.crateSpots.forEach((p, i) => drawCrate(ctx, p.x - cam.x, p.y + 6 - cam.y + bob(p.x), 'weapon', ['SMG', 'Shotgun', 'Sniper', 'Rifle', 'Rocket', 'Flamer'][i % 6]));
  if (!crateOpen) for (const p of map.bananaSpots) drawCrate(ctx, p.x - cam.x, p.y + 6 - cam.y + bob(p.x), 'banana', 'BANANA CRATE');

  cast.forEach((s, i) => {
    const flyY = s.flying ? Math.sin(time * 2 + i) * 10 : 0;
    const view = {
      x: s.x - 14 - cam.x, y: s.y - 50 - cam.y + flyY, w: 28, h: 50,
      facing: s.facing, aim: s.facing > 0 ? -0.08 + Math.sin(time + i) * 0.06 : Math.PI + 0.08 + Math.sin(time + i) * 0.06,
      walkPhase: 0, onGround: !s.flying, jetting: !!s.flying, weapon: s.weapon, hurtFlash: 0,
    };
    drawSoldier(ctx, view, s.avatar, time);
    const color = s.isPlayer ? '#ffe135' : s.team === 'blue' ? '#7ec8ff' : s.team === 'red' ? '#ff8a8a' : '#fff';
    label(ctx, s.name, view.x + 14, view.y - 22, 12, color);
  });
}

export const sceneMap = map;
