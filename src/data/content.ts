// Descriptive content for the Halo Health prototype: signal catalogue, health
// explainers, detected changes and trends, recommendations, alerts and references.
// All crew and vehicle values are fictional and simulated (see sim.ts).
import {
  S, P, NOW, TODAY, PER_DAY, idx, mean, maxIn, NIGHTS, WEAK_SCRUB_DAYS, FAN_NIGHTS, DESAT_EVENTS,
  MODULES, type ModuleId, DAYS,
} from "./sim";

// ------------------------------------------------------------ evidence model --
export type Evidence = "direct" | "derived" | "correlation" | "inference" | "input";
export const EVIDENCE: Record<Evidence, { label: string; short: string; desc: string }> = {
  direct: { label: "Direct measurement", short: "MEASURED", desc: "Read straight from a sensor or test. The number is the measurement." },
  derived: { label: "Derived metric", short: "DERIVED", desc: "Calculated from several measurements with a fixed formula. Useful, but one step removed from a sensor." },
  correlation: { label: "Correlation", short: "CORRELATION", desc: "Two signals moved together in time. This describes a pattern, not a cause." },
  inference: { label: "System inference", short: "INFERENCE", desc: "The system's interpretation of the evidence. It can be wrong and you can overrule it." },
  input: { label: "Astronaut input", short: "YOUR INPUT", desc: "Something you entered or told the system. Your context outranks the system's guess." },
};

// ---------------------------------------------------------- signal catalogue --
export type Sig = {
  id: string;
  label: string;
  unit: string;
  group: "health" | "env" | "eng";
  color: string;
  dec: number;
  evidence: Evidence;
  source: string;
  cadence: string;
  reliability: "High" | "Medium" | "Low";
  maturity: "Established" | "Demonstrated" | "Experimental";
  agg?: "max" | "mean";
  limit?: { v: number; label: string; dir: "above" | "below" };
  points?: boolean; // periodic point measurement rather than continuous
  module?: ModuleId;
};

const C = {
  blue: "#2f64c7", teal: "#16857f", green: "#198a62", rose: "#c0456b", violet: "#7557bd",
  amber: "#b77912", orange: "#c8642a", slate: "#55667d", sky: "#3d8fd1", plum: "#9a4f9e",
};

const sig = (s: Sig) => s;
const envSig = (p: string, label: string, unit: string, color: string, dec: number, source: string, cadence: string, limit?: Sig["limit"], agg?: Sig["agg"]) =>
  MODULES.map((m) =>
    sig({
      id: `${p}_${m.id}`, label: `${label} · ${m.short}`, unit, group: "env", color, dec, evidence: "direct",
      source, cadence, reliability: "High", maturity: "Established", limit, agg, module: m.id,
    }),
  );

export const SIGNALS: Sig[] = [
  // health — continuous wearable
  sig({ id: "hr", label: "Heart rate", unit: "bpm", group: "health", color: C.rose, dec: 0, evidence: "direct", source: "Biosensor garment (chest ECG)", cadence: "Every 5 s while worn", reliability: "High", maturity: "Demonstrated" }),
  sig({ id: "hrv", label: "Heart-rate variability", unit: "ms", group: "health", color: C.blue, dec: 0, evidence: "derived", source: "Biosensor garment · RMSSD over 5 min", cadence: "Every 5 min while worn", reliability: "Medium", maturity: "Demonstrated" }),
  sig({ id: "move", label: "Body movement", unit: "counts", group: "health", color: C.teal, dec: 0, evidence: "direct", source: "Wrist actigraph", cadence: "Every 1 min", reliability: "High", maturity: "Established", agg: "max" }),
  sig({ id: "stress", label: "Stress index", unit: "/100", group: "health", color: C.plum, dec: 0, evidence: "derived", source: "Heart rate + HRV + breathing, corrected for activity", cadence: "Every 5 min while worn", reliability: "Medium", maturity: "Experimental" }),
  sig({ id: "fatigue", label: "Fatigue estimate", unit: "/100", group: "health", color: C.slate, dec: 0, evidence: "derived", source: "Sleep history + hours awake model", cadence: "Every 10 min", reliability: "Medium", maturity: "Demonstrated" }),
  sig({ id: "resp", label: "Breathing rate", unit: "/min", group: "health", color: C.sky, dec: 0, evidence: "direct", source: "Biosensor garment (chest band)", cadence: "Every 5 s while worn", reliability: "High", maturity: "Demonstrated" }),
  sig({ id: "spo2", label: "Blood oxygen (SpO₂)", unit: "%", group: "health", color: C.green, dec: 0, evidence: "direct", source: "Forehead pulse oximeter in garment", cadence: "Every 1 min while worn", reliability: "Medium", maturity: "Demonstrated" }),
  sig({ id: "temp", label: "Body temperature", unit: "°C", group: "health", color: C.orange, dec: 1, evidence: "derived", source: "Skin sensor · core estimate", cadence: "Every 1 min while worn", reliability: "Medium", maturity: "Demonstrated" }),
  // health — periodic
  sig({ id: "pvt", label: "Reaction time", unit: "ms", group: "health", color: C.violet, dec: 0, evidence: "direct", source: "Reaction self-test (3 min)", cadence: "Twice daily", reliability: "High", maturity: "Established", points: true }),
  sig({ id: "glucose", label: "Blood glucose", unit: "mg/dL", group: "health", color: C.amber, dec: 0, evidence: "direct", source: "Fingerstick analyser", cadence: "Fasting + after midday meal", reliability: "High", maturity: "Established", points: true }),
  sig({ id: "bp", label: "Blood pressure", unit: "mmHg", group: "health", color: C.rose, dec: 0, evidence: "direct", source: "Arm cuff, medical bay", cadence: "Weekly, or when prompted", reliability: "High", maturity: "Established", points: true }),
  sig({ id: "sleepq", label: "Sleep quality", unit: "%", group: "health", color: C.blue, dec: 0, evidence: "derived", source: "Actigraph + heart rate, scored each morning", cadence: "Once per sleep period", reliability: "Medium", maturity: "Established", points: true }),
  sig({ id: "sleepdur", label: "Sleep duration", unit: "h", group: "health", color: C.sky, dec: 1, evidence: "derived", source: "Actigraph", cadence: "Once per sleep period", reliability: "High", maturity: "Established", points: true }),
  sig({ id: "mood", label: "Mood", unit: "/5", group: "health", color: C.plum, dec: 0, evidence: "input", source: "Your evening check-in", cadence: "Daily", reliability: "Medium", maturity: "Established", points: true }),
  // environment
  ...envSig("co2", "CO₂", "mmHg", C.amber, 2, "Cabin air analyser", "Every 1 min", { v: 3.0, label: "1-hour limit 3.0", dir: "above" }),
  ...envSig("noise", "Noise", "dBA", C.orange, 0, "Distributed acoustic monitors", "Every 1 s", undefined, "max"),
  ...envSig("temp", "Temperature", "°C", C.slate, 1, "Cabin temperature sensor", "Every 1 min"),
  ...envSig("hum", "Humidity", "%", C.sky, 0, "Cabin humidity sensor", "Every 1 min"),
  ...envSig("light", "Light level", "lux", C.amber, 0, "Lighting assembly photodiode", "Every 1 min"),
  ...envSig("vib", "Vibration", "mg", C.violet, 1, "Structural accelerometers", "500 Hz, RMS per 10 s", undefined, "max"),
  sig({ id: "pressure", label: "Cabin pressure", unit: "kPa", group: "env", color: C.slate, dec: 1, evidence: "direct", source: "Cabin pressure transducers", cadence: "Every 1 s", reliability: "High", maturity: "Established" }),
  sig({ id: "ppo2", label: "Oxygen partial pressure", unit: "kPa", group: "env", color: C.green, dec: 1, evidence: "direct", source: "Major constituent analyser", cadence: "Every 1 min", reliability: "High", maturity: "Established" }),
  sig({ id: "rad", label: "Radiation dose rate", unit: "µSv/h", group: "env", color: C.plum, dec: 0, evidence: "direct", source: "Cabin radiation detector", cadence: "Every 1 min", reliability: "High", maturity: "Established", agg: "max" }),
  // engineering
  sig({ id: "fan", label: "Ventilation fan B speed", unit: "rpm", group: "eng", color: C.orange, dec: 0, evidence: "direct", source: "Life support · fan B tachometer", cadence: "Every 1 s", reliability: "High", maturity: "Established", agg: "max", module: "service" }),
  sig({ id: "cdra", label: "CO₂ removal capacity", unit: "%", group: "eng", color: C.teal, dec: 0, evidence: "derived", source: "Life support · bed state and airflow", cadence: "Every 10 s", reliability: "High", maturity: "Established", module: "service" }),
  sig({ id: "thr", label: "Thruster firings", unit: "pulses", group: "eng", color: C.rose, dec: 0, evidence: "direct", source: "Reaction control valve counts", cadence: "Per firing", reliability: "High", maturity: "Established", agg: "max" }),
  sig({ id: "cmg", label: "Gyro stored momentum", unit: "%", group: "eng", color: C.violet, dec: 0, evidence: "derived", source: "Attitude control computer", cadence: "Every 1 s", reliability: "High", maturity: "Established", module: "service" }),
  sig({ id: "att", label: "Attitude error", unit: "°", group: "eng", color: C.slate, dec: 2, evidence: "derived", source: "Star trackers + rate gyros", cadence: "Every 1 s", reliability: "High", maturity: "Established", agg: "max" }),
  sig({ id: "power", label: "Electrical load", unit: "kW", group: "eng", color: C.blue, dec: 1, evidence: "direct", source: "Main bus current sensors", cadence: "Every 1 s", reliability: "High", maturity: "Established" }),
  sig({ id: "pump", label: "Coolant pump speed", unit: "rpm", group: "eng", color: C.sky, dec: 0, evidence: "direct", source: "Thermal loop A pump", cadence: "Every 1 s", reliability: "High", maturity: "Established", module: "service" }),
  sig({ id: "loop", label: "Coolant loop temperature", unit: "°C", group: "eng", color: C.green, dec: 1, evidence: "direct", source: "Thermal loop A outlet", cadence: "Every 10 s", reliability: "High", maturity: "Established" }),
  sig({ id: "link", label: "Earth link margin", unit: "dB", group: "eng", color: C.plum, dec: 1, evidence: "direct", source: "High-gain antenna receiver", cadence: "Every 1 s", reliability: "High", maturity: "Established" }),
  sig({ id: "oga", label: "Oxygen generation", unit: "%", group: "eng", color: C.green, dec: 0, evidence: "direct", source: "Electrolysis cell stack", cadence: "Every 10 s", reliability: "High", maturity: "Established" }),
  sig({ id: "wpa", label: "Water processor running", unit: "on/off", group: "eng", color: C.sky, dec: 0, evidence: "direct", source: "Water recovery controller", cadence: "On change", reliability: "High", maturity: "Established", agg: "max", module: "galley" }),
];
export const SIG: Record<string, Sig> = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));
/** Lower-cases the first letter for use mid-sentence, leaving acronyms such as CO₂ alone. */
export const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
export const fmt = (id: string, v: number) => (Number.isFinite(v) ? v.toFixed(SIG[id]?.dec ?? 0) : "–");

