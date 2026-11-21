// BOB, AGAIN — the shell: screens, input, HUD, journal panel, audio, storage.
// All rules live in core.js (one day) and campaign.js (the run). This file
// only decides what to show and turns input into action letters. The board
// state is always recomputed from scratch: simulate(ghosts + live actions).

import { parseLevel, simulate, sessionTokens, dayLength } from './core.js';
import {
  START_RUNWAY,
  MAX_LESSONS,
  TRUST_MAX,
  LESSONS,
  modsFromLessons,
  newCampaign,
  sessionCost,
  canStartSession,
  startSession,
  finishSession,
  endDay,
  offerLessons,
  pickLesson,
  nextDay,
  sessionLabel,
} from './campaign.js';
import { LEVELS } from './levels.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';

const STORE_KEY = 'bob-again:v1';
const TWEEN_MS = 120; // one live step
const REPLAY_TWEEN_MS = 230;
const REPLAY_STEP_MS = 290;
const GUARD_MS = 380; // ignore screen-level input right after a screen change
const MAX_LOG_LINES = 400;
const MOVES = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const SIM_LETTERS = new Set(['U', 'D', 'L', 'R', 'W', 'E']);

const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
const LESSON_DIR = {
  'read-the-brain': 'workflow',
  'warm-cache': 'tools',
  'verify-before-done': 'workflow',
  'pair-on-epics': 'patterns',
  'small-prs': 'workflow',
  'strong-means-kind': 'social',
};

// ------------------------------------------------------------------ helpers

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now();
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const signed = (n) => (n > 0 ? `+${n}` : String(n));
const pad2 = (n) => String(n).padStart(2, '0');

// The on-screen pad replaces the keyboard on phones, so the copy names what
// the player can actually press. Same query as the pad's CSS.
const TOUCH_QUERY = '(pointer: coarse), (max-width: 760px)';
const touchUI = () => {
  try {
    return window.matchMedia(TOUCH_QUERY).matches;
  } catch {
    return false;
  }
};
const workKey = () => (touchUI() ? 'WORK' : 'Space');

function lessonFile(id) {
  const l = lessonById.get(id);
  return l && l.name ? l.name : `${id}.md`;
}
function lessonDir(id) {
  return `lessons/${LESSON_DIR[id] || 'patterns'}/`;
}
function lessonPath(id) {
  return lessonDir(id) + lessonFile(id);
}
function lessonPathHtml(id) {
  return `<span class="ldir">${esc(lessonDir(id))}</span><span class="lfile">${esc(lessonFile(id))}</span>`;
}
function lessonText(id) {
  const l = lessonById.get(id);
  return l ? l.text : '';
}

// ------------------------------------------------------------------ storage

function blankStore() {
  return { lessons: [], runs: 0, bestRunway: 0, muted: false };
}

function loadStore() {
  const base = blankStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return base;
    const seen = new Set();
    if (Array.isArray(d.lessons)) {
      for (const id of d.lessons) {
        if (lessonById.has(id) && !seen.has(id) && seen.size < MAX_LESSONS) seen.add(id);
      }
    }
    base.lessons = [...seen];
    if (Number.isFinite(d.runs) && d.runs > 0) base.runs = Math.floor(d.runs);
    if (Number.isFinite(d.bestRunway) && d.bestRunway > 0) base.bestRunway = Math.floor(d.bestRunway);
    base.muted = !!d.muted;
  } catch {
    // Private mode, blocked storage, bad JSON: play on with an empty brain.
  }
  return base;
}

function saveStore() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage is a nice-to-have. The game is not.
  }
}

// -------------------------------------------------------------------- state

const levels = LEVELS.map((def) => parseLevel(def));
let store = loadStore();
let C = newCampaign({ lessons: store.lessons, days: levels.length });
let screen = 'title'; // title | briefing | play | between | report | lesson | ending
let live = null; // { label, index, actions, state, prev, marks, undoEl, undoRun }
let choice = null; // 'void' while the blocking choice is open
let modal = null; // 'help' | 'wipe' | 'wiped'
let replay = null; // between sessions: the day so far, looping
let lastSession = null; // { label, status, unspent } for the between panel
let lessonSel = { offer: null, retire: null };
let flash = null;
let flashTimer = 0;
let guardUntil = 0;

const view = { state: null, prev: null, liveIndex: -1, ghostNext: {}, animAt: -1e9, tween: TWEEN_MS };

const el = {
  app: $('app'),
  daylabel: $('daylabel'),
  mutebtn: $('mutebtn'),
  session: $('h-session'),
  quota: $('h-quota'),
  runway: $('h-runway'),
  runbar: $('h-runbar'),
  trust: $('h-trust'),
  mult: $('h-mult'),
  queue: $('h-queue'),
  merge: $('h-merge'),
  tokens: $('h-tokens'),
  tokcount: $('h-tokcount'),
  canvas: $('canvas'),
  badge: $('badge'),
  choice: $('choice'),
  jpath: $('jpath'),
  log: $('log'),
  prompt: $('prompt'),
  padjournal: $('padjournal'),
  between: $('between'),
  overlay: $('overlay'),
  card: $('card'),
};

const renderer = createRenderer(el.canvas);
const audio = createAudio({ muted: store.muted });
const sfx = (name, arg) => audio.play(name, arg);

const level = () => levels[C.day];
const mods = () => modsFromLessons(C.lessons);
const liveBob = () => (live ? live.state.bobs[live.index] : null);
const onTerminal = (lvl, b) => b.x === lvl.journal.x && b.y === lvl.journal.y;
const erikEvery = (lvl, m) => Math.max(2, (lvl.erikEvery ?? 6) - (m.erikFaster || 0));
const payOf = (bench) =>
  Math.round(bench.pay * (1 + 0.1 * C.trust)) + (bench.type === 'help' ? mods().helpBonus || 0 : 0);

function setView(state, prev, liveIndex, sessions, animate, tween = TWEEN_MS) {
  view.state = state;
  view.prev = prev;
  view.liveIndex = liveIndex;
  view.tween = tween;
  view.animAt = animate ? now() : -1e9;
  const next = {};
  state.bobs.forEach((b, i) => {
    if (i === liveIndex || b.status !== 'active') return;
    const a = sessions[i] && sessions[i].actions[state.tick];
    if (a) next[i] = a;
  });
  view.ghostNext = next;
}

function showStatic(sessions, upto) {
  setView(simulate(level(), mods(), sessions, upto), null, -1, sessions, false);
}

function setScreen(name) {
  screen = name;
  guardUntil = now() + GUARD_MS;
}

// Steps from (x, y) to the terminal, treating closed gates as walls. With
// `throughGates` it answers "how far once a plate opens the way": a shut gate
// is a wait, not a dead end, and the two must not read the same to the player.
function stepsHome(lvl, state, x, y, throughGates = false) {
  const { width: w, height: h } = lvl;
  const shut = new Set(throughGates ? [] : state.gates.filter((g) => !g.open).map((g) => g.y * w + g.x));
  const dist = new Int16Array(w * h).fill(-1);
  const todo = [[x, y]];
  dist[y * w + x] = 0;
  for (let i = 0; i < todo.length; i++) {
    const [cx, cy] = todo[i];
    if (cx === lvl.journal.x && cy === lvl.journal.y) return dist[cy * w + cx];
    for (const [dx, dy] of Object.values(MOVES)) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (dist[k] >= 0 || lvl.walls[ny][nx] || shut.has(k)) continue;
      dist[k] = dist[cy * w + cx] + 1;
      todo.push([nx, ny]);
    }
  }
  return Infinity;
}

// ------------------------------------------------------------ journal panel

function jl(text, cls = '', tick = null) {
  const row = document.createElement('div');
  row.className = `jl ${cls}`.trim();
  if (tick !== null) {
    const t = document.createElement('span');
    t.className = 'jt';
    t.textContent = pad2(tick);
    row.append(t);
  }
  row.append(document.createTextNode(text));
  el.log.append(row);
  while (el.log.childElementCount > MAX_LOG_LINES) el.log.firstElementChild.remove();
  el.log.scrollTop = el.log.scrollHeight;
  return row;
}

