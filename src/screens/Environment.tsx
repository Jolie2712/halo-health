import { useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Segmented, TimeChart, StatusDot, Spark, seriesSlice, Provenance, ENV_WORD, Confidence, Terms, Term, Glance, More, Dir, Disclose } from "../ui";
import { ENV_META, envStatus, SIG, FACTS, INSIGHT, GLANCE, REC_SHORT } from "../data/content";
import { readings } from "../data/derive";
import { S, P, NOW, PER_DAY, TODAY, idx, MODULES, MOD, ENV_PARAMS, baseline, mean, maxIn, NIGHTS, type EnvParam, type ModuleId, CREW_NOW } from "../data/sim";

const COLORS = ["#c8642a", "#2f64c7", "#16857f"];
const RANGES = { "Today + forecast": [idx(TODAY, 0), idx(TODAY + 1, 0)], "24 hours": [NOW - PER_DAY, NOW], "7 days": [NOW - PER_DAY * 7, NOW], "30 days": [0, NOW] } as const;

type Link = {
  id: string; param: EnvParam; module: ModuleId; effect: "Likely affecting you" | "May affect you later" | "Possibly affected you" | "No effect seen";
  env: string; envLabel: string; health: string; healthLabel: string; metric: string;
  envSpark: number[]; healthSpark: number[]; healthColor: string;
  text: string; ship: string; insight?: string; confidence?: number;
  a: string; aDir: string; b: string; bDir: string; // short pair shown first, e.g. Noise ↑ → Sleep ↓
};
function links(): Link[] {
  const rd = readings();
  const ln = FACTS.lastNight;
  const q = "quarters";
  const here = CREW_NOW.rivera.module;
  return [
    { a: "Noise", aDir: "up", b: "Sleep", bDir: "down", id: "noise", param: "noise", module: q, effect: "Likely affecting you", insight: "sleep-0214", confidence: INSIGHT["sleep-0214"].confidence,
      envLabel: "Noise in crew quarters, peak last night", env: `${ln.noisePeak} dBA`, healthLabel: "Sleep quality", health: `${ln.quality}%`, metric: "sleep",
      envSpark: NIGHTS.slice(-14).map((n) => n.noisePeak), healthSpark: NIGHTS.slice(-14).map((n) => n.quality), healthColor: "#2f64c7",
      text: `Noise rose from 47 to ${ln.noisePeak} dBA about 20 minutes before your sleep was interrupted at 02:14. Sleep quality was ${ln.quality}% against your usual ${FACTS.sleepBaselineQ}%. Sleep areas are designed for about 50 dBA.`,
      ship: "Ventilation fan B ran at high speed from 01:50 to 02:30 for a scheduled CO₂ removal bed regeneration, on the other side of your sleep-station wall." },
    { a: "Lab CO₂", aDir: "up", b: "Evening reaction speed", bDir: "down", id: "co2", param: "co2", module: "lab", effect: "May affect you later", insight: "co2-lab", confidence: INSIGHT["co2-lab"].confidence,
      envLabel: "CO₂ in the science lab, forecast peak", env: `${FACTS.labForecastPeak.toFixed(1)} mmHg`, healthLabel: "Evening reaction time on such days", health: `${FACTS.pvtWeak} ms`, metric: "pvt",
      envSpark: seriesSlice("co2_lab", NOW - PER_DAY * 7, NOW + 1, 40), healthSpark: P.pvt.filter((x) => x.i % PER_DAY > 600).slice(-10).map((x) => x.v), healthColor: "#7557bd",
      text: `On days when lab CO₂ stayed above 3.0 mmHg, your evening reaction test averaged ${FACTS.pvtWeak} ms against ${FACTS.pvtNormal} ms on other days, and you logged a headache on ${FACTS.headacheN} of them. Possible effects: slower cognitive performance and headache this evening.`,
      ship: "CO₂ removal is in single-bed mode until 20:00 while bed A is baked out. Two people are planned in the lab from 15:30." },
    { a: "Vibration", aDir: "up", b: "Stress", bDir: "up", id: "vib", param: "vib", module: "work", effect: "Possibly affected you", insight: "stress-1042", confidence: INSIGHT["stress-1042"].confidence,
      envLabel: "Vibration on the work deck at 10:40", env: `${FACTS.vibPeak} mg`, healthLabel: "Stress index, peak at 10:42", health: `${FACTS.stressPeak}`, metric: "stress",
      envSpark: seriesSlice("vib_work", NOW - 36, NOW + 1, 36), healthSpark: seriesSlice("stress", NOW - 36, NOW + 1, 36), healthColor: "#9a4f9e",
      text: `Your heart rate rose from ${FACTS.hrBefore} to ${FACTS.hrPeak} bpm and your stress index from ${FACTS.stressBefore} to ${FACTS.stressPeak} during seated work. Both were back in your usual range by 11:10, which is a healthy recovery.`,
      ship: "A gyro desaturation burn shook the structure for 90 seconds and was followed by a link-dropout caution tone 1.2 m from your seat." },
    { a: "Temperature", aDir: "flat", b: "Recovery", bDir: "flat", id: "temp", param: "temp", module: q, effect: "No effect seen",
      envLabel: "Temperature in crew quarters overnight", env: `${mean(S.temp_quarters, idx(TODAY, 0), idx(TODAY, 390)).toFixed(1)} °C`, healthLabel: "Recovery (HRV) this morning", health: `${rd.hrv.value} ms`, metric: "hrv",
      envSpark: seriesSlice("temp_quarters", NOW - PER_DAY * 3, NOW + 1, 40), healthSpark: seriesSlice("hrv", NOW - PER_DAY * 3, NOW + 1, 40), healthColor: "#2f64c7",
      text: "Sleep-station temperature stayed within 0.2 °C all night, inside the range most people sleep well in. It does not explain last night's interruption or this morning's lower recovery.",
      ship: "Thermal control is nominal. Coolant pump A speeds up briefly with fan B but did not change cabin temperature." },
    { a: "Humidity", aDir: "flat", b: "Breathing", bDir: "flat", id: "hum", param: "hum", module: here, effect: "No effect seen",
      envLabel: `Humidity on the ${MOD[here].name.toLowerCase()}`, env: `${S[`hum_${here}`][NOW].toFixed(0)}%`, healthLabel: "Breathing rate", health: `${rd.resp.value} /min`, metric: "resp",
      envSpark: seriesSlice(`hum_${here}`, NOW - PER_DAY, NOW + 1, 40), healthSpark: seriesSlice("resp", NOW - PER_DAY, NOW + 1, 40), healthColor: "#3d8fd1",
      text: "Humidity is in the comfortable band. Very dry air can irritate eyes and airways and very humid air makes exercise recovery harder. Neither applies today.",
      ship: "Condensate collection and the water processor are running on their normal schedule." },
    { a: "Light", aDir: "flat", b: "Fatigue", bDir: "flat", id: "light", param: "light", module: here, effect: "No effect seen",
      envLabel: `Light on the ${MOD[here].name.toLowerCase()}`, env: `${S[`light_${here}`][NOW].toFixed(0)} lux`, healthLabel: "Fatigue estimate", health: `${rd.fatigue.value} /100`, metric: "fatigue",
      envSpark: seriesSlice(`light_${here}`, NOW - PER_DAY, NOW + 1, 40), healthSpark: seriesSlice("fatigue", NOW - PER_DAY, NOW + 1, 40), healthColor: "#55667d",
      text: "Daytime lighting is bright and blue-enriched, which supports alertness. Lights dim and warm from 20:30 to protect your body clock before sleep. Your higher fatigue today follows the short night, not the lighting.",
      ship: "The lighting schedule is running as planned in every module." },
  ];
}
const EFFECT_TONE = { "Likely affecting you": "amber", "May affect you later": "amber", "Possibly affected you": "blue", "No effect seen": "green" } as const;

