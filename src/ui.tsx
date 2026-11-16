import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EVIDENCE, SIG, fmt, type Evidence, confLabel, GLOSSARY } from "./data/content";
import {
  S, P, NOW, PER_DAY, MD0, dayOf, minOf, hhmm, fmtIdx, MODULES, MOD, CREW, CREW_NOW, type ModuleId, type Point,
} from "./data/sim";

// ---------------------------------------------------------------------- icons
const I: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  orbit: <><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-28 12 12)" /></>,
  heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />,
  pulse: <path d="M3 12h4l2.2-6 4.2 12 2.4-6H21" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  sliders: <><path d="M4 6h10M18 6h2M4 18h2M10 18h10M4 12h4M12 12h8" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="18" r="2" /><circle cx="10" cy="12" r="2" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  back: <path d="m15 18-6-6 6-6" />,
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a7 7 0 0 1 4 5.5" /></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  wind: <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 21V5M9 7h6" /></>,
  shield: <path d="M12 3 4 6v6c0 4.5 3.3 8 8 9 4.7-1 8-4.500 8-9V6Z" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  alert: <><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  send: <path d="M21 3 3 10l7 3 3 7ZM10 13l5-5" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></>,
  body: <><circle cx="12" cy="4.5" r="2.5" /><path d="M5 9h14M12 9v6M8 22l4-7 4 7" /></>,
  flask: <path d="M9 3h6M10 3v6L4.500 19a1.500 1.500 0 0 0 1.300 2h12.400a1.500 1.500 0 0 0 1.300-2L14 9V3" />,
  layers: <path d="m12 3 9 5-9 5-9-5ZM3 13l9 5 9-5M3 17.500 12 22l9-4.500" />,
  rotate: <><path d="M21 12a9 9 0 1 1-3-6.700L21 8" /><path d="M21 3v5h-5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.500" /></>,
  thumbUp: <path d="M7 11v9H4v-9ZM7 11l4-8a2.500 2.500 0 0 1 2.500 2.500V9H19a2 2 0 0 1 2 2.300l-1.200 7A2 2 0 0 1 17.800 20H7" />,
  thumbDown: <path d="M17 13V4h3v9ZM17 13l-4 8a2.500 2.500 0 0 1-2.500-2.500V15H5a2 2 0 0 1-2-2.300l1.200-7A2 2 0 0 1 6.200 4H17" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16ZM13 7l4 4" />,
  eye: <><path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  star: <path d="m12 3 2.700 5.800 6.300.800-4.600 4.400 1.200 6.300L12 17.200 6.400 20.300l1.200-6.300L3 9.600l6.300-.800Z" />,
  play: <path d="m8 5 11 7-11 7Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  external: <path d="M14 4h6v6M20 4 10 14M18 14v6H4V6h6" />,
  home: <path d="M3 11 12 3l9 8M5 9.500V21h14V9.500" />,
  trend: <><path d="M3 17l5-5 4 3 8-9" /><path d="M15 6h5v5" /></>,
  cup: <><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z" /><path d="M16 10h2a2 2 0 0 1 0 5h-2M7 4v1M11 3v2" /></>,
  halo: <><ellipse cx="12" cy="6.500" rx="7" ry="2.600" /><path d="M12 12.500v0M7.500 20a4.500 4.500 0 0 1 9 0" /><circle cx="12" cy="13.500" r="2.600" /></>,
};
export function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[name] ?? I.info}
    </svg>
  );
}