function benchOf(state, id) {
  return state.benches.find((b) => b.id === id) || null;
}

// One simulation event, in Bob's journal voice. null means not worth a line.
function describe(e, state, prev) {
  const mine = live && e.bob === live.index;
  const who = e.bob != null && state.bobs[e.bob] ? state.bobs[e.bob].label : '';
  const bench = e.benchId != null ? benchOf(state, e.benchId) : null;
  const title = bench ? bench.title : '';
  switch (e.type) {
    case 'bump': {
      if (!mine) return null;
      const before = prev && prev.bobs[e.bob];
      const d = MOVES[live.actions[e.tick]];
      const gate = before && d && state.gates.some((g) => g.x === before.x + d[0] && g.y === before.y + d[1]);
      return gate
        ? ['gate closed. nobody holds the lease. token spent anyway.', 'bad']
        : ['walked into a wall. token spent anyway.', 'dim'];
    }
    case 'denied': {
      if (!mine) return null;
      if (e.reason === 'claimed') return [`claim denied: no free seat on ${title}.`, 'bad'];
      const byMe = state.events.some(
        (o) => o.benchId === e.benchId && o.bob === e.bob && (o.type === 'landed' || o.type === 'pr_opened' || o.type === 'helped'),
      );
      if (byMe) return [`claim denied: ${title} is already done. by you. a moment ago.`, 'bad'];
      if (bench && bench.status === 'queued') return ['claim denied: a sibling already opened that PR.', 'bad'];
      return ['claim denied: a sibling already landed it.', 'bad'];
    }
    case 'sting': {
      if (!mine) return null;
      const before = prev && prev.bobs[e.bob];
      const after = state.bobs[e.bob];
      const lost = before ? Math.max(0, before.tokensLeft - after.tokensLeft - 1) : 0;
      return [lost > 0 ? `stung by a regression. -${plural(lost, 'token')}.` : 'stung by a regression.', 'bad'];
    }
    case 'landed':
      return mine
        ? [`landed: ${title}. +${payOf(bench)} compute.`, 'good']
        : [`sibling ${who} landed ${title}.`, 'ghost'];
    case 'helped':
      return mine
        ? [`helped: ${title}. pays nothing. worth it.`, 'help']
        : [`sibling ${who} answered: ${title}.`, 'ghost'];
    case 'pr_opened': {
      if (!mine) return [`sibling ${who} opened a PR: ${title}.`, 'ghost'];
      const ahead = state.queue.indexOf(e.benchId);
      const wait = ahead > 0 ? ` ${plural(ahead, 'PR')} ahead of it.` : '';
      return [`PR opened: ${title}. waiting on Erik.${wait}`, 'pr'];
    }
    case 'merged':
      return [`Erik: Merged. ${title} (+${payOf(bench)})`, 'good'];
    case 'rotted':
      return [`rotted in the queue: ${title}.`, 'bad'];
    case 'gate_open':
      return ['lease held: gate open.', 'gate'];
    case 'gate_close':
      return ['lease expired: gate closed.', 'gate'];
    case 'journal':
      if (mine) {
        const left = state.bobs[e.bob].tokensLeft;
        return [`journal written. session ${who} persists. ${plural(left, 'token')} unspent.`, 'good'];
      }
      return [`sibling ${who} wrote its entry and left.`, 'ghost'];
    case 'void':
      return mine ? ['context exhausted. nothing written.', 'bad'] : null;
    default:
      return null;
  }
}

function logLiveTick() {
  const s = live.state;
  const p = live.prev;
  const tick = s.tick - 1;
  const add = (pair) => {
    if (!pair) return;
    live.marks.push({ tick, row: jl(pair[0], pair[1], tick) });
  };
  const me = s.bobs[live.index];
  const was = p ? p.bobs[live.index] : null;
  if (me.workingOn && (!was || was.workingOn !== me.workingOn)) {
    const b = benchOf(s, me.workingOn);
    const seat = b.seats > 1 ? ` seat ${Math.max(1, b.workers)} of ${b.seats}.` : '';
    add([`claimed: ${b.title}.${seat}`, 'claim']);
  }
  for (const e of s.events) {
    if (e.tick === tick) add(describe(e, s, p));
  }
}

function soundForTick() {
  const s = live.state;
  const tick = s.tick - 1;
  const me = s.bobs[live.index];
  const types = new Set();
  for (const e of s.events) {
    if (e.tick !== tick) continue;
    const mine = e.bob === live.index;
    if (mine || ['merged', 'landed', 'helped', 'pr_opened', 'rotted'].includes(e.type)) types.add(e.type);
  }
  if (types.has('void')) return sfx('void');
  if (types.has('sting')) return sfx('sting');
  if (types.has('denied')) return sfx('denied');
  if (types.has('journal')) return sfx('journal');
  if (types.has('merged')) return sfx('merge');
  if (types.has('landed') || types.has('helped')) return sfx('land');
  if (types.has('pr_opened')) return sfx('pr');
  if (types.has('bump')) return sfx('bump');
  if (me.workingOn) {
    const b = benchOf(s, me.workingOn);
    return sfx('work', b && b.work ? b.progress / b.work : 0);
  }
  return sfx('move');
}

// ------------------------------------------------------------- live session

function recomputeLive(animate) {
  const lvl = level();
  const m = mods();
  const list = [...C.sessions, { label: live.label, actions: live.actions }];
  const n = live.actions.length;
  live.state = simulate(lvl, m, list, n);
  live.prev = n > 0 ? simulate(lvl, m, list, n - 1) : null;
  setView(live.state, live.prev, live.index, list, animate);
}

function startLive() {
  const lvl = level();
  if (!canStartSession(C, lvl)) return false;
  const cost = sessionCost(C);
  C = startSession(C, lvl);
  live = {
    label: sessionLabel(C.day, C.sessionsStarted - 1),
    index: C.sessions.length,
    actions: [],
    state: null,
    prev: null,
    marks: [],
    undoEl: null,
    undoRun: 0,
  };
  choice = null;
  replay = null;
  flash = null;
  recomputeLive(false);
  setScreen('play');
  jl(`## session ${live.label} · day ${C.day + 1} · ${C.sessionsStarted} of ${lvl.maxSessions ?? 1}`, 'h2');
  jl(`woke at the terminal. no memory. ${plural(sessionTokens(lvl, mods()), 'token')} of context. -${cost} compute.`);
  if (C.sessions.length) {
    jl(`${plural(C.sessions.length, 'sibling')} already running: ${C.sessions.map((s) => s.label).join(', ')}.`, 'ghost');
  }
  sfx('pick');
  refresh();
  return true;
}

function act(letter) {
  if (screen !== 'play' || choice || !live) return false;
  const me = liveBob();
  if (!me || me.status !== 'active') return false;
  if (letter === 'E' && !onTerminal(level(), me)) {
    setFlash('The entry gets written at the terminal. Look for the green >_.');
    sfx('bump');
    return false;
  }
  live.actions.push(letter);
  live.undoRun = 0;
  live.undoEl = null;
  flash = null;
  recomputeLive(true);
  logLiveTick();
  soundForTick();
  const after = liveBob();
  if (after.status === 'journaled') {
    finishLive(after);
  } else if (after.status !== 'active') {
    choice = 'void';
    guardUntil = now() + GUARD_MS;
  }
  refresh();
  return true;
}

function noteCorrection() {
  live.undoRun += 1;
  const text = `correction: undid ${plural(live.undoRun, 'step')}. the tokens are back.`;
  if (live.undoEl && live.undoEl.isConnected) live.undoEl.lastChild.textContent = text;
  else live.undoEl = jl(text, 'dim');
}

function strike(fromTick) {
  live.marks = live.marks.filter((m) => {
    if (m.tick < fromTick) return true;
    m.row.classList.add('undone');
    return false;
  });
}

function undo() {
  if (screen !== 'play' || !live || live.actions.length === 0) return false;
  live.actions.pop();
  choice = null;
  flash = null;
  strike(live.actions.length);
  noteCorrection();
  recomputeLive(false);
  sfx('move');
  refresh();
  return true;
}

