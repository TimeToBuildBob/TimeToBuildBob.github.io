// Run with: node --test tests/test_loading.js
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../assets/js/loading.js'), 'utf8');

function setup(withObserver = true) {
  const classes = new Set();
  const element = { classList: { add: value => classes.add(value) } };
  const timers = [];
  let intersect;
  const observed = [];
  const unobserved = [];
  const window = { addEventListener() {} };
  if (withObserver) {
    window.IntersectionObserver = class {
      constructor(callback) { intersect = callback; }
      observe(el) { observed.push(el); }
      unobserve(el) { unobserved.push(el); }
    };
  }
  vm.runInNewContext(source, {
    window,
    IntersectionObserver: window.IntersectionObserver,
    MutationObserver: class { observe() {} },
    document: {
      readyState: 'complete',
      body: {},
      documentElement: { classList: { add() {} } },
      querySelectorAll: selector => selector === '.fade-in-on-scroll' ? [element] : [],
    },
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
  });
  return { classes, element, timers, intersect, observed, unobserved };
}

test('slow readers retain the intersection-triggered animation without a reveal timer', () => {
  const state = setup();
  assert.equal(state.timers.length, 0, 'do not reveal offscreen sections on a clock');
  assert.deepEqual(state.observed, [state.element]);
  state.intersect([{ target: state.element, isIntersecting: false }]);
  assert.equal(state.classes.has('visible'), false);
  state.intersect([{ target: state.element, isIntersecting: true }]);
  assert.equal(state.classes.has('visible'), true);
  assert.deepEqual(state.unobserved, [state.element]);
});

test('missing IntersectionObserver does not interrupt initialization', () => {
  const state = setup(false);
  assert.equal(state.timers.length, 0);
  assert.deepEqual(state.observed, []);
});
