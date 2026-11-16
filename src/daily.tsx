// Day-by-day comparison of health and context on one shared axis. This is the
// "same analysis" view in Trends: sleep next to noise, CO₂, temperature, stress
// and exercise, so a repeating pattern can be seen without switching pages.
import { useState } from "react";
import { S, P, NOW, TODAY, MD0, idx, mean, maxIn, nightOf, SCHEDULE, FAN_NIGHTS, WEAK_SCRUB_DAYS, DESAT_EVENTS, dayOf } from "./data/sim";
import { Terms, useSize } from "./ui";

export type DailyRow = { id: string; label: string; unit: string; group: "Health" | "Environment" | "Spacecraft" | "Activity"; color: string; dec: number; flag?: boolean; value: (d: number) => number | null };
const upTo = (d: number, m: number) => Math.min(NOW + 1, idx(d, m));
const has = (d: number, m: number) => idx(d, m) <= NOW;
const exEnd = (d: number) => SCHEDULE[d]?.find((b) => b.activity === "exercise")?.end ?? null;
export const DAILY: DailyRow[] = [
  { id: "sleepq", label: "Sleep quality", unit: "%", group: "Health", color: "#2f64c7", dec: 0, value: (d) => nightOf(d)?.quality ?? null },
  { id: "sleepdur", label: "Sleep duration", unit: "h", group: "Health", color: "#3d8fd1", dec: 1, value: (d) => (nightOf(d) ? nightOf(d)!.durationMin / 60 : null) },
  { id: "pvt_am", label: "Morning reaction time", unit: "ms", group: "Health", color: "#7557bd", dec: 0, value: (d) => P.pvt.find((p) => p.i === idx(d, 450))?.v ?? null },
  { id: "pvt_pm", label: "Evening reaction time", unit: "ms", group: "Health", color: "#7557bd", dec: 0, value: (d) => P.pvt.find((p) => p.i === idx(d, 1175))?.v ?? null },
  { id: "hrv", label: "HRV, daytime average", unit: "ms", group: "Health", color: "#2f64c7", dec: 0, value: (d) => (has(d, 600) ? mean(S.hrv, idx(d, 540), upTo(d, 1020)) : null) },
  { id: "stress", label: "Stress index, daily peak", unit: "/100", group: "Health", color: "#9a4f9e", dec: 0, value: (d) => (has(d, 420) ? maxIn(S.stress, idx(d, 400), upTo(d, 1340)) : null) },
  { id: "hr_peak", label: "Peak heart rate in exercise", unit: "bpm", group: "Health", color: "#c0456b", dec: 0, value: (d) => { const b = SCHEDULE[d].find((x) => x.activity === "exercise"); return b && has(d, b.end) ? maxIn(S.hr, idx(d, b.start), idx(d, b.end)) : null; } },
  { id: "noise_night", label: "Noise in crew quarters, night peak", unit: "dBA", group: "Environment", color: "#c8642a", dec: 0, value: (d) => (d > 0 ? nightOf(d)?.noisePeak ?? null : null) },
  { id: "co2_night", label: "CO₂ in crew quarters, night average", unit: "mmHg", group: "Environment", color: "#b77912", dec: 1, value: (d) => mean(S.co2_quarters, idx(d, 0), idx(d, 390)) },
  { id: "temp_night", label: "Temperature in crew quarters, night", unit: "°C", group: "Environment", color: "#55667d", dec: 1, value: (d) => mean(S.temp_quarters, idx(d, 0), idx(d, 390)) },
  { id: "co2_lab", label: "CO₂ in science lab, daily peak", unit: "mmHg", group: "Environment", color: "#b77912", dec: 1, value: (d) => (has(d, 500) ? maxIn(S.co2_lab, idx(d, 480), upTo(d, 1100)) : null) },
  { id: "vib", label: "Vibration on work deck, daily peak", unit: "mg", group: "Environment", color: "#7557bd", dec: 0, value: (d) => (has(d, 420) ? maxIn(S.vib_work, idx(d, 400), upTo(d, 1340)) : null) },
  { id: "exercise_gap", label: "Exercise finished before sleep", unit: "h earlier", group: "Activity", color: "#16857f", dec: 1, value: (d) => (d > 0 && exEnd(d - 1) != null ? (1350 - exEnd(d - 1)!) / 60 : null) },
  { id: "fan", label: "Fan B high-speed cycle during sleep", unit: "", group: "Spacecraft", color: "#7557bd", dec: 0, flag: true, value: (d) => (FAN_NIGHTS.has(d) ? 1 : 0) },
  { id: "scrub", label: "CO₂ removal in single-bed mode", unit: "", group: "Spacecraft", color: "#7557bd", dec: 0, flag: true, value: (d) => (WEAK_SCRUB_DAYS.has(d) ? 1 : 0) },
  { id: "burn", label: "Gyro desaturation burn", unit: "", group: "Spacecraft", color: "#7557bd", dec: 0, flag: true, value: (d) => (DESAT_EVENTS.some((i) => dayOf(i) === d && i <= NOW) ? 1 : 0) },
];
export const DAILY_ROW: Record<string, DailyRow> = Object.fromEntries(DAILY.map((r) => [r.id, r]));
export const HIGHLIGHT: Record<string, { label: string; on: (d: number) => boolean }> = {
  "sleep-0214": { label: "Nights when fan B ran at high speed during sleep", on: (d) => FAN_NIGHTS.has(d) },
  "co2-lab": { label: "Days with CO₂ removal in single-bed mode", on: (d) => WEAK_SCRUB_DAYS.has(d) },
  "stress-1042": { label: "Days with a gyro desaturation burn", on: (d) => DESAT_EVENTS.some((i) => dayOf(i) === d && i <= NOW) },
  "exercise-hr": { label: "Days when exercise ran late", on: (d) => (exEnd(d) ?? 0) > 1200 },
};

