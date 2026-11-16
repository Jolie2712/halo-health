// One labelled event model for the whole app. Every marker on a chart is one of
// these, so no dot or spike is ever shown without saying what it was.
// Built from the simulated schedule, vehicle events and detected changes.
import {
  S, P, NOW, TODAY, PER_DAY, idx, dayOf, minOf, hhmm, mean, maxIn, SCHEDULE, VEHICLE_EVENTS, NIGHTS, FAN_NIGHTS, WEAK_SCRUB_DAYS,
  DESAT_EVENTS, MOD, MD0, nightOf, blockAt, type Activity, type Block, type ModuleId,
} from "./sim";
import { FACTS, INSIGHT, SUBSYSTEM } from "./content";

export type EventKind = "exercise" | "sleep" | "meal" | "work" | "environment" | "spacecraft" | "comms" | "medical" | "other";
export const KINDS: { id: EventKind; label: string; color: string; icon: string }[] = [
  { id: "exercise", label: "Exercise", color: "#16857f", icon: "pulse" },
  { id: "sleep", label: "Sleep", color: "#5b6bb5", icon: "moon" },
  { id: "meal", label: "Meals", color: "#198a62", icon: "cup" },
  { id: "work", label: "Work", color: "#2f64c7", icon: "clipboard" },
  { id: "environment", label: "Environmental", color: "#b77912", icon: "wind" },
  { id: "spacecraft", label: "Spacecraft", color: "#7557bd", icon: "bolt" },
  { id: "comms", label: "Communication", color: "#3d8fd1", icon: "send" },
  { id: "medical", label: "Medical", color: "#c0456b", icon: "heart" },
  { id: "other", label: "Other", color: "#55667d", icon: "alert" },
];
export const KIND: Record<EventKind, (typeof KINDS)[number]> = Object.fromEntries(KINDS.map((k) => [k.id, k])) as Record<EventKind, (typeof KINDS)[number]>;
export const ACTIVITY_KIND: Record<Activity, EventKind> = {
  sleep: "sleep", eat: "meal", exercise: "exercise", research: "work", maintenance: "work", evaprep: "work", admin: "work",
  comms: "comms", medical: "medical", personal: "other",
};

export type LabEvent = {
  id: string;
  i: number;
  dur: number; // samples
  kind: EventKind;
  type: string; // what the marker says, e.g. "Sleep interruption"
  title: string;
  priority: 1 | 2 | 3; // 3 = detected change, 2 = notable, 1 = routine
  module?: ModuleId;
  insight?: string; // the Trends pattern this event belongs to
  forecast?: boolean;
  time?: string; // exact clock time when it is finer than the 10-minute samples
  top: string[]; // spacecraft and cabin signals that matter for this event
  bottom: string[]; // health signals that matter for this event
  rows: string[]; // daily rows to pre-select in Trends
};
export type EventDetail = {
  expected?: { label: string; text: string };
  happened: string;
  changed: string[];
  contributor?: string;
  info: string[]; // other relevant information
  others: string[]; // other possibilities
  confidence: number | null;
  confWhy: string;
  history: string;
  ship?: string; // spacecraft activity at the time, in plain words
};

const ev: LabEvent[] = [];
const add = (e: LabEvent) => ev.push(e);
const SLEEP_ROWS = ["sleepq", "noise_night", "co2_night", "temp_night", "stress", "exercise_gap"];
const CO2_ROWS = ["pvt_pm", "co2_lab", "scrub", "hrv", "stress", "sleepq"];
const STRESS_ROWS = ["stress", "vib", "burn", "hrv", "sleepq"];
const EX_ROWS = ["hr_peak", "exercise_gap", "sleepq", "hrv"];