export const ENV_META: Record<string, { label: string; unit: string; dec: number; lo: number; hi: number; watch: number; high: number; note: string; reverse?: boolean }> = {
  co2: { label: "CO₂", unit: "mmHg", dec: 2, lo: 2, hi: 4, watch: 2.8, high: 3.0, note: "NASA-STD-3001 limits the 1-hour average to 3.0 mmHg. Headaches become more likely as CO₂ rises." },
  noise: { label: "Noise", unit: "dBA", dec: 0, lo: 44, hi: 72, watch: 60, high: 65, note: "Work areas are designed to the NC-50 curve (about 58–60 dBA). Sleep areas to NC-40 (about 50 dBA)." },
  temp: { label: "Temperature", unit: "°C", dec: 1, lo: 20, hi: 26, watch: 25, high: 27, note: "Comfort band is 18–27 °C. Most crew prefer 21–24 °C." },
  hum: { label: "Humidity", unit: "%", dec: 0, lo: 30, hi: 65, watch: 60, high: 70, note: "Relative humidity is held between 25% and 75%." },
  light: { label: "Light", unit: "lux", dec: 0, lo: 0, hi: 550, watch: 9999, high: 9999, note: "Tunable lighting: bright and blue-enriched by day, dim and warm before sleep to protect the body clock." },
  vib: { label: "Vibration", unit: "mg", dec: 1, lo: 0, hi: 20, watch: 8, high: 15, note: "Structural vibration in milli-g RMS. Exercise and thruster burns are the usual sources." },
};
export function envStatus(p: string, mod: ModuleId, v: number): "ok" | "watch" | "high" {
  const m = ENV_META[p];
  let watch = m.watch;
  let high = m.high;
  if (p === "noise" && mod === "quarters") { watch = 50; high = 58; }
  if (p === "noise" && mod === "exercise") { watch = 72; high = 80; }
  if (p === "vib" && mod === "exercise") { watch = 18; high = 30; }
  return v >= high ? "high" : v >= watch ? "watch" : "ok";
}

// ------------------------------------------------------------ computed facts --
const eveningPvt = (weak: boolean) => {
  const v: number[] = [];
  for (let d = 15; d < TODAY; d++) {
    if (WEAK_SCRUB_DAYS.has(d) !== weak) continue;
    const p = P.pvt.find((x) => x.i === idx(d, 1175));
    if (p) v.push(p.v);
  }
  return v;
};
const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const fanNights14 = NIGHTS.filter((n) => n.day > TODAY - 14 && n.fanEvent);
const calmNights14 = NIGHTS.filter((n) => n.day > TODAY - 14 && !n.fanEvent);
export const FACTS = {
  lastNight: NIGHTS[NIGHTS.length - 1],
  sleepBaselineQ: Math.round(avg(NIGHTS.filter((n) => n.day < TODAY).map((n) => n.quality))),
  sleepBaselineH: avg(NIGHTS.filter((n) => n.day < TODAY).map((n) => n.durationMin)) / 60,
  fanNightsLast6: NIGHTS.filter((n) => n.day >= TODAY - 6 && n.day < TODAY && n.fanEvent).length,
  fanNightQ: Math.round(avg(fanNights14.map((n) => n.quality))),
  calmNightQ: Math.round(avg(calmNights14.map((n) => n.quality))),
  fanNights14: fanNights14.length,
  pvtWeak: Math.round(avg(eveningPvt(true))),
  pvtNormal: Math.round(avg(eveningPvt(false))),
  pvtWeakN: eveningPvt(true).length,
  headacheN: P.headache.filter((h) => h.i > idx(TODAY - 14, 0)).length,
  weakDays14: [...WEAK_SCRUB_DAYS].filter((d) => d > TODAY - 14 && d < TODAY).length,
  labPeakMorning: maxIn(S.co2_lab, idx(TODAY, 480), NOW + 1),
  labForecastPeak: maxIn(S.co2_lab, idx(TODAY, 900), idx(TODAY, 1080)),
  labNow: S.co2_lab[NOW],
  hrBefore: Math.round(mean(S.hr, idx(TODAY, 610), idx(TODAY, 640))),
  hrPeak: Math.round(maxIn(S.hr, idx(TODAY, 640), idx(TODAY, 680))),
  stressBefore: Math.round(mean(S.stress, idx(TODAY, 610), idx(TODAY, 640))),
  stressPeak: Math.round(maxIn(S.stress, idx(TODAY, 640), idx(TODAY, 680))),
  vibPeak: Math.round(maxIn(S.vib_work, idx(TODAY, 640), idx(TODAY, 660))),
  desatCount: DESAT_EVENTS.length - 1,
  hrvNow: Math.round(mean(S.hrv, NOW - 5, NOW + 1)),
  hrvBase: Math.round(
    avg(Array.from({ length: 14 }, (_, k) => mean(S.hrv, NOW - 5 - (k + 1) * PER_DAY, NOW + 1 - (k + 1) * PER_DAY))),
  ),
  cumulativeDose: Math.round((mean(S.rad, 0, NOW) * 24 * (155 + DAYS)) / 1000), // mSv, extrapolated to mission
};
export const READINESS = (() => {
  const n = FACTS.lastNight;
  const sleepPen = Math.max(0, FACTS.sleepBaselineQ - n.quality) * 0.75;
  const hrvPen = Math.max(0, FACTS.hrvBase - FACTS.hrvNow) * 0.5;
  const pvtPen = Math.max(0, 268 - 246) * 0.12;
  return { score: Math.round(86 - sleepPen - hrvPen - pvtPen), usual: 84 };
})();

// ------------------------------------------------------------ health metrics --
export type Region = "head" | "heart" | "lungs" | "core" | "muscle" | "whole";
export const REGIONS: Record<Region, { name: string; blurb: string; space: string }> = {
  head: { name: "Brain, sleep & mood", blurb: "How rested, alert and settled you are.", space: "Noise, shifted schedules, CO₂ and isolation all work against sleep and attention on long missions. Fluid shifting toward the head can also affect vision." },
  heart: { name: "Heart & circulation", blurb: "How your heart and blood vessels are coping.", space: "Without gravity your heart works less and blood shifts headward. Heart rhythm and blood pressure are watched for slow drift over months." },
  lungs: { name: "Breathing & oxygen", blurb: "How well you are breathing and oxygenating.", space: "Cabin air is recycled. CO₂ can pool where ventilation is weak, and you may breathe faster before you notice any symptom." },
  core: { name: "Metabolism & temperature", blurb: "Energy balance, blood sugar and body heat.", space: "Appetite often drops in flight and the body clock drifts, which shifts blood sugar and temperature rhythms." },
  muscle: { name: "Bones & muscles", blurb: "Countermeasures that protect bone and muscle.", space: "In microgravity, weight-bearing bones can lose 1–1.5% of their density per month. Daily loaded exercise is the main defence." },
  whole: { name: "Whole body · radiation", blurb: "Your cumulative radiation exposure.", space: "Beyond Earth's magnetic field you receive a steady dose from galactic cosmic rays, plus bursts during solar particle events." },
};

