// BOB, AGAIN — canvas renderer.
// Blueprint terminal: everything is drawn with canvas vector calls, no assets.
// The renderer keeps no game state. What it does keep is cosmetic: floating
// text, particles, a screen shake and which way each Bob last looked, all
// derived from the DayState diffs it is handed. See SPEC.md, "Renderer".

const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const TAU = Math.PI * 2;

const C = {
  bg: '#0b1020',
  wall: '#1b2440',
  wallEdge: '#3a4b8c',
  line: '110,150,255',
  amber: '#ffb000',
  amberDark: '#c47a00',
  hat: '#ffe9a6',
  cyan: '#5ad1e6',
  green: '#7dffa0',
  teal: '#2dd4bf',
  violet: '#a78bfa',
  pink: '#ff6b9d',
  magenta: '#e879f9',
  red: '#ff4d5e',
  rot: '#93806a',
  ink: '#0b1020',
  paper: '#eef2ff',
};
// Plate/gate pairs: the first pair is plain magenta, later pairs get their
// own accent so a wire can be followed by colour as well as by line.
const PAIR = [C.magenta, '#fde047', '#7dd3fc', '#fb923c'];
const BENCH_COLOR = { fix: C.teal, feat: C.violet, help: C.pink };
const DIR = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const rgbaCache = new Map();
function rgba(hex, a) {
  let rgb = rgbaCache.get(hex);
  if (!rgb) {
    const n = parseInt(hex.slice(1), 16);
    rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    rgbaCache.set(hex, rgb);
  }
  return `rgba(${rgb},${a})`;
}

function roundRect(g, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.lineTo(x + w - k, y);
  g.arcTo(x + w, y, x + w, y + k, k);
  g.lineTo(x + w, y + h - k);
  g.arcTo(x + w, y + h, x + w - k, y + h, k);
  g.lineTo(x + k, y + h);
  g.arcTo(x, y + h, x, y + h - k, k);
  g.lineTo(x, y + k);
  g.arcTo(x, y, x + k, y, k);
  g.closePath();
}

function diamond(g, cx, cy, rx, ry) {
  g.beginPath();
  g.moveTo(cx, cy - ry);
  g.lineTo(cx + rx, cy);
  g.lineTo(cx, cy + ry);
  g.lineTo(cx - rx, cy);
  g.closePath();
}

function heartPath(g, cx, cy, k) {
  g.beginPath();
  g.moveTo(cx, cy + 0.36 * k);
  g.bezierCurveTo(cx - 0.62 * k, cy - 0.02 * k, cx - 0.36 * k, cy - 0.46 * k, cx, cy - 0.16 * k);
  g.bezierCurveTo(cx + 0.36 * k, cy - 0.46 * k, cx + 0.62 * k, cy - 0.02 * k, cx, cy + 0.36 * k);
  g.closePath();
}

function checkMark(g, cx, cy, k, color, width) {
  g.beginPath();
  g.moveTo(cx - 0.17 * k, cy + 0.0 * k);
  g.lineTo(cx - 0.05 * k, cy + 0.12 * k);
  g.lineTo(cx + 0.18 * k, cy - 0.13 * k);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
}

function label(g, str, x, y, size, color, opts = {}) {
  g.font = `${opts.bold === false ? '' : 'bold '}${size}px ${FONT}`;
  g.textAlign = opts.align || 'center';
  g.textBaseline = 'middle';
  if (opts.halo) {
    g.lineWidth = opts.halo;
    g.lineJoin = 'round';
    g.strokeStyle = opts.haloColor || C.ink;
    g.strokeText(str, x, y);
    g.lineJoin = 'miter';
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
}

// ---------------------------------------------------------------- level grid

const gridCache = new WeakMap();

function readGrid(level) {
  const cached = gridCache.get(level);
  if (cached) return cached;
  const rows = Array.isArray(level.map) ? level.map : null;
  const h = level.height || (rows ? rows.length : 9);
  const w = level.width || (rows && rows[0] ? rows[0].length : 13);
  const wall = new Uint8Array(w * h);
  let jx = 1;
  let jy = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows && rows[y] ? rows[y][x] : '.';
      const solid = level.walls && level.walls[y] ? !!level.walls[y][x] : ch === '#';
      if (solid) wall[y * w + x] = 1;
      if (ch === 'J') {
        jx = x;
        jy = y;
      }
    }
  }
  if (level.journal && Number.isFinite(level.journal.x)) {
    jx = level.journal.x;
    jy = level.journal.y;
  }
  // Walking distance to the journal, ignoring gates: drives the "go home" cue.
  const dist = new Int16Array(w * h).fill(-1);
  const todo = [[jx, jy]];
  dist[jy * w + jx] = 0;
  for (let i = 0; i < todo.length; i++) {
    const [x, y] = todo[i];
    for (const [dx, dy] of Object.values(DIR)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (wall[ny * w + nx] || dist[ny * w + nx] >= 0) continue;
      dist[ny * w + nx] = dist[y * w + x] + 1;
      todo.push([nx, ny]);
    }
  }
  const bugPaths = Array.isArray(level.bugs)
    ? level.bugs.map((b) => (b && Array.isArray(b.path) && b.path.length ? b.path : null))
    : [];
  const grid = {
    w,
    h,
    wall,
    jx,
    jy,
    dist,
    bugPaths,
    key: rows ? rows.join('|') : `${w}x${h}`,
    isWall(x, y) {
      return x < 0 || y < 0 || x >= w || y >= h || wall[y * w + x] === 1;
    },
  };
  gridCache.set(level, grid);
  return grid;
}