for (let d = 0; d <= TODAY; d++) {
  for (const b of SCHEDULE[d]) {
    const i = idx(d, b.start);
    if (i > NOW) continue; // planned activities are shown on the activity strip, not as events
    const dur = Math.round((b.end - b.start) / 10);
    if (b.activity === "exercise")
      add({ id: d === TODAY - 1 ? "exercise-hr" : `ex-${d}`, i, time: hhmm(b.start), dur, kind: "exercise", type: "Exercise", title: b.label.replace("Exercise · ", "Exercise: "), priority: 2, module: b.module, insight: "exercise-hr",
        top: ["vib_exercise", "noise_exercise"], bottom: ["hr", "resp"], rows: EX_ROWS });
    else if (b.activity === "eat")
      add({ id: `meal-${d}-${b.start}`, i, time: hhmm(b.start), dur, kind: "meal", type: "Meal", title: b.label, priority: 1, module: b.module, top: ["noise_galley", "co2_galley"], bottom: ["hr", "stress"], rows: ["stress", "hrv", "sleepq"] });
    else if (b.activity === "comms")
      add({ id: `comm-${d}-${b.start}`, i, time: hhmm(b.start), dur, kind: "comms", type: "Communication", title: b.label, priority: 1, module: b.module, top: ["link", "noise_command"], bottom: ["stress", "hr"], rows: ["stress", "hrv", "sleepq"] });
    else if (b.activity === "medical")
      add({ id: `med-${d}`, i, time: hhmm(b.start), dur, kind: "medical", type: "Medical event", title: b.label, priority: 1, module: b.module, top: ["co2_med", "temp_med"], bottom: ["hr", "hrv"], rows: ["pvt_am", "hrv", "sleepq"] });
  }
  if (FAN_NIGHTS.has(d)) {
    add({ id: `noise-${d}`, i: idx(d, 112), time: "01:52", dur: 4, kind: "environment", type: "Environmental change", title: "Noise rose in crew quarters", priority: 2, module: "quarters", insight: "sleep-0214",
      top: ["noise_quarters", "fan"], bottom: ["move", "hr"], rows: SLEEP_ROWS });
    add({ id: d === TODAY ? "sleep-0214" : `wake-${d}`, i: idx(d, 134), time: "02:14", dur: 3, kind: "sleep", type: "Sleep interruption", title: "Sleep interruption detected", priority: 3, module: "quarters", insight: "sleep-0214",
      top: ["noise_quarters", "fan"], bottom: ["move", "hr"], rows: SLEEP_ROWS });
  }
  if (WEAK_SCRUB_DAYS.has(d) && idx(d, 610) <= NOW)
    add({ id: `co2-${d}`, i: idx(d, 610), dur: 6, kind: "environment", type: "Environmental change", title: "CO₂ rose in the science lab", priority: 2, module: "lab", insight: "co2-lab",
      top: ["co2_lab", "cdra"], bottom: ["hrv", "stress"], rows: CO2_ROWS });
}
for (const h of P.headache)
  add({ id: `head-${dayOf(h.i)}`, i: h.i, dur: 1, kind: "medical", type: "Medical event", title: "Headache logged by you", priority: 2, insight: "co2-lab", top: ["co2_lab", "cdra"], bottom: ["hrv", "stress"], rows: CO2_ROWS });