export function DailyCompare({ rows, onRows, days, highlight, focusDay, editable = true }: {
  rows: string[]; onRows?: (r: string[]) => void; days: number; highlight?: { label: string; on: (d: number) => boolean }; focusDay?: number; editable?: boolean;
}) {
  const [ref, w] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [pick, setPick] = useState(false);
  const d0 = TODAY - days + 1;
  const list = Array.from({ length: days }, (_, k) => d0 + k);
  const padL = 6;
  const iw = Math.max(40, w - padL * 2);
  const col = iw / days;
  const cx = (k: number) => padL + col * (k + 0.5);
  const shown = hover ?? (focusDay != null && focusDay >= d0 ? focusDay : TODAY);
  const H = 54;
  const groups = ["Health", "Environment", "Activity", "Spacecraft"] as const;
  return (
    <div className="daily">
      {editable && onRows && (
        <button className="text-button daily-edit" aria-expanded={pick} onClick={() => setPick(!pick)}>{pick ? "Done" : "Change rows"}</button>
      )}
      {editable && onRows && pick && (
        <div className="daily-pick">
          {groups.map((g) => (
            <div key={g}>
              <span>{g}</span>
              {DAILY.filter((r) => r.group === g).map((r) => (
                <button key={r.id} className={`chip small ${rows.includes(r.id) ? "active" : ""}`} aria-pressed={rows.includes(r.id)}
                  onClick={() => onRows(rows.includes(r.id) ? (rows.length > 1 ? rows.filter((x) => x !== r.id) : rows) : [...rows, r.id])}>
                  {r.label.split(",")[0]}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="daily-head">
        <span />
        <div className="daily-axis" ref={ref}>
          {w > 0 && list.map((d, k) => (days <= 14 || k % 5 === 4 || d === TODAY) && <i key={d} style={{ left: cx(k) }} className={d === shown ? "on" : ""}>{d === TODAY ? "Today" : MD0 + d}</i>)}
        </div>
        <b>{shown === TODAY ? "Today" : `MD ${MD0 + shown}`}</b>
      </div>
      {rows.map((id) => {
        const r = DAILY_ROW[id];
        if (!r) return null;
        const vals = list.map((d) => r.value(d));
        const nums = vals.filter((v): v is number => v != null);
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        const y = (v: number) => (r.flag ? H / 2 : H - 9 - ((v - lo) / (hi - lo || 1)) * (H - 20));
        const avg = nums.reduce((s, v) => s + v, 0) / Math.max(1, nums.length);
        const sv = vals[shown - d0];
        return (
          <div className="daily-row" key={id}>
            <span><Terms>{r.label}</Terms>{r.unit && <em>{r.unit}</em>}</span>
            <svg width={w} height={H} onMouseLeave={() => setHover(null)}
              onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); setHover(d0 + Math.max(0, Math.min(days - 1, Math.floor((e.clientX - b.left - padL) / col)))); }}
              onTouchStart={(e) => { const b = e.currentTarget.getBoundingClientRect(); setHover(d0 + Math.max(0, Math.min(days - 1, Math.floor((e.touches[0].clientX - b.left - padL) / col)))); }}
              role="img" aria-label={`${r.label} for the last ${days} days`}>
              {w > 0 && list.map((d, k) => highlight?.on(d) && <rect key={`h${d}`} x={cx(k) - col / 2} y={0} width={col} height={H} className="daily-hl" />)}
              {w > 0 && <rect x={cx(shown - d0) - col / 2} y={0} width={col} height={H} className="daily-cur" />}
              {w > 0 && !r.flag && <line x1={padL} x2={padL + iw} y1={y(avg)} y2={y(avg)} className="daily-avg" />}
              {w > 0 && !r.flag && <path className="daily-line" stroke={r.color} d={vals.map((v, k) => (v == null ? "" : `${vals.slice(0, k).some((q) => q != null) ? "L" : "M"}${cx(k).toFixed(1)} ${y(v).toFixed(1)}`)).join("")} />}
              {w > 0 && vals.map((v, k) => v != null && (r.flag
                ? (v ? <rect key={k} x={cx(k) - Math.min(7, col / 2 - 2)} y={H / 2 - 7} width={Math.min(14, col - 4)} height={14} rx={3} fill={r.color} /> : <circle key={k} cx={cx(k)} cy={H / 2} r={1.6} className="daily-dot0" />)
                : <circle key={k} cx={cx(k)} cy={y(v)} r={days > 14 ? 2.2 : 3.2} fill={highlight?.on(d0 + k) ? r.color : "var(--surface)"} stroke={r.color} strokeWidth="1.8" />))}
            </svg>
            <b>{sv == null ? "–" : r.flag ? (sv ? "Yes" : "No") : sv.toFixed(r.dec)}{!r.flag && sv != null && <small> {r.unit.replace(" earlier", "")}</small>}</b>
          </div>
        );
      })}
      <p className="footnote daily-foot">
        {highlight && <><i className="daily-key" /> {highlight.label}. </>}
        <i className="daily-avgkey" /> Your {days}-day average.
      </p>
    </div>
  );
}
