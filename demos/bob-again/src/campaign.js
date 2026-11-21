// BOB, AGAIN — pure campaign state machine and the lesson definitions.
// Every function returns a new campaign object and never mutates its input.
// Phases: briefing -> session <-> between -> report -> lesson -> briefing ... -> ending.

import { DEFAULT_MODS, simulate } from './core.js';

export const START_RUNWAY = 40;
export const SESSION_COST = 10;
export const MAX_LESSONS = 3;
export const TRUST_MIN = -3;
export const TRUST_MAX = 3;
export const DAYS = 4;

export const LESSONS = [
  {
    id: 'read-the-brain',
    name: 'read-the-brain.md',
    text: 'Load the brain before touching anything. +3 tokens per session.',
    mods: { tokensBonus: 3 },
  },
  {
    id: 'warm-cache',
    name: 'warm-cache.md',
    text: 'Spawn while the cache is warm. Sessions cost 2 less compute.',
    mods: { sessionDiscount: 2 },
  },
  {
    id: 'verify-before-done',
    name: 'verify-before-done.md',
    text: 'Run the check before calling it done. A bug sting costs 1 token, not 3.',
    mods: { stingCost: 1 },
  },
  {
    id: 'pair-on-epics',
    name: 'pair-on-epics.md',
    text: 'Big tasks want two of you. Two or more Bobs on one bench: +1 work per tick.',
    mods: { pairing: true },
  },
  {
    id: 'small-prs',
    name: 'small-prs.md',
    text: 'Small PRs review fast. Erik merges one tick sooner.',
    mods: { erikFaster: 1 },
  },
  {
    id: 'strong-means-kind',
    name: 'strong-means-kind.md',
    text: 'If you are strong, be kind. Every help request you finish pays 4 compute.',
    mods: { helpBonus: 4 },
  },
];

const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

// Which lessons to put forward after each day, best fit for tomorrow first.
const OFFER_ORDER = [
  ['read-the-brain', 'pair-on-epics', 'small-prs', 'warm-cache', 'verify-before-done', 'strong-means-kind'],
  ['verify-before-done', 'strong-means-kind', 'warm-cache', 'small-prs', 'pair-on-epics', 'read-the-brain'],
  ['strong-means-kind', 'small-prs', 'read-the-brain', 'pair-on-epics', 'verify-before-done', 'warm-cache'],
];

function cleanLessons(ids) {
  const out = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (LESSON_BY_ID.has(id) && !out.includes(id) && out.length < MAX_LESSONS) out.push(id);
  }
  return out;
}

function clampTrust(value) {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, value));
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

// A copy of C whose containers are fresh too, so no two campaign snapshots
// ever share an array. Reports and action lists are treated as immutable.
function fork(C) {
  return {
    ...C,
    lessons: [...C.lessons],
    sessions: C.sessions.map((s) => ({ label: s.label, actions: [...s.actions] })),
    history: [...C.history],
    totals: { ...C.totals },
  };
}

function requirePhase(C, fn, ...phases) {
  if (!phases.includes(C.phase)) {
    throw new Error(`${fn}: campaign is in phase '${C.phase}', expected ${phases.map((p) => `'${p}'`).join(' or ')}`);
  }
}

/** Fold lesson ids into a mods object. Unknown ids are ignored. */
export function modsFromLessons(ids) {
  const mods = { ...DEFAULT_MODS };
  for (const id of cleanLessons(ids)) Object.assign(mods, LESSON_BY_ID.get(id).mods);
  return mods;
}

/** A fresh run. `lessons` is the brain the last run left behind. */
export function newCampaign({ lessons = [], days = DAYS } = {}) {
  return {
    day: 0,
    days,
    runway: START_RUNWAY,
    trust: 0,
    lessons: cleanLessons(lessons),
    phase: 'briefing',
    sessions: [],
    sessionsStarted: 0,
    voidSessions: 0,
    voidTokens: 0,
    report: null,
    history: [],
    ending: null,
    totals: { revenue: 0, burn: 0 },
  };
}