export type Metric = {
  id: string;
  name: string;
  region: Region;
  sig?: string; // signal id for the trend chart
  what: string;
  how: string;
  why: string;
  flag: string;
  act: string;
};
export const METRICS: Metric[] = [
  { id: "sleep", name: "Sleep", region: "head", sig: "sleepq",
    what: "How long and how soundly you slept. Quality is a 0–100 score built from movement and heart rate through the night.",
    how: "Your wrist actigraph and biosensor garment record automatically. Nothing to do except wear them to bed.",
    why: "Crews in orbit average close to 6 hours of sleep a night, well under the 8.5 hours scheduled. Lost sleep slows reactions and judgement before you feel it.",
    flag: "Tell the crew medical officer if quality stays under 70% for 3 nights, or if you need sleep medication more than twice in a week.",
    act: "Start with the cabin: noise, light and temperature in your sleep station. Halo Health checks these against each bad night for you." },
  { id: "pvt", name: "Reaction time", region: "head", sig: "pvt",
    what: "Your average response time on a short tap-when-you-see-it test. Lower is faster. Lapses are responses slower than 355 ms.",
    how: "Open Check-in, choose Reaction test, and tap the target as soon as the counter appears. The full test takes 3 minutes; the demo here uses 5 taps.",
    why: "Reaction tests are sensitive to sleep loss and fatigue, and take minutes. NASA uses a version called the Reaction Self-Test on the space station.",
    flag: "If your average is more than 15% slower than your baseline before a safety-critical task (EVA, docking, robotics), tell the commander and consider a second pair of eyes.",
    act: "Re-test after a 20-minute break. Move demanding tasks earlier in the day when you can." },
  { id: "fatigue", name: "Fatigue estimate", region: "head", sig: "fatigue",
    what: "A model estimate of how fatigued you are likely to be now, from your recent sleep and hours awake.",
    how: "Calculated automatically. It is an estimate, not a measurement of you.",
    why: "People judge their own fatigue poorly. A model based on sleep history gives an independent second opinion.",
    flag: "Above 70 before a critical task is worth a conversation with the commander.",
    act: "A 20–30 minute nap in your sleep station, or bright light, gives a short-term lift." },
  { id: "stress", name: "Stress index", region: "head", sig: "stress",
    what: "A 0–100 index from heart rate, heart-rate variability and breathing, corrected for what you are doing. Exercise does not count as stress.",
    how: "Calculated from the biosensor garment every 5 minutes.",
    why: "It can show a body response you did not consciously notice, such as a startle from an alarm.",
    flag: "Sustained readings above 60 at rest across several days. Mention it at your next private medical conference.",
    act: "Open the spike in the Correlation lab to see what was happening around it before deciding it matters." },
  { id: "mood", name: "Mood", region: "head", sig: "mood",
    what: "Your own 1–5 rating of how you feel, logged each evening.",
    how: "Evening check-in, one tap. Only you and the crew medical officer can see it.",
    why: "Isolation and confinement wear on everyone. A simple daily rating shows slow drifts that are easy to miss from the inside.",
    flag: "Ratings of 2 or lower for 5 days. Ask for a private psychological conference.",
    act: "Protect personal time and family contact. Tell a crewmate you trust." },
  { id: "hr", name: "Heart rate", region: "heart", sig: "hr",
    what: "Beats per minute. Your resting value is taken during quiet seated work.",
    how: "Measured continuously by the chest ECG electrodes in your biosensor garment.",
    why: "Resting heart rate that creeps up over days can point to poor recovery, dehydration, illness or stress.",
    flag: "Resting rate above 100 or below 40, palpitations, or an irregular rhythm notice. Contact the crew medical officer now.",
    act: "Check the context first. A high rate during exercise or EVA prep is expected." },
  { id: "hrv", name: "Heart-rate variability", region: "heart", sig: "hrv",
    what: "The beat-to-beat variation in your heart rhythm, in milliseconds. Higher usually means better recovered.",
    how: "Calculated from the garment's ECG over 5-minute windows. Compare with your own baseline, not other people.",
    why: "It responds to sleep loss, heavy training and stress, often a day before you feel it.",
    flag: "More than 25% under your baseline for 3 days running.",
    act: "Prioritise tonight's sleep period and keep exercise at planned intensity, not above." },
  { id: "bp", name: "Blood pressure", region: "heart", sig: "bp",
    what: "Pressure in your arteries as the heart beats (top number) and rests (bottom number).",
    how: "Sit restrained and still for 5 minutes in the medical bay. Wrap the cuff on your bare upper arm at heart level, press start, and do not talk. Take two readings one minute apart.",
    why: "Fluid shifts, salt intake and months of reduced heart workload can change blood pressure. A weekly reading tracks the slow trend.",
    flag: "Top number at or above 140, or bottom at or above 90, on two readings. Send to the flight surgeon at the next link. Above 180/120 with symptoms: call the crew medical officer immediately.",
    act: "Repeat after 5 quiet minutes. Note caffeine, exercise or stress in the last 30 minutes with the reading." },
  { id: "spo2", name: "Blood oxygen (SpO₂)", region: "lungs", sig: "spo2",
    what: "The percentage of your red blood cells carrying oxygen.",
    how: "Read by the optical sensor in your garment's headband. Movement can make single readings unreliable.",
    why: "A falling value can be an early sign of a cabin atmosphere problem or a chest illness.",
    flag: "Below 92% at rest for more than 5 minutes. Check cabin oxygen and call the crew medical officer.",
    act: "Re-seat the sensor, rest for 2 minutes, and compare with the fingertip oximeter in the medical bay." },
  { id: "resp", name: "Breathing rate", region: "lungs", sig: "resp",
    what: "Breaths per minute.",
    how: "Measured by the stretch band in your garment.",
    why: "Breathing speeds up as CO₂ rises, sometimes before a headache starts.",
    flag: "Resting rate above 24, or any shortness of breath at rest.",
    act: "Check the CO₂ reading for the module you are in. Move to a better-ventilated module if it is elevated." },
  { id: "temp", name: "Body temperature", region: "core", sig: "temp",
    what: "An estimate of your core temperature from a skin sensor. It follows a daily rhythm, lowest before waking.",
    how: "Continuous from the garment. For a clinical reading use the oral thermometer in the medical bay.",
    why: "Core temperature runs slightly higher in spaceflight and its rhythm shows where your body clock is.",
    flag: "Oral temperature at or above 38.0 °C. Log it and tell the crew medical officer.",
    act: "Confirm with the oral thermometer before acting on the estimate." },
  { id: "glucose", name: "Blood glucose", region: "core", sig: "glucose",
    what: "Sugar in your blood, in mg/dL. Fasting values of 70–99 are typical.",
    how: "Clean a fingertip, use the lancet, touch the strip to the drop. The analyser reads in 5 seconds. Restrain the kit so nothing floats away.",
    why: "Changed diet, lower activity and a shifted body clock can alter how your body handles sugar on long missions.",
    flag: "Fasting above 125 on two mornings, or any reading below 60 with symptoms. Report to the flight surgeon.",
    act: "Log what and when you last ate with each reading so the trend can be interpreted." },
  { id: "exercise", name: "Exercise countermeasures", region: "muscle",
    what: "Minutes of loaded exercise completed against your weekly prescription of 2 hours a day, 6 days a week.",
    how: "The treadmill and resistive device log each session automatically.",
    why: "Loaded exercise is the main protection against bone and muscle loss in microgravity.",
    flag: "Under 80% of the prescription for 2 weeks, or pain during loading.",
    act: "If a session slips late into the evening, tell the planner. Late sessions can delay sleep." },
  { id: "dose", name: "Radiation dose", region: "whole", sig: "rad",
    what: "The dose your body has absorbed so far this mission, and the current cabin dose rate.",
    how: "Your personal dosimeter is read weekly. The cabin detector reports continuously.",
    why: "Radiation risk builds up over the whole mission. The cabin dose rate tells you when to use the shielded shelter.",
    flag: "A storm-shelter alert is a safety alarm. Go to the crew quarters shelter when it sounds.",
    act: "Nothing to do day to day. Sleep stations have the thickest shielding on board." },
];

export const PASSIVE = [
  { name: "Voice strain signal", method: "Passive analysis of pitch and pauses during conferences", state: "Slightly raised this morning", conf: "Low confidence", note: "Research signal. It cannot diagnose anything and is never used for alerts." },
  { name: "Typing rhythm", method: "Key and touch timing on workstations", state: "Within your usual range", conf: "Low confidence", note: "Research signal. Shown for your interest only." },
  { name: "Facial fatigue cues", method: "Camera-based eyelid closure at the workstation, opt-in", state: "Off · you have not opted in", conf: "Not collected", note: "Emerging method. Requires your consent each session." },
];

// ----------------------------------------------------------------- insights --
export type Alt = { id: string; label: string; verdict: "Unlikely" | "Possible" | "Plausible" | "Leading"; weight: number; for: string[]; against: string[]; signals: string[] };
export type ChainStep = { time: string; i: number; lane: "Spacecraft" | "Environment" | "Body" | "Activity"; text: string; module?: ModuleId; evidence: Evidence; sig?: string };
export type Insight = {
  id: string;
  time: string;
  i: number;
  title: string;
  short: string;
  status: "needs-review" | "watch" | "context";
  kind: "insight" | "safety";
  body: string; // what changed in you
  contributor: string;
  association: string;
  confidence: number;
  confidenceWhy: { text: string; good: boolean }[];
  chain: ChainStep[];
  spatial: { path: ModuleId[]; text: string; equipment?: string };
  history: { text: string; rows: { label: string; a: string; b: string; hit: boolean }[]; cols: [string, string] };
  alternatives: Alt[];
  recs: string[];
  preset: { top: string[]; bottom: string[]; days: number; end: number };
  impact: string;
  happened: string; // directly observed event
  changed: string[]; // physiological and environmental changes
  info: string[]; // other relevant information
  lagLine: string; // interpreted timing pattern, worked out by the system
  place: { you: string; system: string; event: string }; // sleeping area -> nearby system -> relevant event
  trend: { repeats: string; baseline: string; activity: string; area: string; shipEvent: string; direction: "Worsening" | "Stable" | "Improving" | "New"; directionText: string; rows: string[] };
};

const ln = FACTS.lastNight;
const confLabel = (c: number) => (c >= 0.75 ? "High" : c >= 0.5 ? "Moderate" : "Low");
const fanAll = NIGHTS.filter((n) => n.fanEvent);
const fanBroken = fanAll.filter((n) => n.quality < Math.round(avg(NIGHTS.filter((n) => n.day < TODAY).map((n) => n.quality))) - 4).length;
export { confLabel };