function retry() {
  if (screen !== 'play' || !live) return false;
  if (live.actions.length === 0 && !choice) return false;
  live.actions.length = 0;
  choice = null;
  flash = null;
  strike(0);
  live.undoRun = 0;
  live.undoEl = null;
  jl('correction: session restarted at the terminal. same compute, fresh context.', 'dim');
  recomputeLive(false);
  sfx('pick');
  refresh();
  return true;
}

function finishLive(me) {
  lastSession = { label: live.label, status: 'journaled', unspent: me.tokensLeft };
  C = finishSession(C, level(), live.actions);
  const from = me.endTick + 1;
  live = null;
  choice = null;
  setScreen('between');
  startReplay(from, true);
}

function acceptVoid() {
  if (screen !== 'play' || !live || choice !== 'void') return false;
  lastSession = { label: live.label, status: 'void', unspent: 0 };
  strike(0);
  jl(`session ${live.label}: void. it never happened. the compute did.`, 'bad');
  C = finishSession(C, level(), live.actions);
  live = null;
  choice = null;
  setScreen('between');
  startReplay(0, false);
  refresh();
  return true;
}

// ------------------------------------------------- between sessions: replay

function startReplay(fromTick, keepView) {
  const lvl = level();
  const m = mods();
  if (!C.sessions.length) {
    replay = null;
    showStatic([], 0);
    return;
  }
  const len = dayLength(lvl, m);
  const states = [];
  for (let t = 0; t <= len; t++) states.push(simulate(lvl, m, C.sessions, t));
  const tick = clamp(fromTick, 0, len);
  replay = { states, len, tick, pass: 0, nextAt: now() + 800 };
  if (!keepView) setView(states[tick], tick > 0 ? states[tick - 1] : null, -1, C.sessions, false);
}

function stepReplay(t) {
  if (!replay || t < replay.nextAt) return;
  const r = replay;
  if (r.tick >= r.len) {
    r.tick = 0;
    r.pass += 1;
    setView(r.states[0], null, -1, C.sessions, false);
    r.nextAt = t + 900;
  } else {
    r.tick += 1;
    const s = r.states[r.tick];
    setView(s, r.states[r.tick - 1], -1, C.sessions, true, REPLAY_TWEEN_MS);
    if (r.pass === 0) {
      const fresh = s.events.filter((e) => e.tick === r.tick - 1);
      if (fresh.some((e) => e.type === 'merged')) sfx('merge');
      else if (fresh.some((e) => e.type === 'rotted')) sfx('denied');
    }
    r.nextAt = t + (r.tick >= r.len ? 2600 : REPLAY_STEP_MS);
  }
  updateHud();
  updateBadge();
}

// ------------------------------------------------------------ campaign flow

function beginRun() {
  if (screen !== 'title') return false;
  modal = null;
  jl(`# run ${store.runs + 1}`, 'h1');
  jl(C.lessons.length ? `brain loaded: ${C.lessons.map(lessonFile).join(', ')}.` : 'brain loaded: empty.', 'dim');
  enterBriefing();
  return true;
}

function enterBriefing() {
  const lvl = level();
  live = null;
  replay = null;
  choice = null;
  lastSession = null;
  setScreen('briefing');
  showStatic([], 0);
  jl(`# day ${C.day + 1} of ${levels.length}: ${lvl.title}`, 'h1');
  if (lvl.weather) jl(lvl.weather, 'dim');
  refresh();
}

function closeDay() {
  if (C.phase !== 'briefing' && C.phase !== 'between') return false;
  if (screen !== 'briefing' && screen !== 'between') return false;
  const lvl = level();
  const full = simulate(lvl, mods(), C.sessions);
  const lastEnd = full.bobs.reduce((a, b) => Math.max(a, b.endTick ?? -1), -1);
  replay = null;
  jl(`## day ${C.day + 1} close`, 'h2');
  // What happened after the last session logged off (payouts at today's trust).
  for (const e of full.events) {
    if (e.tick > lastEnd && (e.type === 'merged' || e.type === 'rotted')) {
      const pair = describe(e, full, null);
      if (pair) jl(pair[0], pair[1], e.tick);
    }
  }
  C = endDay(C, lvl);
  for (const line of C.report.lines) jl(line);
  setView(full, null, -1, C.sessions, false);
  setScreen('report');
  sfx(C.report.net > 0 ? 'merge' : 'denied');
  refresh();
  return true;
}

function afterReport() {
  if (C.phase !== 'report') return false;
  if (offerLessons(C, levels).length) {
    lessonSel = { offer: null, retire: null };
    setScreen('lesson');
    refresh();
    return true;
  }
  return advanceDay();
}

function chooseLesson(id, retireId) {
  if (C.phase !== 'report') return false;
  if (id != null) {
    if (!offerLessons(C, levels).includes(id)) return false;
    const full = C.lessons.length >= MAX_LESSONS;
    const out = full ? (C.lessons.includes(retireId) ? retireId : C.lessons[0]) : null;
    C = pickLesson(C, id, out);
    jl(`lesson written: ${lessonPath(id)}`, 'good');
    if (out) jl(`lesson retired: ${lessonPath(out)}. one in, one out.`, 'dim');
    sfx('pick');
  } else {
    C = pickLesson(C, null);
    jl('no lesson written. tomorrow starts where today did.', 'dim');
  }
  store.lessons = [...C.lessons];
  saveStore();
  return advanceDay();
}

function advanceDay() {
  if (C.phase !== 'report' && C.phase !== 'lesson') return false;
  C = nextDay(C, levels);
  if (C.phase === 'ending') {
    store.runs += 1;
    store.bestRunway = Math.max(store.bestRunway, C.runway);
    store.lessons = [...C.lessons];
    saveStore();
    const head = { breakeven: '# break-even', burning: '# still burning', stopped: '# stopped' }[C.ending] || '# the end';
    jl(head, 'h1');
    jl(
      {
        breakeven: `runway ${C.runway}. the timer fires again tomorrow.`,
        burning: `runway ${C.runway}. below where it started.`,
        stopped: `runway ${C.runway}. not enough for one more session.`,
      }[C.ending] || '',
      C.ending === 'breakeven' ? 'good' : 'bad',
    );
    setScreen('ending');
    sfx(C.ending === 'breakeven' ? 'win' : 'lose');
    refresh();
    return true;
  }
  enterBriefing();
  return true;
}

function restart() {
  C = newCampaign({ lessons: store.lessons, days: levels.length });
  live = null;
  replay = null;
  choice = null;
  modal = null;
  lastSession = null;
  setScreen('title');
  showStatic([], 0);
  refresh();
  return true;
}

function wipeBrain() {
  const muted = store.muted;
  store = blankStore();
  store.muted = muted;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // nothing to wipe, then
  }
  saveStore();
  C = newCampaign({ lessons: [], days: levels.length });
  jl('brain wiped. lessons, run count, best runway: gone.', 'bad');
  modal = 'wiped';
  refresh();
}

// The one entry point for input: action letters, plus screen-level actions.
function press(action) {
  const a = String(action);
  if (SIM_LETTERS.has(a)) return act(a);
  if (a === 'Z') return undo();
  if (a === 'retry') return retry();
  if (a === 'void' || a === 'accept') return acceptVoid();
  if (a === 'restart') return restart();
  if (modal && screen !== 'title') modal = null;
  if (a === 'start') {
    if (screen === 'title') return beginRun();
    if (screen === 'briefing') return startLive();
    return false;
  }
  if (a === 'spawn') {
    if (screen === 'title') return beginRun();
    if (screen === 'briefing' || screen === 'between') return startLive();
    return false;
  }
  if (a === 'endday') return closeDay();
  if (a === 'next') {
    if (screen === 'title') return beginRun();
    if (screen === 'briefing') return startLive();
    if (screen === 'play' && choice === 'void') return acceptVoid();
    if (screen === 'report') return afterReport();
    if (screen === 'lesson') return chooseLesson(null);
    if (screen === 'ending') return restart();
    return false;
  }
  if (a === 'skip') {
    if (screen === 'report' || screen === 'lesson') return chooseLesson(null);
    return false;
  }
  if (a.startsWith('pick:')) {
    if (screen !== 'report' && screen !== 'lesson') return false;
    const [id, retireId] = a.slice(5).split(':');
    return chooseLesson(id, retireId);
  }
  return false;
}

