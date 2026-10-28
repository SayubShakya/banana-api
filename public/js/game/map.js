// The battlefield layout drawn behind the HUD: a tile grid with hills, floating
// platforms and pillars, plus where the crates and spawn points sit.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

import { TILE } from './config.js';

const COLS = 90;
const ROWS = 36;

function buildGrid() {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const fill = (c, r, w, h) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) grid[y][x] = 1;
    }
  };

  fill(0, 0, COLS, 1);            // ceiling
  fill(0, 0, 1, ROWS);            // left wall
  fill(COLS - 1, 0, 1, ROWS);     // right wall

  // Ground with two hills and a trench in the middle.
  for (let c = 0; c < COLS; c++) {
    let top = 32;
    if (c >= 14 && c <= 26) top = 32 - Math.round(3 * Math.sin(((c - 14) / 12) * Math.PI));
    if (c >= 60 && c <= 74) top = 32 - Math.round(4 * Math.sin(((c - 60) / 14) * Math.PI));
    if (c >= 40 && c <= 48) top = 34;
    fill(c, top, 1, ROWS - top);
  }

  // Floating platforms (col, row, width, height).
  [
    [6, 25, 8, 1], [21, 21, 10, 1], [35, 26, 7, 1], [45, 19, 12, 1], [59, 22, 9, 1],
    [75, 25, 9, 1], [29, 13, 9, 1], [54, 11, 11, 1], [10, 15, 8, 1], [72, 14, 9, 1],
    [40, 29, 3, 1], [46, 29, 3, 1], [3, 8, 6, 1], [81, 8, 6, 1],
  ].forEach(([c, r, w, h]) => fill(c, r, w, h));

  // Pillars and a bunker roof to fight around.
  [[33, 23, 1, 3], [57, 16, 1, 3], [24, 27, 1, 3], [66, 26, 1, 2], [49, 7, 1, 4]].forEach(([c, r, w, h]) => fill(c, r, w, h));
  return grid;
}

// Spawn points, health packs and weapon crates (in tile coordinates, standing on a surface).
const SPAWNS = [[4, 31], [10, 24], [26, 20], [38, 25], [50, 18], [63, 21], [79, 24], [85, 31], [33, 12], [58, 10], [13, 14], [76, 13]];
const HEALTH = [[44, 33], [6, 7], [84, 7], [51, 18]];
const CRATES = [[18, 28], [30, 12], [60, 10], [70, 28], [8, 24], [80, 24]];
const BANANA_CRATES = [[24, 20], [64, 21]];

const tileCenter = ([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

export function createMap() {
  const grid = buildGrid();
  return {
    grid,
    cols: COLS,
    rows: ROWS,
    width: COLS * TILE,
    height: ROWS * TILE,
    spawns: SPAWNS.map(tileCenter),
    healthSpots: HEALTH.map(tileCenter),
    crateSpots: CRATES.map(tileCenter),
    bananaSpots: BANANA_CRATES.map(tileCenter),
  };
}