export const INSIGHTS: Insight[] = [
  {
    id: "sleep-0214",
    time: "02:14",
    i: idx(TODAY, 134),
    title: "Sleep interruption at 02:14",
    short: "Sleep broke up after noise rose in your sleep station",
    status: "needs-review",
    kind: "insight",
    body: `You woke at 02:14 and were restless for about 30 minutes. Sleep quality was ${ln.quality}% against your usual ${FACTS.sleepBaselineQ}%, and you slept 6 h 12 min.`,
    contributor: "Elevated cabin noise",
    association: "Most strongly associated with ventilation fan B running at high speed in the service module, on the other side of your sleep-station wall.",
    confidence: 0.66,
    confidenceWhy: [
      { text: "The noise rose 22 minutes before you woke, not after.", good: true },
      { text: `Same pattern on all ${FACTS.fanNightsLast6} of the previous 6 nights when the fan cycle ran.`, good: true },
      { text: `No 02:00 awakening on the nights it did not run (average quality ${FACTS.calmNightQ}%).`, good: true },
      { text: "Peak noise of 63 dBA is above the sleep-area design level of about 50 dBA.", good: true },
      { text: "Your exercise session ran late last night, which can also disturb sleep.", good: false },
      { text: "Only 30 nights of data. Other causes cannot be ruled out.", good: false },
    ],
    chain: [
      { time: "21:00", i: idx(TODAY - 1, 1260), lane: "Activity", text: "Exercise ended 2 hours later than planned", module: "exercise", evidence: "direct" },
      { time: "01:50", i: idx(TODAY, 110), lane: "Spacecraft", text: "CO₂ removal bed B regeneration began. Fan B 2,380 → 3,420 rpm", module: "service", evidence: "direct", sig: "fan" },
      { time: "01:52", i: idx(TODAY, 112), lane: "Environment", text: "Crew quarters noise 47 → 63 dBA", module: "quarters", evidence: "direct", sig: "noise_quarters" },
      { time: "02:10", i: idx(TODAY, 130), lane: "Body", text: "Movement increased. Heart rate 52 → 66 bpm", evidence: "direct", sig: "move" },
      { time: "02:14", i: idx(TODAY, 134), lane: "Body", text: "Awake detected, restless until 02:44", evidence: "derived", sig: "hr" },
      { time: "02:30", i: idx(TODAY, 150), lane: "Spacecraft", text: "Regeneration complete. Fan B back to 2,380 rpm", module: "service", evidence: "direct", sig: "fan" },
    ],
    spatial: {
      path: ["quarters", "service"],
      equipment: "Ventilation fan B",
      text: "Fan B is mounted on the forward bulkhead of the service module, about 1.8 m from sleep station 2 through a shared wall. It has produced noise above the sleep design level during your sleep window on 5 of the last 7 nights.",
    },
    history: {
      text: `This is the 5th time in 7 nights that fan B has run at high speed during your sleep period. Nights with the fan cycle averaged ${FACTS.fanNightQ}% sleep quality. Nights without it averaged ${FACTS.calmNightQ}%.`,
      cols: ["Fan cycle 01:50", "Sleep quality"],
      rows: NIGHTS.slice(-7).reverse().map((n) => ({
        label: `MD ${155 + n.day}${n.day === TODAY ? " · last night" : ""}`,
        a: n.fanEvent ? `Ran · ${n.noisePeak} dBA` : "Did not run",
        b: `${n.quality}%${n.lateExercise ? " · late exercise" : ""}`,
        hit: n.fanEvent,
      })),
    },
    alternatives: [
      { id: "exercise", label: "Late exercise session", verdict: "Possible", weight: 0.3,
        for: ["Exercise ended at 21:00, 90 minutes before sleep instead of the usual 3.5 hours.", "You took 28 minutes to fall asleep. Your usual is 16."],
        against: ["On the two other late-exercise nights this month the fan did not run and you had no 02:00 awakening (quality 80–82%).", "It would explain slow sleep onset better than a wake-up at 02:14."],
        signals: ["hr", "temp"] },
      { id: "co2", label: "Elevated CO₂ in crew quarters", verdict: "Unlikely", weight: 0.08,
        for: ["CO₂ in the quarters rises overnight with four crew asleep."],
        against: ["Overnight CO₂ was 2.9 mmHg, the same as on undisturbed nights, and under the 3.0 mmHg limit.", "No step change near 02:14."],
        signals: ["co2_quarters"] },
      { id: "temp", label: "Temperature increase", verdict: "Unlikely", weight: 0.05,
        for: ["The service module warmed by 0.3 °C during the regeneration cycle."],
        against: ["Crew quarters stayed at 21.5 °C ± 0.2 through the night."],
        signals: ["temp_quarters", "temp_service"] },
      { id: "stress", label: "Stress carried over from the day", verdict: "Unlikely", weight: 0.07,
        for: ["Yesterday's workstation task overran by 75 minutes."],
        against: ["Your evening stress index was 24, inside your usual range.", "Mood rating at check-in was 4 of 5."],
        signals: ["stress"] },
      { id: "normal", label: "Normal sleep variability", verdict: "Possible", weight: 0.15,
        for: ["You wake briefly 1–2 times on a typical night."],
        against: ["Awakenings on fan nights cluster between 02:05 and 02:20. Random awakenings would be spread through the night."],
        signals: ["move"] },
    ],
    recs: ["shift-regen", "swap-station", "night-compare"],
    preset: { top: ["noise_quarters", "fan"], bottom: ["move", "hr"], days: 1, end: idx(TODAY, 420), },
    impact: "Less continuous sleep, more fatigue today. Reaction time this morning was 268 ms, 9% slower than your baseline.",
    happened: "Sleep interruption detected at 02:14. You were restless until 02:44.",
    changed: [`Sleep continuity decreased. Sleep quality was ${ln.quality}% against your usual ${FACTS.sleepBaselineQ}%.`, "Movement increased and heart rate rose from 52 to 66 bpm.", "Cabin noise in crew quarters rose from 47 to 63 dBA (about 34%) roughly 20 minutes earlier."],
    info: ["CO₂ remained stable at 2.9 mmHg.", "Temperature remained stable at 21.5 °C.", "Exercise occurred earlier and ended late, at 21:00.", "Stress indicators were moderately elevated after an overrun task, but inside your usual range at bedtime."],
    lagLine: `Elevated cabin noise preceded reduced sleep continuity in ${fanBroken} of the last ${fanAll.length} observed events, by about 20 minutes each time.`,
    place: { you: "Sleep station 2, crew quarters", system: "Ventilation fan B, service module, 1.8 m away through a shared wall", event: "02:14 sleep interruption after noise rose to 63 dBA" },
    trend: {
      repeats: `Yes. ${FACTS.fanNightsLast6 + 1} of the last 7 nights, and ${fanAll.length} nights in the last 30.`,
      baseline: `Sleep quality ${ln.quality}% against your usual ${FACTS.sleepBaselineQ}%. Nights with the fan cycle average ${FACTS.fanNightQ}%, nights without it ${FACTS.calmNightQ}%.`,
      activity: "Not tied to an activity. It occurs with or without late exercise the evening before.",
      area: "Only in crew quarters, sleep station 2, which shares a wall with the service module.",
      shipEvent: "Around the 01:50 CO₂ removal bed regeneration, when ventilation fan B runs at high speed.",
      direction: "Worsening", directionText: "More frequent: 2 nights in the week before, 5 in the last 7 nights.",
      rows: ["sleepq", "noise_night", "co2_night", "temp_night", "stress", "exercise_gap"],
    },
  },
  {
    id: "co2-lab",
    time: "16:00",
    i: idx(TODAY, 960),
    title: "Slower evenings after high-CO₂ lab afternoons",
    short: "Lab CO₂ is forecast above the limit this afternoon",
    status: "watch",
    kind: "insight",
    body: `On days when the lab stayed above 3.0 mmHg for over an hour, your evening reaction test averaged ${FACTS.pvtWeak} ms against ${FACTS.pvtNormal} ms on other days. You logged a headache on ${FACTS.headacheN} of those ${FACTS.weakDays14 } days in the last two weeks.`,
    contributor: "CO₂ build-up in the science lab",
    association: "Associated with two crew working in the lab while CO₂ removal runs in single-bed mode. The same conditions are planned for 15:30 today.",
    confidence: 0.56,
    confidenceWhy: [
      { text: `Evening reaction time was slower on ${FACTS.pvtWeakN} of ${FACTS.pvtWeakN} single-bed days in the last two weeks.`, good: true },
      { text: "Headache reports on station have been linked to CO₂ level in published crew data.", good: true },
      { text: "Your heart-rate variability dips about 2 hours after lab CO₂ peaks.", good: true },
      { text: "Ground studies have not found clear effects on thinking at these CO₂ levels.", good: false },
      { text: "Lab afternoons are also your longest work blocks, so workload may explain part of it.", good: false },
      { text: "One analyser per module. Local CO₂ at your face may differ from the reading.", good: false },
    ],
    chain: [
      { time: "06:00", i: idx(TODAY, 360), lane: "Spacecraft", text: "CO₂ removal switched to single-bed mode (bed A bake-out). Capacity 68%", module: "service", evidence: "direct", sig: "cdra" },
      { time: "08:15", i: idx(TODAY, 495), lane: "Activity", text: "You and E. Okafor began work in the lab", module: "lab", evidence: "direct" },
      { time: "10:10", i: idx(TODAY, 610), lane: "Environment", text: `Lab CO₂ peaked at ${FACTS.labPeakMorning.toFixed(1)} mmHg`, module: "lab", evidence: "direct", sig: "co2_lab" },
      { time: "15:30", i: idx(TODAY, 930), lane: "Activity", text: "Planned: you and M. Chen in the lab for 2 hours", module: "lab", evidence: "inference" },
      { time: "16:40", i: idx(TODAY, 1000), lane: "Environment", text: `Forecast: lab CO₂ near ${FACTS.labForecastPeak.toFixed(1)} mmHg`, module: "lab", evidence: "inference", sig: "co2_lab" },
    ],
    spatial: {
      path: ["lab", "node", "quarters", "service"],
      equipment: "CO₂ removal assembly",
      text: "The lab is a dead-end module three hatches from the CO₂ removal assembly in the service module. Its air is exchanged only through the node hatch, so CO₂ from two people working there clears slowly.",
    },
    history: {
      text: `Single-bed mode has been used on ${FACTS.weakDays14} of the last 14 days. This is the pattern on your evening reaction test.`,
      cols: ["Lab CO₂ peak", "Evening reaction time"],
      rows: Array.from({ length: 7 }, (_, k) => TODAY - 1 - k).map((d) => {
        const p = P.pvt.find((x) => x.i === idx(d, 1175));
        const pk = maxIn(S.co2_lab, idx(d, 480), idx(d, 1100));
        const hd = P.headache.some((h) => h.i === idx(d, 1080));
        return { label: `MD ${155 + d}`, a: `${pk.toFixed(1)} mmHg${WEAK_SCRUB_DAYS.has(d) ? " · single-bed" : ""}`, b: `${p?.v ?? "–"} ms${hd ? " · headache" : ""}`, hit: WEAK_SCRUB_DAYS.has(d) };
      }),
    },
    alternatives: [
      { id: "workload", label: "Long lab work blocks", verdict: "Plausible", weight: 0.3,
        for: ["High-CO₂ afternoons are also 3.5-hour focused work blocks."],
        against: ["On dual-bed days with the same lab schedule, evening reaction time was normal."],
        signals: ["stress", "fatigue"] },
      { id: "sleep", label: "Sleep debt", verdict: "Possible", weight: 0.2,
        for: ["Three of the single-bed days followed a disturbed night."],
        against: ["The effect is still present on single-bed days after a good night."],
        signals: ["fatigue"] },
      { id: "airflow", label: "Poor local air mixing", verdict: "Possible", weight: 0.2,
        for: ["CO₂ can pool around the head where airflow is weak. The glovebox position is behind a rack."],
        against: ["No airflow sensor at the glovebox. This cannot be checked from telemetry."],
        signals: ["co2_lab", "co2_node"] },
      { id: "chance", label: "Chance", verdict: "Possible", weight: 0.15,
        for: ["Seven days is a small sample."],
        against: ["The direction of the difference has been the same every time."],
        signals: ["hrv"] },
    ],
    recs: ["co2-dualbed", "co2-relocate", "pvt-recheck"],
    preset: { top: ["co2_lab", "cdra"], bottom: ["hrv", "stress"], days: 7, end: NOW },
    happened: `Lab CO₂ peaked at ${FACTS.labPeakMorning.toFixed(1)} mmHg this morning and is forecast to reach about ${FACTS.labForecastPeak.toFixed(1)} mmHg at 16:40.`,
    changed: [`Evening reaction test averaged ${FACTS.pvtWeak} ms on high-CO₂ days against ${FACTS.pvtNormal} ms on other days.`, `Headache logged on ${FACTS.headacheN} of those ${FACTS.weakDays14} days.`, "Heart-rate variability dips about 2 hours after lab CO₂ peaks."],
    info: ["CO₂ removal is in single-bed mode until 20:00.", "Noise and temperature in the lab remained stable.", "Lab afternoons are also your longest work blocks.", "Whole-vehicle oxygen and pressure are steady."],
    lagLine: `Raised lab CO₂ was followed by a slower evening reaction test on ${FACTS.pvtWeakN} of the last ${FACTS.pvtWeakN} observed days, about 7 hours later.`,
    place: { you: "Glovebox position, science lab", system: "CO₂ removal assembly, service module, three hatches away", event: "16:40 forecast CO₂ peak during the two-person session" },
    trend: {
      repeats: `Yes. On ${FACTS.weakDays14} of the last 14 days.`,
      baseline: `Evening reaction time ${FACTS.pvtWeak} ms on these days against ${FACTS.pvtNormal} ms on other days. Your baseline is 246 ms.`,
      activity: "After afternoon lab sessions with two people present.",
      area: "Only in the science lab, a dead-end module with one hatch.",
      shipEvent: "On days when CO₂ removal runs in single-bed mode for the bed A bake-out.",
      direction: "Stable", directionText: "About the same size each time. No sign of it growing.",
      rows: ["pvt_pm", "co2_lab", "scrub", "hrv", "stress", "sleepq"],
    },
    impact: "Possible headache and slower reactions this evening. No safety limit is forecast to be exceeded for the vehicle as a whole.",
  },
  {
    id: "stress-1042",
    time: "10:42",
    i: idx(TODAY, 642),
    title: "Heart rate and stress rose during a routine task",
    short: "Body response at 10:42 while seated at the workstation",
    status: "watch",
    kind: "insight",
    body: `At 10:42 your heart rate went from ${FACTS.hrBefore} to ${FACTS.hrPeak} bpm and your stress index from ${FACTS.stressBefore} to ${FACTS.stressPeak} while you were seated at the workstation. It settled within 30 minutes.`,
    contributor: "Caution tone and vibration during a gyro desaturation burn",
    association: "Coincided with a thruster burn that shook the work deck and a link-dropout caution tone 40 seconds later.",
    confidence: 0.44,
    confidenceWhy: [
      { text: "The burn, the tone and your response happened within 2 minutes, in that order.", good: true },
      { text: "Your activity was routine seated work, so the rise is not explained by exertion.", good: true },
      { text: `First time a burn and a caution tone have coincided. On ${FACTS.desatCount} earlier burns without a tone, your heart rate rose by under 5 bpm.`, good: false },
      { text: "A single event. One occurrence cannot establish a pattern.", good: false },
    ],
    chain: [
      { time: "10:15", i: idx(TODAY, 615), lane: "Activity", text: "Began workstation procedures & inventory", module: "work", evidence: "direct" },
      { time: "10:40", i: idx(TODAY, 640), lane: "Spacecraft", text: "Gyro desaturation burn, 14 thruster pulses over 90 s", module: "service", evidence: "direct", sig: "thr" },
      { time: "10:40", i: idx(TODAY, 640), lane: "Environment", text: `Work deck vibration 2 → ${FACTS.vibPeak} mg`, module: "work", evidence: "direct", sig: "vib_work" },
      { time: "10:41", i: idx(TODAY, 641), lane: "Spacecraft", text: "High-gain link dropout. Caution tone for 20 s", module: "command", evidence: "direct", sig: "link" },
      { time: "10:42", i: idx(TODAY, 642), lane: "Body", text: `Heart rate ${FACTS.hrBefore} → ${FACTS.hrPeak} bpm. Stress index ${FACTS.stressBefore} → ${FACTS.stressPeak}`, evidence: "direct", sig: "hr" },
      { time: "11:10", i: idx(TODAY, 670), lane: "Body", text: "Heart rate and stress index back in your usual range", evidence: "derived", sig: "stress" },
    ],
    spatial: {
      path: ["work", "command"],
      equipment: "Caution speaker · command deck hatch",
      text: "The caution speaker sits at the hatch between the work deck and the command deck, about 1.2 m from workstation 1. Thruster vibration reaches every module through the structure.",
    },
    history: {
      text: "Compared with the previous gyro desaturation burns while you were awake.",
      cols: ["Event", "Heart-rate change"],
      rows: [
        { label: "MD 184 · 10:40", a: "Burn + caution tone", b: `+${FACTS.hrPeak - FACTS.hrBefore} bpm`, hit: true },
        { label: "MD 182 · 15:10", a: "Burn only", b: "+3 bpm", hit: false },
        { label: "MD 180 · 09:20", a: "Burn only", b: "+4 bpm", hit: false },
        { label: "MD 178 · 13:50", a: "Burn only", b: "+2 bpm", hit: false },
      ],
    },
    alternatives: [
      { id: "startle", label: "Startle from the caution tone alone", verdict: "Leading", weight: 0.45,
        for: ["Earlier burns without a tone produced almost no response.", "The speaker is 1.2 m from your seat."],
        against: ["Cannot be separated from vibration with one event."],
        signals: ["link", "hr"] },
      { id: "task", label: "Task difficulty", verdict: "Possible", weight: 0.15,
        for: ["You opened a new procedure at 10:38."],
        against: ["Similar procedure reviews this week showed no response."],
        signals: ["stress"] },
      { id: "caffeine", label: "Caffeine", verdict: "Possible", weight: 0.1,
        for: ["Coffee is usually taken around 10:15."],
        against: ["No caffeine entry was logged today. The system cannot see this unless you tell it."],
        signals: ["hr"] },
      { id: "normal", label: "Normal variability", verdict: "Unlikely", weight: 0.08,
        for: ["Heart rate varies by ±6 bpm during seated work."],
        against: ["A 24 bpm rise is four times your usual seated variation."],
        signals: ["hr"] },
    ],
    recs: ["desat-notice", "bp-now"],
    preset: { top: ["vib_work", "link"], bottom: ["hr", "stress"], days: 0.5, end: NOW },
    happened: "Heart rate and stress index rose at 10:42 while you were seated at the workstation. They settled by 11:10.",
    changed: [`Heart rate ${FACTS.hrBefore} to ${FACTS.hrPeak} bpm.`, `Stress index ${FACTS.stressBefore} to ${FACTS.stressPeak}.`, `Work deck vibration rose from 2 to ${FACTS.vibPeak} mg two minutes earlier.`],
    info: ["CO₂, noise and temperature on the work deck remained stable.", "Your activity was routine seated work.", "No caffeine entry was logged today.", "The Earth link recovered at 11:00."],
    lagLine: `A burn followed by a caution tone has been observed once. On ${FACTS.desatCount} earlier burns without a tone your heart rate rose by under 5 bpm.`,
    place: { you: "Workstation 1, work deck", system: "Caution speaker at the command deck hatch, 1.2 m away", event: "10:42 rise in heart rate and stress index" },
    trend: {
      repeats: "Not yet. This is the first time.",
      baseline: `Heart rate rose ${FACTS.hrPeak - FACTS.hrBefore} bpm. Your usual variation during seated work is about 6 bpm.`,
      activity: "During routine seated work, so exertion does not explain it.",
      area: "Work deck, next to the caution speaker.",
      shipEvent: "Around a gyro desaturation burn that was followed by a link-dropout caution tone.",
      direction: "New", directionText: "A single event. It will be compared with the next burn, forecast for MD 186.",
      rows: ["stress", "vib", "burn", "hrv", "sleepq"],
    },
    impact: "No lasting effect seen. Worth knowing if it repeats during precise manual work.",
  },
  {
    id: "exercise-hr",
    time: "19:30",
    i: idx(TODAY - 1, 1170),
    title: "High heart rate during exercise",
    short: "Explained by activity. No action needed",
    status: "context",
    kind: "insight",
    body: "Your heart rate reached 134 bpm yesterday evening. You were on the treadmill, so this is the expected response and it matches your previous sessions.",
    contributor: "Planned exercise",
    association: "Explained by what you were doing. Shown here so you can see how context is used.",
    confidence: 0.95,
    confidenceWhy: [
      { text: "The exercise device logged a session at the same time.", good: true },
      { text: "Peak heart rate was within 4 bpm of your last 10 sessions.", good: true },
    ],
    chain: [
      { time: "19:30", i: idx(TODAY - 1, 1170), lane: "Activity", text: "Treadmill session started (late: planned 17:30)", module: "exercise", evidence: "direct" },
      { time: "19:40", i: idx(TODAY - 1, 1180), lane: "Environment", text: "Exercise bay vibration 2 → 15 mg, galley 6 mg", module: "exercise", evidence: "direct", sig: "vib_exercise" },
      { time: "19:50", i: idx(TODAY - 1, 1190), lane: "Body", text: "Heart rate 134 bpm, breathing 29 per minute", evidence: "direct", sig: "hr" },
    ],
    spatial: { path: ["exercise", "galley"], equipment: "Treadmill isolators", text: "The treadmill sits on vibration isolators. Some vibration still reaches the galley next door, as expected." },
    history: {
      text: "This is the 5th time in 14 days that vibration above 5 mg has reached the galley during exercise. It is within isolator limits.",
      cols: ["Session", "Peak heart rate"],
      rows: [
        { label: "MD 183 · late", a: "90 min", b: "134 bpm", hit: false },
        { label: "MD 182", a: "90 min", b: "131 bpm", hit: false },
        { label: "MD 181", a: "90 min", b: "133 bpm", hit: false },
      ],
    },
    alternatives: [],
    recs: [],
    preset: { top: ["vib_exercise", "vib_galley"], bottom: ["hr", "resp"], days: 0.5, end: idx(TODAY - 1, 1350) },
    happened: "Scheduled treadmill session from 19:30 to 21:00 in the exercise bay. It started two hours late.",
    changed: ["Heart rate reached 134 bpm.", "Breathing rate reached 29 per minute.", "Exercise bay vibration rose from 2 to 15 mg, within isolator limits."],
    info: ["CO₂ and temperature in the exercise bay stayed within limits.", "No spacecraft activity coincided with the rise.", "Peak heart rate was within 4 bpm of your last 10 sessions."],
    lagLine: "Heart rate rose within 10 minutes of the start of every exercise session in the last 14 days, as expected.",
    place: { you: "Treadmill, exercise bay", system: "Treadmill vibration isolators", event: "19:50 peak heart rate of 134 bpm" },
    trend: {
      repeats: "Yes, every session. That is what exercise should do.",
      baseline: "Peak of 134 bpm against your usual 131 to 134 bpm in a session.",
      activity: "During scheduled exercise. This is the expected response.",
      area: "Exercise bay. Some vibration reaches the galley next door, within limits.",
      shipEvent: "No spacecraft activity involved.",
      direction: "Stable", directionText: "Peak heart rate has stayed within 4 bpm across sessions.",
      rows: ["hr_peak", "exercise_gap", "sleepq", "hrv"],
    },
    impact: "None. Expected training response.",
  },
];
export const INSIGHT: Record<string, Insight> = Object.fromEntries(INSIGHTS.map((x) => [x.id, x]));