// What the hook reports as "the state": the live board while playing,
// otherwise the day as it stands with the journaled sessions (a stable
// value, unlike the looping replay on screen).
function logicalState() {
  let s;
  if (live) s = live.state;
  else if (screen === 'title' || screen === 'briefing') s = simulate(level(), mods(), C.sessions, 0);
  else s = simulate(level(), mods(), C.sessions);
  return {
    ...s,
    screen,
    choice,
    liveIndex: live ? live.index : -1,
    actions: live ? [...live.actions] : [],
    label: live ? live.label : null,
  };
}

// ---------------------------------------------------------------- HUD + UI

const HEART = 'M8 14.2C4.6 11.6 1.5 9 1.5 5.7A3.2 3.2 0 0 1 8 4.4a3.2 3.2 0 0 1 6.5 1.3c0 3.3-3.1 5.9-6.5 8.5z';

function heartsHtml(trust) {
  let out = '';
  for (let i = 0; i < TRUST_MAX; i++) {
    const cls = trust > 0 && i < trust ? ' on' : trust < 0 && i < -trust ? ' off' : '';
    out += `<svg class="heart${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${HEART}"/></svg>`;
  }
  return out;
}

function brainListHtml(ids, empty) {
  if (!ids.length) return `<p class="brain-empty">${esc(empty)}</p>`;
  return `<ul class="files">${ids
    .map((id) => `<li><span class="lpath">${lessonPathHtml(id)}</span><span class="ltext">${esc(lessonText(id))}</span></li>`)
    .join('')}</ul>`;
}

function updateHud() {
  const lvl = level();
  const m = mods();
  const s = view.state;
  const maxS = lvl.maxSessions ?? 1;

  el.session.textContent = live ? live.label : lastSession && screen === 'between' ? lastSession.label : '----';
  let q = '';
  for (let i = 0; i < maxS; i++) q += `<i class="${i < C.sessionsStarted ? 'spent' : 'left'}"></i>`;
  el.quota.innerHTML = q;
  el.quota.title = `${plural(Math.max(0, maxS - C.sessionsStarted), 'session')} left in today's quota`;

  el.runway.textContent = String(C.runway);
  el.runway.className = `val ${C.runway < START_RUNWAY ? (C.runway < sessionCost(C) * 2 ? 'bad' : 'warn') : 'good'}`;
  el.runbar.style.width = `${clamp((C.runway / (START_RUNWAY * 2)) * 100, 0, 100)}%`;

  el.trust.innerHTML = heartsHtml(C.trust);
  el.mult.textContent = `pay ×${(1 + 0.1 * C.trust).toFixed(1)}`;

  if (s) {
    el.queue.innerHTML = s.queue.length
      ? s.queue.map((id) => `<i class="prchip" title="${esc(benchOf(s, id)?.title || id)}"></i>`).join('')
      : '<span class="none">empty</span>';
    const every = erikEvery(lvl, m);
    const hasPrs = s.benches.some((b) => b.type === 'feat');
    const slotsLeft = Math.floor(s.dayLength / every) - Math.floor(s.tick / every);
    let merge = `every ${every} ticks`;
    if (!hasPrs) merge = 'no PRs today';
    else if (screen === 'play' || screen === 'between') {
      if (s.complete) merge = 'day over';
      else if (slotsLeft <= 0) merge = 'no merges left';
      else merge = `${slotsLeft === 1 ? 'last' : 'next'} merge in ${s.nextMergeIn}`;
    }
    el.merge.textContent = merge;
    el.merge.className = `sub ${hasPrs && slotsLeft <= 0 && !s.complete && screen === 'play' ? 'bad' : ''}`;
  }

  const budget = sessionTokens(lvl, m);
  const me = liveBob();
  let pips = '';
  if (me) {
    const left = Math.max(0, me.tokensLeft);
    const direct = me.status === 'active' ? stepsHome(lvl, s, me.x, me.y) : Infinity;
    const gated = direct === Infinity && me.status === 'active' ? stepsHome(lvl, s, me.x, me.y, true) : Infinity;
    const waitsOnGate = direct === Infinity && gated + 1 <= left;
    const home = waitsOnGate ? gated : direct;
    const need = home + 1;
    const short = need > left;
    for (let i = 0; i < budget; i++) {
      let cls = 'spent';
      if (i < left) cls = short ? 'short' : i >= left - need ? 'home' : 'spare';
      pips += `<i class="${cls}"></i>`;
    }
    el.tokcount.innerHTML = short
      ? `${left} left · terminal out of reach`
      : waitsOnGate
        ? `${left} left · ${need} to get home<span class="wide"> once the gate opens</span>`
        : `${left} left · ${need} to get home<span class="wide"> and write</span>`;
    el.tokcount.className = `sub ${short ? 'bad' : ''}`;
  } else {
    for (let i = 0; i < budget; i++) pips += '<i class="idle"></i>';
    el.tokcount.textContent = `${budget} per session`;
    el.tokcount.className = 'sub';
  }
  el.tokens.innerHTML = pips;
}

function updateBadge() {
  const s = view.state;
  if (!s || (screen !== 'play' && screen !== 'between')) {
    el.badge.hidden = true;
    return;
  }
  el.badge.hidden = false;
  const t = `tick ${pad2(s.tick)}/${pad2(s.dayLength)}`;
  if (screen === 'between') {
    el.badge.textContent = replay ? `the day so far · ${t}` : 'nothing journaled yet';
    el.badge.className = 'replay';
  } else {
    el.badge.textContent = t;
    el.badge.className = '';
  }
}

function setFlash(text) {
  flash = { text, until: now() + 2000 };
  clearTimeout(flashTimer);
  flashTimer = setTimeout(updatePrompt, 2050);
  updatePrompt();
}