export default function Environment() {
  const app = useApp();
  const [p0, m0] = (app.route.param ?? "co2-lab").split("-");
  const [param, setParam] = useState<EnvParam>((ENV_PARAMS as readonly string[]).includes(p0) ? (p0 as EnvParam) : "co2");
  const [mods, setMods] = useState<ModuleId[]>(() => {
    const first = (m0 as ModuleId) && MOD[m0 as ModuleId] ? (m0 as ModuleId) : "lab";
    return first === "quarters" ? ["quarters", "service"] : [first, "quarters"];
  });
  const [range, setRange] = useState<keyof typeof RANGES>("Today + forecast");
  const [hover, setHover] = useState<number | null>(null);
  const [raw, setRaw] = useState(!!app.route.param);
  const cards = links();
  const meta = ENV_META[param];
  const here = CREW_NOW.rivera.module;
  const vals = MODULES.map((m) => ({ m, v: S[`${param}_${m.id}`][NOW], base: baseline(`${param}_${m.id}`, NOW, 3) }));
  const max = Math.max(meta.hi, ...vals.map((x) => x.v));
  const toggle = (id: ModuleId) => setMods(mods.includes(id) ? (mods.length > 1 ? mods.filter((x) => x !== id) : mods) : mods.length >= 3 ? [...mods.slice(1), id] : [...mods, id]);
  const [i0, i1] = RANGES[range];
  const display = (v: number) => (param === "co2" && app.settings.co2Unit === "ppm" ? `${Math.round((v / 760) * 1e6).toLocaleString()} ppm` : `${v.toFixed(meta.dec)} ${meta.unit}`);

  const showRaw = (c: Link) => { setParam(c.param); setMods(c.module === "quarters" ? ["quarters", "service"] : [c.module, "quarters"]); setRaw(true); window.setTimeout(() => document.getElementById("raw-env")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };

  return (
    <div className="grid">
      <Glance tone="watch" label={`Environment and my health · you are on the ${MOD[here].name.toLowerCase()}`}
        title={<>Noise <Dir d="up" /> is likely affecting your sleep</>}
        sub="2 other links to watch. 3 conditions show no effect."
        cells={[
          { k: "Later today", v: <>Lab CO₂ <Dir d="up" /> at 16:40</>, sub: "May slow evening reactions", onClick: () => app.go("workspace", "co2-lab") },
          { k: "What to do", v: REC_SHORT["shift-regen"].do, sub: REC_SHORT["shift-regen"].benefit, primary: true, onClick: () => app.go("actions", "shift-regen") },
        ]} />
      <div className="envlinks">
        {cards.filter((c) => c.insight).map((c) => (
          <Panel key={c.id} className={`envlink e-${EFFECT_TONE[c.effect]}`}>
            <div className="row between wrap">
              <Tag tone={EFFECT_TONE[c.effect]}>{c.effect.toUpperCase()}</Tag>
              {c.confidence != null && <Confidence value={c.confidence} />}
            </div>
            <div className="envlink-pair">
              <button onClick={() => showRaw(c)} title="Show the raw readings">
                <span className="tile-name"><Terms>{c.a}</Terms><Dir d={c.aDir} /></span>
                <strong>{c.env}</strong>
                <Spark data={c.envSpark} height={24} color="#b77912" />
              </button>
              <Icon name="arrow" size={18} />
              <button onClick={() => app.go("health", c.metric)} title="Open in My health">
                <span className="tile-name"><Terms>{c.b}</Terms><Dir d={c.bDir} /></span>
                <strong>{c.health}</strong>
                <Spark data={c.healthSpark} height={24} color={c.healthColor} />
              </button>
            </div>
            <p className="envlink-one">{GLANCE[c.insight!].click}</p>
            {INSIGHT[c.insight!].recs[0] && (
              <button className="secondary wide" onClick={() => app.go("actions", INSIGHT[c.insight!].recs[0])}>
                <span><small>What to do</small>{REC_SHORT[INSIGHT[c.insight!].recs[0]].do}</span><Icon name="arrow" />
              </button>
            )}
            <More label="Why">
              <p>{c.text}</p>
              <p className="ship-ctx-line"><Icon name="bolt" size={13} /> <b>Spacecraft activity:</b> {c.ship}</p>
              <div className="btns">
                <button className="secondary" onClick={() => app.go("workspace", c.insight)}><Icon name="link" /> See the event</button>
                <button className="secondary" onClick={() => app.go("insights", c.insight)}><Icon name="trend" /> See the trend</button>
              </div>
            </More>
          </Panel>
        ))}
      </div>
      <Panel>
        <Head title="No effect seen" right={<Tag tone="green">3 CONDITIONS</Tag>} />
        <div className="disc-list flush">
          {cards.filter((c) => !c.insight).map((c) => (
            <Disclose key={c.id} k={`${c.a} and ${c.b.toLowerCase()}`} v={<>{c.env} · {c.b} {c.health}</>}>
              <p>{c.text}</p>
              <p className="ship-ctx-line"><Icon name="bolt" size={13} /> <b>Spacecraft activity:</b> {c.ship}</p>
              <div className="btns"><button className="secondary" onClick={() => showRaw(c)}>Raw readings</button><button className="secondary" onClick={() => app.go("health", c.metric)}>Open in My health</button></div>
            </Disclose>
          ))}
        </div>
      </Panel>

      <button id="raw-env" className="raw-toggle" aria-expanded={raw} onClick={() => setRaw(!raw)}>
        <Icon name="chevron" /> {raw ? "Hide raw cabin readings" : "Raw cabin readings, every module"}
      </button>
      {raw && (<>
      <Panel>
        <Head title="Cabin conditions now" right={<span className="updated">Pick a cell to compare</span>} />
        <div className="heat" role="table" aria-label="Environmental conditions by module">
          <div className="heat-row head" role="row">
            <span />
            {ENV_PARAMS.map((p) => (
              <button key={p} className={param === p ? "active" : ""} onClick={() => setParam(p)}><Terms>{ENV_META[p].label}</Terms><small>{ENV_META[p].unit}</small></button>
            ))}
          </div>
          {MODULES.map((m) => (
            <div className={`heat-row ${mods.includes(m.id) ? "picked" : ""}`} role="row" key={m.id}>
              <button className="heat-name" onClick={() => { app.setFocus({ module: m.id }); app.go("ship"); }}>
                {m.name} {here === m.id && <Tag tone="blue">YOU</Tag>}
              </button>
              {ENV_PARAMS.map((p) => {
                const v = S[`${p}_${m.id}`][NOW];
                const st = envStatus(p, m.id, v);
                return (
                  <button key={p} role="cell" className={`heat-cell st-${st} ${param === p && mods.includes(m.id) ? "sel" : ""}`} title={`${m.name} · ${ENV_META[p].label}: ${ENV_WORD[st]}`}
                    onClick={() => { setParam(p); if (!mods.includes(m.id)) toggle(m.id); }}>
                    {v.toFixed(ENV_META[p].dec)}
                    {st !== "ok" && <StatusDot s={st} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid cols-main">
        <Panel>
          <Head title={<Terms>{`${meta.label} over time`}</Terms>}
            right={<Segmented options={Object.keys(RANGES) as (keyof typeof RANGES)[]} value={range} onChange={setRange} compact label="Range" />} />
          <div className="chips">
            {MODULES.map((m) => {
              const k = mods.indexOf(m.id);
              return (
                <button key={m.id} className={`chip small ${k >= 0 ? "active" : ""}`} aria-pressed={k >= 0} onClick={() => toggle(m.id)} style={k >= 0 ? { borderColor: COLORS[k], color: COLORS[k], background: "transparent" } : undefined}>
                  {k >= 0 && <i className="sw" style={{ background: COLORS[k] }} />} {m.short}
                </button>
              );
            })}
          </div>
          <TimeChart series={mods.map((m, k) => ({ id: `${param}_${m}`, color: COLORS[k], label: MOD[m].name }))} i0={i0} i1={i1} hover={hover} onHover={setHover}
            showForecast={range === "Today + forecast"} height={250} shadeSleep limit={param === "co2" ? { v: 3, label: "1-hour limit 3.0 mmHg" } : undefined} />
          <div className="row between wrap chart-foot">
            <Provenance id={`${param}_${mods[0]}`} />
            <span className="muted small">{meta.note}</span>
          </div>
          <div className="btns">
            <button className="secondary" onClick={() => { app.setPreset({ top: mods.slice(0, 2).map((m) => `${param}_${m}`), bottom: ["hr", "hrv"], days: 1, end: NOW }); app.go("workspace"); }}>
              <Icon name="link" /> Compare with my health
            </button>
          </div>
        </Panel>
        <Panel>
          <Head title={`${meta.label} by module`} />
          <div className="hbars">
            {vals.sort((a, b) => b.v - a.v).map(({ m, v, base }) => {
              const st = envStatus(param, m.id, v);
              return (
                <button key={m.id} className={mods.includes(m.id) ? "picked" : ""} onClick={() => toggle(m.id)}>
                  <span>{m.short}</span>
                  <div className="hbar">
                    <i className={`st-${st}`} style={{ width: `${(v / max) * 100}%` }} />
                    <em style={{ left: `${(base / max) * 100}%` }} title={`Usual: ${base.toFixed(meta.dec)}`} />
                  </div>
                  <b>{display(v)}</b>
                </button>
              );
            })}
          </div>
          <p className="footnote"><i className="base-tick" /> = usual at this hour</p>
        </Panel>
      </div>

      <Panel>
        <Head eyebrow="Whole vehicle" title="Atmosphere and radiation" />
        <div className="tiles four">
          {[
            { id: "pressure", note: "Target 101.3 kPa", st: "ok" as const },
            { id: "ppo2", note: "Target 19.5–23.1 kPa", st: "ok" as const },
            { id: "rad", note: "Typical for interplanetary cruise", st: "ok" as const },
            { id: "cdra", note: "Single-bed mode until 20:00", st: "watch" as const },
          ].map((x) => (
            <button key={x.id} className={`tile st-${x.st}`} onClick={() => { app.setPreset({ top: [x.id], bottom: ["resp", "spo2"], days: 7, end: NOW }); app.go("workspace"); }}>
              <div className="tile-top"><span>{SIG[x.id].label}</span><StatusDot s={x.st} /></div>
              <div className="tile-value">{S[x.id][NOW].toFixed(SIG[x.id].dec)} <small>{SIG[x.id].unit}</small></div>
              <div className="tile-delta">{x.note}</div>
              <Spark data={seriesSlice(x.id, NOW - PER_DAY * 7, NOW + 1, 60)} color="#55667d" />
            </button>
          ))}
        </div>
      </Panel>
      </>)}
    </div>
  );
}