for (const v of VEHICLE_EVENTS) {
  if (v.i > NOW) continue;
  const lastBurn = v.kind === "attitude" && v.i === DESAT_EVENTS[DESAT_EVENTS.length - 1];
  if (v.id.startsWith("fan"))
    add({ id: v.id, i: v.i, dur: v.dur, kind: "spacecraft", type: "Spacecraft activity", title: "Ventilation fan B at high speed", priority: 2, module: "service", insight: "sleep-0214", top: ["fan", "noise_quarters"], bottom: ["move", "hr"], rows: SLEEP_ROWS });
  else if (v.id.startsWith("scrub"))
    add({ id: v.id, i: v.i, dur: v.dur, kind: "spacecraft", type: "Spacecraft activity", title: "CO₂ removal in single-bed mode", priority: 2, module: "service", insight: "co2-lab", top: ["cdra", "co2_lab"], bottom: ["hrv", "stress"], rows: CO2_ROWS });
  else if (v.id.startsWith("wpa"))
    add({ id: v.id, i: v.i, dur: v.dur, kind: "spacecraft", type: "Spacecraft activity", title: "Water processor cycle", priority: 1, module: "galley", top: ["wpa", "noise_galley"], bottom: ["hr", "stress"], rows: ["stress", "sleepq", "hrv"] });
  else if (v.kind === "attitude")
    add({ id: v.id, i: v.i, dur: v.dur, kind: "spacecraft", type: "Spacecraft activity", title: "Gyro desaturation burn", priority: 2, insight: lastBurn ? "stress-1042" : undefined, top: ["vib_work", "thr"], bottom: ["hr", "stress"], rows: STRESS_ROWS });
  else if (v.kind === "comms")
    add({ id: v.id, i: v.i + 1, time: "10:41", dur: v.dur, kind: "comms", type: "Communication", title: "Earth link dropout with caution tone", priority: 2, module: "command", insight: "stress-1042", top: ["link", "vib_work"], bottom: ["hr", "stress"], rows: STRESS_ROWS });
  else if (v.kind === "radiation")
    add({ id: v.id, i: v.i, dur: v.dur, kind: "environment", type: "Environmental change", title: "Minor solar particle event", priority: 2, top: ["rad"], bottom: ["hr", "stress"], rows: ["sleepq", "stress", "hrv"] });
}
add({ id: "stress-1042", i: idx(TODAY, 642), time: "10:42", dur: 3, kind: "other", type: "Unexpected physiological change", title: "Heart rate and stress rose during seated work", priority: 3, module: "work", insight: "stress-1042",
  top: ["vib_work", "link"], bottom: ["hr", "stress"], rows: STRESS_ROWS });
add({ id: `recov-${TODAY}`, i: idx(TODAY, 670), dur: 1, kind: "other", type: "Recovery", title: "Heart rate and stress back in your usual range", priority: 2, module: "work", insight: "stress-1042",
  top: ["vib_work", "link"], bottom: ["hr", "stress"], rows: STRESS_ROWS });
add({ id: "co2-lab", i: idx(TODAY, 960), dur: 9, kind: "environment", type: "Environmental change · forecast", title: "Lab CO₂ forecast to rise this afternoon", priority: 3, module: "lab", insight: "co2-lab", forecast: true,
  top: ["co2_lab", "cdra"], bottom: ["hrv", "stress"], rows: CO2_ROWS });
ev.sort((a, b) => a.i - b.i || (a.time ?? "").localeCompare(b.time ?? ""));

export const EVENTS: LabEvent[] = ev;
export const EVENT: Record<string, LabEvent> = Object.fromEntries(ev.map((e) => [e.id, e]));
export const DETECTED = ["sleep-0214", "stress-1042", "co2-lab", "exercise-hr"].map((id) => EVENT[id]);
export const eventTime = (e: LabEvent) => e.time ?? hhmm(minOf(e.i));
export const eventDay = (e: LabEvent) => (dayOf(e.i) === TODAY ? "Today" : dayOf(e.i) === TODAY - 1 ? "Yesterday" : `MD ${MD0 + dayOf(e.i)}`);
export const eventsIn = (i0: number, i1: number) => ev.filter((e) => e.i >= i0 && e.i <= i1);

/** Schedule blocks in a window, with the filter group each belongs to. */
export function blocksIn(i0: number, i1: number): { b: Block; i0: number; i1: number; kind: EventKind }[] {
  const out: { b: Block; i0: number; i1: number; kind: EventKind }[] = [];
  for (let d = Math.max(0, dayOf(i0)); d <= Math.min(TODAY, dayOf(i1)); d++)
    for (const b of SCHEDULE[d]) {
      const a = idx(d, b.start);
      const z = idx(d, b.end);
      if (z > i0 && a < i1) out.push({ b, i0: Math.max(a, i0), i1: Math.min(z, i1), kind: ACTIVITY_KIND[b.activity] });
    }
  return out;
}