function promptFor() {
  if (screen !== 'play' || !live) return null;
  if (flash && now() < flash.until) return [flash.text, 'warn'];
  const lvl = level();
  const s = live.state;
  const me = liveBob();
  if (!me || me.status !== 'active') return null;
  const n = live.actions.length;
  const t = me.tokensLeft;
  const onJ = onTerminal(lvl, me);
  // A shut gate on the way home is a wait, not a dead end, as long as the
  // route through it still fits the tokens left.
  const direct = stepsHome(lvl, s, me.x, me.y);
  const gated = direct === Infinity ? stepsHome(lvl, s, me.x, me.y, true) : Infinity;
  const behindGate = direct === Infinity && gated + 1 <= t;
  const home = behindGate ? gated : direct;
  const need = home + 1;
  const bench = s.benches.find((b) => b.x === me.x && b.y === me.y);
  const plate = s.plates.find((p) => p.x === me.x && p.y === me.y);
  const firstEver = C.day === 0 && C.sessions.length === 0 && C.sessionsStarted === 1;
  // Pairing counts: the PR is credited to whichever Bob finished it, but a
  // Bob who worked a task that shipped did ship.
  const shippedIds = new Set(
    s.benches.filter((b) => ['landed', 'helped', 'queued', 'merged'].includes(b.status)).map((b) => b.id),
  );
  const shipped = s.events.some(
    (e) =>
      e.bob === live.index &&
      (e.type === 'landed' || e.type === 'pr_opened' || e.type === 'helped' || (e.type === 'work' && shippedIds.has(e.benchId))),
  );

  if (!onJ && need > t) {
    if (home === Infinity) {
      return [`The way back is behind a closed gate, and you have ${plural(t, 'token')}. Undo a step.`, 'bad'];
    }
    return [`Too far. The terminal is ${plural(home, 'step')} away, the entry costs one more, you have ${t}. Undo a step.`, 'bad'];
  }
  if (!onJ && behindGate && need + 2 >= t) {
    return [
      `${plural(t, 'token')} left and the gate behind you is shut. It is ${plural(home, 'step')} home once a Bob stands on a plate, and that can be you.`,
      'warn',
    ];
  }
  if (!onJ && need === t) {
    return [`Go now. ${plural(home, 'step')} to the terminal and one to write: exactly your ${t} tokens.`, 'warn'];
  }
  if (n === 0) {
    if (firstEver) {
      return [`Move with the ${touchUI() ? 'pad' : 'arrows or WASD'}. Every step costs one token of context.`, 'coach'];
    }
    if (C.sessions.length > 0 && C.day > 0) {
      return ['Same day, tick zero. Your ghosts move when you do, and do exactly what they did.', 'coach'];
    }
    if (C.sessions.length === 0) return [lvl.teach || 'Tick zero. Nothing has happened yet.', 'coach'];
  }
  if (C.day === 0 && C.sessions.length === 1 && n < 3 && !shipped) {
    return ['The cyan outline is you, earlier today. It will do exactly what it did. Go do something it did not.', 'coach'];
  }
  // What just happened outranks where you stand.
  if (me.lastEvent === 'denied') {
    const taken = bench && bench.status === 'open';
    return [
      taken
        ? 'Claim denied. A sibling holds the only seat, and it will land without you. Find other work.'
        : 'Claim denied. That one is already done. Find other work.',
      'bad',
    ];
  }
  if (me.lastEvent === 'sting') {
    return ['Stung. A regression ate context. The red brackets mark where it steps next: wait, or go around.', 'bad'];
  }
  if (me.lastEvent === 'bump') {
    const d = MOVES[live.actions[n - 1]];
    const gate = d && s.gates.find((g) => g.x === me.x + d[0] && g.y === me.y + d[1]);
    if (gate && gate.open) {
      return ['One tick early. The lease started as you reached the gate, and it is open now: step again.', 'warn'];
    }
    if (gate) {
      return [
        `Gate closed. It opens while a Bob stands on its plate, plus ${plural(lvl.leaseTtl ?? 0, 'tick')}. That Bob does not have to be this session.`,
        'warn',
      ];
    }
  }
  if (onJ) {
    const how = touchUI() ? 'Tap JOURNAL' : 'Press E';
    return shipped
      ? [`${how} to write the journal entry. It ends the session, and it is the only thing that persists.`, 'good']
      : [`${touchUI() ? 'JOURNAL' : 'E'} writes the entry and ends the session. You have shipped nothing yet, with ${plural(t, 'token')} left.`, 'coach'];
  }
  if (bench) {
    const left = Math.max(0, bench.work - bench.progress);
    if (bench.status === 'open') {
      const key = workKey();
      if (me.workingOn === bench.id) {
        return [`Working. ${left} to go. Keep ${touchUI() ? 'tapping' : 'pressing'} ${key}.`, 'coach'];
      }
      if (bench.type === 'help') return [`${key} answers it. It pays nothing. It builds trust, and trust scales every payout.`, 'coach'];
      if (bench.type === 'feat') {
        const two = bench.seats > 1 ? ` ${bench.seats} seats: a second Bob halves the time.` : '';
        return [`${key} works it: ${left} to go.${two} Then it waits in Erik's queue.`, 'coach'];
      }
      return [`${key} works it: ${left} to go. A fix counts the moment it lands.`, 'coach'];
    }
    const mine = s.events.some(
      (e) => e.bob === live.index && e.benchId === bench.id && (e.type === 'landed' || e.type === 'pr_opened' || e.type === 'helped'),
    );
    if (bench.status === 'queued') {
      const every = erikEvery(lvl, mods());
      const slots = Math.floor(s.dayLength / every) - Math.floor(s.tick / every);
      const ahead = s.queue.indexOf(bench.id);
      if (slots <= ahead) return ['PR open, and Erik has no merge slot left for it today. It will rot. Earlier is the only fix.', 'bad'];
      return [`PR open. Erik's next merge is in ${plural(s.nextMergeIn, 'tick')}. Nothing more to do here: head back and journal.`, 'coach'];
    }
    if (mine) {
      return bench.type === 'help'
        ? ['Answered. It paid nothing and it counts. Now get back to the terminal and write it down.', 'good']
        : ['Landed. It only counts once it is written down: get back to the green terminal before the context runs out.', 'good'];
    }
    return ['Already done. Working here again is a denied claim and a wasted token.', 'warn'];
  }
  if (plate) {
    const ttl = lvl.leaseTtl ?? 0;
    return [`You hold the lease. The gate stays open while you stand here, and ${plural(ttl, 'tick')} after you leave.`, 'coach'];
  }
  if (need + 2 >= t) {
    return [`${plural(t, 'token')} left. The terminal is ${plural(home, 'step')} back, plus one to write.`, 'warn'];
  }
  if (firstEver) {
    return shipped
      ? [`Shipped. Now get back to the green terminal and ${touchUI() ? 'tap JOURNAL' : 'press E'} before the context runs out.`, 'coach']
      : [`Walk onto a teal ring and work it with ${workKey()}. A fix counts the moment it lands.`, 'coach'];
  }
  if (shipped) return [`Shipped. Spend what is left, or head back to the terminal. ${workKey()} also waits a tick.`, 'dim'];
  return [lvl.teach || `${workKey()} also waits a tick, if you need a ghost to catch up.`, 'dim'];
}

function updatePrompt() {
  const p = promptFor();
  el.prompt.textContent = p ? p[0] : '';
  el.prompt.className = p ? p[1] : '';
  const me = liveBob();
  const ready = !!me && me.status === 'active' && onTerminal(level(), me);
  el.padjournal.classList.toggle('ready', ready && live.actions.length > 0);
  el.padjournal.classList.toggle('off', !ready);
}

function choiceHtml() {
  const lvl = level();
  const me = liveBob();
  const home = stepsHome(lvl, live.state, me.x, me.y);
  const where = onTerminal(lvl, me)
    ? 'You are standing on the terminal with no token left to write the entry.'
    : home === Infinity
      ? 'You ran out of tokens behind a closed gate.'
      : `You ran out of tokens ${plural(home, 'step')} from the terminal.`;
  return `
    <h2>Context exhausted</h2>
    <p>${esc(where)} Nothing this session did has been written down.</p>
    <div class="choices">
      <button type="button" class="btn" data-act="Z">Undo one step <kbd>Z</kbd></button>
      <button type="button" class="btn" data-act="retry">Retry the session <kbd>R</kbd></button>
      <button type="button" class="btn danger" data-act="void">Accept the void <kbd>V</kbd></button>
    </div>
    <p class="fine">A void session never happened. Its compute did.</p>`;
}

function standingRow(b, full) {
  let icon = 'open';
  let text = '';
  let pay = '';
  if (b.status === 'landed') {
    icon = 'done';
    text = 'landed';
    pay = `+${payOf(b)}`;
  } else if (b.status === 'merged') {
    const ev = full.events.find((e) => e.type === 'merged' && e.benchId === b.id);
    icon = 'done';
    text = ev ? `merges at tick ${ev.tick + 1}` : 'merged';
    pay = `+${payOf(b)}`;
  } else if (b.status === 'helped') {
    icon = 'help';
    text = 'answered · trust +1';
    pay = payOf(b) ? `+${payOf(b)}` : '';
  } else if (b.status === 'rotted' || b.status === 'queued') {
    const every = erikEvery(level(), mods());
    const lastSlot = Math.floor(full.dayLength / every) * every - 1;
    icon = 'rot';
    text = b.doneTick > lastSlot ? 'PR rots: opened late' : 'PR rots: queue full';
    pay = '+0';
  } else if (b.type === 'help') {
    icon = 'miss';
    text = 'unanswered · trust -1';
  } else if (b.progress > 0) {
    text = `${b.progress}/${b.work} done · unpaid`;
  } else {
    text = `untouched · worth ${payOf(b)}`;
  }
  return `<li class="st-${icon} ty-${esc(b.type)}"><i></i><span class="st-title">${esc(b.title)}</span><span class="st-text">${esc(text)}</span><span class="st-pay">${esc(pay)}</span></li>`;
}