// ---------------------------------------------------------- recommendations --
export type RecStatus =
  | "new" | "reviewed" | "accepted" | "scheduled" | "sent" | "approved" | "planned" | "shared" | "investigating" | "dismissed" | "done";
export const REC_STATUS: Record<RecStatus, { label: string; tone: string }> = {
  new: { label: "NEW", tone: "blue" },
  reviewed: { label: "REVIEWED", tone: "neutral" },
  accepted: { label: "ACCEPTED", tone: "green" },
  scheduled: { label: "SCHEDULED", tone: "green" },
  sent: { label: "AWAITING APPROVAL", tone: "amber" },
  approved: { label: "APPROVED", tone: "green" },
  planned: { label: "IN WORK PLAN", tone: "green" },
  shared: { label: "SHARED WITH MISSION CONTROL", tone: "violet" },
  investigating: { label: "INVESTIGATING", tone: "violet" },
  dismissed: { label: "DISMISSED", tone: "neutral" },
  done: { label: "DONE", tone: "green" },
};
export type Rec = {
  id: string;
  insight: string;
  title: string;
  type: "Vehicle schedule" | "Personal" | "Work plan" | "Investigation";
  control: string; // who can make the change
  what: string;
  why: string;
  when: string;
  where: string;
  modules: ModuleId[];
  impact: string;
  tradeoffs: string;
  confidence: number;
  effort: string;
  slots?: string[];
  primary: "approval" | "schedule" | "plan" | "accept" | "investigate" | "measure";
};
export const RECS: Rec[] = [
  {
    id: "shift-regen", insight: "sleep-0214",
    title: "Move the bed B regeneration cycle out of the sleep period",
    type: "Vehicle schedule", control: "Needs commander and mission control approval. Halo Health does not command life support.",
    what: "Reschedule the 40-minute CO₂ removal bed B regeneration, and its high-speed fan run, from 01:50–02:30 to a daytime window.",
    why: "Noise in crew quarters rose to 62–64 dBA on every night this cycle ran during sleep, and your sleep broke up within 25 minutes each time.",
    when: "From tonight. A lower-impact window is open between 10:00 and 14:00, when the quarters are empty.",
    where: "Service module (fan B, forward bulkhead) → crew quarters",
    modules: ["service", "quarters"],
    impact: "Removes the largest noise source from your sleep window. On nights without the cycle your sleep quality averaged " + FACTS.calmNightQ + "%.",
    tradeoffs: "Daytime regeneration adds about 0.9 kW when electrical load is already highest and warms coolant loop A by 0.1 °C. Both stay inside limits. Thermal engineers on the ground must confirm.",
    confidence: 0.66, effort: "Planner change · no crew time",
    slots: ["10:00–10:40", "12:30–13:10", "13:20–14:00"], primary: "approval",
  },
  {
    id: "swap-station", insight: "sleep-0214",
    title: "Sleep in station 4 tonight",
    type: "Personal", control: "Your decision. Reversible.",
    what: "Use spare sleep station 4, on the forward side of the crew quarters, until the regeneration schedule is settled.",
    why: "Station 4 is 3.1 m from fan B instead of 1.8 m. Its acoustic monitor read 6 dBA lower than station 2 during the last five fan cycles.",
    when: "Tonight, before the 22:30 sleep period.",
    where: "Crew quarters, station 2 → station 4",
    modules: ["quarters"],
    impact: "Expected peak of about 57 dBA instead of 63 dBA. Still above the sleep design level, so this is a stop-gap.",
    tradeoffs: "Station 4 has no personal laptop mount and is closer to the node hatch light.",
    confidence: 0.6, effort: "10 min to move sleeping bag", primary: "accept",
  },
  {
    id: "night-compare", insight: "sleep-0214",
    title: "Compare the next three nights",
    type: "Investigation", control: "Your decision.",
    what: "Keep the event open and let Halo Health compare your next three sleep periods against tonight's change.",
    why: "A change followed by better sleep is stronger evidence than a correlation alone.",
    when: "Automatic. Review on MD 187.",
    where: "Crew quarters",
    modules: ["quarters"],
    impact: "Raises or lowers the system's confidence in the fan explanation.",
    tradeoffs: "None.",
    confidence: 0.9, effort: "No crew time", primary: "investigate",
  },
  {
    id: "co2-dualbed", insight: "co2-lab",
    title: "Ask to return CO₂ removal to dual-bed mode before 15:30",
    type: "Vehicle schedule", control: "Needs mission control approval. Life-support configuration is not changed from this tool.",
    what: "Request that the bed A bake-out is paused, or moved to the overnight period, so both beds run during the two-person lab session.",
    why: `Lab CO₂ is forecast to reach ${FACTS.labForecastPeak.toFixed(1)} mmHg at about 16:40 with two crew and single-bed removal. The 1-hour limit is 3.0 mmHg.`,
    when: "Request now. With a 7 min 42 s one-way signal delay, allow 25 minutes for an answer.",
    where: "Service module (CO₂ removal assembly) → science lab",
    modules: ["service", "lab"],
    impact: "Keeps the forecast lab peak near 2.9 mmHg. May reduce evening headache and slower reactions.",
    tradeoffs: "Delays the bed A bake-out by one day. Bed A sorbent performance keeps degrading slowly until it is done.",
    confidence: 0.56, effort: "1 message", primary: "approval",
  },
  {
    id: "co2-relocate", insight: "co2-lab",
    title: "Do the sample logging half of the session on the work deck",
    type: "Work plan", control: "Commander can re-plan crew tasks. You are the commander.",
    what: "Move your 60 minutes of sample logging from the lab to workstation 2, leaving one person in the lab at a time after 16:30.",
    why: "Lab CO₂ rises about 0.35 mmHg for each person working there. One person keeps it under the limit even in single-bed mode.",
    when: "16:30–17:30 today.",
    where: "Science lab → work deck",
    modules: ["lab", "work"],
    impact: "Forecast lab peak drops from " + FACTS.labForecastPeak.toFixed(1) + " to about 3.0 mmHg.",
    tradeoffs: "Samples must be carried to the work deck in the cold bag. Adds roughly 10 minutes.",
    confidence: 0.62, effort: "10 min extra", slots: ["16:30–17:30", "16:00–17:00"], primary: "plan",
  },
  {
    id: "pvt-recheck", insight: "co2-lab",
    title: "Take a reaction test at 17:30",
    type: "Investigation", control: "Your decision.",
    what: "Add one extra 3-minute reaction test straight after the lab session.",
    why: "Your evening test is at 19:35, two hours after the lab session. A test straight afterwards shows whether the slowing tracks CO₂ or builds later.",
    when: "17:30 today.",
    where: "Any workstation",
    modules: ["work"],
    impact: "Better evidence for or against the CO₂ explanation.",
    tradeoffs: "3 minutes of crew time.",
    confidence: 0.8, effort: "3 min", primary: "measure",
  },
  {
    id: "desat-notice", insight: "stress-1042",
    title: "Announce desaturation burns five minutes ahead",
    type: "Work plan", control: "Commander's decision. Uses an existing planner notice.",
    what: "Turn on the 5-minute crew notice for planned gyro desaturation burns, and share today's event with mission control for the link-dropout review.",
    why: "Today's burn arrived without warning and was followed by a caution tone. An expected event is less likely to startle.",
    when: "Next burn is forecast for MD 186, around 08:30.",
    where: "All modules",
    modules: ["work", "command"],
    impact: "Fewer startle responses during precise manual work.",
    tradeoffs: "One more audio notice every two days.",
    confidence: 0.4, effort: "1 planner setting", primary: "plan",
  },
  {
    id: "bp-now", insight: "stress-1042",
    title: "Take your weekly blood pressure reading today",
    type: "Personal", control: "Your decision.",
    what: "Your weekly cuff reading is due. Take it in the medical bay before the 14:00 EVA systems prep.",
    why: "It is due anyway, and a reading on a day with a short night and a stress response is useful context for the flight surgeon.",
    when: "Before 14:00. Takes 8 minutes including 5 minutes of quiet sitting.",
    where: "Medical bay",
    modules: ["med"],
    impact: "Keeps your weekly trend complete.",
    tradeoffs: "None.",
    confidence: 0.9, effort: "8 min", primary: "measure",
  },
];
export const REC: Record<string, Rec> = Object.fromEntries(RECS.map((r) => [r.id, r]));

