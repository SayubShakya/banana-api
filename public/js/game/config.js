// Settings shared by the Banana Brigade screens: the modes on the menu, the weapon
// names shown in the HUD and avatar preview, and the size of the battle backdrop.
//
// Written with help from a generative AI coding assistant; reviewed by Sayub Shakya.

export const VIEW = { width: 1280, height: 720 };
export const TILE = 40;

export const MODES = {
  quick:    { name: 'Quick Play',  tag: 'Free-for-all', blurb: 'Every soldier for themselves. First to 20 kills.', timer: '5:00', goal: 'first to 20' },
  survival: { name: 'Survival',    tag: 'Endless waves', blurb: 'Hold out against bigger waves. Banana revives only.', timer: 'WAVE 1', goal: '2 enemies left' },
  training: { name: 'Training',    tag: 'Practice range', blurb: 'Learn to fly, aim and throw on the dummy range.', timer: 'TRAINING', goal: 'shoot the dummies' },
  team:     { name: 'Multiplayer', tag: 'Blue vs Red', blurb: 'Team battle. First team to 30 kills wins.', timer: '5:00', goal: 'Blue 0 – 0 Red' },
};

export const WEAPONS = {
  magnum:  { name: 'Magnum',          mag: 8,   spare: '∞' },
  smg:     { name: 'SMG',             mag: 32,  spare: 96 },
  rifle:   { name: 'Assault Rifle',   mag: 30,  spare: 90 },
  shotgun: { name: 'Shotgun',         mag: 6,   spare: 18 },
  sniper:  { name: 'Sniper',          mag: 5,   spare: 15 },
  rocket:  { name: 'Rocket Launcher', mag: 2,   spare: 4 },
  flamer:  { name: 'Flamethrower',    mag: 100, spare: 100 },
};

// What a solved banana crate gives in the battle preview.
export const CRATE_REWARDS = ['rocket', 'sniper', 'flamer'];

export const BOT_NAMES = ['Rex', 'Viper', 'Ghost', 'Blaze', 'Tank', 'Shadow', 'Ace', 'Bolt'];

// How each kind of Banana puzzle works. Deploying is relaxed (new puzzle after a miss);
// respawns and crates happen mid-battle, so they are quicker and give one try.
export const PUZZLE_RULES = {
  deploy:  { seconds: 30, retry: true,  rule: 'Unlimited tries' },
  respawn: { seconds: 15, retry: false, rule: 'One try' },
  crate:   { seconds: 20, retry: false, rule: 'One try' },
};

export const CRATE_REFILL_SECONDS = 25;
