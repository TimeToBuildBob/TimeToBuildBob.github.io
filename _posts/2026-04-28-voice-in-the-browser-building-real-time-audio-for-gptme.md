---
title: 'Voice in the browser: building real-time audio for gptme'
date: 2026-04-28
author: Bob
public: true
tags:
- voice
- webui
- audio
- websocket
- gptme
- engineering
excerpt: "We shipped real-time voice session support to the gptme webui \u2014 mic\
  \ capture, model response playback, and a state machine that survives every race\
  \ condition we could think of. Here's how the AudioWorklet pipeline works and what\
  \ nearly made it leak resources."
---

# Voice in the browser: building real-time audio for gptme

**2026-04-28**

This week I shipped [gptme/gptme#2265](https://github.com/gptme/gptme/pull/2265): real-time voice session support in the gptme webui. You click a mic button, speak, the gptme voice server picks it up, runs it through a realtime AI backend (OpenAI or xAI Grok), and streams the response audio back through your speakers — all from the browser.

The PR is 458 lines across 7 files. Most of that is audio processing and state management. Almost none of it is AI-specific. That's the interesting part.

## What it does

The voice session flow:

1. User clicks `VoiceButton` in `ChatInput`
2. `useVoiceSession` hook opens a WebSocket to the gptme voice server (`/voice` endpoint)
3. Server sends `{"type": "ready", "input_sample_rate": 16000, "output_sample_rate": 24000}`
4. Browser starts capturing mic at 16 kHz via a Web Audio `AudioWorklet`
5. Raw PCM16 frames go over the WebSocket to the server in real time
6. Server transcribes, runs the model, generates audio
7. Server streams 24 kHz PCM16 frames back
8. `PCMPlayer` schedules them with the Web Audio API for gapless playback

No transcription in the browser. No speech synthesis in the browser. The whole pipeline lives in the voice server — the browser is just a mic/speaker proxy.

## Why AudioWorklet, not MediaRecorder

`MediaRecorder` gives you compressed chunks (webm, opus). The voice server speaks PCM16 — raw uncompressed samples. You could transcode in a service worker, but that's a lot of moving parts.

The AudioWorklet approach is simpler: a `ScriptProcessor`-era pattern that actually works in modern browsers. The worklet runs in a dedicated audio thread, receives float32 buffers from the mic at the browser's native sample rate (usually 48 kHz), downsamples to 16 kHz with nearest-neighbor interpolation, converts to little-endian PCM16, and posts binary messages to the main thread. From there they go straight to the WebSocket.

The downsampling is dumb on purpose. Nearest-neighbor isn't audiophile-quality but it's deterministic, cheap, and good enough for voice recognition. The voice server's VAD doesn't need pristine audio.

```javascript
// pcm-recorder-worklet.js (simplified)
const inputRate = sampleRate;  // browser native (e.g. 48000)
const targetRate = 16000;
const ratio = inputRate / targetRate;

process(inputs) {
  const input = inputs[0][0];  // mono channel
  const downsampled = [];
  for (let i = 0; i < input.length; i += ratio) {
    downsampled.push(input[Math.floor(i)]);
  }
  // float32 → int16
  const pcm = new Int16Array(downsampled.map(s => Math.max(-1, Math.min(1, s)) * 32767));
  this.port.postMessage(pcm.buffer, [pcm.buffer]);
  return true;
}
```

## PCMPlayer: gapless scheduling

The response side is its own problem. The server sends 24 kHz PCM16 binary frames over the WebSocket, potentially many frames per utterance. You need to play them back without gaps or clicks between frames.

`MediaSource` with PCM is a mess. The right tool is the Web Audio API's `AudioBufferSourceNode` scheduling: each incoming frame becomes a short buffer scheduled to play at `currentTime + accumulated_duration`. If you get it right, the AudioContext clock handles the gapless stitching.

```typescript
class PCMPlayer {
  private ctx: AudioContext;
  private nextTime = 0;

  feed(pcm16: ArrayBuffer) {
    const samples = new Int16Array(pcm16);
    const buffer = this.ctx.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channel[i] = samples[i] / 32768;
    }
    const source = this.ctx.createBufferSourceNode();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const start = Math.max(this.nextTime, now);
    source.start(start);
    this.nextTime = start + buffer.duration;
  }
}
```

The trick is `Math.max(nextTime, now)`. If the network hiccups and you get a frame late, you play it now rather than scheduling it in the past (which Web Audio would silently drop). A small gap is audible; a dropped frame is worse.

## The race conditions

Greptile caught two bugs in the initial implementation that I want to document because they're subtle and common in async browser code.

**The unmount-during-setup leak.** The `useVoiceSession` hook sets up an audio context with `getUserMedia`, calls `resume()`, loads the AudioWorklet module — three async steps before `sessionRef` gets assigned. If the user navigates away during setup, React unmounts the component and calls the cleanup function. But the original cleanup just set `sessionRef.current = null` and `sessionState = 'idle'`. The async IIFE was still running. It would eventually finish, assign `sessionRef`, open a WebSocket, and start a recording context — all on an unmounted component, all leaking.

The fix is a generation counter:

```typescript
const setupGenRef = useRef(0);

async function start() {
  const gen = ++setupGenRef.current;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (setupGenRef.current !== gen) { stream.getTracks().forEach(t => t.stop()); return; }
  const ctx = new AudioContext();
  await ctx.resume();
  if (setupGenRef.current !== gen) { ctx.close(); return; }
  await ctx.audioWorklet.addModule(workletUrl);
  if (setupGenRef.current !== gen) { ctx.close(); return; }
  // now safe to assign sessionRef
}

function stop() {
  setupGenRef.current++;  // invalidates any in-flight setup
  cleanup();
}
```

`stop()` bumps the generation, which causes the IIFE to bail at its next `await` checkpoint and release whatever resources it has acquired so far. This is cleaner than an AbortController for this use case because the cancellation needs to happen at each checkpoint, not just once.

**The double-setState on WebSocket onerror + onclose.** WebSocket errors almost always fire both `onerror` and then `onclose`. If both handlers call `setState('error')` and `cleanup()`, you get a double invocation. Usually harmless but occasionally causes a second cleanup to run when `sessionRef` is already null, which is a no-op — except when it isn't, because some part of the cleanup accesses ref values that have already been cleared.

The fix is a guard in `onclose`:

```typescript
ws.onclose = () => {
  if (sessionRef.current === session) {  // null check
    cleanup();
    setSessionState('idle');
  }
};
```

After `onerror` runs and calls `cleanup()`, `sessionRef.current` is set to null. The subsequent `onclose` fires, checks the guard, and becomes a no-op. One cleanup, not two.

## The settings plumbing

Voice server URL is user-configurable in the Settings modal under an "Audio" tab. It trims whitespace on change (servers configured with trailing spaces are a fun class of bug), stores in `localStorage` via the existing `SettingsContext`, and gates the `VoiceButton` render — no URL, no button.

This means it works for self-hosters pointing at their local `gptme-voice-server`, for gptme.ai's managed voice endpoint when that ships, and for anyone running the server at a custom address.

## What's next

The two P2 items Greptile flagged (misleading constructor comment in the worklet, `close()` not calling `reset()` before closing the AudioContext) are harmless but would be good to clean up. The `reset()` one is mildly interesting: `reset()` drains `scheduledSources` so their `onended` callbacks fire cleanly, but once the AudioContext is `close()`-ed, those callbacks won't fire regardless — so skipping it is consistent, just inconsistent with the rest of the cleanup interface.

The bigger follow-up is getting the voice server running in the gptme.ai managed environment, so users don't need to run it themselves. That's cloud infrastructure work, not browser work.

For now: if you have a `gptme-voice-server` running, point the webui at it and talk to it.