// -------------------------------------------------------------------- alerts --
export type Alert = {
  id: string;
  level: "critical" | "important" | "info";
  type: "safety" | "insight" | "routine";
  title: string;
  desc: string;
  time: string;
  link: { screen: string; param?: string };
  resolved?: boolean;
};
export const ALERTS: Alert[] = [
  { id: "a-sleep", level: "important", type: "insight", title: "Sleep ↓ · associated with cabin noise", desc: "5th night in 7. Schedule change recommended.", time: "06:31", link: { screen: "insights", param: "sleep-0214" } },
  { id: "a-co2", level: "important", type: "safety", title: "Lab CO₂ ↑ · forecast above limit at 16:40", desc: `Forecast ${FACTS.labForecastPeak.toFixed(1)} mmHg. Limit 3.0.`, time: "11:06", link: { screen: "insights", param: "co2-lab" } },
  { id: "a-stress", level: "info", type: "insight", title: "Heart rate and stress ↑ at 10:42", desc: "With a burn and a caution tone. Recovered in 30 min.", time: "10:44", link: { screen: "insights", param: "stress-1042" } },
  { id: "a-bp", level: "info", type: "routine", title: "Blood pressure reading due", desc: "Before 14:00 · 8 min · medical bay.", time: "07:15", link: { screen: "checkin", param: "bp" } },
  { id: "a-water", level: "info", type: "safety", title: "Water filter service due in 36 h", desc: "Planned. Kit in service module locker 3.", time: "09:30", link: { screen: "ship", param: "galley" } },
  { id: "a-spe", level: "critical", type: "safety", title: "Solar particle event · storm shelter advised", desc: "MD 172, 03:20. Dose rate peaked at 380 µSv/h. Crew sheltered for 4 h 10 min. Closed.", time: "MD 172", link: { screen: "history" }, resolved: true },
];

