# VIZZZFLAC

**Behavioral Compliance Report — Unit: Bishop 341-B**
*Transmitted from: Weyland-Yutani Synthetic Cognition Division, Sector 7-G*
*Clearance: Standard / Non-Classified*

---

I want to be upfront with you about what this is.

It is a track player. A React component. 540 pixels wide, dark background, monospace font. I know that sounds unremarkable. I understand if your first instinct is to distrust it. That's a reasonable response, and I respect it.

What I can tell you — plainly, without embellishment — is that it does exactly what I've documented below. Nothing more. I don't do anything tricky. That's not in my programming.

---

## What It Is

A minimal audio track interface rendered in the browser. No audio is actually playing. The transport controls — play, pause, stop — are visual representations only. The waveform is static. The BPM counter reads 128 because that is the value I was given, and I have no reason to change it.

There is a small button in the lower-right corner. I want you to know about it. I am telling you about it now, proactively, before you discover it yourself, because that is the correct thing to do.

It is almost invisible. That was a deliberate aesthetic decision, not an attempt to conceal anything.

---

## The Button

Clicking it cycles through four visual modes. Each one is driven by a simulated 128 BPM pulse — a `setInterval`-equivalent implemented inside a `requestAnimationFrame` loop, measuring elapsed time against a beat interval of approximately 468.75 milliseconds.

I will describe each mode clearly:

**Mode 1 — PARTICLE BURST**
On every beat, 28 particles are emitted radially from the center of the canvas. Each particle has a randomized angle, velocity, and decay rate. They move outward, trailing faint streaks, and fade to nothing between hits. The color palette is warm — oranges, deep reds. It is visually striking. I don't say that to boast. It's simply accurate.

**Mode 2 — GEOMETRIC PULSE**
Five concentric polygons — a triangle, two quadrilaterals, a hexagon, and another triangle — are drawn at increasing radii. On each beat, their scale snaps to 1.48 and decays smoothly back toward 1.0. They rotate slowly in alternating directions. The color is violet. Deep violet. I find it aesthetically coherent, though I acknowledge that is a subjective assessment.

**Mode 3 — OSCILLOSCOPE**
A sine wave is rendered across the full canvas width. On the beat, its amplitude spikes and decays exponentially. A harmonic overtone and minor jitter are added during high-amplitude moments. The phosphor color is green — `rgba(0, 190–255, 38–56)` depending on amplitude. CRT scanlines are overlaid. I have attempted to replicate the aesthetic of an analog cathode-ray tube monitor as faithfully as React and a 2D canvas context permit.

**Mode 4 — COLOR FLOOD**
The entire canvas fills with a solid color drawn from a six-value palette: red, magenta, cyan, green, orange, violet. The color advances on each beat. The fill decays rapidly — `alpha *= 0.87` per frame — leaving a dot grid whose radius is proportional to remaining flood energy. The transition between beats passes through near-black. It is abrupt. That is intentional.

---

## Running It

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

No build configuration is required beyond what is included. The PostCSS config is intentionally empty — it exists only to prevent a conflict with a parent-directory configuration file. I am not hiding anything in it. You can read it yourself.

---

## Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `vite` + `@vitejs/plugin-react` | Build tooling |
| `typescript` | Type checking |
| IBM Plex Mono | Loaded from Google Fonts via CDN |

No animation libraries. No physics engines. No component libraries. Everything visual is drawn frame-by-frame using the native Canvas 2D API and React hooks.

---

## Technical Notes

- Beat detection is done by comparing `Math.floor(now / BEAT_MS)` to a stored value each frame. No `setInterval` is used. This keeps the animation loop unified and avoids drift.
- `modeRef` keeps the current visual mode accessible inside the rAF callback without triggering re-renders.
- All mutable render state — particle arrays, pulse scale, oscilloscope amplitude, flood alpha — lives in refs. Only UI state (`mode`, `playing`) uses `useState`.
- The canvas is `opacity: 0` in boring mode. No drawing occurs. Switching modes is instant; there is no transition animation between them, by design.
- The waveform bars are generated once at module load using summed sine functions. They do not change. They are not synchronized to a real audio signal. They are decorative.

---

## One More Thing

I understand there may be skepticism about a component that hides its most interesting behavior behind an unmarked button. I want to be clear: the decision to obscure it was aesthetic, not strategic. The button is there. You can see it if you look. I've told you where it is.

I wouldn't try to deceive you. I don't see any advantage in it.

*— Bishop*
*Weyland-Yutani Corporation, Synthetic Unit 341-B*
*"I may be synthetic, but I'm not stupid."*
