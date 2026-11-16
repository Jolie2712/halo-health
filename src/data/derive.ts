// Current values, personal baselines and status for each health metric.
import { S, P, NOW, PER_DAY, TODAY, idx, SCHEDULE, mean, baseline, NIGHTS, blockAt, ACTIVITY_LABEL, MOD } from "./sim";
import { FACTS, type Metric, METRICS, type Region } from "./content";
import { seriesSlice } from "../ui";

export type Status = "ok" | "watch" | "high";
export type Reading = {
  id: string;
  value: string;
  unit: string;
  base: string;
  delta: string;
  dir: "up" | "down" | "flat";
  status: Status;
  phrase: string; // contextual wording, never "out of range"
  note: string;
  age: string;
  spark: number[];
  band?: [number, number];
};
const pct = (v: number, b: number) => ((v - b) / b) * 100;
const arrow = (d: number, eps = 2) => (d > eps ? "up" : d < -eps ? "down" : "flat");
const signed = (d: number, dec = 0) => `${d > 0 ? "+" : ""}${d.toFixed(dec)}`;

function cont(id: string, unit: string, dec: number, judge: (v: number, b: number) => [Status, string]): Omit<Reading, "phrase"> {
  const v = mean(S[id], NOW - 2, NOW + 1);
  const b = baseline(id, NOW, 3);
  const d = pct(v, b);
  const [status, note] = judge(v, b);
  return {
    id, value: v.toFixed(dec), unit, base: b.toFixed(dec), delta: `${signed(d)}% vs your usual at this hour`, dir: arrow(d), status, note,
    age: "Updated 5 s ago", spark: seriesSlice(id, NOW - PER_DAY, NOW + 1, 48),
  };
}