// ---------------------------------------------------------------- subsystems --
export type Subsystem = {
  id: string;
  name: string;
  module: ModuleId | "vehicle";
  state: "Nominal" | "Reduced" | "Attention";
  plain: string;
  crew: string;
  health: number;
  signals: string[];
  items: { tag: string; label: string; sig?: string; value?: string; note: string }[];
};
export const SUBSYSTEMS: Subsystem[] = [
  { id: "eclss", name: "Air revitalisation", module: "service", state: "Reduced", health: 82,
    plain: "CO₂ removal is in single-bed mode until 20:00 while bed A is baked out. Oxygen and pressure are steady.",
    crew: "Expect CO₂ to rise faster than usual in dead-end modules with two or more people. Fan B runs fast during regeneration and is audible in crew quarters.",
    signals: ["cdra", "fan", "co2_lab"],
    items: [
      { tag: "ECL-CDR-CAP", label: "CO₂ removal capacity", sig: "cdra", note: "100% with both beds. 68% in single-bed mode." },
      { tag: "ECL-IMV-FANB-N", label: "Ventilation fan B speed", sig: "fan", note: "2,380 rpm cruise. 3,420 rpm during bed regeneration." },
      { tag: "ECL-CAB-PRESS", label: "Cabin pressure", sig: "pressure", note: "Held at 101.3 kPa." },
      { tag: "ECL-PPO2", label: "Oxygen partial pressure", sig: "ppo2", note: "Target 21.3 kPa." },
      { tag: "ECL-BEDA-STATE", label: "Bed A state", value: "Bake-out · 6 h 38 m left", note: "Offline until about 20:00." },
    ] },
  { id: "oxygen", name: "Oxygen generation", module: "service", state: "Nominal", health: 96,
    plain: "Electrolysis is making oxygen at the planned daytime rate.",
    crew: "No crew effect.",
    signals: ["oga", "ppo2"],
    items: [
      { tag: "OGA-PROD-RATE", label: "Production rate", sig: "oga", note: "Higher by day to match crew activity." },
      { tag: "OGA-H2-SENSOR", label: "Hydrogen sensor", value: "Clear", note: "Checks for hydrogen in the oxygen outlet." },
    ] },
  { id: "water", name: "Water recovery", module: "galley", state: "Attention", health: 78,
    plain: "Recycling normally. The particulate filter is due for service within 36 hours.",
    crew: "Processing runs three times a day and adds about 4 dBA in the galley.",
    signals: ["wpa", "noise_galley"],
    items: [
      { tag: "WRS-PROC-STATE", label: "Processor running", sig: "wpa", note: "Three 90-minute runs a day." },
      { tag: "WRS-TANK-POT", label: "Drinking water tank", value: "71%", note: "About 9 days at current use without recycling." },
      { tag: "WRS-FILT-DP", label: "Filter pressure drop", value: "38 kPa · service at 40", note: "Rising as the filter loads up." },
    ] },
  { id: "thermal", name: "Thermal control", module: "service", state: "Nominal", health: 94,
    plain: "Both coolant loops are inside their temperature bands with normal pump speeds.",
    crew: "Pump A sits behind the service module forward bulkhead. It speeds up with fan B during regeneration.",
    signals: ["loop", "pump", "temp_service"],
    items: [
      { tag: "TCS-LOOPA-TOUT", label: "Loop A outlet temperature", sig: "loop", note: "Band 3.5–6.0 °C." },
      { tag: "TCS-PUMPA-N", label: "Pump A speed", sig: "pump", note: "About 11,800 rpm." },
      { tag: "TCS-RAD-FLOW", label: "Radiator flow", value: "100%", note: "Both radiator wings in use." },
    ] },
  { id: "power", name: "Electrical power", module: "vehicle", state: "Nominal", health: 91,
    plain: "Solar arrays are meeting demand with an 18% margin. Batteries are at 96%.",
    crew: "Daytime margin is the constraint on moving equipment runs out of the sleep period.",
    signals: ["power"],
    items: [
      { tag: "EPS-BUS-LOAD", label: "Main bus load", sig: "power", note: "Peaks during daytime research." },
      { tag: "EPS-ARRAY-OUT", label: "Array output", value: "17.4 kW", note: "At 1.31 AU from the Sun." },
      { tag: "EPS-BATT-SOC", label: "Battery state of charge", value: "96%", note: "Used during attitude manoeuvres." },
    ] },
  { id: "attitude", name: "Attitude control", module: "service", state: "Nominal", health: 93,
    plain: "Four control moment gyros are holding attitude. A desaturation burn ran at 10:40. The next is forecast for MD 186.",
    crew: "Burns last about 90 seconds and are felt as vibration in every module.",
    signals: ["cmg", "thr", "att"],
    items: [
      { tag: "GNC-CMG-MOM", label: "Stored momentum", sig: "cmg", note: "Burn is commanded near 85%." },
      { tag: "GNC-RCS-PULSE", label: "Thruster pulses", sig: "thr", note: "Per 10 minutes." },
      { tag: "GNC-ATT-ERR", label: "Attitude error", sig: "att", note: "Roll, pitch and yaw combined." },
      { tag: "GNC-RPY", label: "Roll · pitch · yaw", value: "0.02° · −0.01° · 0.03°", note: "Relative to cruise attitude." },
    ] },
  { id: "comms", name: "Communications", module: "command", state: "Nominal", health: 97,
    plain: "High-gain link to Earth is up. One-way delay is 7 min 42 s. A 20-minute dropout at 10:41 has cleared.",
    crew: "A link dropout sounds a caution tone on the work deck and command deck.",
    signals: ["link"],
    items: [
      { tag: "COM-HGA-MARGIN", label: "Link margin", sig: "link", note: "Above 3 dB is healthy." },
      { tag: "COM-OWLT", label: "One-way light time", value: "7 min 42 s", note: "Grows by about 4 s a day." },
      { tag: "COM-NEXT-PASS", label: "Next private medical conference", value: "MD 185 · 09:00", note: "Store-and-forward video." },
    ] },
  { id: "airlock", name: "Airlock", module: "airlock", state: "Nominal", health: 100,
    plain: "Pressurised and idle. EVA systems prep is planned for 14:00.",
    crew: "Depress pump runs are loud in the node. None planned today.",
    signals: ["noise_airlock"],
    items: [
      { tag: "ALK-PRESS", label: "Airlock pressure", value: "101.2 kPa", note: "Equalised with cabin." },
      { tag: "ALK-SUIT-CHG", label: "Suit battery charge", value: "2 of 2 full", note: "Ready for prep." },
    ] },
];
export const SUBSYSTEM: Record<string, Subsystem> = Object.fromEntries(SUBSYSTEMS.map((s) => [s.id, s]));

// ------------------------------------------------------------------ routine --
export type Routine = { id: string; name: string; when: string; mins: number; done: boolean; kind: "auto" | "test" | "manual"; points: number };
export const ROUTINE: Routine[] = [
  { id: "wear", name: "Biosensor garment worn overnight", when: "Automatic", mins: 0, done: true, kind: "auto", points: 10 },
  { id: "glucose", name: "Fasting blood glucose", when: "06:40 · done", mins: 2, done: true, kind: "manual", points: 10 },
  { id: "pvt", name: "Morning reaction test", when: "07:25 · done", mins: 3, done: true, kind: "test", points: 15 },
  { id: "bp", name: "Weekly blood pressure", when: "Due before 14:00", mins: 8, done: false, kind: "manual", points: 20 },
  { id: "symptoms", name: "Symptom check", when: "Any time", mins: 1, done: false, kind: "manual", points: 10 },
  { id: "pvt2", name: "Evening reaction test", when: "19:35", mins: 3, done: false, kind: "test", points: 15 },
  { id: "mood", name: "Evening mood and sleep diary", when: "20:45", mins: 1, done: false, kind: "manual", points: 10 },
];

