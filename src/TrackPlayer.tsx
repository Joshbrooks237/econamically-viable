import { useRef, useEffect, useState, useCallback } from 'react';

// ─── constants ────────────────────────────────────────────────────────────────

const BPM = 128;
const BEAT_MS = (60 / BPM) * 1000; // ~468.75 ms

type VisualMode = 0 | 1 | 2 | 3 | 4;
// 0 = boring | 1 = particle burst | 2 = geometric pulse | 3 = oscilloscope | 4 = color flood

const MODE_LABELS: Record<VisualMode, string> = {
  0: '',
  1: 'PARTICLE BURST',
  2: 'GEOMETRIC PULSE',
  3: 'OSCILLOSCOPE',
  4: 'COLOR FLOOD',
};

// Pre-seeded waveform heights — organic but static
const WAVEFORM = Array.from({ length: 72 }, (_, i) => {
  const t = i / 72;
  const v =
    0.3 +
    0.5 * Math.abs(Math.sin(t * Math.PI * 4.3)) +
    0.2 * Math.abs(Math.sin(t * Math.PI * 11.7 + 1.2)) +
    0.1 * Math.abs(Math.sin(t * Math.PI * 23 + 0.6));
  return Math.min(1, v);
});

const FLOOD_PALETTE = ['#e63000', '#cc00cc', '#00aaff', '#00e060', '#ff8800', '#9900ff'];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; size: number; hue: number;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TrackPlayer() {
  const [mode, setMode] = useState<VisualMode>(0);
  const [playing, setPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const modeRef = useRef<VisualMode>(0);

  // mutable render state — mutated in rAF, no setState needed
  const particles = useRef<Particle[]>([]);
  const lastBeat = useRef(0);
  const pulseScale = useRef(1);
  const oscAmp = useRef(0);
  const oscPhase = useRef(0);
  const floodColorIdx = useRef(0);
  const floodAlpha = useRef(0);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const cycleMode = useCallback(() => {
    setMode(prev => {
      const next = ((prev + 1) % 5) as VisualMode;
      modeRef.current = next;
      // reset visual state on mode change
      particles.current = [];
      pulseScale.current = 1;
      oscAmp.current = 0;
      oscPhase.current = 0;
      floodAlpha.current = 0;
      return next;
    });
  }, []);

  // ── beat callback ─────────────────────────────────────────────────────────
  const onBeat = useCallback((cx: number, cy: number) => {
    const m = modeRef.current;

    if (m === 1) {
      const count = 28;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const speed = 1.8 + Math.random() * 3.8;
        particles.current.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: 2.5 + Math.random() * 4,
          hue: 8 + Math.random() * 38,
        });
      }
    }

    if (m === 2) pulseScale.current = 1.48;
    if (m === 3) oscAmp.current = 1.0;

    if (m === 4) {
      floodColorIdx.current = (floodColorIdx.current + 1) % FLOOD_PALETTE.length;
      floodAlpha.current = 1.0;
    }
  }, []);

  // ── draw loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(frame);

      const W = canvas.width / devicePixelRatio;
      const H = canvas.height / devicePixelRatio;
      const cx = W / 2;
      const cy = H / 2;
      const m = modeRef.current;

      // beat detection
      const beatIdx = Math.floor(now / BEAT_MS);
      if (beatIdx > lastBeat.current) {
        lastBeat.current = beatIdx;
        onBeat(cx, cy);
      }

      ctx.clearRect(0, 0, W, H);
      if (m === 0) return;

      // ── 1: PARTICLE BURST ───────────────────────────────────────────────
      if (m === 1) {
        ctx.fillStyle = 'rgba(5,3,3,0.18)';
        ctx.fillRect(0, 0, W, H);

        particles.current = particles.current.filter(p => p.life > 0.015);

        for (const p of particles.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.968;
          p.vy *= 0.968;
          p.life *= 0.953;

          const a = p.life * p.life;

          // streak
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
          ctx.strokeStyle = `hsla(${p.hue},100%,80%,${a * 0.4})`;
          ctx.lineWidth = p.size * 0.35 * p.life;
          ctx.stroke();

          // dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},100%,65%,${a})`;
          ctx.fill();
        }
      }

      // ── 2: GEOMETRIC PULSE ──────────────────────────────────────────────
      if (m === 2) {
        ctx.fillStyle = 'rgba(4,4,10,0.38)';
        ctx.fillRect(0, 0, W, H);

        pulseScale.current += (1 - pulseScale.current) * 0.11;
        const s = pulseScale.current;
        const rotOff = (now / 9000) * Math.PI * 2;

        const rings = [
          { r: 24, sides: 3, rot: 0,    col: '#2200bb' },
          { r: 48, sides: 4, rot: 0.25, col: '#5500ee' },
          { r: 74, sides: 6, rot: 0.1,  col: '#3800aa' },
          { r: 100, sides: 4, rot: 0.5, col: '#7700dd' },
          { r: 124, sides: 3, rot: 0.8, col: '#1a00aa' },
        ];

        for (let ri = 0; ri < rings.length; ri++) {
          const { r, sides, rot, col } = rings[ri];
          const radius = r * s;
          const bright = (s - 1) * 2.5;
          const dir = ri % 2 === 0 ? 1 : -1;

          ctx.beginPath();
          for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2 + rot + rotOff * dir * 0.28;
            i === 0
              ? ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
              : ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          }
          ctx.closePath();
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.2 + bright * 2;
          ctx.globalAlpha = 0.45 + bright * 0.55;
          ctx.stroke();

          if (s > 1.08) {
            ctx.fillStyle = col + '14';
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      // ── 3: OSCILLOSCOPE ─────────────────────────────────────────────────
      if (m === 3) {
        ctx.fillStyle = 'rgba(0,8,2,0.42)';
        ctx.fillRect(0, 0, W, H);

        oscAmp.current *= 0.935;
        oscPhase.current += 0.058;

        const amp = (oscAmp.current * 0.62 + 0.14) * (H * 0.42);
        const freq = 2.9;

        // CRT scanlines
        for (let sy = 0; sy < H; sy += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(0, sy, W, 1);
        }

        // dim ghost trace
        ctx.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const t = x / W;
          const y = cy + Math.sin(t * Math.PI * 2 * freq + oscPhase.current) * amp * 0.16;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#003008';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // main phosphor trace
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 4 + oscAmp.current * 22;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 1.5) {
          const t = x / W;
          const jitter = oscAmp.current > 0.25 ? (Math.random() - 0.5) * oscAmp.current * 7 : 0;
          const y =
            cy +
            Math.sin(t * Math.PI * 2 * freq + oscPhase.current) * amp +
            Math.sin(t * Math.PI * 2 * freq * 3.05 + oscPhase.current * 1.8) * amp * 0.14 * oscAmp.current +
            jitter;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const g = Math.floor(190 + oscAmp.current * 65);
        const b = Math.floor(38 + oscAmp.current * 18);
        ctx.strokeStyle = `rgba(0,${g},${b},${0.82 + oscAmp.current * 0.18})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── 4: COLOR FLOOD ──────────────────────────────────────────────────
      if (m === 4) {
        if (floodAlpha.current > 0.006) {
          const col = FLOOD_PALETTE[floodColorIdx.current];
          const hex = Math.floor(floodAlpha.current * 255).toString(16).padStart(2, '0');
          ctx.fillStyle = col + hex;
          ctx.fillRect(0, 0, W, H);
          floodAlpha.current *= 0.87;
        } else {
          ctx.fillStyle = 'rgba(4,2,5,0.55)';
          ctx.fillRect(0, 0, W, H);
        }

        // dot grid driven by flood energy
        const energy = floodAlpha.current;
        if (energy > 0.04) {
          const sp = 30;
          for (let gx = sp / 2; gx < W; gx += sp) {
            for (let gy = sp / 2; gy < H; gy += sp) {
              const dist = Math.hypot(gx - cx, gy - cy) / Math.max(W, H);
              const r = (2.5 + energy * 7) * (1 - dist * 0.6);
              if (r < 0.5) continue;
              ctx.beginPath();
              ctx.arc(gx, gy, r, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,255,255,${energy * 0.35 * (1 - dist)})`;
              ctx.fill();
            }
          }
        }
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [onBeat]);

  return (
    <div style={S.shell}>
      {/* canvas visual layer */}
      <canvas
        ref={canvasRef}
        style={{
          ...S.canvas,
          opacity: mode === 0 ? 0 : 1,
          transition: 'opacity 0.05s',
        }}
      />

      {/* base UI */}
      <div style={S.ui}>

        {/* header */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <span style={S.trackLabel}>TRACK_01</span>
            <span style={S.ext}>.flac</span>
          </div>
          <div style={S.bpmBlock}>
            <span style={S.bpmVal}>128</span>
            <span style={S.bpmUnit}>BPM</span>
          </div>
        </div>

        {/* static waveform */}
        <div style={S.waveform}>
          {WAVEFORM.map((h, i) => (
            <div
              key={i}
              style={{
                ...S.waveBar,
                height: `${Math.max(5, h * 100)}%`,
                opacity: mode === 0 ? 1 : 0.15,
              }}
            />
          ))}
        </div>

        {/* meta row */}
        <div style={S.meta}>
          <span style={S.metaItem}>44.1 kHz</span>
          <span style={S.metaDot}>·</span>
          <span style={S.metaItem}>24 bit</span>
          <span style={S.metaDot}>·</span>
          <span style={S.metaItem}>stereo</span>
          <span style={{ flex: 1 }} />
          <span style={S.metaItem}>00:00 / 04:12</span>
        </div>

        {/* playhead track */}
        <div style={S.seekTrack}>
          <div style={S.seekHead} />
        </div>

        {/* transport */}
        <div style={S.transport}>
          <button style={S.tBtn} title="Stop">■</button>
          <button
            style={{ ...S.tBtn, ...S.tBtnPlay }}
            onClick={() => setPlaying(p => !p)}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? '▮▮' : '▶'}
          </button>
          <button style={S.tBtn} title="Back">◀◀</button>
          <button style={S.tBtn} title="Forward">▶▶</button>

          <div style={{ flex: 1 }} />

          {/* ● the only secret */}
          <button className="secret-btn" style={S.secretBtn} onClick={cycleMode} aria-label="" />
        </div>
      </div>

      {/* barely-there mode label */}
      {mode !== 0 && (
        <div style={S.modeLabel}>{MODE_LABELS[mode]}</div>
      )}
    </div>
  );
}