// ---------------------------------------------------------------- plain words --
const r0 = (v: number) => Math.round(v);
const fanNights = NIGHTS.filter((n) => n.fanEvent);
const fanBroken = fanNights.filter((n) => n.quality < FACTS.sleepBaselineQ - 4).length;
export const LAG_LINE = {
  sleep: `Elevated cabin noise preceded reduced sleep continuity in ${fanBroken} of the last ${fanNights.length} observed events, by about 20 minutes each time.`,
  co2: `Raised lab CO₂ was followed by a slower evening reaction test on ${FACTS.pvtWeakN} of the last ${FACTS.pvtWeakN} observed days, about 7 hours later.`,
  stress: `A burn followed by a caution tone has been observed once. On ${FACTS.desatCount} earlier burns without a tone your heart rate rose by under 5 bpm.`,
  exercise: "Heart rate rose within 10 minutes of the start of every exercise session in the last 14 days, as expected.",
};
const shipAt = (e: LabEvent): string | undefined => {
  const near = VEHICLE_EVENTS.filter((v) => v.i <= e.i + 1 && v.i + Math.max(v.dur, 3) >= e.i - 3 && v.kind !== "radiation");
  if (!near.length) return undefined;
  return near.map((v) => `${hhmm(minOf(v.i))} ${v.label} (${v.module === "vehicle" ? "whole vehicle" : MOD[v.module].name}). ${SUBSYSTEM[v.system]?.crew ?? v.detail}`).join(" ");
};