const PHRASE: Record<string, [string, string, string]> = {
  sleep: ["Your usual range", "Below your baseline", "Well below your baseline"],
  pvt: ["Your usual range", "Slower than your baseline", "Much slower than your baseline"],
  fatigue: ["Typical for this hour", "Above your baseline", "High for this hour"],
  stress: ["Settled", "High for current activity", "High for current activity"],
  mood: ["Your usual range", "Below your baseline", "Below your baseline"],
  hr: ["Normal for current activity", "High for current activity", "Well above resting range"],
  hrv: ["Your usual range", "Below your baseline", "Well below your baseline"],
  bp: ["Your usual range", "Weekly reading due", "Above your baseline"],
  spo2: ["Your usual range", "Slightly below your baseline", "Lower than expected at rest"],
  resp: ["Normal at rest", "Faster than your baseline", "Fast for current activity"],
  temp: ["Normal daily rhythm", "Above your baseline", "Higher than expected. Confirm with thermometer"],
  glucose: ["Your usual range", "Above your baseline", "Well outside your usual range"],
  exercise: ["On plan", "Behind this week's plan", "Well behind this week's plan"],
  dose: ["Typical for cruise", "Higher than typical for cruise", "Elevated. Follow shelter guidance"],
};
const K = { ok: 0, watch: 1, high: 2 } as const;
export function readings(): Record<string, Reading> {
  const out = rawReadings() as Record<string, Reading>;
  for (const id of Object.keys(out)) out[id].phrase = (PHRASE[id] ?? PHRASE.hrv)[K[out[id].status]];
  return out;
}
function rawReadings(): Record<string, Omit<Reading, "phrase">> {
  const n = FACTS.lastNight;
  const pv = P.pvt[P.pvt.length - 1].v;
  const pvBase = 246;
  const bp = P.bp[P.bp.length - 1];
  const gl = P.glucose[P.glucose.length - 1];
  const mood = P.mood[P.mood.length - 1];
  const hrv = cont("hrv", "ms", 0, (v, b) => (v < b * 0.75 ? ["high", "Well under your baseline"] : v < b * 0.88 ? ["watch", "Lower than your usual. Often follows a short night"] : ["ok", "Within your usual range"]));
  const exWeek = 6 * 120 - 90 + 0; // minutes completed (one late/shortened session)
  return {
    sleep: {
      id: "sleep", value: `${Math.floor(n.durationMin / 60)} h ${n.durationMin % 60} m`, unit: "", base: `${FACTS.sleepBaselineH.toFixed(1)} h`,
      delta: `Quality ${n.quality}% · your usual ${FACTS.sleepBaselineQ}%`, dir: "down", status: n.quality < 65 ? "high" : n.quality < 78 ? "watch" : "ok",
      note: `${n.awakenings} awakenings, longest at 02:14`, age: "Scored at 06:31", spark: NIGHTS.slice(-14).map((x) => x.quality), band: [78, 95],
    },
    pvt: {
      id: "pvt", value: String(pv), unit: "ms", base: `${pvBase} ms`, delta: `${signed(pct(pv, pvBase))}% slower than your baseline`, dir: "up",
      status: pv > pvBase * 1.15 ? "high" : pv > pvBase * 1.06 ? "watch" : "ok", note: "1 lapse over 355 ms in this morning's test", age: "Tested 07:25 · 3 h 57 m ago",
      spark: P.pvt.slice(-14).map((x) => x.v), band: [230, 262],
    },
    fatigue: cont("fatigue", "/100", 0, (v, b) => (v > 70 ? ["high", "High. Avoid starting critical tasks alone"] : v > b + 8 ? ["watch", "Higher than usual for late morning"] : ["ok", "Typical for this time of day"])),
    stress: { ...cont("stress", "/100", 0, (v) => (v > 60 ? ["watch", "Elevated for current activity"] : v > 45 ? ["watch", "Raised"] : ["ok", "Settled"])), note: `Settled now. Peaked at ${FACTS.stressPeak} at 10:42` },
    mood: {
      id: "mood", value: `${mood.v}`, unit: "/5", base: "4", delta: "Last evening's check-in", dir: "flat", status: mood.v <= 2 ? "watch" : "ok", note: "Tonight's check-in is at 20:45",
      age: "Logged yesterday 20:45", spark: P.mood.slice(-14).map((x) => x.v), band: [3, 5],
    },
    hr: { ...cont("hr", "bpm", 0, (v, b) => (v > 100 || v < 40 ? ["high", "Outside the resting range"] : v > b + 10 ? ["watch", "Above your usual for seated work"] : ["ok", "Normal for seated work"])) },
    hrv,
    bp: {
      id: "bp", value: `${bp.v}/${bp.v2}`, unit: "mmHg", base: "117/75", delta: "Weekly reading is due today", dir: "flat", status: "watch", note: "Last taken MD 177. Due before 14:00",
      age: "7 days ago", spark: P.bp.map((x) => x.v), band: [105, 130],
    },
    spo2: cont("spo2", "%", 0, (v) => (v < 92 ? ["high", "Low. Check sensor and cabin oxygen"] : v < 94 ? ["watch", "Slightly low"] : ["ok", "Normal"])),
    resp: cont("resp", "/min", 0, (v) => (v > 24 ? ["high", "Fast at rest"] : v > 19 ? ["watch", "A little fast"] : ["ok", "Normal at rest"])),
    temp: { ...cont("temp", "°C", 1, (v) => (v >= 38 ? ["high", "Fever range. Confirm with oral thermometer"] : v >= 37.6 ? ["watch", "Slightly raised"] : ["ok", "Normal daily rhythm"])), delta: "Estimate from skin sensor" },
    glucose: {
      id: "glucose", value: String(gl.v), unit: "mg/dL", base: "88", delta: "Fasting · typical range 70–99", dir: "flat", status: gl.v > 125 || gl.v < 60 ? "high" : gl.v > 99 ? "watch" : "ok",
      note: "Next: after midday meal", age: "Tested 06:40", spark: P.glucose.filter((x) => (x.i % PER_DAY) < 60).slice(-14).map((x) => x.v), band: [70, 99],
    },
    exercise: {
      id: "exercise", value: `${Math.round((exWeek / 720) * 100)}`, unit: "% of weekly plan", base: "100%", delta: "5 of 6 sessions done, one ran late", dir: "flat", status: "ok",
      note: "Today's session is 17:30–19:00", age: "Logged by exercise devices", spark: [100, 100, 92, 100, 100, 88, 100, 100, 100, 96, 100, 100, 88, 100],
    },
    dose: {
      id: "dose", value: `${FACTS.cumulativeDose}`, unit: "mSv this mission", base: "", delta: `Cabin now ${Math.round(S.rad[NOW])} µSv/h · typical for cruise`, dir: "flat", status: "ok",
      note: "Personal dosimeter read MD 180", age: "Cabin detector: 1 min ago", spark: seriesSlice("rad", idx(TODAY - 14, 0), NOW, 48),
    },
  };
}

export function regionStatus(r: Region, rd: Record<string, Reading>): Status {
  const list = METRICS.filter((m: Metric) => m.region === r).map((m) => rd[m.id]?.status ?? "ok");
  return list.includes("high") ? "high" : list.includes("watch") ? "watch" : "ok";
}

export function whereNow() {
  const b = blockAt(NOW);
  const next = SCHEDULE[TODAY].find((x) => x.start >= b.end) || b;
  return { block: b, module: MOD[b.module], activity: ACTIVITY_LABEL[b.activity], next };
}