/** Compute one session costs right now. */
export function sessionCost(C) {
  return Math.max(1, SESSION_COST - modsFromLessons(C.lessons).sessionDiscount);
}

/** Quota left today and enough runway to pay for one more session. */
export function canStartSession(C, level) {
  return (
    (C.phase === 'briefing' || C.phase === 'between') &&
    C.sessionsStarted < (level.maxSessions ?? 1) &&
    C.runway >= sessionCost(C)
  );
}

/** Pay for a session and enter it. */
export function startSession(C, level) {
  requirePhase(C, 'startSession', 'briefing', 'between');
  if (!canStartSession(C, level)) throw new Error('startSession: no quota or no runway for another session');
  const cost = sessionCost(C);
  const next = fork(C);
  next.runway -= cost;
  next.sessionsStarted += 1;
  next.totals.burn += cost;
  next.phase = 'session';
  return next;
}

/**
 * Close the running session. If it journaled it is stored as a ghost, cut at
 * its journal entry. Anything else is a void session: dropped and counted.
 */
export function finishSession(C, level, actions) {
  requirePhase(C, 'finishSession', 'session');
  const list = Array.from(actions ?? []);
  const label = sessionLabel(C.day, C.sessionsStarted - 1);
  const state = simulate(level, modsFromLessons(C.lessons), [...C.sessions, { label, actions: list }], list.length);
  const bob = state.bobs[state.bobs.length - 1];
  const next = fork(C);
  next.phase = 'between';
  if (bob.status === 'journaled') {
    next.sessions.push({ label, actions: list.slice(0, bob.endTick + 1) });
  } else {
    next.voidSessions += 1;
    next.voidTokens += bob.tokensSpent;
  }
  return next;
}

function reportLines(r, mult) {
  const lines = [];
  const kept = r.sessions - r.voidSessions;
  if (r.sessions === 0) {
    lines.push('No sessions today. Nothing happened, at no cost.');
  } else if (r.voidSessions === 0) {
    const how = r.sessions === 1 ? 'journaled' : 'all journaled';
    lines.push(`${plural(r.sessions, 'session')}, ${how}. ${plural(r.motion.tokens, 'token')} burned.`);
  } else {
    lines.push(
      `${plural(r.sessions, 'session')}, ${kept} journaled, ${r.voidSessions} void. ` +
        `${plural(r.motion.tokens, 'token')} burned.`,
    );
    lines.push('A void session never happened. The compute still did.');
  }
  if (r.fixes + r.merged > 0) {
    const parts = [];
    if (r.fixes) parts.push(`${plural(r.fixes, 'fix', 'fixes')} landed`);
    if (r.merged) parts.push(`${plural(r.merged, 'PR')} merged`);
    lines.push(`Outcome: ${parts.join(', ')}.`);
  } else if (r.sessions > 0) {
    lines.push('Outcome: nothing shipped. That was all motion.');
  }
  if (r.rotted) {
    lines.push(`${plural(r.rotted, 'PR')} rotted in the queue. Opened too late for Erik to reach.`);
  }
  if (r.motion.denied) {
    lines.push(`${plural(r.motion.denied, 'claim')} denied. A sibling was already on it.`);
  }
  if (r.motion.stings) {
    lines.push(`${plural(r.motion.stings, 'bug sting')}. Regressions eat context.`);
  }
  if (r.helps) lines.push(`${plural(r.helps, 'help request')} answered.`);
  if (r.helpsMissed) lines.push(`${plural(r.helpsMissed, 'help request')} ignored. Peers remember.`);
  if (r.trustAfter !== r.trustBefore) {
    lines.push(`Trust ${signed(r.trustBefore)} -> ${signed(r.trustAfter)}.`);
  }
  if (r.trustBefore !== 0 && r.revenue > 0) {
    lines.push(`Payouts scaled x${mult.toFixed(1)} by trust.`);
  }
  lines.push(`Revenue ${r.revenue}, compute ${r.burn}. Net ${signed(r.net)}.`);
  return lines;
}