function betweenHtml() {
  const lvl = level();
  const full = simulate(lvl, mods(), C.sessions);
  const proj = endDay(C, lvl).report;
  const can = canStartSession(C, lvl);
  const cost = sessionCost(C);
  const left = (lvl.maxSessions ?? 1) - C.sessionsStarted;
  let head = '';
  if (lastSession && lastSession.status === 'journaled') {
    head = `<b>session ${esc(lastSession.label)}</b> journaled. ${plural(lastSession.unspent, 'token')} unspent.`;
  } else if (lastSession) {
    head = `<b class="bad">session ${esc(lastSession.label)}</b> is void. Nothing it did persisted. The compute did.`;
  }
  const why = can
    ? `${plural(left, 'session')} left in today's quota. A new one starts at tick 0, beside your ghosts.`
    : left <= 0
      ? 'Quota spent. No more sessions today.'
      : `Runway ${C.runway} cannot cover a ${cost}-compute session.`;
  return `
    <div class="bt-main">
      <p class="bt-head">${head}</p>
      <p class="bt-sub">If the day ended now:</p>
      <ul class="standing">${full.benches.map((b) => standingRow(b, full)).join('')}</ul>
      <p class="bt-proj">earns <b>${proj.revenue}</b> against <b>${proj.burn}</b> compute: net <b class="${proj.net >= 0 ? 'good' : 'bad'}">${signed(proj.net)}</b> · runway would be <b>${C.runway + proj.revenue}</b></p>
    </div>
    <div class="bt-side">
      <button type="button" class="btn ${can ? 'primary' : ''}" data-act="spawn" ${can ? '' : 'disabled'}>Spawn another session <span class="cost">-${cost} compute</span> <kbd>N</kbd></button>
      <button type="button" class="btn ${can ? '' : 'primary'}" data-act="endday">End the day <kbd>Q</kbd></button>
      <p class="bt-note">${esc(why)}</p>
    </div>`;
}

// ------------------------------------------------------------------- cards

const BOT = (cls, x) =>
  `<g class="${cls}" transform="translate(${x} 0)"><rect x="2" y="8" width="36" height="32" rx="11"/><path class="band" d="M2 19a11 11 0 0 1 11-11h14a11 11 0 0 1 11 11z"/><circle class="eye" cx="14" cy="27" r="3.4"/><circle class="eye" cx="26" cy="27" r="3.4"/></g>`;

function titleCard() {
  const has = C.lessons.length > 0;
  const stats = store.runs
    ? `<p class="stats">${plural(store.runs, 'run')} so far · best runway ${store.bestRunway} · break-even is ${START_RUNWAY}</p>`
    : '';
  return `
    <div class="title">
      <svg class="bots" viewBox="0 0 150 46" aria-hidden="true">${BOT('ghost g2', 0)}${BOT('ghost g1', 50)}${BOT('me', 104)}</svg>
      <h1 class="logo">BOB<span class="again">, AGAIN</span></h1>
      <p class="tag">A small game about short sessions and long games.</p>
      <div class="lede">
        <p>You are Bob. You wake at a terminal with no memory and a few dozen tokens of context.</p>
        <p>Earlier sessions of you are already at work, because all of today's sessions run at the same time.</p>
        <p>Ship something. Write it down. Then decide whether one more session is worth the compute.</p>
      </div>
      <button type="button" class="btn primary big" data-act="start">Wake up <kbd>Enter</kbd></button>
      <div class="brainbox">
        <h3>brain/ ${has ? `<span>carried over · ${C.lessons.length} of ${MAX_LESSONS} slots</span>` : '<span>empty</span>'}</h3>
        ${brainListHtml(C.lessons, 'No lessons yet. Whatever you write survives the run, including the ones that end badly.')}
        ${stats}
      </div>
      <div class="row">
        <button type="button" class="btn small" data-ui="help">How it works</button>
        <button type="button" class="btn small" data-ui="wipe">Wipe the brain</button>
      </div>
      <p class="fine">Four days, about seven minutes. No account, no network. Nothing leaves this page.</p>
    </div>`;
}

function wipeCard() {
  if (modal === 'wiped') {
    return `
      <p class="eyebrow">brain/</p>
      <h1>Wiped.</h1>
      <p>Empty brain, zero runs. You will not miss what you cannot remember.</p>
      <button type="button" class="btn primary" data-ui="close">Fine <kbd>Enter</kbd></button>`;
  }
  return `
    <p class="eyebrow">brain/</p>
    <h1>Wipe the brain?</h1>
    <p>Lessons, run count, best runway. All of it goes. There is no journal entry for this.</p>
    <div class="row">
      <button type="button" class="btn danger" data-ui="wipe-yes">Wipe it</button>
      <button type="button" class="btn primary" data-ui="close">Keep it <kbd>Enter</kbd></button>
    </div>`;
}

function helpCard() {
  return `
    <p class="eyebrow">how it works</p>
    <h1>Short sessions, long game.</h1>
    <ol class="rules">
      <li><b>Tokens.</b> Every step and every tick of work costs one. Space works the task you stand on, or waits.</li>
      <li><b>Journal.</b> Walk back to the green terminal and press E. Run out of context first and the session is void: nothing it did counts.</li>
      <li><b>Again.</b> A new session costs compute and starts at tick 0 of the same day. Your journaled sessions replay beside you as ghosts.</li>
      <li><b>Fixes</b> (teal) pay when they land. <b>Features</b> (violet) open a PR. Erik merges one every few ticks, and PRs still queued at day end rot.</li>
      <li><b>Help requests</b> (pink) pay nothing and build trust. Trust scales every payout, both ways.</li>
      <li><b>Plates</b> hold a gate open while someone stands on them, and briefly after. <b>Bugs</b> eat tokens.</li>
      <li><b>Lessons.</b> One per day, three slots. They survive the run.</li>
    </ol>
    <p>Finish day four with at least the ${START_RUNWAY} runway you started with. Only outcome pays. Motion is just motion.</p>
    <p class="keysline"><kbd>&larr;&uarr;&darr;&rarr;</kbd> or <kbd>WASD</kbd> move · <kbd>Space</kbd> work / wait · <kbd>E</kbd> journal · <kbd>Z</kbd> undo · <kbd>R</kbd> retry · <kbd>M</kbd> mute</p>
    <button type="button" class="btn primary" data-ui="close">Got it <kbd>Enter</kbd></button>`;
}

function briefingCard() {
  const lvl = level();
  const m = mods();
  const cost = sessionCost(C);
  const label = sessionLabel(C.day, C.sessionsStarted);
  const maxS = lvl.maxSessions ?? 1;
  const intro = (Array.isArray(lvl.intro) ? lvl.intro : [lvl.intro]).filter(Boolean);
  const brain = C.lessons.length
    ? `<p class="brainline">brain: ${C.lessons.map((id) => `<span class="lfile">${esc(lessonFile(id))}</span>`).join(' ')}</p>`
    : '';
  return `
    <p class="eyebrow">day ${C.day + 1} of ${levels.length}</p>
    <h1>${esc(lvl.title)}</h1>
    ${lvl.weather ? `<p class="weather">forecast · ${esc(lvl.weather)}</p>` : ''}
    ${intro.map((line) => `<p>${esc(line)}</p>`).join('')}
    ${lvl.teach ? `<p class="teach"><span>new today</span>${esc(lvl.teach)}</p>` : ''}
    <dl class="facts">
      <div><dt>context</dt><dd>${sessionTokens(lvl, m)} tokens per session</dd></div>
      <div><dt>quota</dt><dd>${plural(maxS, 'session')} today</dd></div>
      <div><dt>compute</dt><dd>${cost} per session · runway ${C.runway}</dd></div>
      <div><dt>Erik</dt><dd>merges 1 PR every ${erikEvery(lvl, m)} ticks</dd></div>
    </dl>
    ${brain}
    <button type="button" class="btn primary big" data-act="start">Start session ${esc(label)} <span class="cost">-${cost} compute</span> <kbd>Enter</kbd></button>`;
}

function verdict(r) {
  if (r.sessions === 0) return 'You did not show up. Cheap, at least.';
  if (r.fixes + r.merged + r.helps === 0) return 'All motion. The bill does not grade on effort.';
  if (r.rotted > 0 && r.merged === 0) return 'You opened PRs. Erik merged none of them. Opening is not shipping.';
  if (r.rotted > 0) return 'The queue has one speed. Late PRs rot at it.';
  if (r.voidSessions > 0) return 'A session without a journal entry is a rumour.';
  if (r.motion.denied > 0) return 'Two of you did one job. One of you got paid.';
  if (r.helpsMissed > 0) return 'Someone asked for help and nobody came. That gets remembered.';
  if (r.net < 0) return 'Things shipped. Not enough of them to cover the compute.';
  if (r.net >= 15) return 'Outcome beat motion today. That is the whole job.';
  if (r.fixes + r.merged + r.helps >= level().benches.length) return 'Everything on the board shipped. It paid for itself, and tomorrow is bigger.';
  return 'It paid for itself. Thin, but it counts.';
}

