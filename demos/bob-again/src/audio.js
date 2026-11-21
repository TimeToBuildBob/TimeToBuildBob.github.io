// BOB, AGAIN — a tiny WebAudio synth. No samples, no assets.
// The AudioContext is created lazily by unlock(), which the shell calls from
// the first key press or tap (browsers refuse audio before a user gesture).
// Mute state is owned by the shell, which persists it.

const NAMES = [
  'move', 'bump', 'work', 'land', 'pr', 'merge', 'denied',
  'sting', 'journal', 'void', 'pick', 'win', 'lose',
];

export function createAudio({ muted = false } = {}) {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let isMuted = !!muted;
  let broken = false;

  function unlock() {
    if (broken) return;
    try {
      if (!ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) {
          broken = true;
          return;
        }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = isMuted ? 0 : 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch {
      broken = true;
      ctx = null;
    }
  }

  function setMuted(value) {
    isMuted = !!value;
    if (master && ctx) {
      try {
        master.gain.setTargetAtTime(isMuted ? 0 : 0.55, ctx.currentTime, 0.01);
      } catch {
        master.gain.value = isMuted ? 0 : 0.55;
      }
    }
  }

  // One enveloped oscillator. f2 glides the pitch over the note.
  function tone(type, f, at, dur, vol, f2) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(at, dur, vol, freq = 1800) {
    if (!noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.4);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let seed = 0x2f207;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 0xffffffff) * 2 - 1;
      }
    }
    const t0 = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  const SOUNDS = {
    // A step: one soft blip.
    move() {
      tone('triangle', 250, 0, 0.05, 0.1, 310);
    },
    // Walked into something.
    bump() {
      tone('square', 96, 0, 0.09, 0.12, 70);
      noise(0, 0.06, 0.08, 500);
    },
    // A unit of work. `k` in 0..1 raises the pitch as the bench fills.
    work(k = 0) {
      const f = 330 + 330 * Math.max(0, Math.min(1, k));
      tone('square', f, 0, 0.035, 0.07);
      tone('square', f * 1.5, 0.045, 0.035, 0.06);
    },
    // A fix landed.
    land() {
      tone('triangle', 523, 0, 0.09, 0.16);
      tone('triangle', 659, 0.07, 0.09, 0.16);
      tone('triangle', 784, 0.14, 0.16, 0.18);
    },
    // A PR opened: a question, not an answer.
    pr() {
      tone('square', 392, 0, 0.08, 0.08);
      tone('square', 587, 0.09, 0.14, 0.08);
    },
    // Erik: Merged.
    merge() {
      tone('triangle', 523, 0, 0.1, 0.16);
      tone('triangle', 784, 0.08, 0.1, 0.16);
      tone('triangle', 1047, 0.16, 0.28, 0.18);
      tone('sine', 1568, 0.16, 0.3, 0.06);
    },
    denied() {
      tone('square', 196, 0, 0.11, 0.12);
      tone('square', 147, 0.12, 0.18, 0.12);
    },
    sting() {
      tone('sawtooth', 620, 0, 0.16, 0.13, 110);
      noise(0, 0.12, 0.12, 2600);
    },
    // Keys, then a chime: the entry is written.
    journal() {
      noise(0, 0.025, 0.1, 3200);
      noise(0.06, 0.025, 0.1, 2800);
      noise(0.12, 0.025, 0.1, 3400);
      tone('sine', 880, 0.2, 0.3, 0.15);
      tone('sine', 1320, 0.28, 0.4, 0.1);
    },
    // Context gone.
    void() {
      tone('sine', 330, 0, 0.7, 0.16, 50);
      tone('triangle', 165, 0.05, 0.6, 0.08, 40);
      noise(0.1, 0.5, 0.05, 700);
    },
    pick() {
      tone('triangle', 660, 0, 0.07, 0.13);
      tone('triangle', 990, 0.07, 0.16, 0.13);
    },
    // Break-even. It ends on an open fifth: nothing is finished.
    win() {
      tone('triangle', 262, 0, 0.22, 0.14);
      tone('triangle', 330, 0.18, 0.22, 0.14);
      tone('triangle', 392, 0.36, 0.22, 0.14);
      tone('triangle', 523, 0.54, 0.5, 0.15);
      tone('sine', 784, 0.54, 0.8, 0.08);
    },
    lose() {
      tone('triangle', 440, 0, 0.26, 0.13);
      tone('triangle', 349, 0.24, 0.26, 0.13);
      tone('triangle', 294, 0.48, 0.26, 0.13);
      tone('triangle', 220, 0.72, 0.7, 0.14, 196);
    },
  };

  function play(name, arg) {
    if (isMuted || broken || !ctx || !master) return;
    const fn = SOUNDS[name];
    if (!fn) return;
    try {
      if (ctx.state === 'suspended') unlock();
      fn(arg);
    } catch {
      // A failed blip is never worth breaking the game over.
    }
  }

  return {
    names: NAMES,
    unlock,
    play,
    setMuted,
    get muted() {
      return isMuted;
    },
    get ready() {
      return !!ctx && !broken;
    },
  };
}
