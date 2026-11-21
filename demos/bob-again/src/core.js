// BOB, AGAIN — pure day simulation.
// No DOM, no globals, no randomness. simulate() is a pure function of its
// arguments: undo, retry and ghosts are all just re-runs. See SPEC.md.

export const DEFAULT_MODS = Object.freeze({
  tokensBonus: 0,
  pairing: false,
  stingCost: 3,
  erikFaster: 0,
  helpBonus: 0,
  sessionDiscount: 0,
});

const BENCH_TYPES = new Set(['fix', 'feat', 'help']);
const MOVES = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const PARSED = new WeakSet();

function fail(def, message) {
  const id = def && typeof def.id === 'string' ? def.id : '?';
  throw new Error(`level ${id}: ${message}`);
}

function wholeNumber(def, name, value, min) {
  if (!Number.isInteger(value) || value < min) {
    fail(def, `${name} must be an integer >= ${min}, got ${String(value)}`);
  }
  return value;
}

/**
 * Parse a level definition into a Level. The result keeps every field of the
 * definition (copied, never shared) and adds the parsed grid and objects:
 * width, height, walls[y][x], journal {x, y}, benches, plates, gates, bugs.
 * Throws an Error with a readable message on a bad map.
 */
export function parseLevel(def) {
  if (!def || typeof def !== 'object') throw new Error('level: definition must be an object');
  if (PARSED.has(def)) return def;

  const map = def.map;
  if (!Array.isArray(map) || map.length === 0) fail(def, 'map must be a non-empty array of rows');
  for (const row of map) {
    if (typeof row !== 'string' || row.length === 0) fail(def, 'map rows must be non-empty strings');
    if (row.length !== map[0].length) fail(def, 'map rows must all be the same length');
  }
  const height = map.length;
  const width = map[0].length;

  const tokens = wholeNumber(def, 'tokens', def.tokens, 1);
  const maxSessions = wholeNumber(def, 'maxSessions', def.maxSessions ?? 1, 1);
  const erikEvery = wholeNumber(def, 'erikEvery', def.erikEvery ?? 6, 1);
  const overnight = wholeNumber(def, 'overnight', def.overnight ?? 0, 0);
  const leaseTtl = wholeNumber(def, 'leaseTtl', def.leaseTtl ?? 0, 0);

  const legendIn = def.legend ?? {};
  if (typeof legendIn !== 'object') fail(def, 'legend must be an object');
  const legend = {};
  for (const [ch, entry] of Object.entries(legendIn)) {
    if (ch.length !== 1 || ch === '#' || ch === '.' || ch === 'J') {
      fail(def, `legend key "${ch}" must be one character other than # . J`);
    }
    if (!entry || typeof entry !== 'object') fail(def, `legend "${ch}" must be an object`);
    legend[ch] = { ...entry };
  }

  const walls = [];
  const benches = [];
  const plates = [];
  const gates = [];
  let journal = null;

  for (let y = 0; y < height; y++) {
    const wallRow = [];
    for (let x = 0; x < width; x++) {
      const ch = map[y][x];
      wallRow.push(ch === '#');
      if (ch === '#' || ch === '.') continue;
      if (ch === 'J') {
        if (journal) fail(def, 'map must have exactly one journal terminal J');
        journal = { x, y };
        continue;
      }
      const entry = legend[ch];
      if (!entry) fail(def, `map char "${ch}" at ${x},${y} is not in the legend`);
      if (BENCH_TYPES.has(entry.type)) {
        if (benches.some((b) => b.id === ch)) fail(def, `bench "${ch}" appears more than once`);
        benches.push({
          id: ch,
          type: entry.type,
          title: typeof entry.title === 'string' ? entry.title : '',
          x,
          y,
          work: wholeNumber(def, `bench "${ch}" work`, entry.work, 1),
          seats: wholeNumber(def, `bench "${ch}" seats`, entry.seats ?? 1, 1),
          pay: wholeNumber(def, `bench "${ch}" pay`, entry.pay ?? 0, 0),
        });
      } else if (entry.type === 'plate') {
        if (typeof entry.gate !== 'string' || !entry.gate) fail(def, `plate "${ch}" needs a gate id`);
        plates.push({ x, y, gate: entry.gate });
      } else if (entry.type === 'gate') {
        if (typeof entry.id !== 'string' || !entry.id) fail(def, `gate "${ch}" needs an id`);
        gates.push({ id: entry.id, x, y });
      } else {
        fail(def, `legend "${ch}" has unknown type "${String(entry.type)}"`);
      }
    }
    walls.push(wallRow);
  }
  if (!journal) fail(def, 'map must have exactly one journal terminal J');

  for (const p of plates) {
    if (!gates.some((g) => g.id === p.gate)) fail(def, `plate at ${p.x},${p.y} opens unknown gate "${p.gate}"`);
  }
  for (const g of gates) {
    if (!plates.some((p) => p.gate === g.id)) fail(def, `gate "${g.id}" has no plate and could never open`);
  }

  const bugsIn = def.bugs ?? [];
  if (!Array.isArray(bugsIn)) fail(def, 'bugs must be an array');
  const bugs = bugsIn.map((bug, i) => {
    const path = bug && bug.path;
    if (!Array.isArray(path) || path.length === 0) fail(def, `bug ${i} needs a non-empty path`);
    const copy = path.map((p, k) => {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) {
        fail(def, `bug ${i} path[${k}] must be [x, y]`);
      }
      const [x, y] = p;
      if (x < 0 || y < 0 || x >= width || y >= height) fail(def, `bug ${i} path[${k}] is out of bounds`);
      if (walls[y][x]) fail(def, `bug ${i} path[${k}] is inside a wall`);
      return [x, y];
    });
    for (let k = 0; k < copy.length; k++) {
      const a = copy[k];
      const b = copy[(k + 1) % copy.length];
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 1) {
        fail(def, `bug ${i} jumps between path[${k}] and its next step; steps must be adjacent (the path loops)`);
      }
    }
    return { path: copy };
  });

  const level = {
    ...def,
    intro: Array.isArray(def.intro) ? [...def.intro] : def.intro,
    tokens,
    maxSessions,
    erikEvery,
    overnight,
    leaseTtl,
    map: [...map],
    legend,
    bugs,
    width,
    height,
    walls,
    journal,
    benches,
    plates,
    gates,
  };
  PARSED.add(level);
  return level;
}