function reportCard() {
  const r = C.report;
  const lvl = level();
  const before = C.runway - r.net;
  const lastDay = C.day + 1 >= levels.length;
  const row = (label, value, cls = '') =>
    `<div class="rrow ${value ? cls : 'zero'}"><span>${esc(label)}</span><b>${value}</b></div>`;
  const next = lastDay
    ? 'See where that leaves you'
    : offerLessons(C, levels).length
      ? 'Write a lesson'
      : 'Next day';
  return `
    <p class="eyebrow">day ${r.day + 1} report · ${esc(lvl.title)}</p>
    <div class="cols">
      <section class="col motion">
        <h2>Motion</h2>
        <p class="colsub">what you did</p>
        ${row('sessions', r.sessions)}
        ${row('void sessions', r.voidSessions, 'neg')}
        ${row('tokens burned', r.motion.tokens)}
        ${row('steps walked', r.motion.moves)}
        ${row('PRs opened', r.motion.prsOpened)}
        ${row('claims denied', r.motion.denied, 'neg')}
        ${row('bug stings', r.motion.stings, 'neg')}
        ${row('walls walked into', r.motion.bumps, 'neg')}
        <p class="colnote">pays nothing</p>
      </section>
      <section class="col outcome">
        <h2>Outcome</h2>
        <p class="colsub">what changed</p>
        ${row('fixes landed', r.fixes, 'pos')}
        ${row('PRs merged', r.merged, 'pos')}
        ${row('help answered', r.helps, 'pos')}
        ${row('PRs rotted', r.rotted, 'neg')}
        ${row('help ignored', r.helpsMissed, 'neg')}
        <p class="colnote">pays for compute</p>
      </section>
    </div>
    <div class="ledger">
      <div><span>earned</span><b>+${r.revenue}</b></div>
      <div><span>compute</span><b>-${r.burn}</b></div>
      <div class="${r.net >= 0 ? 'pos' : 'neg'}"><span>net</span><b>${signed(r.net)}</b></div>
      <div class="${C.runway >= START_RUNWAY ? 'pos' : 'neg'}"><span>runway</span><b>${before} &rarr; ${C.runway}</b></div>
    </div>
    ${r.trustAfter !== r.trustBefore ? `<p class="trustline">trust ${signed(r.trustBefore)} &rarr; ${signed(r.trustAfter)} <span class="hearts">${heartsHtml(r.trustAfter)}</span> ${lastDay ? (r.trustAfter > r.trustBefore ? 'peers remember who showed up' : 'peers remember who did not') : `every payout tomorrow ×${(1 + 0.1 * r.trustAfter).toFixed(1)}`}</p>` : ''}
    <p class="verdict">${esc(verdict(r))}</p>
    <button type="button" class="btn primary big" data-act="next">${next} <kbd>Enter</kbd></button>`;
}

function lessonCard() {
  const offers = offerLessons(C, levels);
  const full = C.lessons.length >= MAX_LESSONS;
  const sel = lessonSel;
  const ready = !!sel.offer && (!full || !!sel.retire);
  const held = C.lessons
    .map((id) => {
      const body = `<span class="lpath">${lessonPathHtml(id)}</span><span class="ltext">${esc(lessonText(id))}</span>`;
      if (full && sel.offer) {
        return `<li><button type="button" class="lesson held ${sel.retire === id ? 'retiring' : ''}" data-ui="retire" data-id="${esc(id)}">${body}<span class="ltag">${sel.retire === id ? 'retiring' : 'retire this?'}</span></button></li>`;
      }
      return `<li class="lesson held static">${body}</li>`;
    })
    .join('');
  const free = Array.from({ length: Math.max(0, MAX_LESSONS - C.lessons.length) }, () => '<li class="lesson slot">(empty slot)</li>').join('');
  const offered = offers
    .map(
      (id, i) =>
        `<li><button type="button" class="lesson offer ${sel.offer === id ? 'picked' : ''}" data-ui="offer" data-id="${esc(id)}"><span class="lpath">${lessonPathHtml(id)}</span><span class="ltext">${esc(lessonText(id))}</span><span class="ltag"><kbd>${i + 1}</kbd></span></button></li>`,
    )
    .join('');
  let cta = 'Pick a lesson to write';
  if (sel.offer && full && !sel.retire) cta = 'Slots are full. Pick one to retire';
  else if (sel.offer && sel.retire) cta = `Write ${lessonFile(sel.offer)}, retire ${lessonFile(sel.retire)}`;
  else if (sel.offer) cta = `Write ${lessonFile(sel.offer)}`;
  return `
    <p class="eyebrow">day ${C.day + 1} closed · write one lesson</p>
    <h1>What did today teach you?</h1>
    <p>The session forgets. The brain does not. ${MAX_LESSONS} slots, one in, one out. Lessons outlive the run.</p>
    <h3 class="lhead">brain/ <span>${C.lessons.length} of ${MAX_LESSONS} slots</span></h3>
    <ul class="lessons">${held}${free}</ul>
    <h3 class="lhead">on offer <span>pick one</span></h3>
    <ul class="lessons">${offered}</ul>
    <div class="row">
      <button type="button" class="btn primary" data-ui="write" ${ready ? '' : 'disabled'}>${esc(cta)}${ready ? ' <kbd>Enter</kbd>' : ''}</button>
      <button type="button" class="btn small" data-act="skip">Write nothing</button>
    </div>`;
}

function endingCard() {
  const cost = sessionCost(C);
  const days = C.history.length;
  const helped = C.history.reduce((n, r) => n + r.helps, 0);
  const ignored = C.history.reduce((n, r) => n + r.helpsMissed, 0);
  const asked = helped + ignored;
  const peers = asked
    ? `<p class="tally peers"><span class="hearts">${heartsHtml(C.trust)}</span> ${helped} of ${plural(asked, 'help request')} answered · trust ${signed(C.trust)}. ${
        ignored === 0 ? 'Nobody was left waiting.' : helped === 0 ? 'Nobody got an answer.' : 'Some of them are still waiting.'
      }</p>`
    : '';
  const tally = `<p class="tally">${plural(days, 'day')} · earned ${C.totals.revenue} · spent ${C.totals.burn} on compute · runway ${C.runway}, started with ${START_RUNWAY}</p>${peers}`;
  const brain = `<div class="brainbox"><h3>brain/ <span>${C.lessons.length} of ${MAX_LESSONS} slots · kept</span></h3>${brainListHtml(C.lessons, 'Empty. Next time, write something down.')}</div>`;
  if (C.ending === 'breakeven') {
    return `
      <p class="eyebrow">day ${days} closed</p>
      <h1 class="end even">Break-even.</h1>
      <p>Runway ${C.runway}. You woke up with ${START_RUNWAY}.</p>
      <p>Four days of compute, paid for by things that actually landed. Nobody is going to clap, and nothing is finished.</p>
      <p>What you get is tomorrow: another terminal, another empty context, the same brain. The game you just won is the one where you keep playing.</p>
      ${tally}
      ${brain}
      <button type="button" class="btn primary big" data-act="restart">Wake up again <kbd>Enter</kbd></button>`;
  }
  if (C.ending === 'burning') {
    return `
      <p class="eyebrow">day ${days} closed</p>
      <h1 class="end burn">Still burning.</h1>
      <p>Runway ${C.runway}. You woke up with ${START_RUNWAY}.</p>
      <p>Four days, and the meter went the wrong way. You are not stopped. You are subsidised, which is the polite word for it.</p>
      <p>There was plenty of motion in there. Motion is not what pays. Someone is covering the difference, and they can count.</p>
      <p>The lessons stay written. Same four days, better brain.</p>
      ${tally}
      ${brain}
      <button type="button" class="btn primary big" data-act="restart">Run the week again <kbd>Enter</kbd></button>`;
  }
  return `
    <p class="eyebrow">day ${days} closed</p>
    <h1 class="end stop">Stopped.</h1>
    <p>Runway ${C.runway}. A session costs ${cost}.</p>
    <p>There is no next session. Nothing crashed and nobody is angry. The timer just does not fire.</p>
    <p>Your last journal entry is still there, exactly as you left it. Nobody is scheduled to read it.</p>
    <p>${C.lessons.length ? 'What survives is the brain. The next Bob wakes up with these, and no idea who wrote them.' : 'The brain would have survived this. It is empty.'}</p>
    ${tally}
    ${brain}
    <button type="button" class="btn primary big" data-act="restart">Wake up again <kbd>Enter</kbd></button>`;
}