// ------------------------------------------------------------------ renderer

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const doc = canvas.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const view = { w: 300, h: 150, dpr: 1 };
  let staticLayer = null;
  let staticKey = '';

  const fx = {
    key: null,
    tick: 0,
    time: 0,
    floaters: [],
    parts: [],
    shakeAt: -10,
    shakeAmp: 0,
    facing: new Map(),
  };

  function resize() {
    const win = doc && doc.defaultView;
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    if (!w || !h) {
      // Not laid out (detached or hidden): draw 1:1 into the backing store.
      view.w = canvas.width || 300;
      view.h = canvas.height || 150;
      view.dpr = 1;
      return;
    }
    const dpr = clamp((win && win.devicePixelRatio) || 1, 1, 3);
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      // A canvas sized only by its attributes would now have grown: pin it.
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        w = canvas.clientWidth || w;
        h = canvas.clientHeight || h;
      }
    }
    view.w = w;
    view.h = h;
    view.dpr = dpr;
  }

  function layout(grid) {
    const pad = clamp(Math.min(view.w, view.h) * 0.015, 3, 14);
    const s = clamp(Math.floor(Math.min((view.w - pad * 2) / grid.w, (view.h - pad * 2) / grid.h)), 6, 112);
    return {
      s,
      ox: Math.round((view.w - s * grid.w) / 2),
      oy: Math.round((view.h - s * grid.h) / 2),
    };
  }

  // -------------------------------------------------------------- static layer

  function buildStatic(grid, L) {
    const key = `${grid.key}@${view.w}x${view.h}x${view.dpr}`;
    if (staticLayer && staticKey === key) return staticLayer;
    if (!staticLayer) staticLayer = doc.createElement('canvas');
    staticKey = key;
    staticLayer.width = Math.max(1, Math.round(view.w * view.dpr));
    staticLayer.height = Math.max(1, Math.round(view.h * view.dpr));
    const g = staticLayer.getContext('2d');
    const { s, ox, oy } = L;
    const W = grid.w * s;
    const H = grid.h * s;
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.fillStyle = C.bg;
    g.fillRect(0, 0, view.w, view.h);

    // The sheet: a faint grid that runs past the board, so a canvas of any
    // aspect ratio still looks like one drawing.
    g.strokeStyle = `rgba(${C.line},0.06)`;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = ox % s; x <= view.w; x += s) {
      g.moveTo(Math.round(x) + 0.5, 0);
      g.lineTo(Math.round(x) + 0.5, view.h);
    }
    for (let y = oy % s; y <= view.h; y += s) {
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(view.w, Math.round(y) + 0.5);
    }
    g.stroke();

    // Floor: a touch lighter than the sheet, with grid lines and vertex ticks.
    g.fillStyle = `rgba(${C.line},0.04)`;
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (!grid.isWall(x, y)) g.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
    g.strokeStyle = `rgba(${C.line},0.16)`;
    g.beginPath();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (grid.isWall(x, y)) continue;
        g.rect(ox + x * s + 0.5, oy + y * s + 0.5, s - 1, s - 1);
      }
    }
    g.stroke();
    const tick = Math.max(1.5, s * 0.07);
    g.strokeStyle = `rgba(${C.line},0.6)`;
    g.beginPath();
    for (let y = 0; y <= grid.h; y++) {
      for (let x = 0; x <= grid.w; x++) {
        const touchesFloor =
          !grid.isWall(x, y) || !grid.isWall(x - 1, y) || !grid.isWall(x, y - 1) || !grid.isWall(x - 1, y - 1);
        if (!touchesFloor) continue;
        const px = ox + x * s + 0.5;
        const py = oy + y * s + 0.5;
        g.moveTo(px - tick, py);
        g.lineTo(px + tick, py);
        g.moveTo(px, py - tick);
        g.lineTo(px, py + tick);
      }
    }
    g.stroke();

    // Walls: solid, hatched like a section cut, with a lit edge on the floor side.
    g.save();
    g.beginPath();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (grid.isWall(x, y)) g.rect(ox + x * s, oy + y * s, s, s);
      }
    }
    g.fillStyle = C.wall;
    g.fill();
    g.clip();
    g.strokeStyle = `rgba(${C.line},0.13)`;
    g.lineWidth = 1;
    g.beginPath();
    const gap = Math.max(5, s / 4);
    for (let d = -H; d < W + H; d += gap) {
      g.moveTo(ox + d, oy + H);
      g.lineTo(ox + d + H, oy);
    }
    g.stroke();
    g.restore();

    g.strokeStyle = C.wallEdge;
    g.lineWidth = Math.max(1, s * 0.045);
    g.lineCap = 'square';
    g.beginPath();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (!grid.isWall(x, y)) continue;
        const x0 = ox + x * s;
        const y0 = oy + y * s;
        const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < grid.w && cy < grid.h && !grid.isWall(cx, cy);
        if (inside(x, y - 1)) {
          g.moveTo(x0, y0);
          g.lineTo(x0 + s, y0);
        }
        if (inside(x, y + 1)) {
          g.moveTo(x0, y0 + s);
          g.lineTo(x0 + s, y0 + s);
        }
        if (inside(x - 1, y)) {
          g.moveTo(x0, y0);
          g.lineTo(x0, y0 + s);
        }
        if (inside(x + 1, y)) {
          g.moveTo(x0 + s, y0);
          g.lineTo(x0 + s, y0 + s);
        }
      }
    }
    g.stroke();
    g.lineCap = 'butt';

    // Sheet furniture: registration marks, and column/row references when
    // there is room to read them.
    const m = Math.max(4, s * 0.22);
    g.strokeStyle = `rgba(${C.line},0.5)`;
    g.lineWidth = 1;
    g.beginPath();
    for (const [cx, cy, sx, sy] of [
      [ox, oy, -1, -1],
      [ox + W, oy, 1, -1],
      [ox, oy + H, -1, 1],
      [ox + W, oy + H, 1, 1],
    ]) {
      g.moveTo(cx + 0.5 * sx, cy + 0.5 * sy - sy * m);
      g.lineTo(cx + 0.5 * sx, cy + 0.5 * sy);
      g.lineTo(cx + 0.5 * sx - sx * m, cy + 0.5 * sy);
    }
    g.stroke();
    if (s >= 34) {
      const size = Math.max(8, Math.round(s * 0.2));
      for (let x = 0; x < grid.w; x++) {
        if (!grid.isWall(x, 0)) continue;
        label(g, String.fromCharCode(65 + x), ox + (x + 0.5) * s, oy + s * 0.5, size, `rgba(${C.line},0.34)`, {
          bold: false,
        });
      }
      for (let y = 1; y < grid.h; y++) {
        if (!grid.isWall(0, y)) continue;
        label(g, String(y), ox + s * 0.5, oy + (y + 0.5) * s, size, `rgba(${C.line},0.34)`, { bold: false });
      }
    }
    return staticLayer;
  }

  // --------------------------------------------------------------- effects

  function spawnBits(x, y, color, count, seed, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = hash(seed + i * 7.3) * TAU;
      const v = (opts.speed || 1.6) * (0.45 + hash(seed + i * 3.1));
      fx.parts.push({
        kind: opts.kind || 'bit',
        x,
        y,
        vx: Math.cos(a) * v * (opts.spreadX == null ? 1 : opts.spreadX),
        vy: Math.sin(a) * v - (opts.lift || 0),
        g: opts.gravity || 0,
        t0: fx.time + (opts.delay || 0),
        life: (opts.life || 0.55) * (0.7 + 0.6 * hash(seed + i * 1.7)),
        size: (opts.size || 0.11) * (0.7 + 0.6 * hash(seed + i * 9.9)),
        color,
      });
    }
  }

  function spawnRing(x, y, color, delay = 0) {
    fx.parts.push({ kind: 'ring', x, y, vx: 0, vy: 0, g: 0, t0: fx.time + delay, life: 0.5, size: 0.9, color });
  }

  function floater(x, y, text, color, opts = {}) {
    const tileKey = `${x},${y}`;
    const stacked = fx.floaters.filter((f) => f.tileKey === tileKey && f.t0 >= fx.time - 0.01).length;
    fx.floaters.push({
      tileKey,
      x,
      y,
      text,
      sub: opts.sub || null,
      color,
      scale: opts.scale || 1,
      t0: fx.time + stacked * 0.24,
      life: opts.life || 1.25,
    });
  }

  function shake(amp) {
    fx.shakeAt = fx.time;
    fx.shakeAmp = Math.max(amp, 0);
  }

  function spawnEvent(e, n, state, prev, liveIndex) {
    const bench = e.benchId != null && state.benches ? state.benches.find((b) => b.id === e.benchId) : null;
    const bob = e.bob != null && state.bobs ? state.bobs[e.bob] : null;
    let x = Number.isFinite(e.x) ? e.x : null;
    let y = Number.isFinite(e.y) ? e.y : null;
    if (x == null || y == null) {
      const at = bench || bob;
      if (!at) return;
      x = at.x;
      y = at.y;
    }
    const live = e.bob != null && e.bob === liveIndex;
    const seed = e.tick * 31 + n * 17 + x * 5 + y * 3;
    const color = bench ? BENCH_COLOR[bench.type] || C.paper : C.paper;
    switch (e.type) {
      case 'work':
        spawnBits(x, y, color, 4, seed, { speed: 1.5, lift: 0.9, life: 0.45, size: 0.06 });
        break;
      case 'bump':
        spawnBits(x, y, '#8fa3d9', 5, seed, { speed: 1.3, life: 0.35, size: 0.055 });
        if (live) shake(0.07);
        break;
      case 'denied':
        floater(x, y, 'DENIED', C.red, {
          sub: e.reason === 'claimed' ? 'seat taken' : 'a sibling landed it',
          life: 1.5,
        });
        spawnBits(x, y, C.red, 7, seed, { speed: 1.8, life: 0.4 });
        if (live) shake(0.1);
        break;
      case 'sting': {
        const before = prev && prev.bobs && prev.bobs[e.bob];
        const lost = before && bob && bob.tokensLeft > 0 ? before.tokensLeft - bob.tokensLeft - 1 : 0;
        floater(x, y, lost > 0 ? `-${lost} token${lost === 1 ? '' : 's'}` : 'stung', C.red, { scale: live ? 1 : 0.85 });
        spawnBits(x, y, C.red, 9, seed, { speed: 2.2, life: 0.45, kind: 'bar' });
        if (live) shake(0.09);
        break;
      }
      case 'journal':
        floater(x, y, 'journaled', C.green, { scale: live ? 1 : 0.85 });
        spawnRing(x, y, C.green);
        spawnBits(x, y, C.green, 10, seed, { speed: 1.4, lift: 1.4, life: 0.7 });
        break;
      case 'void':
        floater(x, y, 'context lost', C.red, { sub: 'nothing persisted', life: 1.6 });
        spawnBits(x, y, live ? C.amber : C.cyan, 14, seed, { speed: 2.4, life: 0.6, kind: 'bar' });
        if (live) shake(0.08);
        break;
      case 'landed':
        floater(x, y, bench ? `+${bench.pay}` : 'landed', C.teal, { sub: 'landed', scale: 1.15 });
        spawnRing(x, y, C.teal);
        spawnBits(x, y, C.teal, 14, seed, { speed: 2.3, life: 0.7 });
        break;
      case 'helped':
        floater(x, y, 'helped', C.pink, { sub: 'trust +1' });
        spawnBits(x, y, C.pink, 7, seed, { speed: 0.9, lift: 1.6, life: 0.95, size: 0.12, kind: 'heart' });
        break;
      case 'pr_opened':
        floater(x, y, 'PR opened', C.violet, { sub: "in Erik's queue" });
        spawnRing(x, y, C.violet);
        spawnBits(x, y, C.violet, 8, seed, { speed: 1.7, life: 0.55 });
        break;
      case 'merged':
        floater(x, y, bench ? `+${bench.pay}` : 'merged', C.green, { sub: 'merged', scale: 1.15 });
        spawnRing(x, y, C.violet);
        spawnRing(x, y, C.green, 0.12);
        spawnBits(x, y, C.violet, 10, seed, { speed: 2.4, life: 0.75 });
        spawnBits(x, y, C.green, 8, seed + 99, { speed: 1.8, life: 0.75 });
        break;
      case 'rotted':
        floater(x, y, 'rotted', C.rot, { sub: 'never merged', life: 1.6 });
        spawnBits(x, y, C.rot, 9, seed, { speed: 0.8, gravity: 3.2, life: 0.8 });
        break;
      case 'gate_open':
        floater(x, y, 'lease held', C.magenta, { scale: 0.8, life: 0.9 });
        spawnBits(x, y, C.magenta, 5, seed, { speed: 1.4, life: 0.4, size: 0.05 });
        break;
      case 'gate_close':
        floater(x, y, 'lease expired', C.magenta, { scale: 0.8, life: 0.9 });
        spawnBits(x, y, C.magenta, 5, seed, { speed: 1.0, life: 0.4, size: 0.05 });
        break;
      default:
        break;
    }
  }

  function trackEffects(grid, state, prev, time, liveIndex) {
    if (time < fx.time - 0.05 || time > fx.time + 4) {
      fx.floaters.length = 0;
      fx.parts.length = 0;
      fx.shakeAt = -10;
    }
    fx.time = time;
    const key = `${grid.key}#${state.bobs ? state.bobs.length : 0}`;
    if (key !== fx.key) {
      // A new day or a new session: nothing carries over.
      fx.key = key;
      fx.tick = state.tick;
      fx.floaters.length = 0;
      fx.parts.length = 0;
      fx.facing.clear();
      return;
    }
    if (state.tick > fx.tick) {
      const from = state.tick - fx.tick > 3 ? state.tick - 1 : fx.tick;
      const events = Array.isArray(state.events) ? state.events : [];
      let n = 0;
      for (const e of events) {
        if (e.tick >= from && e.tick < state.tick) spawnEvent(e, n++, state, prev, liveIndex);
      }
      const now = state.bobs && state.bobs[liveIndex];
      const old = prev && prev.bobs && prev.bobs[liveIndex];
      if (now && old && state.tick - fx.tick === 1 && (now.x !== old.x || now.y !== old.y)) {
        // A puff of dust where the live Bob pushed off.
        spawnBits(old.x, old.y + 0.3, '#8fa3d9', 3, state.tick * 13, { speed: 0.7, life: 0.35, size: 0.06, lift: 0.3 });
      }
    } else if (state.tick < fx.tick) {
      fx.floaters.length = 0; // undo or retry: the text was about a tick that no longer happened
    }
    fx.tick = state.tick;
  }

  // ---------------------------------------------------------------- pieces

  function drawTerminal(g, cx, cy, s, t, occupied, urgency, asleep) {
    const half = 0.4 * s;
    const pulse = 0.5 + 0.5 * Math.sin(t * (urgency ? 7 : 2));
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s * (urgency ? 1.25 : 0.95));
    glow.addColorStop(0, rgba(C.green, urgency ? 0.26 + 0.14 * pulse : 0.16 + 0.05 * pulse));
    glow.addColorStop(1, rgba(C.green, 0));
    g.fillStyle = glow;
    g.fillRect(cx - s * 1.3, cy - s * 1.3, s * 2.6, s * 2.6);

    if (urgency) {
      // Sonar rings: the terminal calls the live Bob home.
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.9 + i * 0.5) % 1;
        g.strokeStyle = rgba(C.green, 0.55 * (1 - p));
        g.lineWidth = Math.max(1, s * 0.04);
        roundRect(g, cx - half - p * s * 0.45, cy - half - p * s * 0.45, (half + p * s * 0.45) * 2, (half + p * s * 0.45) * 2, s * (0.1 + p * 0.2));
        g.stroke();
      }
    }

    roundRect(g, cx - half, cy - half, half * 2, half * 2, s * 0.1);
    g.fillStyle = '#0d2a22';
    g.fill();
    g.strokeStyle = C.green;
    g.lineWidth = Math.max(1.5, s * 0.06);
    g.stroke();
    // Title bar with three status dots: a window, not just a box.
    g.fillStyle = rgba(C.green, 0.28);
    g.fillRect(cx - half + s * 0.03, cy - half + s * 0.03, half * 2 - s * 0.06, s * 0.13);
    g.fillStyle = C.green;
    for (let i = 0; i < 3; i++) {
      g.fillRect(cx - half + s * (0.08 + i * 0.09), cy - half + s * 0.07, s * 0.05, s * 0.05);
    }
    if (!occupied) {
      const size = Math.max(8, Math.round(s * 0.36));
      g.font = `bold ${size}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = C.green;
      const blink = (t * 1.6) % 1 < 0.55;
      g.fillText(asleep ? 'zz' : blink ? '>_' : '> ', cx, cy + s * 0.09);
    }
    if (asleep) {
      // Sessions are over: a couple of z's drift off the screen.
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.45 + i * 0.5) % 1;
        label(g, 'z', cx + s * (0.3 + 0.18 * p + 0.05 * Math.sin(p * 9)), cy - s * (0.35 + 0.5 * p), Math.max(7, Math.round(s * (0.2 + 0.1 * p))), rgba(C.green, 0.8 * (1 - p)));
      }
    }
  }

  function drawFix(g, b, cx, cy, s, t, occupied, was, a) {
    const R = 0.4 * s;
    const lw = Math.max(2, s * 0.085);
    const col = C.teal;
    if (b.status !== 'open') {
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.fillStyle = rgba(col, 0.2);
      g.fill();
      g.strokeStyle = rgba(col, 0.85);
      g.lineWidth = lw * 0.7;
      g.stroke();
      if (!occupied) checkMark(g, cx, cy, s, col, Math.max(2, s * 0.09));
      return;
    }
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fillStyle = rgba(col, b.workers > 0 ? 0.16 + 0.06 * Math.sin(t * 9) : 0.08);
    g.fill();
    const n = b.work;
    if (n <= 12) {
      const span = TAU / n;
      const gapA = Math.min(0.16, span * 0.3);
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.arc(cx, cy, R, -Math.PI / 2 + i * span + gapA / 2, -Math.PI / 2 + (i + 1) * span - gapA / 2);
        const fresh = i < b.progress && i >= was && a < 1;
        g.strokeStyle = fresh ? C.paper : i < b.progress ? col : rgba(col, 0.36);
        g.lineWidth = fresh ? lw * (1 + 0.7 * (1 - a)) : lw;
        g.stroke();
      }
    } else {
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.strokeStyle = rgba(col, 0.28);
      g.lineWidth = lw;
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (TAU * b.progress) / n);
      g.strokeStyle = col;
      g.stroke();
    }
    if (!occupied) benchNumbers(g, b, cx, cy, s, col);
  }

  function benchNumbers(g, b, cx, cy, s, col) {
    const left = Math.max(0, b.work - b.progress);
    const big = Math.max(9, Math.round(s * 0.36));
    const showPay = b.pay > 0;
    label(g, String(left), cx, cy - (showPay ? s * 0.07 : 0), big, C.paper);
    if (showPay) label(g, `+${b.pay}`, cx, cy + s * 0.2, Math.max(7, Math.round(s * 0.21)), col);
  }

  function drawFeat(g, b, cx, cy, s, t, occupied, state, was, a) {
    const half = 0.38 * s;
    const r = s * 0.1;
    const lw = Math.max(2, s * 0.085);
    const col = C.violet;
    const box = () => roundRect(g, cx - half, cy - half, half * 2, half * 2, r);

    if (b.status === 'rotted') {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.09);
      g.translate(-cx, -cy);
      box();
      g.fillStyle = rgba(C.rot, 0.14);
      g.fill();
      g.setLineDash([s * 0.13, s * 0.09]);
      g.strokeStyle = rgba(C.rot, 0.9);
      g.lineWidth = lw * 0.7;
      g.stroke();
      g.setLineDash([]);
      if (!occupied) {
        g.beginPath();
        g.moveTo(cx - s * 0.13, cy - s * 0.13);
        g.lineTo(cx + s * 0.13, cy + s * 0.13);
        g.moveTo(cx + s * 0.13, cy - s * 0.13);
        g.lineTo(cx - s * 0.13, cy + s * 0.13);
        g.strokeStyle = C.rot;
        g.lineWidth = Math.max(2, s * 0.08);
        g.lineCap = 'round';
        g.stroke();
        g.lineCap = 'butt';
      }
      g.fillStyle = rgba(C.rot, 0.7);
      for (let i = 0; i < 4; i++) {
        g.fillRect(cx - half + hash(b.x * 7 + i) * half * 1.8, cy - half + hash(b.y * 5 + i * 3) * half * 1.8, s * 0.05, s * 0.05);
      }
      g.restore();
      return;
    }
    if (b.status === 'merged') {
      box();
      g.fillStyle = rgba(col, 0.88);
      g.fill();
      g.strokeStyle = rgba(C.paper, 0.5);
      g.lineWidth = Math.max(1, s * 0.03);
      g.stroke();
      if (!occupied) checkMark(g, cx, cy, s, C.ink, Math.max(2, s * 0.1));
      return;
    }
    if (b.status === 'queued') {
      const pos = state.queue ? state.queue.indexOf(b.id) : -1;
      box();
      g.fillStyle = rgba(col, 0.2);
      g.fill();
      g.setLineDash([s * 0.14, s * 0.1]);
      g.lineDashOffset = -t * s * 0.35;
      g.strokeStyle = col;
      g.lineWidth = lw * 0.75;
      g.stroke();
      g.setLineDash([]);
      g.lineDashOffset = 0;
      if (!occupied) {
        label(g, 'PR', cx, cy - s * 0.08, Math.max(9, Math.round(s * 0.32)), C.paper);
        const subSize = Math.max(7, Math.round(s * 0.21));
        let sub = pos === 0 && Number.isFinite(state.nextMergeIn) ? `in ${state.nextMergeIn}` : pos >= 0 ? `#${pos + 1}` : '';
        g.font = `bold ${subSize}px ${FONT}`;
        if (pos === 0 && g.measureText(sub).width > half * 2 - 4) sub = String(state.nextMergeIn);
        if (sub) label(g, sub, cx, cy + s * 0.2, subSize, col);
      }
      return;
    }
    // open
    box();
    g.fillStyle = rgba(col, b.workers > 0 ? 0.16 + 0.06 * Math.sin(t * 9) : 0.08);
    g.fill();
    g.strokeStyle = rgba(col, 0.28);
    g.lineWidth = lw;
    g.stroke();
    if (b.progress > 0) {
      const perimeter = 8 * (half - r) + TAU * r;
      box();
      const shown = lerp(Math.min(was, b.progress), b.progress, easeOut(a));
      const swell = was < b.progress && a < 1 ? 1 - a : 0;
      g.setLineDash([(perimeter * shown) / b.work, perimeter]);
      g.strokeStyle = swell > 0.5 ? C.paper : col;
      g.lineWidth = lw * (1 + 0.6 * swell);
      g.stroke();
      g.setLineDash([]);
    }
    if (!occupied) benchNumbers(g, b, cx, cy, s, col);
    drawSeats(g, b, cx, cy - half, s, col);
  }

  function drawSeats(g, b, cx, y, s, col) {
    if (!(b.seats > 1)) return;
    const pr = Math.max(2.5, s * 0.075);
    const step = pr * 2.7;
    for (let i = 0; i < b.seats; i++) {
      const px = cx + (i - (b.seats - 1) / 2) * step;
      g.beginPath();
      g.arc(px, y, pr, 0, TAU);
      g.fillStyle = i < b.workers ? C.paper : C.ink;
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = Math.max(1.25, s * 0.035);
      g.stroke();
    }
  }

  function drawHelp(g, b, cx, cy, s, t, occupied, was, a) {
    const col = C.pink;
    const done = b.status !== 'open';
    const beat = done ? 1 + 0.05 * Math.max(0, Math.sin(t * 4)) : 1;
    const k = 0.92 * s * beat;
    const yy = cy + s * 0.02;
    heartPath(g, cx, yy, k);
    g.fillStyle = rgba(col, done ? 0.95 : 0.08);
    g.fill();
    if (!done && b.progress > 0) {
      g.save();
      const top = yy - 0.34 * k;
      const bottom = yy + 0.36 * k;
      g.beginPath();
      g.rect(cx - s * 0.5, lerp(bottom, top, lerp(Math.min(was, b.progress), b.progress, easeOut(a)) / b.work), s, s);
      g.clip();
      heartPath(g, cx, yy, k);
      g.fillStyle = rgba(col, 0.7);
      g.fill();
      g.restore();
    }
    heartPath(g, cx, yy, k);
    g.strokeStyle = done ? rgba(C.paper, 0.6) : col;
    g.lineWidth = Math.max(1.5, s * (done ? 0.03 : 0.07));
    g.lineJoin = 'round';
    g.stroke();
    g.lineJoin = 'miter';
    if (occupied) return;
    if (done) {
      checkMark(g, cx, yy - s * 0.03, s * 0.9, C.ink, Math.max(2, s * 0.09));
    } else {
      label(g, String(Math.max(0, b.work - b.progress)), cx, yy - s * 0.04, Math.max(9, Math.round(s * 0.32)), C.paper, {
        halo: Math.max(2, s * 0.07),
        haloColor: '#4a1630',
      });
    }
  }

  function drawWorkBar(g, b, cx, cy, s, was, a) {
    const col = BENCH_COLOR[b.type] || C.paper;
    const w = s * 0.8;
    const h = Math.max(3, s * 0.085);
    const x = cx - w / 2;
    const y = cy - h / 2;
    g.fillStyle = C.ink;
    g.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    const n = b.work;
    const gapW = n <= 12 ? Math.max(1, s * 0.025) : 0;
    const cells = n <= 12 ? n : 1;
    const cw = (w - gapW * (cells - 1)) / cells;
    if (cells === 1) {
      g.fillStyle = rgba(col, 0.3);
      g.fillRect(x, y, w, h);
      g.fillStyle = col;
      g.fillRect(x, y, (w * b.progress) / n, h);
      return;
    }
    for (let i = 0; i < n; i++) {
      const fresh = i < b.progress && i >= was && a < 1;
      g.fillStyle = fresh ? C.paper : i < b.progress ? col : rgba(col, 0.3);
      g.fillRect(x + i * (cw + gapW), y, cw, h);
    }
  }

  function drawPlate(g, p, cx, cy, s, t, color) {
    const half = (p.held ? 0.38 + 0.03 * Math.sin(t * 6) : 0.36) * s;
    if (p.held) {
      g.fillStyle = rgba(color, 0.16 + 0.08 * Math.sin(t * 6));
      g.fillRect(cx - half, cy - half, half * 2, half * 2);
    }
    g.setLineDash([s * 0.12, s * 0.085]);
    g.lineDashOffset = p.held ? -t * s * 0.5 : 0;
    g.strokeStyle = rgba(color, p.held ? 1 : 0.8);
    g.lineWidth = Math.max(1.5, s * 0.06);
    g.strokeRect(cx - half, cy - half, half * 2, half * 2);
    g.setLineDash([]);
    g.lineDashOffset = 0;
    // The button: a key-shaped notch that matches the lock on its gate.
    diamond(g, cx, cy, s * 0.13, s * 0.13);
    g.fillStyle = p.held ? color : rgba(color, 0.25);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = Math.max(1, s * 0.04);
    g.stroke();
  }

  function drawWire(g, L, p, gate, t, color) {
    const { s, ox, oy } = L;
    const x0 = ox + (p.x + 0.5) * s;
    const y0 = oy + (p.y + 0.5) * s;
    const x1 = ox + (gate.x + 0.5) * s;
    const y1 = oy + (gate.y + 0.5) * s;
    g.beginPath();
    g.moveTo(x0, y0);
    if (x0 !== x1 && y0 !== y1) g.lineTo(x1, y0);
    g.lineTo(x1, y1);
    g.setLineDash([s * 0.09, s * 0.11]);
    g.lineDashOffset = p.held ? -t * s * 0.9 : 0;
    g.strokeStyle = rgba(color, p.held ? 0.95 : 0.42);
    g.lineWidth = Math.max(1, s * (p.held ? 0.05 : 0.035));
    g.stroke();
    g.setLineDash([]);
    g.lineDashOffset = 0;
    if (x0 !== x1 && y0 !== y1) {
      g.fillStyle = rgba(color, p.held ? 1 : 0.55);
      g.fillRect(x1 - s * 0.045, y0 - s * 0.045, s * 0.09, s * 0.09);
    }
  }

  function drawGate(g, grid, gate, was, held, cx, cy, s, t, a, color) {
    const now = gate.open ? 1 : 0;
    const o = lerp(was == null ? now : was, now, easeOut(a));
    // Bars run from wall to wall, across the direction of travel.
    const alongX = grid.isWall(gate.x, gate.y - 1) && grid.isWall(gate.x, gate.y + 1) ? false : true;
    const half = s * 0.5;
    const reach = lerp(half, s * 0.13, o);
    const lw = Math.max(2, s * 0.1);
    const bar = (offset, len0, len1, alphaV) => {
      g.beginPath();
      if (alongX) {
        g.moveTo(cx + len0, cy + offset);
        g.lineTo(cx + len1, cy + offset);
      } else {
        g.moveTo(cx + offset, cy + len0);
        g.lineTo(cx + offset, cy + len1);
      }
      g.strokeStyle = rgba(C.magenta, alphaV);
      g.lineWidth = lw;
      g.stroke();
    };
    if (o < 1) {
      g.fillStyle = rgba(C.magenta, 0.14 * (1 - o));
      g.fillRect(cx - half, cy - half, s, s);
    }
    const expiring = gate.open && !held;
    if (expiring) {
      // The lease is running out: the bars flicker back in as a warning.
      const f = 0.14 + 0.12 * Math.sin(t * 11);
      for (const off of [-0.24, 0, 0.24]) bar(off * s, -half, half, f);
    }
    const barAlpha = lerp(1, 0.5, o);
    for (const off of [-0.24, 0, 0.24]) {
      bar(off * s, -half, -half + reach, barAlpha);
      bar(off * s, half - reach, half, barAlpha);
    }
    if (o < 0.5) {
      // The lock: same notch as the plate button, in the pair colour.
      const k = s * 0.16 * (1 - o * 2);
      diamond(g, cx, cy, k, k);
      g.fillStyle = C.ink;
      g.fill();
      g.strokeStyle = color;
      g.lineWidth = Math.max(1.5, s * 0.05);
      g.stroke();
    } else if (expiring && Number.isFinite(gate.ttl) && gate.ttl > 0) {
      label(g, String(gate.ttl), cx, cy, Math.max(9, Math.round(s * 0.34)), C.magenta, { halo: Math.max(2, s * 0.08) });
    }
  }

  function drawBugPath(g, L, path, tick, t) {
    const { s, ox, oy } = L;
    if (path.length > 1) {
      g.beginPath();
      for (let i = 0; i <= path.length; i++) {
        const [x, y] = path[i % path.length];
        const px = ox + (x + 0.5) * s;
        const py = oy + (y + 0.5) * s;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.setLineDash([s * 0.05, s * 0.12]);
      g.strokeStyle = rgba(C.red, 0.3);
      g.lineWidth = Math.max(1, s * 0.035);
      g.stroke();
      g.setLineDash([]);
    }
    // Where it will be after the next tick: corner brackets, the tell.
    const [nx, ny] = path[(tick + 1) % path.length];
    const cx = ox + (nx + 0.5) * s;
    const cy = oy + (ny + 0.5) * s;
    const h = s * (0.43 + 0.025 * Math.sin(t * 5));
    const k = s * 0.14;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      g.moveTo(cx + sx * h, cy + sy * (h - k));
      g.lineTo(cx + sx * h, cy + sy * h);
      g.lineTo(cx + sx * (h - k), cy + sy * h);
    }
    g.strokeStyle = rgba(C.red, 0.55 + 0.25 * Math.sin(t * 5));
    g.lineWidth = Math.max(1.25, s * 0.045);
    g.stroke();
  }

  function drawBug(g, cx, cy, s, t, seed, heading) {
    const r = 0.29 * s;
    const phase = (t * 0.9 + seed * 0.41) % 1.7;
    const glitching = phase < 0.14;
    const jx = Math.sin(t * 37 + seed * 3) * s * 0.012;
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.62);
    glow.addColorStop(0, rgba(C.red, 0.3));
    glow.addColorStop(1, rgba(C.red, 0));
    g.fillStyle = glow;
    g.fillRect(cx - s * 0.65, cy - s * 0.65, s * 1.3, s * 1.3);

    // Legs: three a side, twitching out of step.
    g.strokeStyle = C.red;
    g.lineWidth = Math.max(1, s * 0.04);
    g.lineCap = 'round';
    g.beginPath();
    for (let i = -1; i <= 1; i++) {
      for (const side of [-1, 1]) {
        const tw = Math.sin(t * 13 + i * 2.1 + side + seed) * s * 0.035;
        const bx = cx + side * r * (0.72 - Math.abs(i) * 0.28);
        const by = cy + i * r * 0.42;
        g.moveTo(bx, by);
        g.lineTo(bx + side * s * 0.13, by + i * s * 0.07 + tw);
        g.lineTo(bx + side * s * 0.19, by + i * s * 0.07 + tw + s * 0.07);
      }
    }
    g.stroke();
    g.lineCap = 'butt';

    const body = (dx, fill, alphaV) => {
      g.globalAlpha = alphaV;
      diamond(g, cx + dx + jx, cy, r, r * 1.08);
      g.fillStyle = fill;
      g.fill();
      g.globalAlpha = 1;
    };
    if (glitching) {
      body(-s * 0.09, C.cyan, 0.55);
      body(s * 0.09, C.magenta, 0.55);
    }
    // Three slices, knocked sideways while glitching.
    const offsets = glitching
      ? [s * 0.1 * (hash(seed + Math.floor(t * 20)) - 0.5) * 2, -s * 0.08, s * 0.06]
      : [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      g.save();
      g.beginPath();
      g.rect(cx - s, cy - r * 1.1 + (i * r * 2.2) / 3, s * 2, (r * 2.2) / 3 + 0.5);
      g.clip();
      diamond(g, cx + offsets[i] + jx, cy, r, r * 1.08);
      g.fillStyle = C.red;
      g.fill();
      g.strokeStyle = C.ink;
      g.lineWidth = Math.max(1, s * 0.035);
      g.stroke();
      diamond(g, cx + offsets[i] + jx, cy + r * 0.2, r * 0.5, r * 0.5);
      g.fillStyle = '#b3152c';
      g.fill();
      g.restore();
    }
    // Eyes: two slanted slits that lean toward where it is going.
    const ex = heading[0] * s * 0.03;
    const ey = heading[1] * s * 0.03;
    g.fillStyle = C.paper;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + jx + ex + side * s * 0.03, cy + ey - s * 0.035);
      g.lineTo(cx + jx + ex + side * s * 0.14, cy + ey - s * 0.1);
      g.lineTo(cx + jx + ex + side * s * 0.12, cy + ey - s * 0.005);
      g.closePath();
      g.fill();
    }
  }

  // Bob, live or ghost. Drawn around (cx, cy) in tile units of s; squash is
  // applied from the feet so he compresses into the floor, not the air.
  function drawBob(g, cx, cy, s, o) {
    const ghost = !!o.ghost;
    const outline = Math.max(1, s * 0.035);
    g.save();
    g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    g.translate(cx, cy + 0.37 * s);
    g.scale(o.sx || 1, o.sy || 1);
    g.translate(0, -0.37 * s);

    const bodyFill = ghost ? '#0f2536' : o.flash ? '#ff7a66' : C.amber;
    const line = ghost ? C.cyan : C.ink;
    const lw = ghost ? Math.max(1.25, s * 0.045) : outline;
    const paint = (fill) => {
      g.fillStyle = fill;
      g.fill();
      g.strokeStyle = line;
      g.lineWidth = lw;
      g.stroke();
    };

    // Feet, alternating while he walks.
    const step = (o.step || 0) * s * 0.045;
    roundRect(g, -0.2 * s, 0.27 * s - Math.max(0, step), 0.15 * s, 0.1 * s, 0.04 * s);
    paint(ghost ? bodyFill : C.amberDark);
    roundRect(g, 0.05 * s, 0.27 * s - Math.max(0, -step), 0.15 * s, 0.1 * s, 0.04 * s);
    paint(ghost ? bodyFill : C.amberDark);

    // Body.
    roundRect(g, -0.27 * s, -0.17 * s, 0.54 * s, 0.48 * s, 0.15 * s);
    paint(bodyFill);
    if (!ghost) {
      // Chest plate: a small panel line and a status light.
      g.strokeStyle = rgba(C.amberDark, 0.9);
      g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath();
      g.moveTo(-0.13 * s, 0.21 * s);
      g.lineTo(0.13 * s, 0.21 * s);
      g.stroke();
    }

    // Hard hat: dome, band, brim.
    const dome = () => {
      g.beginPath();
      g.moveTo(-0.25 * s, -0.14 * s);
      g.bezierCurveTo(-0.25 * s, -0.43 * s, 0.25 * s, -0.43 * s, 0.25 * s, -0.14 * s);
      g.closePath();
    };
    dome();
    paint(ghost ? bodyFill : C.hat);
    if (ghost) {
      g.beginPath();
      g.moveTo(-0.22 * s, -0.22 * s);
      g.lineTo(0.22 * s, -0.22 * s);
      g.strokeStyle = line;
      g.lineWidth = lw * 0.8;
      g.stroke();
    } else {
      g.save();
      dome();
      g.clip();
      g.fillStyle = C.ink;
      g.fillRect(-0.3 * s, -0.245 * s, 0.6 * s, 0.05 * s);
      g.fillStyle = rgba('#ffffff', 0.55);
      g.fillRect(-0.035 * s, -0.4 * s, 0.07 * s, 0.15 * s);
      g.restore();
    }
    roundRect(g, -0.32 * s, -0.195 * s, 0.64 * s, 0.085 * s, 0.04 * s);
    paint(ghost ? bodyFill : C.hat);

    // Eyes look along the last move (ghosts: along the next one).
    const fxd = o.face ? o.face[0] : 0;
    const fyd = o.face ? o.face[1] : 0;
    const ey = 0.045 * s + fyd * 0.02 * s;
    for (const side of [-1, 1]) {
      const exx = side * 0.105 * s + fxd * 0.025 * s;
      if (ghost) {
        g.beginPath();
        g.arc(exx + fxd * 0.03 * s, ey + fyd * 0.025 * s, Math.max(1.2, 0.04 * s), 0, TAU);
        g.fillStyle = C.cyan;
        g.fill();
      } else if (o.wince || o.blink) {
        g.beginPath();
        if (o.wince) {
          g.moveTo(exx - side * 0.055 * s, ey - 0.045 * s);
          g.lineTo(exx + side * 0.04 * s, ey);
          g.lineTo(exx - side * 0.055 * s, ey + 0.045 * s);
        } else {
          g.moveTo(exx - 0.055 * s, ey);
          g.lineTo(exx + 0.055 * s, ey);
        }
        g.strokeStyle = C.ink;
        g.lineWidth = Math.max(1.25, s * 0.04);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.stroke();
        g.lineCap = 'butt';
        g.lineJoin = 'miter';
      } else {
        g.beginPath();
        g.ellipse(exx, ey, 0.068 * s, 0.085 * s, 0, 0, TAU);
        g.fillStyle = '#fffdf2';
        g.fill();
        g.beginPath();
        g.arc(exx + fxd * 0.032 * s, ey + fyd * 0.04 * s, 0.04 * s, 0, TAU);
        g.fillStyle = C.ink;
        g.fill();
      }
    }
    if (o.sweat) {
      const dy = ((o.time * 0.9) % 1) * s * 0.12;
      g.beginPath();
      g.moveTo(0.33 * s, -0.3 * s + dy);
      g.quadraticCurveTo(0.4 * s, -0.2 * s + dy, 0.33 * s, -0.17 * s + dy);
      g.quadraticCurveTo(0.26 * s, -0.2 * s + dy, 0.33 * s, -0.3 * s + dy);
      g.fillStyle = rgba('#9bdcff', 1 - ((o.time * 0.9) % 1) * 0.7);
      g.fill();
    }
    g.restore();
  }

  function drawIntent(g, cx, cy, s, action, t) {
    const d = DIR[action];
    const p = (t * 1.3) % 1;
    g.strokeStyle = rgba(C.cyan, 0.55);
    g.fillStyle = rgba(C.cyan, 0.55);
    g.lineWidth = Math.max(1.25, s * 0.045);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (d) {
      // Two chevrons marching toward the next tile.
      for (let i = 0; i < 2; i++) {
        const reach = s * (0.47 + i * 0.13 + p * 0.06);
        const ax = cx + d[0] * reach;
        const ay = cy + d[1] * reach;
        const k = s * 0.085;
        g.globalAlpha = i === 0 ? 0.9 : 0.5;
        g.beginPath();
        g.moveTo(ax - d[0] * k + d[1] * k, ay - d[1] * k + d[0] * k);
        g.lineTo(ax, ay);
        g.lineTo(ax - d[0] * k - d[1] * k, ay - d[1] * k - d[0] * k);
        g.stroke();
      }
      g.globalAlpha = 1;
    } else if (action === 'W') {
      // Staying put: three ticking dots under the feet.
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.35 + 0.65 * (Math.floor(t * 4) % 3 === i ? 1 : 0);
        g.fillRect(cx + (i - 1) * s * 0.11 - s * 0.03, cy + s * 0.42, s * 0.06, s * 0.06);
      }
      g.globalAlpha = 1;
    } else if (action === 'E') {
      // About to journal: a return arrow.
      const ax = cx + s * 0.34;
      const ay = cy + s * 0.36;
      g.strokeStyle = rgba(C.green, 0.8);
      g.beginPath();
      g.moveTo(ax + s * 0.1, ay - s * 0.1);
      g.lineTo(ax + s * 0.1, ay);
      g.lineTo(ax - s * 0.06, ay);
      g.moveTo(ax - s * 0.01, ay - s * 0.05);
      g.lineTo(ax - s * 0.06, ay);
      g.lineTo(ax - s * 0.01, ay + s * 0.05);
      g.stroke();
    }
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
  }

  function pill(g, lines, cx, cy, size, color) {
    g.font = `bold ${size}px ${FONT}`;
    const maxW = view.w - 8;
    const fitted = lines.map((str) => {
      let out = str;
      while (out.length > 4 && g.measureText(out).width > maxW - 12) out = `${out.slice(0, -2).trimEnd()}…`;
      return out;
    });
    const w = Math.max(...fitted.map((str) => g.measureText(str).width)) + 12;
    const lh = Math.round(size * 1.25);
    const h = lh * fitted.length + 6;
    const x = clamp(cx - w / 2, 3, Math.max(3, view.w - w - 3));
    const y = clamp(cy - h / 2, 3, Math.max(3, view.h - h - 3));
    roundRect(g, x, y, w, h, 4);
    g.fillStyle = 'rgba(8,12,26,0.92)';
    g.fill();
    g.strokeStyle = rgba(color, 0.75);
    g.lineWidth = 1;
    g.stroke();
    fitted.forEach((str, i) => {
      label(g, str, x + w / 2, y + 3 + lh * (i + 0.5), size, i === 0 ? color : rgba(C.paper, 0.86), { bold: i === 0 });
    });
  }

  function captionFor(bench, state) {
    const title = bench.title || bench.id;
    switch (bench.status) {
      case 'open': {
        const left = Math.max(0, bench.work - bench.progress);
        const pay = bench.type === 'help' ? 'pays nothing. builds trust' : `pays ${bench.pay}`;
        const seats = bench.seats > 1 ? ` · ${bench.seats} seats` : '';
        return [title, `${left} work left · ${pay}${seats}`];
      }
      case 'landed':
        return [title, 'landed. nothing left to claim'];
      case 'helped':
        return [title, 'helped. it counts'];
      case 'queued': {
        const pos = state.queue ? state.queue.indexOf(bench.id) : -1;
        return [title, pos === 0 ? `PR open · Erik merges in ${state.nextMergeIn}` : `PR open · #${pos + 1} in Erik's queue`];
      }
      case 'merged':
        return [title, 'merged'];
      case 'rotted':
        return [title, 'rotted in the queue'];
      default:
        return [title];
    }
  }

  function drawParticles(g, L, time) {
    const { s, ox, oy } = L;
    fx.parts = fx.parts.filter((p) => time - p.t0 < p.life);
    for (const p of fx.parts) {
      const dt = time - p.t0;
      if (dt < 0) continue;
      const k = dt / p.life;
      const drag = 1 - Math.exp(-dt * 4);
      const x = ox + (p.x + 0.5 + (p.vx * drag) / 4) * s;
      const y = oy + (p.y + 0.5 + (p.vy * drag) / 4 + 0.5 * p.g * dt * dt) * s;
      g.globalAlpha = 1 - k * k;
      if (p.kind === 'ring') {
        g.beginPath();
        g.arc(x, y, s * (0.3 + 0.55 * easeOut(k)), 0, TAU);
        g.strokeStyle = p.color;
        g.lineWidth = Math.max(1, s * 0.1 * (1 - k));
        g.stroke();
      } else if (p.kind === 'heart') {
        heartPath(g, x, y, p.size * s * 1.6);
        g.fillStyle = p.color;
        g.fill();
      } else if (p.kind === 'bar') {
        g.fillStyle = p.color;
        g.fillRect(x - p.size * s * 1.6, y - p.size * s * 0.3, p.size * s * 3.2, p.size * s * 0.6);
      } else {
        const z = p.size * s * (1 - 0.5 * k);
        g.fillStyle = p.color;
        g.fillRect(x - z / 2, y - z / 2, z, z);
      }
    }
    g.globalAlpha = 1;
  }

  function drawFloaters(g, L, time) {
    const { s, ox, oy } = L;
    fx.floaters = fx.floaters.filter((f) => time - f.t0 < f.life);
    for (const f of fx.floaters) {
      const dt = time - f.t0;
      if (dt < 0) continue;
      const k = dt / f.life;
      const pop = dt < 0.12 ? 0.6 + (dt / 0.12) * 0.55 : dt < 0.22 ? 1.15 - ((dt - 0.12) / 0.1) * 0.15 : 1;
      const size = Math.max(10, Math.round(s * 0.34)) * f.scale * pop;
      const subSize = Math.max(8, Math.round(s * 0.2));
      g.font = `bold ${size}px ${FONT}`;
      let w = g.measureText(f.text).width;
      if (f.sub) {
        g.font = `bold ${subSize}px ${FONT}`;
        w = Math.max(w, g.measureText(f.sub).width);
      }
      const x = clamp(ox + (f.x + 0.5) * s, w / 2 + 4, Math.max(w / 2 + 4, view.w - w / 2 - 4));
      const rise = s * (0.5 + 0.75 * easeOut(k));
      const y = Math.max(size * 0.7 + 2, oy + (f.y + 0.5) * s - rise);
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      label(g, f.text, x, y, size, f.color, { halo: Math.max(3, size * 0.32) });
      if (f.sub) label(g, f.sub, x, y + size * 0.62 + subSize * 0.6, subSize, rgba(C.paper, 0.9), { halo: 3 });
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ frame

  function render(frame) {
    resize();
    const level = frame && frame.level;
    const state = frame && frame.state;
    const g = ctx;
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (!level || !state) {
      g.fillStyle = C.bg;
      g.fillRect(0, 0, view.w, view.h);
      return;
    }
    const prev = frame.prev || null;
    const a = frame.alpha == null ? 1 : clamp(frame.alpha, 0, 1);
    const t =
      typeof frame.time === 'number'
        ? frame.time
        : (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const liveIndex = Number.isInteger(frame.liveIndex) ? frame.liveIndex : -1;
    const next = (frame.hints && frame.hints.ghostNext) || null;
    const nextOf = (i) => (!next ? null : typeof next.get === 'function' ? next.get(i) : next[i]) || null;

    const grid = readGrid(level);
    const L = layout(grid);
    const { s } = L;
    trackEffects(grid, state, prev, t, liveIndex);

    const bobs = state.bobs || [];
    const benches = state.benches || [];
    const gates = state.gates || [];
    const plates = state.plates || [];
    const bugs = state.bugs || [];
    const tween = prev && a < 1;
    const e = tween ? easeOut(a) : 1;

    // Screen shake: a short decaying wobble, in tile units so it scales.
    const sdt = t - fx.shakeAt;
    let shx = 0;
    let shy = 0;
    if (sdt >= 0 && sdt < 0.32) {
      const decay = (1 - sdt / 0.32) ** 2;
      shx = Math.sin(sdt * 70) * fx.shakeAmp * s * decay;
      shy = Math.cos(sdt * 53) * fx.shakeAmp * s * 0.5 * decay;
    }

    g.fillStyle = C.bg;
    g.fillRect(0, 0, view.w, view.h);
    g.setTransform(view.dpr, 0, 0, view.dpr, Math.round(shx * view.dpr), Math.round(shy * view.dpr));
    g.drawImage(buildStatic(grid, L), 0, 0, view.w, view.h);
    // Nobody at work: the lights go down and the day runs on without you.
    const night = state.tick > 0 && !bobs.some((b) => b.status === 'active');
    if (night) {
      g.fillStyle = 'rgba(3,5,14,0.34)';
      g.fillRect(-s, -s, view.w + 2 * s, view.h + 2 * s);
    }

    const X = (x) => L.ox + (x + 0.5) * s;
    const Y = (y) => L.oy + (y + 0.5) * s;

    const gateIds = [...new Set(gates.map((gt) => gt.id))];
    const pairColor = (id) => PAIR[Math.max(0, gateIds.indexOf(id)) % PAIR.length];

    // Where every Bob is drawn this frame.
    const where = bobs.map((b, i) => {
      const p = tween && prev.bobs ? prev.bobs[i] : null;
      const from = p && p.status === 'active' ? p : b;
      return {
        x: lerp(from.x, b.x, e),
        y: lerp(from.y, b.y, e),
        moved: from.x !== b.x || from.y !== b.y,
        leaving: b.status !== 'active' && !!p && p.status === 'active',
      };
    });
    const before = prev && prev.bobs ? prev.bobs : [];
    bobs.forEach((b, i) => {
      const p = before[i];
      if (p && (p.x !== b.x || p.y !== b.y)) fx.facing.set(i, [Math.sign(b.x - p.x), Math.sign(b.y - p.y)]);
    });
    const activeOn = (x, y) => bobs.some((b) => b.status === 'active' && b.x === x && b.y === y);

    // Bug patrols and wires sit under everything else.
    bugs.forEach((bug, i) => {
      const path = grid.bugPaths[i];
      if (path) drawBugPath(g, L, path, state.tick, t);
    });
    for (const p of plates) {
      const gate = gates.find((gt) => gt.id === p.gate);
      if (gate) drawWire(g, L, p, gate, t, pairColor(p.gate));
    }
    for (const p of plates) drawPlate(g, p, X(p.x), Y(p.y), s, t, pairColor(p.gate));

    // The journal terminal: home.
    const live = liveIndex >= 0 ? bobs[liveIndex] : null;
    const liveActive = live && live.status === 'active';
    let urgency = false;
    let stranded = false;
    if (liveActive) {
      const d = grid.dist[live.y * grid.w + live.x];
      if (d > 0) {
        urgency = live.tokensLeft <= d + 2;
        stranded = live.tokensLeft <= d;
      }
    }
    drawTerminal(g, X(grid.jx), Y(grid.jy), s, t, activeOn(grid.jx, grid.jy), urgency, night);

    const workBars = [];
    for (const b of benches) {
      const occupied = activeOn(b.x, b.y);
      const old = tween && prev.benches ? prev.benches.find((o) => o.id === b.id) : null;
      const was = old ? old.progress : b.progress;
      const ba = tween ? a : 1;
      if (b.type === 'fix') drawFix(g, b, X(b.x), Y(b.y), s, t, occupied, was, ba);
      else if (b.type === 'feat') drawFeat(g, b, X(b.x), Y(b.y), s, t, occupied, state, was, ba);
      else drawHelp(g, b, X(b.x), Y(b.y), s, t, occupied, was, ba);
      if (occupied && b.status === 'open' && b.type !== 'fix') workBars.push({ b, was, a: ba });
    }

    gates.forEach((gate, i) => {
      const was = tween && prev.gates && prev.gates[i] ? (prev.gates[i].open ? 1 : 0) : null;
      const held = plates.some((p) => p.gate === gate.id && p.held);
      drawGate(g, grid, gate, was, held, X(gate.x), Y(gate.y), s, t, tween ? a : 1, pairColor(gate.id));
    });

    // Ghosts. Siblings sharing a tile fan out so each outline and label reads.
    const slots = new Map();
    const ghostLabels = [];
    bobs.forEach((b, i) => {
      if (i === liveIndex) return;
      const w = where[i];
      if (b.status !== 'active' && !w.leaving) return;
      const key = `${b.x},${b.y}`;
      const slot = slots.get(key) || 0;
      if (b.status === 'active') slots.set(key, slot + 1);
      const sharing = bobs.filter((o, j) => j !== liveIndex && o.status === 'active' && o.x === b.x && o.y === b.y).length;
      const withLive = liveActive && live.x === b.x && live.y === b.y;
      // Around the live Bob ghosts step aside, left then right; alone they fan out evenly.
      const spread = withLive
        ? (slot % 2 === 0 ? -1 : 1) * (0.2 + 0.1 * Math.floor(slot / 2)) * s
        : sharing > 1
          ? (slot - (sharing - 1) / 2) * 0.17 * s
          : 0;
      const cx = X(w.x) + spread;
      const cy = Y(w.y);
      const act = b.status === 'active' ? nextOf(i) : null;
      const face = DIR[act] || fx.facing.get(i) || [0, 0];
      const worked = b.lastEvent === 'work';
      const k = tween && worked ? Math.sin(Math.PI * a) : 0;
      const fade = w.leaving ? 1 - e : 1;
      if (fade <= 0.01) return;
      const flicker = 0.78 + 0.07 * Math.sin(t * 3 + i * 1.7);
      g.globalAlpha = flicker * fade;
      drawBob(g, cx, cy - (w.moved && tween ? Math.sin(Math.PI * e) * s * 0.05 : 0), s, {
        ghost: true,
        face,
        sx: (1 + 0.1 * k) * (w.leaving ? 1 - 0.5 * e : 1),
        sy: (1 - 0.14 * k) * (w.leaving ? 1 - 0.5 * e : 1),
        step: w.moved && tween ? Math.sin(a * TAU) : 0,
        time: t,
      });
      g.globalAlpha = 1;
      if (act) drawIntent(g, cx, cy, s, act, t + i * 0.13);
      if (b.status === 'active') {
        // Sharing a tile: the labels line up as one row over it.
        ghostLabels.push({
          text: String(b.label || '').slice(0, 6),
          cx: sharing > 1 || withLive ? X(w.x) : cx,
          cy,
          slot,
          of: sharing,
          lift: withLive ? 0.52 : 0.33,
        });
      }
    });

    // Bugs.
    bugs.forEach((bug, i) => {
      const p = tween && prev.bugs ? prev.bugs[i] : null;
      const from = p || bug;
      const far = Math.abs(from.x - bug.x) + Math.abs(from.y - bug.y) > 1;
      const bx = far ? bug.x : lerp(from.x, bug.x, e);
      const by = far ? bug.y : lerp(from.y, bug.y, e);
      const path = grid.bugPaths[i];
      let heading = [bug.x - from.x, bug.y - from.y];
      if (path && !heading[0] && !heading[1]) {
        const n = path[(state.tick + 1) % path.length];
        heading = [Math.sign(n[0] - bug.x), Math.sign(n[1] - bug.y)];
      }
      drawBug(g, X(bx), Y(by), s, t, i + 1, heading);
    });

    // Ghost labels: over ghosts and bugs, under the live Bob, who is never hidden.
    const lsize = Math.max(8, Math.round(s * 0.24));
    g.font = `bold ${lsize}px ${FONT}`;
    for (const gl of ghostLabels) {
      // Siblings on one tile get their labels side by side, as one row.
      const w = g.measureText(gl.text).width + 6;
      const h = lsize + 3;
      const row = gl.of * w + (gl.of - 1) * 2;
      const left = clamp(gl.cx - row / 2, 2, Math.max(2, view.w - row - 2));
      const x = left + gl.slot * (w + 2);
      const y = Math.max(2, gl.cy - s * gl.lift - h);
      roundRect(g, x, y, w, h, 3);
      g.fillStyle = 'rgba(8,12,26,0.85)';
      g.fill();
      g.strokeStyle = rgba(C.cyan, 0.55);
      g.lineWidth = 1;
      g.stroke();
      label(g, gl.text, x + w / 2, y + h / 2 + 0.5, lsize, C.cyan);
    }

    // The live Bob, on top.
    if (live && (liveActive || where[liveIndex].leaving)) {
      const w = where[liveIndex];
      const ev = live.lastEvent;
      const k = tween ? Math.sin(Math.PI * a) : 0;
      const fresh = tween || a < 1;
      let sx = 1 + 0.015 * Math.sin(t * 2.4);
      let sy = 1 - 0.015 * Math.sin(t * 2.4);
      let ox2 = 0;
      let oy2 = 0;
      if (ev === 'work') {
        sx += 0.16 * k;
        sy -= 0.2 * k;
      } else if (ev === 'move' && w.moved) {
        oy2 = -Math.sin(Math.PI * e) * s * 0.07;
        sx -= 0.05 * k;
        sy += 0.07 * k;
      } else if (ev === 'bump' || ev === 'denied') {
        ox2 = Math.sin(a * TAU * 2.5) * s * 0.07 * (1 - a);
      } else if (ev === 'sting') {
        ox2 = Math.sin(a * TAU * 3) * s * 0.06 * (1 - a);
      }
      const fade = w.leaving ? 1 - e : 1;
      const cx = X(w.x) + ox2;
      const cy = Y(w.y) + oy2;
      if (fade > 0.01) {
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.8);
        glow.addColorStop(0, rgba(C.amber, 0.2 * fade));
        glow.addColorStop(1, rgba(C.amber, 0));
        g.fillStyle = glow;
        g.fillRect(cx - s * 0.8, cy - s * 0.8, s * 1.6, s * 1.6);
        drawBob(g, cx, cy, s, {
          face: fx.facing.get(liveIndex) || [0, 0],
          sx: 1.1 * sx * (w.leaving ? 1 - 0.6 * e : 1),
          sy: 1.1 * sy * (w.leaving ? 1 - 0.6 * e : 1),
          step: w.moved && tween ? Math.sin(a * TAU) : 0,
          blink: (t + 0.4) % 3.7 < 0.13,
          wince: (ev === 'bump' || ev === 'denied' || ev === 'sting') && fresh && a < 0.85,
          flash: ev === 'sting' && fresh && a < 0.6 && Math.floor(a * 10) % 2 === 0,
          sweat: stranded || (urgency && live.tokensLeft <= 3),
          alpha: fade,
          time: t,
        });
      }
      if (liveActive && (urgency || live.tokensLeft <= 5)) {
        // Context is nearly gone: say so where the player is already looking.
        const r = Math.max(6.5, s * 0.17);
        const bx = clamp(cx + s * 0.4, r + 2, view.w - r - 2);
        const by = clamp(cy + s * 0.3, r + 2, view.h - r - 2);
        const hot = stranded || live.tokensLeft <= 2;
        const beat = 1 + (hot ? 0.12 : 0.05) * Math.sin(t * (hot ? 11 : 5));
        g.beginPath();
        g.arc(bx, by, r * beat, 0, TAU);
        g.fillStyle = C.ink;
        g.fill();
        g.strokeStyle = hot ? C.red : C.amber;
        g.lineWidth = Math.max(1.5, s * 0.045);
        g.stroke();
        label(g, String(live.tokensLeft), bx, by + 0.5, Math.max(8, Math.round(r * 1.25)), hot ? C.red : C.amber);
      }
    }

    // A Bob standing on a square or a heart hides its progress, so it gets a
    // small work bar under his feet instead.
    for (const { b, was, a: ba } of workBars) drawWorkBar(g, b, X(b.x), Y(b.y) + s * 0.445, s, was, ba);

    drawParticles(g, L, t);

    // A status line for whatever the live Bob is standing on. It lives in the
    // bottom margin of the sheet, where it never covers a tile that matters.
    if (liveActive && !(tween && where[liveIndex].moved)) {
      const bench = benches.find((b) => b.x === live.x && b.y === live.y);
      const onJournal = live.x === grid.jx && live.y === grid.jy && state.tick > 0;
      const lines = bench ? captionFor(bench, state) : onJournal ? ['>_ journal', 'write it down, or it never happened'] : null;
      const busy = fx.floaters.some((f) => f.y >= grid.h - 2 && t >= f.t0);
      if (lines && !busy) {
        const size = clamp(Math.round(s * 0.24), 10, 18);
        const color = bench ? (bench.status === 'rotted' ? C.rot : BENCH_COLOR[bench.type] || C.paper) : C.green;
        const h = Math.round(size * 1.25) * lines.length + 6;
        const rowMid = L.oy + (grid.h - 0.5) * s;
        pill(g, lines, view.w / 2, Math.min(rowMid, view.h - 3 - h / 2), size, color);
      }
    }

    drawFloaters(g, L, t);
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  }

  resize();
  return { resize, render };
}