export function detail(e: LabEvent): EventDetail {
  const d = dayOf(e.i);
  const hrB = r0(mean(S.hr, e.i - 3, e.i));
  const hrA = r0(maxIn(S.hr, e.i, Math.min(NOW + 1, e.i + Math.max(4, e.dur))));
  const stB = r0(mean(S.stress, e.i - 3, e.i));
  const stA = r0(maxIn(S.stress, e.i, Math.min(NOW + 1, e.i + Math.max(4, e.dur))));
  const small = hrA - hrB < 8 && stA - stB < 10;
  const noChange = { confidence: null, confWhy: "No health change was linked to this event, so there is nothing to rate.", contributor: undefined, others: [] as string[] };
  const x = e.insight ? INSIGHT[e.insight] : undefined;
  const ship = shipAt(e);

  // the four detected changes use their written analysis
  if (x && e.id === x.id) {
    return {
      expected: x.id === "exercise-hr" ? { label: "EXPECTED RESPONSE — EXERCISE", text: "Heart rate increased during scheduled exercise. This is consistent with the activity and does not indicate a spacecraft-related problem." } : undefined,
      happened: x.happened, changed: x.changed, contributor: x.id === "exercise-hr" ? undefined : x.contributor, info: x.info,
      others: x.alternatives.map((a) => a.label), confidence: x.confidence, confWhy: x.confidenceWhy.filter((c) => !c.good)[0]?.text ?? x.confidenceWhy[0].text,
      history: x.lagLine, ship,
    };
  }
  if (e.kind === "exercise") {
    const peaks = EVENTS.filter((o) => o.kind === "exercise" && o.i < e.i).slice(-10).map((o) => maxIn(S.hr, o.i, o.i + o.dur));
    const avg = peaks.length ? r0(peaks.reduce((s, v) => s + v, 0) / peaks.length) : hrA;
    return {
      expected: { label: "EXPECTED RESPONSE — EXERCISE", text: "Heart rate increased during scheduled exercise. This is consistent with the activity and does not indicate a spacecraft-related problem." },
      happened: `Scheduled exercise session from ${eventTime(e)} in the ${MOD.exercise.name.toLowerCase()}.`,
      changed: [`Heart rate rose from ${hrB} to a peak of ${hrA} bpm.`, `Breathing rate reached ${r0(maxIn(S.resp, e.i, e.i + e.dur))} per minute.`, `Vibration in the exercise bay reached ${r0(maxIn(S.vib_exercise, e.i, e.i + e.dur))} mg, within isolator limits.`],
      info: ["CO₂ and temperature in the exercise bay stayed within limits.", "No spacecraft activity coincided with the rise."], others: [], contributor: undefined,
      confidence: 0.95, confWhy: "The exercise device logged a session at the same time.",
      history: `Peak heart rate was within ${Math.abs(hrA - avg)} bpm of your average over the previous ${peaks.length || 1} sessions (${avg} bpm).`, ship,
    };
  }
  if (e.kind === "meal") {
    const g = P.glucose.find((p) => dayOf(p.i) === d && p.i > e.i && p.i < e.i + 12);
    return {
      expected: { label: "EXPECTED RESPONSE — MEAL", text: "A small rise in heart rate after eating is consistent with the meal and does not indicate a spacecraft-related problem." },
      happened: `${e.title} in the galley from ${eventTime(e)}.`,
      changed: [`Heart rate ${hrB} to ${hrA} bpm while eating.`, ...(g ? [`Blood glucose ${g.v} mg/dL after the meal, typical for you after eating.`] : [])],
      info: ["Galley CO₂ and noise stayed within limits."], ...noChange, confidence: 0.9, confWhy: "The schedule and galley sensors agree that this was a meal.",
      history: "Your heart rate rises by a few beats at most meals. No meal in the last 14 days was followed by an unusual response.", ship,
    };
  }
  if (e.kind === "comms" && e.id.startsWith("comm-") && e.id !== "comm-drop") {
    return {
      expected: small ? { label: "EXPECTED RESPONSE — SCHEDULED ACTIVITY", text: "Your signals stayed in the range that is usual for you during conferences." } : undefined,
      happened: `${e.title} on the command deck from ${eventTime(e)}.`,
      changed: [`Stress index ${stB} to ${stA}.`, `Heart rate ${hrB} to ${hrA} bpm.`],
      info: ["Earth link margin was healthy for the whole conference."], ...noChange, history: "Conferences have not been followed by a change in your sleep or recovery in the last 14 days.", ship,
    };
  }
  if (e.id === "comm-drop")
    return {
      happened: "The high-gain link to Earth dropped during the gyro desaturation burn. A caution tone sounded on the work deck and command deck for 20 seconds.",
      changed: INSIGHT["stress-1042"].changed, contributor: "Caution tone 1.2 m from your seat", info: INSIGHT["stress-1042"].info,
      others: ["Vibration from the burn", "Task difficulty", "Caffeine"], confidence: INSIGHT["stress-1042"].confidence, confWhy: "A single event. One occurrence cannot establish a pattern.", history: LAG_LINE.stress, ship,
    };
  if (e.kind === "medical" && e.id.startsWith("med-")) {
    const pv = P.pvt.find((p) => dayOf(p.i) === d && minOf(p.i) < 600);
    const gl = P.glucose.find((p) => dayOf(p.i) === d && minOf(p.i) < 600);
    return {
      expected: { label: "ROUTINE HEALTH CHECK", text: "Planned measurements. Shown so the readings on the chart have a source." },
      happened: `Morning health check in the medical bay from ${eventTime(e)}.`,
      changed: [...(pv ? [`Reaction test: ${pv.v} ms (your baseline is 246 ms).`] : []), ...(gl ? [`Fasting blood glucose: ${gl.v} mg/dL.`] : [])],
      info: [nightOf(d)?.fanEvent ? "The night before was interrupted, which often slows the morning reaction test." : "The night before was undisturbed."], ...noChange,
      history: "Morning reaction time is slower by about 20 ms after an interrupted night.", ship,
    };
  }
  if (e.id.startsWith("head-")) {
    const pk = maxIn(S.co2_lab, idx(d, 480), idx(d, 1100));
    return {
      happened: `You logged a headache at ${hhmm(minOf(e.i))}. This is your own entry, not a sensor reading.`,
      changed: ["Headache reported.", `Evening reaction test ${P.pvt.find((p) => p.i === idx(d, 1175))?.v ?? "–"} ms.`],
      contributor: `Lab CO₂ peaked at ${pk.toFixed(1)} mmHg earlier that day`, info: ["CO₂ removal was in single-bed mode.", "You worked in the lab for 3.5 hours that afternoon."],
      others: ["Long work block", "Dehydration", "Sleep debt"], confidence: INSIGHT["co2-lab"].confidence, confWhy: "Workload and CO₂ rose together on these days, so they cannot be fully separated.", history: LAG_LINE.co2, ship,
    };
  }
  if (e.id.startsWith("wake-") || e.id.startsWith("noise-") || e.id.startsWith("fan-")) {
    const n = nightOf(d)!;
    const base = { info: ["CO₂ in crew quarters remained stable.", "Temperature remained stable.", n.lateExercise ? "Exercise ended late the evening before." : "Exercise ended at the usual time the evening before.", "Stress indicators were within your usual range at bedtime."],
      others: ["Temperature variation", "Stress", "Normal sleep variability", ...(n.lateExercise ? ["Late exercise"] : [])], confidence: INSIGHT["sleep-0214"].confidence, confWhy: "Only 30 nights of data. Other explanations cannot be ruled out.", history: LAG_LINE.sleep, ship };
    if (e.id.startsWith("wake-"))
      return { ...base, happened: "Sleep interruption detected at about 02:14.", changed: [`Sleep continuity decreased. Sleep quality was ${n.quality}% against your usual ${FACTS.sleepBaselineQ}%.`, `${n.awakenings} awakenings that night.`],
        contributor: `Cabin noise rose from 47 to ${n.noisePeak} dBA about 20 minutes earlier` };
    if (e.id.startsWith("noise-"))
      return { ...base, happened: `Noise in crew quarters rose from 47 to ${n.noisePeak} dBA at about 01:52, above the sleep-area design level of about 50 dBA.`,
        changed: ["Movement increased within 20 minutes.", `Sleep quality that night was ${n.quality}% against your usual ${FACTS.sleepBaselineQ}%.`], contributor: "Ventilation fan B at high speed in the service module" };
    return { ...base, happened: "Scheduled regeneration of CO₂ removal bed B. Ventilation fan B ran at 3,400 rpm for 40 minutes in the service module, on the other side of your sleep-station wall.",
      changed: [`Crew quarters noise rose from 47 to ${n.noisePeak} dBA.`, "A sleep interruption followed about 20 minutes later."], contributor: "This activity is the potential contributor to the sleep interruption that followed" };
  }
  if (e.id.startsWith("co2-") || e.id.startsWith("scrub-")) {
    const pk = maxIn(S.co2_lab, idx(d, 480), Math.min(NOW + 1, idx(d, 1100)));
    const pv = P.pvt.find((p) => p.i === idx(d, 1175));
    return {
      happened: e.id.startsWith("scrub") ? "CO₂ removal ran in single-bed mode while bed A was baked out. Removal capacity was about 68% for the working day." : `Lab CO₂ rose to ${maxIn(S.co2_lab, e.i - 6, e.i + 6).toFixed(1)} mmHg at about 10:10 while two crew worked there.`,
      changed: [`Lab CO₂ peaked at ${pk.toFixed(1)} mmHg that day (1-hour limit 3.0).`, pv ? `Evening reaction test ${pv.v} ms against ${FACTS.pvtNormal} ms on other days.` : "Evening reaction test not yet taken.", ...(P.headache.some((h) => dayOf(h.i) === d) ? ["You logged a headache at 18:00."] : [])],
      contributor: "CO₂ build-up in the science lab", info: ["Noise and temperature in the lab remained stable.", "The same lab schedule on dual-bed days was followed by normal reaction times."],
      others: ["Long lab work blocks", "Sleep debt", "Poor local air mixing"], confidence: INSIGHT["co2-lab"].confidence, confWhy: "Ground studies have not found clear effects on thinking at these CO₂ levels.", history: LAG_LINE.co2, ship,
    };
  }
  if (e.id.startsWith("desat")) {
    const vib = r0(maxIn(S.vib_work, e.i, e.i + 2));
    const act = blockAt(e.i).activity;
    return {
      expected: small ? { label: "NO HEALTH CHANGE LINKED", text: "A routine attitude-control burn. Your signals stayed in your usual range." } : undefined,
      happened: "Gyro desaturation burn. Thrusters fired for about 90 seconds, felt as vibration in every module.",
      changed: [`Work deck vibration reached ${vib} mg.`, `Heart rate ${hrA - hrB >= 0 ? "+" : ""}${hrA - hrB} bpm while you were ${act === "sleep" ? "asleep" : act === "exercise" ? "exercising" : "working"}.`],
      info: ["No caution tone followed this burn."], ...noChange, history: LAG_LINE.stress, ship,
    };
  }
  if (e.id.startsWith("wpa"))
    return {
      expected: { label: "NO HEALTH CHANGE LINKED", text: "Routine equipment run. Shown so the rise in galley noise has an explanation." },
      happened: "Water processor cycle in the galley, about 90 minutes.", changed: [`Galley noise rose to ${r0(maxIn(S.noise_galley, e.i, e.i + e.dur))} dBA, about 4 dBA above its usual level.`, small ? "No change in your heart rate or stress index." : `Heart rate ${hrB} to ${hrA} bpm.`],
      info: ["You were not in the galley for most of the run."], ...noChange, history: "The water processor runs three times a day. None of its runs in the last 14 days was followed by a change in your health signals.", ship,
    };
  if (e.id === "spe")
    return {
      happened: "Minor solar particle event. Cabin dose rate peaked near 380 µSv/h for a few hours and the crew used the storm shelter.",
      changed: ["Cabin radiation dose rate rose for about 9 hours.", "No change in your heart rate, stress index or sleep quality that night."], info: ["Your cumulative dose stayed within mission limits."], ...noChange,
      history: "This is the only solar particle event of the last 30 days.", ship,
    };
  if (e.type === "Recovery")
    return {
      expected: { label: "RECOVERY — BACK IN YOUR USUAL RANGE", text: "Your body settled within 30 minutes. A quick return to baseline is a healthy response." },
      happened: "Heart rate and stress index returned to your usual range by 11:10.", changed: [`Heart rate back to ${r0(mean(S.hr, e.i, e.i + 3))} bpm.`, `Stress index back to ${r0(mean(S.stress, e.i, e.i + 3))}.`],
      info: ["The link to Earth recovered at 11:00.", "No further burn is planned today."], ...noChange, confidence: 0.9, confWhy: "Measured directly by the biosensor garment.", history: "After the last 6 burns your heart rate settled within 10 minutes. Today took 28 minutes.", ship,
    };
  return { happened: e.title, changed: [`Heart rate ${hrB} to ${hrA} bpm.`], info: [], ...noChange, history: "No repeating pattern found for this kind of event.", ship };
}

/** The same kind of event on earlier days, with what your body did each time. */
export function recurrence(e: LabEvent): { cols: [string, string]; rows: { id: string; label: string; a: string; b: string; hit: boolean }[] } {
  const same = EVENTS.filter((o) => o.type === e.type && o.title === e.title && o.i <= NOW && o.i > e.i - PER_DAY * 14 && o.i <= e.i).slice(-8).reverse();
  return {
    cols: ["Around the event", "Your heart rate"],
    rows: same.map((o) => {
      const b = r0(mean(S.hr, o.i - 3, o.i));
      const a = r0(maxIn(S.hr, o.i, Math.min(NOW + 1, o.i + Math.max(4, o.dur))));
      const blk = blockAt(o.i);
      return { id: o.id, label: `MD ${MD0 + dayOf(o.i)} · ${hhmm(minOf(o.i))}`, a: `${blk.label.split(" · ")[0]} in ${MOD[blk.module].short}`, b: `${b} to ${a} bpm`, hit: o.id === e.id };
    }),
  };
}