function withDefaults(mods) {
  return { ...DEFAULT_MODS, ...(mods ?? {}) };
}

/** Context budget of one session. */
export function sessionTokens(level, mods) {
  return level.tokens + withDefaults(mods).tokensBonus;
}

/** Ticks in a full day: one session's worth of tokens, then the overnight. */
export function dayLength(level, mods) {
  return sessionTokens(level, mods) + (level.overnight ?? 0);
}

/** Erik merges at the end of every tick t with (t + 1) % erikInterval === 0. */
export function erikInterval(level, mods) {
  return Math.max(2, (level.erikEvery ?? 6) - withDefaults(mods).erikFaster);
}

function makeEvent(tick, type, fields) {
  return { tick, type, bob: null, benchId: null, reason: null, x: null, y: null, ...fields };
}

/**
 * Run the day for ticks 0 .. min(upto, dayLength) - 1 and return the DayState.
 * `level` may be a raw definition or a parsed Level. Never mutates its inputs.
 */
export function simulate(levelIn, modsIn, sessionsIn, upto = Infinity) {
  const level = parseLevel(levelIn);
  const mods = withDefaults(modsIn);
  const sessions = sessionsIn ?? [];
  const budget = sessionTokens(level, mods);
  const length = dayLength(level, mods);
  const every = erikInterval(level, mods);
  const limit = Number.isNaN(Number(upto)) ? length : Math.max(0, Math.min(Math.floor(Number(upto)), length));

  const bobs = sessions.map((s, index) => ({
    label: s.label,
    index,
    x: level.journal.x,
    y: level.journal.y,
    status: 'active',
    tokensLeft: budget,
    tokensSpent: 0,
    endTick: null,
    workingOn: null,
    lastEvent: null,
  }));
  const benches = level.benches.map((b) => ({
    ...b,
    progress: 0,
    status: 'open',
    doneTick: null,
    workers: 0,
  }));
  const benchAt = new Map(benches.map((b) => [`${b.x},${b.y}`, b]));
  const gateIds = [...new Set(level.gates.map((g) => g.id))];
  const gateOpen = new Map(gateIds.map((id) => [id, false]));
  const lastHeld = new Map(gateIds.map((id) => [id, null])); // last tick a Bob started on a plate
  const gateTile = new Map(level.gates.map((g) => [`${g.x},${g.y}`, g.id]));
  const bugPos = (bug, t) => bug.path[t % bug.path.length];

  const queue = [];
  const income = [];
  const events = [];
  const motion = { tokens: 0, moves: 0, bumps: 0, denied: 0, stings: 0, prsOpened: 0 };
  const outcome = { fixes: 0, merged: 0, helps: 0, rotted: 0, helpsMissed: 0 };

  // Step 1 for tick t. Events are stamped with the tick that just ended, so a
  // state always shows gates as they will be during its next tick.
  const updateGates = (t) => {
    for (const id of gateIds) {
      let holder = null;
      for (const p of level.plates) {
        if (p.gate !== id) continue;
        for (const b of bobs) {
          if (b.status === 'active' && b.x === p.x && b.y === p.y && (holder === null || b.index < holder)) {
            holder = b.index;
          }
        }
      }
      if (holder !== null) lastHeld.set(id, t);
      const held = lastHeld.get(id);
      const open = held !== null && t - held <= level.leaseTtl;
      if (open !== gateOpen.get(id)) {
        gateOpen.set(id, open);
        const tile = level.gates.find((g) => g.id === id);
        events.push(
          makeEvent(Math.max(0, t - 1), open ? 'gate_open' : 'gate_close', {
            bob: open ? holder : null,
            x: tile.x,
            y: tile.y,
          }),
        );
      }
    }
  };

  updateGates(0);

  for (let t = 0; t < limit; t++) {
    const acted = [];
    const startPos = bobs.map((b) => [b.x, b.y]);
    for (const b of bobs) {
      b.workingOn = null;
      b.lastEvent = null;
    }
    for (const bench of benches) bench.workers = 0;

    // 2. Actions, in session order.
    for (const b of bobs) {
      if (b.status !== 'active') continue;
      const actions = sessions[b.index].actions ?? [];
      if (t >= actions.length) {
        b.status = 'done';
        b.endTick = t;
        continue;
      }
      const action = actions[t];
      acted.push(b);
      if (MOVES[action]) {
        const nx = b.x + MOVES[action][0];
        const ny = b.y + MOVES[action][1];
        const gate = gateTile.get(`${nx},${ny}`);
        const blocked =
          nx < 0 || ny < 0 || nx >= level.width || ny >= level.height ||
          level.walls[ny][nx] || (gate !== undefined && !gateOpen.get(gate));
        if (blocked) {
          b.lastEvent = 'bump';
          motion.bumps++;
          events.push(makeEvent(t, 'bump', { bob: b.index, x: b.x, y: b.y }));
        } else {
          b.x = nx;
          b.y = ny;
          b.lastEvent = 'move';
          motion.moves++;
        }
      } else if (action === 'W') {
        const bench = benchAt.get(`${b.x},${b.y}`);
        if (!bench) {
          b.lastEvent = 'wait';
        } else if (bench.status !== 'open') {
          b.lastEvent = 'denied';
          motion.denied++;
          events.push(makeEvent(t, 'denied', { bob: b.index, benchId: bench.id, reason: 'landed', x: b.x, y: b.y }));
        } else if (bench.workers >= bench.seats) {
          b.lastEvent = 'denied';
          motion.denied++;
          events.push(makeEvent(t, 'denied', { bob: b.index, benchId: bench.id, reason: 'claimed', x: b.x, y: b.y }));
        } else {
          bench.workers++;
          b.workingOn = bench.id;
          b.lastEvent = 'work';
          events.push(makeEvent(t, 'work', { bob: b.index, benchId: bench.id, x: b.x, y: b.y }));
        }
      } else if (action === 'E') {
        if (b.x === level.journal.x && b.y === level.journal.y) {
          b.status = 'journaled';
          b.endTick = t;
          b.lastEvent = 'journal';
          events.push(makeEvent(t, 'journal', { bob: b.index, x: b.x, y: b.y }));
        } else {
          b.lastEvent = 'wait';
        }
      } else {
        throw new Error(`session ${String(b.label)}: unknown action ${JSON.stringify(action)} at tick ${t}`);
      }
    }

    // 3. Work.
    for (const bench of benches) {
      if (bench.status !== 'open' || bench.workers === 0) continue;
      bench.progress += bench.workers + (mods.pairing && bench.workers >= 2 ? 1 : 0);
      if (bench.progress < bench.work) continue;
      bench.progress = bench.work;
      bench.doneTick = t;
      const first = bobs.find((b) => b.workingOn === bench.id);
      const at = { bob: first ? first.index : null, benchId: bench.id, x: bench.x, y: bench.y };
      if (bench.type === 'fix') {
        bench.status = 'landed';
        outcome.fixes++;
        income.push({ tick: t, benchId: bench.id, type: 'fix', pay: bench.pay });
        events.push(makeEvent(t, 'landed', at));
      } else if (bench.type === 'help') {
        bench.status = 'helped';
        outcome.helps++;
        income.push({ tick: t, benchId: bench.id, type: 'help', pay: bench.pay });
        events.push(makeEvent(t, 'helped', at));
      } else {
        bench.status = 'queued';
        queue.push(bench.id);
        motion.prsOpened++;
        events.push(makeEvent(t, 'pr_opened', at));
      }
    }

    // 4. Bugs move to their t + 1 position and sting what they meet.
    for (const b of bobs) {
      if (b.status !== 'active') continue;
      const [sx, sy] = startPos[b.index];
      const stung = level.bugs.some((bug) => {
        const [ox, oy] = bugPos(bug, t);
        const [nx, ny] = bugPos(bug, t + 1);
        const shares = nx === b.x && ny === b.y;
        const swapped = (sx !== b.x || sy !== b.y) && nx === sx && ny === sy && ox === b.x && oy === b.y;
        return shares || swapped;
      });
      if (!stung) continue;
      const lost = Math.min(mods.stingCost, b.tokensLeft);
      b.tokensLeft -= lost;
      b.tokensSpent += lost;
      b.lastEvent = 'sting';
      motion.stings++;
      events.push(makeEvent(t, 'sting', { bob: b.index, x: b.x, y: b.y }));
    }

    // 5. Tokens.
    for (const b of acted) {
      if (b.tokensLeft > 0) {
        b.tokensLeft--;
        b.tokensSpent++;
      }
    }
    for (const b of bobs) {
      if (b.status === 'active' && b.tokensLeft <= 0) {
        b.status = 'void';
        b.endTick = t;
        events.push(makeEvent(t, 'void', { bob: b.index, x: b.x, y: b.y }));
      }
    }

    // 6. Erik.
    if ((t + 1) % every === 0 && queue.length > 0) {
      const bench = benches.find((b) => b.id === queue[0]);
      queue.shift();
      bench.status = 'merged';
      outcome.merged++;
      income.push({ tick: t, benchId: bench.id, type: 'feat', pay: bench.pay });
      events.push(makeEvent(t, 'merged', { benchId: bench.id, x: bench.x, y: bench.y }));
    }

    // 1 (for the next tick). Gates.
    updateGates(t + 1);
  }

  const complete = limit === length;
  if (complete) {
    for (const id of queue.splice(0)) {
      const bench = benches.find((b) => b.id === id);
      bench.status = 'rotted';
      outcome.rotted++;
      events.push(makeEvent(Math.max(0, length - 1), 'rotted', { benchId: bench.id, x: bench.x, y: bench.y }));
    }
  }

  motion.tokens = bobs.reduce((sum, b) => sum + b.tokensSpent, 0);
  outcome.helpsMissed = benches.filter((b) => b.type === 'help' && b.status === 'open').length;

  const isHeld = (p) => bobs.some((b) => b.status === 'active' && b.x === p.x && b.y === p.y);
  const ttlOf = (id) => {
    if (!gateOpen.get(id)) return 0;
    return lastHeld.get(id) + level.leaseTtl - limit + 1;
  };

  return {
    tick: limit,
    dayLength: length,
    complete,
    bobs,
    benches,
    gates: level.gates.map((g) => ({ id: g.id, x: g.x, y: g.y, open: gateOpen.get(g.id), ttl: ttlOf(g.id) })),
    plates: level.plates.map((p) => ({ x: p.x, y: p.y, gate: p.gate, held: isHeld(p) })),
    bugs: level.bugs.map((bug) => {
      const [x, y] = bugPos(bug, limit);
      return { x, y };
    }),
    queue,
    nextMergeIn: every - (limit % every),
    income,
    events,
    motion,
    outcome,
  };
}