/** Stop spawning: run the whole day with the journaled sessions and pay out. */
export function endDay(C, level) {
  requirePhase(C, 'endDay', 'briefing', 'between');
  const mods = modsFromLessons(C.lessons);
  const state = simulate(level, mods, C.sessions);
  const mult = 1 + 0.1 * C.trust;
  let revenue = 0;
  for (const row of state.income) {
    revenue += Math.round(row.pay * mult) + (row.type === 'help' ? mods.helpBonus : 0);
  }
  const burn = C.sessionsStarted * sessionCost(C);
  const { fixes, merged, rotted, helps, helpsMissed } = state.outcome;
  const trustAfter = clampTrust(C.trust + helps - helpsMissed);
  const report = {
    day: C.day,
    revenue,
    burn,
    net: revenue - burn,
    fixes,
    merged,
    rotted,
    helps,
    helpsMissed,
    motion: { ...state.motion, tokens: state.motion.tokens + C.voidTokens },
    sessions: C.sessionsStarted,
    voidSessions: C.voidSessions,
    trustBefore: C.trust,
    trustAfter,
    lines: [],
  };
  report.lines = reportLines(report, mult);
  const next = fork(C);
  next.runway += revenue;
  next.trust = trustAfter;
  next.phase = 'report';
  next.report = report;
  next.history.push(report);
  next.totals.revenue += revenue;
  return next;
}

/** Three lesson ids not held, fixed per day. Empty after the last day. */
export function offerLessons(C, levels) {
  const days = Array.isArray(levels) ? levels.length : (C.days ?? DAYS);
  if (C.day >= days - 1) return [];
  const ids = LESSONS.map((l) => l.id);
  const order = OFFER_ORDER[C.day] ?? ids.map((_, i) => ids[(i + C.day * 2) % ids.length]);
  return order.filter((id) => !C.lessons.includes(id)).slice(0, 3);
}

/**
 * Write one lesson into the brain (report -> lesson). `id` null skips. When
 * all slots are full `retireId` names the lesson that leaves; the new lesson
 * takes its slot. With a free slot `retireId` is ignored.
 */
export function pickLesson(C, id, retireId) {
  requirePhase(C, 'pickLesson', 'report');
  const next = fork(C);
  next.phase = 'lesson';
  if (id === null || id === undefined) return next;
  if (!LESSON_BY_ID.has(id)) throw new Error(`pickLesson: unknown lesson '${id}'`);
  if (C.lessons.includes(id)) throw new Error(`pickLesson: '${id}' is already in the brain`);
  if (!offerLessons(C).includes(id)) throw new Error(`pickLesson: '${id}' is not on offer today`);
  if (next.lessons.length >= MAX_LESSONS) {
    const slot = next.lessons.indexOf(retireId);
    if (slot === -1) throw new Error('pickLesson: slots are full, retireId must name a held lesson');
    next.lessons[slot] = id;
  } else {
    next.lessons.push(id);
  }
  return next;
}

/** Move on: the next day's briefing, or an ending. */
export function nextDay(C, levels) {
  requirePhase(C, 'nextDay', 'report', 'lesson');
  const next = fork(C);
  if (C.day + 1 >= levels.length) {
    next.phase = 'ending';
    next.ending = C.runway >= START_RUNWAY ? 'breakeven' : 'burning';
    return next;
  }
  if (C.runway < sessionCost(C)) {
    next.phase = 'ending';
    next.ending = 'stopped';
    return next;
  }
  next.day = C.day + 1;
  next.phase = 'briefing';
  next.sessions = [];
  next.sessionsStarted = 0;
  next.voidSessions = 0;
  next.voidTokens = 0;
  next.report = null;
  return next;
}

/** Deterministic four-hex session label, unique per (day, index) for index < 31. */
export function sessionLabel(day, index) {
  const n = ((day * 31 + index + 1) * 0x9e37 + 0xf207) & 0xffff;
  return n.toString(16).padStart(4, '0');
}