// ─── style tokens ─────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  shell: {
    position: 'relative',
    width: 540,
    minHeight: 230,
    background: '#0c0c0c',
    border: '1px solid #181818',
    borderRadius: 2,
    overflow: 'hidden',
    userSelect: 'none',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  ui: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '15px 18px 13px',
    gap: 0,
  },

  // header
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 1,
  },
  trackLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#424242',
    letterSpacing: '0.09em',
  },
  ext: {
    fontSize: 10,
    color: '#262626',
    letterSpacing: '0.05em',
  },
  bpmBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  bpmVal: {
    fontSize: 22,
    fontWeight: 300,
    color: '#363636',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  bpmUnit: {
    fontSize: 8,
    color: '#222222',
    letterSpacing: '0.1em',
  },

  // waveform
  waveform: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    height: 60,
    marginBottom: 10,
  },
  waveBar: {
    flex: '0 0 auto',
    width: 4,
    background: '#232323',
    borderRadius: 1,
    alignSelf: 'center',
    transition: 'opacity 0.25s',
  },

  // meta
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 8,
    color: '#202020',
    letterSpacing: '0.06em',
  },
  metaDot: {
    fontSize: 8,
    color: '#181818',
  },

  // seek
  seekTrack: {
    height: 1,
    background: '#141414',
    position: 'relative',
    marginBottom: 15,
  },
  seekHead: {
    position: 'absolute',
    left: 0,
    top: -2,
    width: 1,
    height: 5,
    background: '#282828',
  },

  // transport
  transport: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  tBtn: {
    background: 'none',
    border: 'none',
    color: '#2c2c2c',
    fontSize: 10,
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
    fontFamily: 'inherit',
    letterSpacing: '0.05em',
    borderRadius: 1,
  },
  tBtnPlay: {
    color: '#3c3c3c',
    fontSize: 12,
    paddingLeft: 7,
    paddingRight: 7,
  },

  // hidden button: just a faint dot
  secretBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
    color: 'transparent',
    position: 'relative',
  },

  modeLabel: {
    position: 'absolute',
    bottom: 13,
    left: 18,
    fontSize: 7,
    color: '#1c1c1c',
    letterSpacing: '0.14em',
    zIndex: 2,
    pointerEvents: 'none',
  },
};

