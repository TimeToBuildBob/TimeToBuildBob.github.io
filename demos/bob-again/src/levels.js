// BOB, AGAIN — the four days. Format: SPEC.md "Level format".
// Every number here is pinned by test/solutions.mjs + test/levels.test.mjs:
// change a map, a budget or a bug path and those tests say what broke.

export const LEVELS = [
  {
    // Idea: one session lands one fix; the second must take the other one.
    // Mistake: follow the ghost to `a` -> CLAIM DENIED.
    id: 'day1',
    title: 'Hello, world',
    weather: 'Quota: clear skies. Two sessions fit.',
    intro: [
      'You wake at the journal terminal with no memory and a little context.',
      'Fix something. Write it down before the context runs out. Then do it again.',
    ],
    teach: 'Stand on a task and work it. Journal at the terminal, or the session never happened.',
    tokens: 18,
    maxSessions: 2,
    erikEvery: 6,
    overnight: 0,
    leaseTtl: 2,
    map: [
      '#########',
      '#..a#...#',
      '#.#.#.#.#',
      '#J......#',
      '#.#.#.#.#',
      '#...#b..#',
      '#########',
    ],
    legend: {
      a: { type: 'fix', work: 3, pay: 12, seats: 1, title: 'fix(ci): flaky test' },
      b: { type: 'fix', work: 3, pay: 16, seats: 1, title: 'fix(docs): dead link' },
    },
    bugs: [],
  },
  {
    // Idea: S1 stands on P (then fixes a); S2 + S3 walk through G and pair on B.
    // The inner plate p lets them out. Mistake: solo B opens the PR at tick 12,
    // one tick after Erik's only slot (tick 11) -> rotted.
    id: 'day2',
    title: 'Hold the door',
    weather: 'Quota: fair. Erik is in meetings: one merge today, mid-morning.',
    intro: [
      'The big feature sits behind a leased gate, and it has two seats: worked alone, it opens too late for Erik.',
      'The plate that opens the gate is nowhere near the door. An earlier you can hold it.',
    ],
    teach: 'A plate opens its gate while a Bob stands on it, and for 2 ticks after. Features pay when Erik merges.',
    tokens: 18,
    maxSessions: 3,
    erikEvery: 12,
    overnight: 2,
    leaseTtl: 2,
    map: [
      '#########',
      '#P..#####',
      '#.###...#',
      '#J.GpB..#',
      '#.###...#',
      '#a..#####',
      '#########',
    ],
    legend: {
      a: { type: 'fix', work: 3, pay: 8, seats: 1, title: 'fix(lint): unused import' },
      B: { type: 'feat', work: 8, pay: 30, seats: 2, title: 'feat(world): lease TTLs' },
      P: { type: 'plate', gate: 'g1' },
      p: { type: 'plate', gate: 'g1' },
      G: { type: 'gate', id: 'g1' },
    },
    bugs: [],
  },
  {
    // Idea: S1 holds P then fixes a. S2 + S3 cross the bug lane at p, pair on F,
    // then split: one fixes b, one helps Alice. Mistake: both go for b -> denied.
    id: 'day3',
    title: 'Regressions',
    weather: 'Quota: scattered showers. Bugs on the wind.',
    intro: [
      'A regression paces in front of the vault door. Every sting eats context.',
      'Alice wants a second pair of eyes. It pays nothing. Peers remember either way.',
    ],
    teach: 'Never step where a bug is about to step. Help pays in trust, and trust scales tomorrow.',
    tokens: 22,
    maxSessions: 3,
    erikEvery: 7,
    overnight: 2,
    leaseTtl: 2,
    map: [
      '#########',
      '##.hFb.##',
      '##..p..##',
      '####G####',
      '#P..J.a.#',
      '#########',
    ],
    legend: {
      a: { type: 'fix', work: 3, pay: 8, seats: 1, title: 'fix(tests): off-by-one' },
      b: { type: 'fix', work: 3, pay: 12, seats: 1, title: 'fix(sync): retry storm' },
      F: { type: 'feat', work: 8, pay: 30, seats: 2, title: 'feat(aw): sync dedupe' },
      h: { type: 'help', work: 3, pay: 0, seats: 1, title: 'Alice asks for a second pair of eyes' },
      P: { type: 'plate', gate: 'g1' },
      p: { type: 'plate', gate: 'g1' },
      G: { type: 'gate', id: 'g1' },
    },
    bugs: [{ path: [[6, 2], [5, 2], [4, 2], [3, 2], [2, 2], [3, 2], [4, 2], [5, 2]] }],
  },
  {
    // Idea: no inner plate. S1 steps on P (tick 3), helps Gordon (h) next to it,
    // steps back on P (tick 8): gate open ticks 3-5 and 8-10. S2 + S3 enter at 3,
    // pair on F ticks 5-8, leave at 9. S4 opens f first (PR by tick 7), then
    // crosses the bug lane to help Sven (k). Mistake: fix a first, then f ->
    // the PR lands behind F for the last slot and rots.
    id: 'day4',
    title: 'Short context, long game',
    weather: 'Quota: storm front. Short sessions, four of them.',
    intro: [
      'Less context today, and no latch inside the vault: the door must be held on the way out too.',
      'Erik merges twice, first come first served. Gordon and Sven both need a hand.',
    ],
    teach: 'PRs merge in the order they were opened. Open the small one early, and hold the door twice.',
    tokens: 16,
    maxSessions: 4,
    erikEvery: 8,
    overnight: 2,
    leaseTtl: 2,
    map: [
      '#########',
      '####F####',
      '####G####',
      '#P..J.f.#',
      '#h......#',
      '####a#k##',
      '#########',
    ],
    legend: {
      a: { type: 'fix', work: 3, pay: 8, seats: 1, title: 'fix(typo): README' },
      F: { type: 'feat', work: 8, pay: 36, seats: 2, title: 'feat(queue): merge train' },
      f: { type: 'feat', work: 3, pay: 14, seats: 1, title: 'feat(cli): --dry-run' },
      h: { type: 'help', work: 3, pay: 0, seats: 1, title: 'Gordon is stuck on a rebase' },
      k: { type: 'help', work: 3, pay: 0, seats: 1, title: "Sven's CI is red" },
      P: { type: 'plate', gate: 'g1' },
      G: { type: 'gate', id: 'g1' },
    },
    bugs: [{ path: [[7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [4, 4], [5, 4], [6, 4]] }],
  },
];