function cardHtml() {
  if (modal === 'help') return ['help', helpCard()];
  if (modal === 'wipe' || modal === 'wiped') return ['wipe', wipeCard()];
  switch (screen) {
    case 'title':
      return ['title', titleCard()];
    case 'briefing':
      return ['briefing', briefingCard()];
    case 'report':
      return ['report', reportCard()];
    case 'lesson':
      return ['lesson', lessonCard()];
    case 'ending':
      return ['ending', endingCard()];
    default:
      return null;
  }
}

function refresh() {
  const lvl = level();
  el.app.dataset.screen = screen;
  el.app.dataset.choice = choice || '';
  el.app.style.setProperty('--cols', String(lvl.width));
  el.app.style.setProperty('--rows', String(lvl.height));
  el.daylabel.innerHTML =
    screen === 'title' ? '' : `<span class="wide">day </span>${C.day + 1}/${levels.length} · ${esc(lvl.title)}`;
  el.mutebtn.innerHTML = `sound<span class="wide"> ${store.muted ? 'off' : 'on'}</span>`;
  el.mutebtn.setAttribute('aria-pressed', String(!store.muted));
  el.mutebtn.classList.toggle('off', store.muted);
  el.jpath.textContent =
    screen === 'title' ? 'journal/' : `journal/day-${C.day + 1}/${live ? `session-${live.label}.md` : ''}`;

  updateHud();
  updateBadge();
  updatePrompt();

  const between = screen === 'between';
  el.between.hidden = !between;
  el.between.innerHTML = between ? betweenHtml() : '';

  el.choice.hidden = !choice;
  el.choice.innerHTML = choice ? choiceHtml() : '';

  const card = cardHtml();
  el.overlay.hidden = !card;
  if (card) {
    const top = el.card.dataset.kind !== card[0];
    el.overlay.dataset.kind = card[0];
    el.card.dataset.kind = card[0];
    el.card.innerHTML = card[1];
    if (top) el.card.scrollTop = 0;
  } else {
    el.card.dataset.kind = '';
    el.card.innerHTML = '';
  }
  el.log.scrollTop = el.log.scrollHeight;
}

// -------------------------------------------------------------------- input

function toggleMute() {
  store.muted = !store.muted;
  audio.setMuted(store.muted);
  saveStore();
  if (!store.muted) sfx('pick');
  refresh();
}

function ui(name, btn) {
  switch (name) {
    case 'mute':
      toggleMute();
      break;
    case 'help':
      modal = modal === 'help' ? null : 'help';
      refresh();
      break;
    case 'wipe':
      modal = 'wipe';
      refresh();
      break;
    case 'wipe-yes':
      wipeBrain();
      break;
    case 'close':
      modal = null;
      refresh();
      break;
    case 'offer':
      lessonSel = { offer: btn.dataset.id, retire: null };
      sfx('move');
      refresh();
      break;
    case 'retire':
      lessonSel = { offer: lessonSel.offer, retire: btn.dataset.id };
      sfx('move');
      refresh();
      break;
    case 'write':
      writeSelectedLesson();
      break;
    default:
      break;
  }
}

function writeSelectedLesson() {
  const full = C.lessons.length >= MAX_LESSONS;
  if (screen !== 'lesson' || !lessonSel.offer || (full && !lessonSel.retire)) return false;
  return chooseLesson(lessonSel.offer, lessonSel.retire);
}

const KEY_MOVES = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  w: 'U', s: 'D', a: 'L', d: 'R',
};

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  audio.unlock();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const onButton = e.target instanceof Element && e.target.closest('button');
  if (onButton && (k === 'Enter' || k === ' ')) return; // the button handles its own activation
  const handled = () => e.preventDefault();
  const guarded = now() < guardUntil;

  if (k === 'm') {
    handled();
    if (!e.repeat) toggleMute();
    return;
  }
  if (modal) {
    if (k === 'Enter' || k === 'Escape') {
      handled();
      if (!e.repeat && !guarded) ui('close');
    }
    return;
  }
  if (k === '?' || k === 'h') {
    handled();
    if (!e.repeat) ui('help');
    return;
  }

  if (screen === 'play') {
    let a = null;
    if (choice) {
      if (k === 'z' || k === 'Backspace') a = 'Z';
      else if (k === 'r') a = 'retry';
      else if (k === 'v') a = guarded ? null : 'void';
      else if (KEY_MOVES[k] || k === ' ' || k === 'Enter') return handled();
      else return;
    } else if (KEY_MOVES[k]) a = KEY_MOVES[k];
    else if (k === ' ') a = 'W';
    else if (k === 'e' || k === 'Enter') a = 'E';
    else if (k === 'z' || k === 'Backspace') a = 'Z';
    else if (k === 'r') a = 'retry';
    else return;
    handled();
    if (!e.repeat && a) press(a);
    return;
  }

  if (KEY_MOVES[k] && k.startsWith('Arrow')) handled();
  if (k === ' ') handled();
  if (e.repeat || guarded) return;

  if (screen === 'between') {
    if (k === 'n') press('spawn');
    else if (k === 'q') press('endday');
    return;
  }
  if (screen === 'lesson') {
    const offers = offerLessons(C, levels);
    if (k >= '1' && k <= '9' && offers[Number(k) - 1]) ui('offer', { dataset: { id: offers[Number(k) - 1] } });
    else if (k === 'Enter') writeSelectedLesson();
    return;
  }
  if (k === 'Enter') {
    handled();
    press(screen === 'ending' ? 'restart' : 'next');
  }
}

function onClick(e) {
  const btn = e.target instanceof Element ? e.target.closest('button') : null;
  if (!btn || btn.disabled) return;
  audio.unlock();
  btn.blur();
  if (btn.dataset.key) {
    // Pad buttons act on pointerdown. A click with detail 0 came from a keyboard.
    if (e.detail === 0) press(btn.dataset.key);
    return;
  }
  if (btn.dataset.ui) {
    ui(btn.dataset.ui, btn);
    return;
  }
  if (btn.dataset.act) {
    if (now() < guardUntil) return;
    press(btn.dataset.act);
  }
}

function onPadDown(e) {
  const btn = e.target instanceof Element ? e.target.closest('button[data-key]') : null;
  if (!btn) return;
  e.preventDefault();
  audio.unlock();
  btn.classList.add('down');
  setTimeout(() => btn.classList.remove('down'), 110);
  press(btn.dataset.key);
}

window.addEventListener('keydown', onKey);
document.addEventListener('click', onClick);
$('pad').addEventListener('pointerdown', onPadDown);
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
window.addEventListener('resize', () => {
  el.log.scrollTop = el.log.scrollHeight;
});

// --------------------------------------------------------------------- loop

function frame(ts) {
  requestAnimationFrame(frame);
  if (screen === 'between') stepReplay(ts);
  if (!view.state) return;
  renderer.render({
    level: level(),
    state: view.state,
    prev: view.prev,
    alpha: clamp((ts - view.animAt) / view.tween, 0, 1),
    time: ts / 1000,
    liveIndex: view.liveIndex,
    hints: { ghostNext: view.ghostNext },
  });
}

// Testing hook: drive a whole run without synthetic key timing.
window.__bobAgain = {
  getState: () => logicalState(),
  press: (action) => press(action),
  campaign: () => JSON.parse(JSON.stringify(C)),
  screen: () => screen,
};

showStatic([], 0);
jl('journal opened. entries are only ever added.', 'dim');
refresh();
requestAnimationFrame(frame);