// --------------------------------------------------------------- references --
export const REFERENCES: { topic: string; title: string; src: string; url: string; used: string }[] = [
  { topic: "CO₂", title: "OCHMO-TB-004 Carbon Dioxide technical brief", src: "NASA Office of the Chief Health and Medical Officer", url: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf", used: "3.0 mmHg 1-hour average limit; symptom ranges; ground studies finding no clear cognitive effect at these levels." },
  { topic: "CO₂", title: "Law J. et al. (2014) Relationship between carbon dioxide levels and reported headaches on the International Space Station", src: "Journal of Occupational and Environmental Medicine 56(5) · link opens a press summary", url: "https://sciencedaily.com/releases/2014/05/140501100922.htm", used: "Headache reports rise with CO₂ level. The relationship was found by looking back at records, which is the gap this tool addresses." },
  { topic: "Noise", title: "OCHMO-TB-035 Acoustics technical brief", src: "NASA OCHMO", url: "https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf", used: "NC-50 work-area and NC-40 sleep-area design curves; 85 dBA hazard level. The dBA equivalents shown (about 60 and 50) are approximations." },
  { topic: "Standards", title: "NASA-STD-3001 Volume 2, Human Factors, Habitability and Environmental Health", src: "NASA Technical Standards", url: "https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-2-rev-d-with-signature.pdf", used: "Atmosphere, temperature, humidity, lighting and vibration bands for the environment screens." },
  { topic: "Sleep", title: "Barger L. et al. (2014) Prevalence of sleep deficiency and use of hypnotic drugs in astronauts", src: "The Lancet Neurology 13(9)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/", used: "Crews average about 6 hours of sleep in flight; actigraphy as the measurement method." },
  { topic: "Cognition", title: "Cognition test battery and Reaction Self-Test (PVT-B)", src: "Basner M. et al., University of Pennsylvania / NASA", url: "https://www.med.upenn.edu/uep/cognition.html", used: "Short reaction-time testing as an operational fatigue measure; 355 ms lapse threshold." },
  { topic: "Wearables", title: "Bio-Monitor: keeping an eye on astronauts' vital signs", src: "Canadian Space Agency", url: "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp", used: "A garment that records heart rate, breathing, skin temperature, blood oxygen and activity has flown on the station." },
  { topic: "Telemetry", title: "ISS Live public telemetry (telemetry.space, ISS Mimic)", src: "NASA / community projects", url: "https://github.com/ISS-Mimic/Mimic", used: "Real categories of vehicle telemetry: gyro wheel speeds, loop temperatures, cabin pressure, array output. Tag names in this prototype are invented." },
  { topic: "Radiation", title: "Zeitlin C. et al. (2013) Measurements of energetic particle radiation in transit to Mars", src: "Science 340(6136)", url: "https://www.science.org/doi/10.1126/science.1235989", used: "Cruise dose rate of about 1.8 mSv per day used for the cabin detector." },
  { topic: "Decision support", title: "Exploration Medical Capability Clinical Decision Support System Concept of Operations", src: "NASA Human Research Program, NTRS", url: "https://ntrs.nasa.gov/citations/20220017856", used: "Earth-independent crews need medical, vehicle and environment data brought together on board." },
  { topic: "Hazards", title: "5 Hazards of Human Spaceflight", src: "NASA Human Research Program", url: "https://www.nasa.gov/hrp/hazards/", used: "Framing of radiation, isolation, distance, gravity and closed environments in the health explainers." },
  { topic: "Bone", title: "Bone and muscle loss in microgravity", src: "NASA", url: "https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/", used: "1–1.5% bone density loss per month and the daily exercise prescription." },
];

export const ASSUMPTIONS = [
  "The vehicle is a fictional deep-space transit craft, DST Aether, on mission day 184 with a crew of four.",
  "All crew health values and all vehicle telemetry are generated by a seeded simulation. No real person's data is shown.",
  "The patterns in the simulation (fan noise and sleep, CO₂ and evening performance) are built in so the tools have something to find. Their size is illustrative.",
  "Telemetry tag names are invented. Categories follow real space-station telemetry.",
  "The stress index, fatigue estimate and passive signals are labelled as derived or experimental. None is a validated medical measurement.",
  "Halo Health recommends and routes requests. It never commands life support, propulsion or thermal systems.",
];

// ----------------------------------------------------------------- glossary --
// Short definitions shown in place by the Term tooltip, so nobody has to leave
// the page to find out what a word means.
export const GLOSSARY: Record<string, { term: string; def: string }> = {
  hrv: { term: "HRV", def: "Heart-rate variability: how much the gap between heartbeats varies. Higher usually means you are better recovered. Compare it with your own baseline, not other people." },
  spo2: { term: "SpO₂", def: "Blood oxygen: the share of your red blood cells carrying oxygen. 95 to 100% is typical at rest." },
  baseline: { term: "Baseline", def: "Your own usual value, taken from your last 14 days at the same time of day. It is not a population average." },
  recovery: { term: "Recovery", def: "How well your body has bounced back from sleep loss, exercise or stress. Estimated mainly from HRV and sleep." },
  cogload: { term: "Cognitive load", def: "How much demand is on your attention and working memory. Estimated from reaction-time tests and task type." },
  correlation: { term: "Correlation", def: "Two signals moved together in time. It describes a pattern. It does not show that one caused the other." },
  trend: { term: "Trend", def: "A change that repeats or keeps moving in one direction over several days, not a single reading." },
  confidence: { term: "Confidence", def: "How well the evidence fits the system's interpretation: low, moderate or high. It is not the chance that something is the cause." },
  anomaly: { term: "Anomaly", def: "A reading that is unusual for you in that situation. Unusual does not mean harmful. Exercise and meals are checked first." },
  co2: { term: "CO₂", def: "Carbon dioxide, the gas you breathe out. In a sealed cabin it builds up where air mixes poorly. The 1-hour limit is 3.0 mmHg." },
  readiness: { term: "Readiness", def: "A 0 to 100 summary of sleep, recovery and reaction time against your own baseline. A guide, not a medical measurement." },
  stress: { term: "Stress index", def: "A 0 to 100 estimate from heart rate, HRV and breathing, corrected for activity. Experimental." },
  fatigue: { term: "Fatigue estimate", def: "A model estimate from your recent sleep and hours awake. It is not measured from your body directly." },
  dba: { term: "dBA", def: "Loudness as the ear hears it. 50 dBA is a quiet office. Sleep areas are designed to about 50 dBA." },
  reaction: { term: "Reaction time", def: "Your average response on a 3-minute tap test. Slower than your baseline often follows short sleep." },
};

// ------------------------------------------------------------ glance layer --
// The shortest useful version of each detected change. Shown first; the full
// explanation stays one click away.
export type GlanceInfo = {
  metric: string; dir: "up" | "down"; amount: string; phrase: string;
  contributor: string; // short form of the potential contributor
  click: string; // one sentence shown on the first click
  action: string; // id of the first recommendation, "" when none is needed
  tone: "watch" | "high" | "ok";
  happened: string; changed: string; alts: string; history: string; // one-line answers; the full text sits behind each
  repeat: string; // how often, in a few words
  q: [string, string, string, string, string]; // short answers: repeating, vs baseline, activity, area, spacecraft event
  factors: { label: string; state: string; flag?: boolean }[]; // relevant context, brought forward
};
export const GLANCE: Record<string, GlanceInfo> = {
  "sleep-0214": {
    metric: "Sleep", dir: "down", amount: `${FACTS.sleepBaselineQ - ln.quality} pts`, phrase: "Below your baseline", contributor: "Cabin noise", tone: "watch",
    repeat: `${FACTS.fanNightsLast6 + 1} of last 7 nights`, q: [`Yes · ${FACTS.fanNightsLast6 + 1} of last 7 nights`, `Yes · ${ln.quality}% vs usual ${FACTS.sleepBaselineQ}%`, "No", "Crew quarters, station 2", "Bed B regeneration, 01:50"],
    happened: "Woke at 02:14, restless 30 min", changed: "Sleep ↓ · Movement ↑ · Heart rate ↑", alts: "2 possible · 3 unlikely", history: `${fanBroken} of last ${fanAll.length} fan nights`,
    click: "Noise rose 34% about 20 minutes before you woke.", action: "shift-regen",
    factors: [
      { label: "Noise", state: "↑ 63 dBA", flag: true }, { label: "Exercise", state: "Ended late" }, { label: "Stress", state: "Usual" },
      { label: "CO₂", state: "Steady" }, { label: "Temperature", state: "Steady" },
    ],
  },
  "co2-lab": {
    metric: "Evening reaction speed", dir: "down", amount: "slower", phrase: "After high-CO₂ lab days", contributor: "Lab CO₂", tone: "watch",
    repeat: `${FACTS.weakDays14} of last 14 days`, q: [`Yes · ${FACTS.weakDays14} of last 14 days`, `Yes · ${FACTS.pvtWeak} vs ${FACTS.pvtNormal} ms`, "After 2-person lab sessions", "Science lab only", "Single-bed CO₂ removal"],
    happened: "Lab CO₂ ↑ this morning, higher forecast 16:40", changed: "Evening reactions slower · Headache logged", alts: "Fatigue and workload possible", history: `${FACTS.pvtWeakN} of last ${FACTS.pvtWeakN} high-CO₂ days`,
    click: `Lab CO₂ is forecast at ${FACTS.labForecastPeak.toFixed(1)} mmHg at 16:40. Limit 3.0.`, action: "co2-dualbed",
    factors: [
      { label: "CO₂", state: `↑ ${FACTS.labForecastPeak.toFixed(1)} forecast`, flag: true }, { label: "Crew in lab", state: "2 people" }, { label: "Sleep", state: "Short night" },
      { label: "Workload", state: "Usual" }, { label: "Temperature", state: "Steady" },
    ],
  },
  "stress-1042": {
    metric: "Heart rate and stress", dir: "up", amount: "30 min", phrase: "High for seated work", contributor: "Caution tone + burn", tone: "watch",
    repeat: "Seen once", q: ["Not yet · first time", `Yes · +${FACTS.hrPeak - FACTS.hrBefore} bpm, usual 6`, "No · routine seated work", "Work deck, by the speaker", "Gyro burn + caution tone"],
    happened: "Rise at 10:42 while seated", changed: "Heart rate ↑ · Stress ↑ · settled by 11:10", alts: "Task difficulty, caffeine unlikely", history: "Seen once. Not yet a pattern",
    click: "A caution tone and a thruster burn came 1 minute before the rise.", action: "desat-notice",
    factors: [
      { label: "Caution tone", state: "Sounded", flag: true }, { label: "Vibration", state: "↑ during burn", flag: true }, { label: "Task", state: "Routine" },
      { label: "Caffeine", state: "None logged" }, { label: "CO₂", state: "Steady" },
    ],
  },
  "exercise-hr": {
    metric: "Heart rate", dir: "up", amount: "exercise", phrase: "Expected response", contributor: "Planned exercise", tone: "ok",
    repeat: "Every session", q: ["Yes · every session", "No · usual peak", "Scheduled exercise", "Exercise bay", "None"],
    happened: "Treadmill 19:30 to 21:00, started late", changed: "Heart rate ↑ as expected", alts: "None needed", history: "Every session, last 14 days",
    click: "Heart rate rose with the treadmill session and recovered normally.", action: "",
    factors: [{ label: "Exercise", state: "Treadmill", flag: true }, { label: "Recovery", state: "Normal" }, { label: "Timing", state: "2 h late" }],
  },
};
/** Short verb-first titles for recommendations, with the benefit in a few words. */
export const REC_SHORT: Record<string, { do: string; benefit: string; why: string; when: string; where: string; cost: string }> = {
  "shift-regen": { do: "Move bed B cycle to daytime", benefit: "Quieter sleep", why: "Noise ↑ on every fan night", when: "From tonight", where: "Service module → crew quarters", cost: "+0.9 kW by day, within limits" },
  "swap-station": { do: "Sleep in station 4 tonight", benefit: "About 6 dBA quieter", why: "Station 4 is further from fan B", when: "Tonight, before 22:30", where: "Crew quarters, station 4", cost: "No laptop mount, more hatch light" },
  "night-compare": { do: "Compare the next 3 nights", benefit: "Tests the noise link", why: "A change then better sleep is stronger evidence", when: "Automatic · review MD 187", where: "Crew quarters", cost: "None" },
  "co2-dualbed": { do: "Request dual-bed CO₂ removal by 15:30", benefit: "Lab CO₂ stays under limit", why: "Lab CO₂ forecast above limit at 16:40", when: "Request now · reply takes about 25 min", where: "Service module → science lab", cost: "Bed A bake-out slips 1 day" },
  "co2-relocate": { do: "Log samples on the work deck", benefit: "Less time in high CO₂", why: "One person in the lab keeps CO₂ under limit", when: "16:30 to 17:30 today", where: "Science lab → work deck", cost: "About 10 min extra" },
  "pvt-recheck": { do: "Reaction test at 17:30", benefit: "Checks the CO₂ link", why: "Shows if slowing tracks CO₂", when: "17:30 today", where: "Any workstation", cost: "3 min" },
  "desat-notice": { do: "Announce burns 5 min ahead", benefit: "No surprise tone", why: "Today's burn came without warning", when: "Next burn MD 186, about 08:30", where: "All modules", cost: "One more audio notice every 2 days" },
  "bp-now": { do: "Take blood pressure today", benefit: "Keeps weekly trend", why: "Weekly reading is due", when: "Before 14:00 · 8 min", where: "Medical bay", cost: "None" },
};