// ------------------------------------------------------------------ atoms
export function Tag({ children, tone = "neutral", title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return <span className={`tag tag-${tone}`} title={title}>{children}</span>;
}
export const STATUS_TONE = { ok: "green", watch: "amber", high: "red", info: "blue" } as const;
// Health wording compares you with yourself. A value outside your usual range is not automatically a problem.
export const STATUS_WORD = { ok: "Your usual range", watch: "Off your baseline", high: "Well off your baseline" } as const;
// Cabin wording compares a reading with its limit.
export const ENV_WORD = { ok: "Within limits", watch: "Approaching limit", high: "Above limit" } as const;
export function StatusDot({ s }: { s: "ok" | "watch" | "high" | "info" }) {
  // shape + colour, so status never relies on colour alone
  return <span className={`sdot sdot-${s}`} aria-label={s} />;
}
export function Ev({ kind, compact }: { kind: Evidence; compact?: boolean }) {
  const e = EVIDENCE[kind];
  return (
    <span className={`ev ev-${kind}`} title={`${e.label}: ${e.desc}`}>
      <i />
      {compact ? null : e.short}
    </span>
  );
}
export function Confidence({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  return (
    <div className="conf">
      <div className="conf-bar" aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <i key={k} className={(value >= 0.75 ? 3 : value >= 0.5 ? 2 : 1) > k ? "on" : ""} />
        ))}
      </div>
      {showLabel && (
        <span>
          <Term k="confidence">Confidence</Term>: <b>{confLabel(value)}</b>
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------- definitions
/** A word with its definition one hover, focus or tap away. Never navigates. */
export function Term({ k, children }: { k: keyof typeof GLOSSARY | string; children?: React.ReactNode }) {
  const g = GLOSSARY[k];
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const [pin, setPin] = useState(false);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150);
    const up = r.bottom + 150 > window.innerHeight;
    setPos({ x, y: up ? r.top - 8 : r.bottom + 8, up });
  };
  const hide = () => { setPos(null); setPin(false); };
  useEffect(() => {
    if (!pos) return;
    const off = () => hide();
    window.addEventListener("scroll", off, true);
    const key = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("scroll", off, true); window.removeEventListener("keydown", key); };
  }, [pos]);
  if (!g) return <>{children}</>;
  return (
    <span className="term" ref={ref} tabIndex={0} role="button" aria-label={`${g.term}: ${g.def}`} aria-expanded={!!pos}
      onMouseEnter={show} onMouseLeave={() => !pin && setPos(null)} onFocus={show} onBlur={hide}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (pin) hide(); else { show(); setPin(true); } }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (pos) hide(); else show(); } }}>
      {children ?? g.term}
      <svg className="term-i" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.500v.500" /></svg>
      {pos && (
        <span className={`term-pop ${pos.up ? "up" : ""}`} role="tooltip" style={{ left: pos.x, top: pos.y }}>
          <b>{g.term}</b>
          {g.def}
        </span>
      )}
    </span>
  );
}
const TERM_RX: [RegExp, string][] = [
  [/\bHRV\b|[Hh]eart-rate variability/, "hrv"], [/SpO₂|[Bb]lood oxygen/, "spo2"], [/\b[Bb]aseline\b/, "baseline"], [/\b[Rr]ecovery\b/, "recovery"],
  [/[Cc]ognitive (load|readiness)/, "cogload"], [/\b[Cc]orrelation\b/, "correlation"], [/\b[Tt]rends?\b/, "trend"], [/\b[Aa]nomal(y|ies)\b/, "anomaly"],
  [/CO₂/, "co2"], [/\b[Rr]eadiness\b/, "readiness"], [/[Ss]tress index|^Stress$/, "stress"], [/[Ff]atigue( estimate)?/, "fatigue"], [/\bdBA\b/, "dba"], [/[Rr]eaction time/, "reaction"],
];
/** Wraps the first glossary word found in a short label with its definition. */
export function Terms({ children }: { children: string }) {
  for (const [rx, k] of TERM_RX) {
    const m = rx.exec(children);
    if (m) return <>{children.slice(0, m.index)}<Term k={k}>{m[0]}</Term>{children.slice(m.index + m[0].length)}</>;
  }
  return <>{children}</>;
}
export function Segmented<T extends string>({ options, value, onChange, compact, label, names }: { options: readonly T[] | T[]; value: T; onChange: (v: T) => void; compact?: boolean; label?: string; names?: Partial<Record<T, string>> }) {
  return (
    <div className={`segmented ${compact ? "compact" : ""}`} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={value === o} className={value === o ? "active" : ""} onClick={() => onChange(o)}>
          {names?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}
export function Provenance({ id, age }: { id: string; age?: string }) {
  const s = SIG[id];
  if (!s) return null;
  return (
    <div className="prov">
      <Ev kind={s.evidence} />
      <span>{s.source}</span>
      <span>· {age ?? s.cadence}</span>
      {s.maturity === "Experimental" && <Tag tone="violet">EXPERIMENTAL</Tag>}
    </div>
  );
}
export function Panel({ children, className = "", pad = true, ...rest }: React.HTMLAttributes<HTMLElement> & { pad?: boolean }) {
  return (
    <section className={`panel ${pad ? "pad" : ""} ${className}`} {...rest}>
      {children}
    </section>
  );
}
export function Head({ eyebrow, title, right, level = 3 }: { eyebrow?: React.ReactNode; title: React.ReactNode; right?: React.ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <H>{title}</H>
      </div>
      {right}
    </div>
  );
}
export function Modal({ title, eyebrow, onClose, children, footer, wide }: { title: string; eyebrow?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            {eyebrow}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </article>
    </div>
  );
}

export function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ---------------------------------------------------------------- sparkline
export function Spark({ data, color = "#2f64c7", height = 30, band }: { data: number[]; color?: string; height?: number; band?: [number, number] }) {
  if (!data.length) return null;
  const lo = Math.min(...data, band ? band[0] : Infinity);
  const hi = Math.max(...data, band ? band[1] : -Infinity);
  const y = (v: number) => height - 3 - ((v - lo) / (hi - lo || 1)) * (height - 6);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="spark" style={{ height }}>
      {band && <rect x="0" width="100" y={y(band[1])} height={Math.max(1, y(band[0]) - y(band[1]))} fill={color} opacity=".08" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
export function seriesSlice(id: string, i0: number, i1: number, n = 48): number[] {
  const a = S[id];
  if (!a) return [];
  const out: number[] = [];
  const step = Math.max(1, Math.floor((i1 - i0) / n));
  for (let i = i0; i < i1; i += step) {
    let s = 0;
    let c = 0;
    for (let j = i; j < Math.min(i1, i + step); j++) {
      s += a[j];
      c++;
    }
    out.push(s / c);
  }
  return out;
}

// --------------------------------------------------------------- time chart
export type ChartSeries = {
  id: string;
  label?: string;
  color?: string;
  shift?: number; // samples; positive moves the series later in time
  dashed?: boolean;
};
export type Mark = { i: number; label: string; tone?: string; onClick?: () => void; strong?: boolean };
type ChartProps = {
  series: ChartSeries[];
  i0: number;
  i1: number;
  height?: number;
  hover?: number | null;
  onHover?: (i: number | null) => void;
  marks?: Mark[];
  shade?: { i0: number; i1: number; label?: string }[];
  shadeSleep?: boolean;
  showForecast?: boolean;
  limit?: { v: number; label: string };
  axis?: boolean;
  onClickIndex?: (i: number) => void;
  compare?: { id: string; offset: number; label: string }; // overlay same signal shifted by whole days
  mask?: { i0: number; i1: number }[]; // periods greyed out by an event filter (data is kept)
  padR?: number;
};
const tickLabel = (i: number, span: number) => {
  if (span <= PER_DAY * 2) return hhmm(minOf(i));
  return `MD ${MD0 + dayOf(i)}`;
};
export function TimeChart(p: ChartProps) {
  const { series, i0, i1, height = 170, marks = [], shade = [], limit } = p;
  const [ref, w] = useSize<HTMLDivElement>();
  const padL = p.axis === false ? 4 : 44;
  const padR = p.padR ?? (series.length > 1 && p.axis !== false ? 44 : 8);
  const padT = 10;
  const padB = p.axis === false ? 4 : 22;
  const iw = Math.max(10, w - padL - padR);
  const ih = height - padT - padB;
  const span = i1 - i0;
  const x = (i: number) => padL + ((i - i0) / span) * iw;
  const end = p.showForecast ? i1 : Math.min(i1, NOW + 1);

  const drawn = useMemo(() => {
    const bucket = Math.max(1, Math.ceil(span / Math.max(60, iw / 2.2)));
    return series.map((s) => {
      const meta = SIG[s.id];
      const sh = s.shift ?? 0;
      const isPts = !!meta?.points;
      let lo = Infinity;
      let hi = -Infinity;
      const pts: [number, number][] = [];
      const fut: [number, number][] = [];
      if (isPts) {
        for (const q of (P[s.id] ?? []) as Point[]) {
          const i = q.i + sh;
          if (i < i0 || i > i1) continue;
          pts.push([i, q.v]);
          lo = Math.min(lo, q.v2 ?? q.v);
          hi = Math.max(hi, q.v);
        }
      } else {
        const a = S[s.id];
        const useMax = meta?.agg === "max";
        for (let b = i0; b < i1; b += bucket) {
          let acc = useMax ? -Infinity : 0;
          let c = 0;
          for (let j = b; j < Math.min(i1, b + bucket); j++) {
            const src = j - sh;
            if (src < 0 || src >= a.length) continue;
            if (!p.showForecast && src > NOW) continue;
            acc = useMax ? Math.max(acc, a[src]) : acc + a[src];
            c++;
          }
          if (!c) continue;
          const v = useMax ? acc : acc / c;
          const mid = b + bucket / 2;
          (b - sh > NOW ? fut : pts).push([mid, v]);
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        if (fut.length && pts.length) fut.unshift(pts[pts.length - 1]);
      }
      return { s, meta, pts, fut, lo, hi, isPts };
    });
  }, [series, i0, i1, iw, span, p.showForecast]);

  // shared scale when every series has the same unit, otherwise one scale per series
  const units = new Set(drawn.map((d) => d.meta?.unit));
  const shared = units.size === 1;
  const scales = drawn.map((d) => {
    let lo = d.lo;
    let hi = d.hi;
    if (shared) {
      lo = Math.min(...drawn.map((q) => q.lo));
      hi = Math.max(...drawn.map((q) => q.hi));
    }
    if (limit && (shared || d === drawn[0])) {
      lo = Math.min(lo, limit.v);
      hi = Math.max(hi, limit.v);
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const padv = (hi - lo) * 0.12 || 1;
    lo -= padv;
    hi += padv;
    return { lo, hi, y: (v: number) => padT + ih - ((v - lo) / (hi - lo)) * ih };
  });

  const ticks: number[] = [];
  {
    const stepS = span <= 36 ? 6 : span <= PER_DAY ? 18 : span <= PER_DAY * 2 ? 36 : span <= PER_DAY * 8 ? PER_DAY : PER_DAY * 5;
    const first = Math.ceil(i0 / stepS) * stepS;
    for (let t = first; t <= i1; t += stepS) ticks.push(t);
  }
  const sleepBands: [number, number][] = [];
  if (p.shadeSleep && span <= PER_DAY * 8) {
    for (let d = dayOf(i0) - 1; d <= dayOf(i1); d++) {
      const a = d * PER_DAY + 135;
      const b = (d + 1) * PER_DAY + 39;
      if (b > i0 && a < i1) sleepBands.push([Math.max(a, i0), Math.min(b, i1)]);
    }
  }
  const hov = p.hover != null && p.hover >= i0 && p.hover <= i1 ? p.hover : null;
  const valueAt = (d: (typeof drawn)[number], i: number) => {
    const sh = d.s.shift ?? 0;
    if (d.isPts) {
      let best: [number, number] | null = null;
      for (const q of d.pts) if (!best || Math.abs(q[0] - i) < Math.abs(best[0] - i)) best = q;
      return best && Math.abs(best[0] - i) < span * 0.04 ? best[1] : NaN;
    }
    const src = Math.round(i - sh);
    if (src < 0 || src >= S[d.s.id].length || (!p.showForecast && src > NOW)) return NaN;
    return S[d.s.id][src];
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!p.onHover || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const i = Math.round(i0 + ((cx - r.left - padL) / iw) * span);
    p.onHover(Math.max(i0, Math.min(i1, i)));
  };
  const path = (pts: [number, number][], y: (v: number) => number) =>
    pts.map((q, k) => `${k ? "L" : "M"}${x(q[0]).toFixed(1)} ${y(q[1]).toFixed(1)}`).join("");

  return (
    <div className="tchart" ref={ref} style={{ height }} onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={() => p.onHover?.(null)}
      onClick={() => hov != null && p.onClickIndex?.(hov)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={series.map((s) => SIG[s.id]?.label).join(", ")}>
          {sleepBands.map(([a, b], k) => (
            <rect key={k} x={x(a)} y={padT} width={x(b) - x(a)} height={ih} className="sleep-band" />
          ))}
          {shade.map((sh, k) => (
            <g key={k}>
              <rect x={x(Math.max(i0, sh.i0))} y={padT} width={Math.max(2, x(Math.min(i1, sh.i1)) - x(Math.max(i0, sh.i0)))} height={ih} className="shade-band" />
              {sh.label && <text x={x(Math.max(i0, sh.i0)) + 4} y={padT + 11} className="shade-label">{sh.label}</text>}
            </g>
          ))}
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={padL} x2={padL + iw} y1={padT + ih * f} y2={padT + ih * f} className="gridline" />
          ))}
          {p.axis !== false &&
            ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={padT} y2={padT + ih} className="gridline v" />
                <text x={x(t)} y={height - 6} className="tick" textAnchor="middle">{tickLabel(t, span)}</text>
              </g>
            ))}
          {p.axis !== false &&
            scales.slice(0, shared ? 1 : 2).map((sc, k) =>
              [0, 0.5, 1].map((f) => {
                const v = sc.hi - (sc.hi - sc.lo) * f;
                const dec = drawn[k].meta?.dec ?? 0;
                return (
                  <text key={`${k}-${f}`} x={k === 0 ? padL - 6 : padL + iw + 6} y={padT + ih * f + 4} className="tick" textAnchor={k === 0 ? "end" : "start"} fill={shared ? undefined : drawn[k].s.color ?? drawn[k].meta?.color}>
                    {Math.abs(v) >= 1000 ? Math.round(v) : v.toFixed(dec > 1 ? 1 : dec)}
                  </text>
                );
              }),
            )}
          {limit && (
            <g>
              <line x1={padL} x2={padL + iw} y1={scales[0].y(limit.v)} y2={scales[0].y(limit.v)} className="limit-line" />
              <text x={padL + iw - 4} y={scales[0].y(limit.v) - 5} textAnchor="end" className="limit-label">{limit.label}</text>
            </g>
          )}
          {NOW >= i0 && NOW <= i1 && <line x1={x(NOW)} x2={x(NOW)} y1={padT} y2={padT + ih} className="now-rule" />}
          {p.compare &&
            (() => {
              const a = S[p.compare.id];
              const pts: [number, number][] = [];
              const bucket = Math.max(1, Math.ceil(span / Math.max(60, iw / 2.2)));
              for (let b = i0; b < i1; b += bucket) {
                const src = b - p.compare.offset;
                if (src < 0 || src > NOW) continue;
                let s2 = 0, c = 0;
                for (let j = src; j < Math.min(src + bucket, NOW + 1); j++) { s2 += a[j]; c++; }
                if (c) pts.push([b + bucket / 2, s2 / c]);
              }
              return <path d={path(pts, scales[0].y)} className="line compare" stroke={drawn[0]?.meta?.color} />;
            })()}
          {drawn.map((d, k) => {
            const col = d.s.color ?? d.meta?.color ?? "#2f64c7";
            const sc = scales[k];
            return (
              <g key={d.s.id + k}>
                {d.isPts ? (
                  <>
                    <path d={path(d.pts, sc.y)} className="line thin" stroke={col} />
                    {d.pts.map((q, n) => <circle key={n} cx={x(q[0])} cy={sc.y(q[1])} r="3.2" fill="var(--surface)" stroke={col} strokeWidth="2" />)}
                  </>
                ) : (
                  <>
                    <path d={path(d.pts, sc.y)} className={`line ${d.s.dashed ? "dashed" : ""}`} stroke={col} />
                    {d.fut.length > 1 && <path d={path(d.fut, sc.y)} className="line forecast" stroke={col} />}
                  </>
                )}
                {hov != null && Number.isFinite(valueAt(d, hov)) && <circle cx={x(hov)} cy={sc.y(valueAt(d, hov))} r="4" fill={col} stroke="var(--surface)" strokeWidth="2" />}
              </g>
            );
          })}
          {(p.mask ?? []).filter((m) => m.i1 > i0 && m.i0 < i1).map((m, k) => (
            <rect key={`mask${k}`} x={x(Math.max(i0, m.i0))} y={padT} width={Math.max(1, x(Math.min(i1, m.i1)) - x(Math.max(i0, m.i0)))} height={ih} className="mask-band" />
          ))}
          {marks.filter((m) => m.i >= i0 && m.i <= i1).map((m, k) => (
            <g key={k} className={`mark mark-${m.tone ?? "amber"} ${m.onClick ? "clickable" : ""} ${m.strong ? "strong" : ""}`} onClick={(e) => { if (m.onClick) { e.stopPropagation(); m.onClick(); } }}>
              <line x1={x(m.i)} x2={x(m.i)} y1={padT} y2={padT + ih} />
              <path d={`M${x(m.i) - 5} ${padT}h10l-5 7Z`} />
              <title>{m.label}</title>
            </g>
          ))}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={padT} y2={padT + ih} className="crosshair" />}
        </svg>
      )}
      {hov != null && w > 0 && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hov), 80), w - 90) }}>
          <b>{fmtIdx(hov, span > PER_DAY)}{hov > NOW ? " · forecast" : ""}</b>
          {drawn.map((d, k) => (
            <span key={k}>
              <i style={{ background: d.s.color ?? d.meta?.color }} />
              {d.s.label ?? d.meta?.label}: <b>{fmt(d.s.id, valueAt(d, hov))}</b> {d.meta?.unit}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
export function Legend({ series, onRemove }: { series: ChartSeries[]; onRemove?: (id: string) => void }) {
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.id}>
          <i style={{ background: s.color ?? SIG[s.id]?.color }} />
          {s.label ?? SIG[s.id]?.label} <em>{SIG[s.id]?.unit}</em>
          {onRemove && (
            <button onClick={() => onRemove(s.id)} aria-label={`Remove ${SIG[s.id]?.label}`}>
              <Icon name="close" size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------- 2D ship schematic
export function Schematic({
  status, selected, onSelect, path, crew = true, equipment, compact, valueFor,
}: {
  status?: (m: ModuleId) => "ok" | "watch" | "high" | "none";
  selected?: ModuleId | null;
  onSelect?: (m: ModuleId) => void;
  path?: ModuleId[];
  crew?: boolean;
  equipment?: string;
  compact?: boolean;
  valueFor?: (m: ModuleId) => string;
}) {
  const centre = (m: ModuleId): [number, number] => {
    const r = MOD[m].plan;
    return [r[0] + r[2] / 2, r[1] + r[3] / 2];
  };
  return (
    <svg viewBox="0 0 620 410" className={`schematic ${compact ? "compact" : ""}`} role="img" aria-label="Spacecraft layout">
      {/* external systems */}
      <g className="ext">
        <rect x="14" y="170" width="44" height="40" rx="6" />
        <path d="M14 178 4 172v36l10-6" />
        <text x="36" y="226">Propulsion</text>
        <rect x="92" y="40" width="46" height="112" className="array" /><rect x="92" y="228" width="46" height="112" className="array" />
        <path d="M115 152v8M115 220v8M92 68h46M92 96h46M92 124h46M92 256h46M92 284h46M92 312h46" />
        <text x="115" y="32">Solar array</text>
        <rect x="392" y="96" width="58" height="50" className="radiator" /><path d="M421 146v14" />
        <text x="421" y="88">Radiator</text>
        <rect x="566" y="170" width="42" height="40" rx="12" />
        <text x="587" y="226">Return craft</text>
        <path d="M515 162v-22M503 132a12 8 0 0 0 24 0Z" />
        <text x="515" y="122">Antenna</text>
        <path d="M278 138 247 107M362 244l14 14" className="tunnel" />
      </g>
      {path && path.length > 1 && (
        <polyline className="spath" points={path.map((m) => centre(m).join(",")).join(" ")} />
      )}
      {MODULES.map((m) => {
        const [x, y, w, h] = m.plan;
        const st = status?.(m.id) ?? "none";
        const inPath = path?.includes(m.id);
        return (
          <g key={m.id} className={`mod st-${st} ${selected === m.id ? "selected" : ""} ${inPath ? "in-path" : ""} ${onSelect ? "clickable" : ""}`}
            onClick={() => onSelect?.(m.id)} tabIndex={onSelect ? 0 : undefined} role={onSelect ? "button" : undefined} aria-label={m.name}
            onKeyDown={(e) => e.key === "Enter" && onSelect?.(m.id)}>
            <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2.6} />
            <text x={x + w / 2} y={y + h / 2 + (valueFor ? -2 : 4)}>{m.short}</text>
            {valueFor && <text x={x + w / 2} y={y + h / 2 + 12} className="val">{valueFor(m.id)}</text>}
            {st === "watch" && <path className="flag" d={`M${x + w - 8} ${y - 4}l7 12h-14Z`} />}
            {st === "high" && <rect className="flag" x={x + w - 14} y={y - 5} width="12" height="12" rx="2" />}
          </g>
        );
      })}
      {equipment && path && (
        <g className="equip">
          <circle cx={centre(path[path.length - 1])[0] + (path[path.length - 1] === "service" ? 40 : 0)} cy={centre(path[path.length - 1])[1] - 14} r="7" />
          <text x={centre(path[path.length - 1])[0] + (path[path.length - 1] === "service" ? 40 : 0)} y={centre(path[path.length - 1])[1] - 28}>{equipment}</text>
        </g>
      )}
      {crew &&
        CREW.map((c, k) => {
          const loc = CREW_NOW[c.id].module;
          const [cx, cy] = centre(loc);
          const same = CREW.slice(0, k).filter((o) => CREW_NOW[o.id].module === loc).length;
          return (
            <g key={c.id} className={`crewdot ${c.you ? "you" : ""}`} transform={`translate(${cx - 22 + same * 16},${cy + 18})`}>
              <circle r="8" />
              <text y="3">{c.you ? "You" : c.initials}</text>
              <title>{c.name} · {MOD[loc].name}</title>
            </g>
          );
        })}
    </svg>
  );
}

export function EmptyState({ icon = "check", title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={28} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// ------------------------------------------------- glance-first primitives
/** Direction glyph. Always paired with a word, never colour alone. */
export function Dir({ d }: { d: "up" | "down" | "flat" | string }) {
  return <span className={`dirg dirg-${d}`} aria-label={d === "up" ? "up" : d === "down" ? "down" : "steady"}>{d === "up" ? "↑" : d === "down" ? "↓" : "→"}</span>;
}
export type GlanceCell = { k: string; v: React.ReactNode; sub?: React.ReactNode; onClick?: () => void; icon?: string; primary?: boolean };
const TONE_ICON: Record<string, string> = { ok: "check", watch: "alert", high: "alert", info: "info" };
/**
 * The one-glance summary that opens every screen: status, then what changed,
 * the likely contributor and what to do. Same shape everywhere.
 */
export function Glance({ tone = "info", label, title, sub, cells = [], right }: { tone?: "ok" | "watch" | "high" | "info"; label?: string; title: React.ReactNode; sub?: React.ReactNode; cells?: GlanceCell[]; right?: React.ReactNode }) {
  return (
    <section className={`glance glance-${tone}`}>
      <div className="glance-head">
        <span className="glance-ic"><Icon name={TONE_ICON[tone]} size={22} /></span>
        <div className="glance-title">
          {label && <p className="glance-label">{label}</p>}
          <h2>{title}</h2>
          {sub && <p className="glance-sub">{sub}</p>}
        </div>
        {right}
      </div>
      {cells.length > 0 && (
        <div className="glance-cells">
          {cells.map((c) => {
            const body = (
              <>
                <span className="glance-k">{c.icon && <Icon name={c.icon} size={14} />}{c.k}</span>
                <strong>{c.v}</strong>
                {c.sub && <small>{c.sub}</small>}
              </>
            );
            return c.onClick
              ? <button key={c.k} className={`glance-cell ${c.primary ? "act" : "link"}`} onClick={c.onClick}>{body}<Icon name="arrow" size={16} className="glance-go" /></button>
              : <div key={c.k} className="glance-cell">{body}</div>;
          })}
        </div>
      )}
    </section>
  );
}
/** Progressive disclosure. Closed by default; always looks and behaves the same. */
export function More({ label = "Details", children, open: open0 = false, count }: { label?: string; children: React.ReactNode; open?: boolean; count?: number }) {
  const [open, setOpen] = useState(open0);
  return (
    <div className={`more ${open ? "open" : ""}`}>
      <button className="more-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="chevron" size={16} />
        <span>{label}</span>
        {count != null && <em>{count}</em>}
      </button>
      {open && <div className="more-body">{children}</div>}
    </div>
  );
}
/** Label and value pair used for every short fact. */
export function Fact({ k, children, icon }: { k: string; children: React.ReactNode; icon?: string }) {
  return (
    <div className="fact">
      <span className="fact-k">{icon && <Icon name={icon} size={14} />}{k}</span>
      <div className="fact-v">{children}</div>
    </div>
  );
}

/** One row of an analysis: the question, a one-line answer, and the full answer on demand. */
export function Disclose({ k, v, children, badge, open: open0 = false }: { k: string; v: React.ReactNode; children?: React.ReactNode; badge?: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(open0);
  if (!children) return <div className="disc"><div className="disc-row static"><span className="fact-k">{k}{badge}</span><strong>{v}</strong></div></div>;
  return (
    <div className={`disc ${open ? "open" : ""}`}>
      <button className="disc-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="fact-k">{k}{badge}</span>
        <strong>{v}</strong>
        <Icon name="chevron" size={16} className="disc-chev" />
      </button>
      {open && <div className="disc-body">{children}</div>}
    </div>
  );
}
