import { useMemo, useState } from "react";
import { useApp, type Screen } from "../store";
import { Icon, Tag, Panel, Head, Segmented, TimeChart, Ev, Toggle, EmptyState, StatusDot, Schematic, ENV_WORD, STATUS_TONE, Glance, More, Dir, Disclose, Fact, Confidence } from "../ui";
import { EVENT, EVENTS, KIND, KINDS, eventTime, detail, type EventKind } from "../data/events";
import {
  ALERTS, EVIDENCE, SIGNALS, SIG, REFERENCES, ASSUMPTIONS, INSIGHT, INSIGHTS, REC, REC_STATUS, FACTS, READINESS, ENV_META, envStatus, GLOSSARY, GLANCE, REC_SHORT, type Evidence, lc } from "../data/content";
import {
  S, P, NOW, PER_DAY, TODAY, idx, NIGHTS, MODULES, MOD, mean, maxIn, baseline, CREW, CREW_NOW, DESAT_EVENTS, FAN_NIGHTS, WEAK_SCRUB_DAYS, MD0, SCHEDULE,
  blockAt, fmtIdx, type ModuleId,
} from "../data/sim";
import { moduleStatus } from "./Ship";

// =========================================================================== ALERTS
const LEVEL = {
  critical: { label: "Critical", desc: "Requires immediate attention", tone: "red" },
  important: { label: "Important", desc: "Could affect health, performance or operations", tone: "amber" },
  info: { label: "Informational", desc: "Worth knowing, no action required", tone: "blue" },
} as const;
const TYPE = { safety: "SAFETY", insight: "HUMAN-PERFORMANCE INSIGHT", routine: "ROUTINE" } as const;

export function Alerts() {
  const app = useApp();
  const [tab, setTab] = useState<"Active" | "Acknowledged" | "All">("Active");
  const [type, setType] = useState<"All types" | "Safety" | "Human-performance" | "Routine">("All types");
  const typed = ALERTS.filter((a) => type === "All types" || (type === "Safety" && a.type === "safety") || (type === "Human-performance" && a.type === "insight") || (type === "Routine" && a.type === "routine"));
  const isAck = (id: string) => app.ack.includes(id);
  const active = typed.filter((a) => !a.resolved && !isAck(a.id));
  const acked = typed.filter((a) => a.resolved || isAck(a.id));
  const list = tab === "Active" ? active : tab === "Acknowledged" ? acked : typed;
  const nCrit = ALERTS.filter((a) => !a.resolved && !isAck(a.id) && a.level === "critical").length;
  const nImp = ALERTS.filter((a) => !a.resolved && !isAck(a.id) && a.level === "important").length;
  const bpDue = !isAck("a-bp");
  return (
    <div className="grid">
      <Glance tone={nCrit ? "high" : nImp ? "watch" : "ok"} label="Alerts" title={nCrit ? `${nCrit} critical` : "No critical alerts"}
        sub={`${nImp} important · ${ALERTS.filter((a) => !a.resolved && !isAck(a.id) && a.level === "info").length} informational`}
        cells={[
          ...(nImp ? [{ k: "Most important", v: <>Lab CO₂ <Dir d="up" /> forecast 16:40</>, sub: "Above the 1-hour limit", onClick: () => app.go("workspace", "co2-lab") }] : []),
          ...(bpDue ? [{ k: "Next deadline", v: "Blood pressure before 14:00", sub: "8 min", primary: true, onClick: () => app.go("checkin", "bp") }] : []),
        ]} />
      <Panel pad={false}>
        <div className="tab-bar">
          {(["Active", "Acknowledged", "All"] as const).map((x) => (
            <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>
              {x} <span>{x === "Active" ? active.length : x === "Acknowledged" ? acked.length : typed.length}</span>
            </button>
          ))}
        </div>
        {(["critical", "important", "info"] as const).map((lv) => {
          const rows = list.filter((a) => a.level === lv);
          if (!rows.length && !(lv === "critical" && tab === "Active")) return null;
          return (
            <div key={lv} className="alert-group">
              <div className="alert-group-head"><Tag tone={LEVEL[lv].tone}>{LEVEL[lv].label.toUpperCase()}</Tag></div>
              {!rows.length && <p className="muted pad-x">None active.</p>}
              {rows.map((a) => (
                <div className={`alert-row lv-${a.level} ${a.resolved || isAck(a.id) ? "acked" : ""}`} key={a.id}>
                  <span className="severity" />
                  <div>
                    <div className="row wrap"><Tag tone={a.type === "safety" ? "neutral" : a.type === "insight" ? "violet" : "blue"}>{TYPE[a.type]}</Tag><time>{a.time}</time>{a.resolved && <Tag tone="green">CLOSED</Tag>}</div>
                    <h3>{a.title}</h3>
                    <p>{a.desc}</p>
                  </div>
                  <div className="alert-actions">
                    <button className="secondary" onClick={() => app.go(a.link.screen as Screen, a.link.param)}>Open <Icon name="arrow" size={14} /></button>
                    {!a.resolved && (isAck(a.id) ? <button className="quiet" onClick={() => app.unackAlert(a.id)}>Undo</button> : <button className="quiet" onClick={() => { app.ackAlert(a.id); app.toast("Acknowledged. It stays in the mission record."); }}><Icon name="check" size={14} /> Acknowledge</button>)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {!list.length && <EmptyState title={tab === "Active" ? "You're caught up" : "Nothing here yet"}><button className="secondary" onClick={() => { setTab("All"); setType("All types"); }}>View all alerts</button></EmptyState>}
      </Panel>
      <Panel>
        <More label="What the labels mean">
          <div className="facts">
            <Fact k="Safety" icon="shield"><p className="about-p">Vehicle or cabin near a crew-protection limit. Fixed thresholds.</p></Fact>
            <Fact k="Human-performance insight" icon="search"><p className="about-p">A change in you that may be linked to the cabin. An interpretation, never an alarm.</p></Fact>
            <Fact k="Routine" icon="clipboard"><p className="about-p">A planned health task that is due.</p></Fact>
          </div>
        </More>
      </Panel>
    </div>
  );
}

// ========================================================================== HISTORY
const MODES = ["Day log", "Today vs yesterday", "Sleep periods", "Environment vs baseline", "Same activity", "Same module", "Same spacecraft event"] as const;
function Bars({ rows, unit, max, onPick, picked }: { rows: { label: string; v: number; hit?: boolean; note?: string; sim?: boolean }[]; unit: string; max?: number; onPick?: (k: number) => void; picked?: number }) {
  const hi = max ?? Math.max(...rows.map((r) => r.v)) * 1.1;
  return (
    <div className="bars">
      {rows.map((r, k) => (
        <button key={k} className={`${r.hit ? "hit" : ""} ${picked === k ? "picked" : ""} ${r.sim ? "sim" : ""}`} onClick={() => onPick?.(k)} title={`${r.label}: ${r.v}${unit}${r.note ? ` · ${r.note}` : ""}`}>
          <b>{r.v}{unit}</b>
          <span style={{ height: `${(r.v / hi) * 100}%` }} />
          <small>{r.label}</small>
        </button>
      ))}
    </div>
  );
}

export function History() {
  const app = useApp();
  const start = app.route.param === "co2-lab" ? "Same activity" : app.route.param === "stress-1042" ? "Same spacecraft event" : app.route.param === "sleep-0214" ? "Sleep periods" : "Day log";
  const [mode, setMode] = useState<(typeof MODES)[number]>(start);
  const [sig, setSig] = useState("hrv");
  const [hover, setHover] = useState<number | null>(null);
  const [day, setDay] = useState(TODAY);
  const [kinds, setKinds] = useState<EventKind[]>([]);
  const [filt, setFilt] = useState(false);
  const [routine, setRoutine] = useState(false);
  const [moreModes, setMoreModes] = useState(!(MODES.slice(0, 3) as readonly string[]).includes(start));
  const [night, setNight] = useState(13);
  const [mod, setMod] = useState<ModuleId>("quarters");
  const [par, setPar] = useState<"co2" | "noise" | "vib" | "temp">("noise");
  const [evt, setEvt] = useState<"Fan cycle during sleep" | "Gyro desaturation burn">("Fan cycle during sleep");
  const nights = NIGHTS.slice(-14);
  const regen = ["approved", "scheduled", "done"].includes(app.recStatus("shift-regen"));
  const nightRows = [
    ...nights.map((n) => ({ label: `${MD0 + n.day}`, v: n.quality, hit: n.fanEvent, note: n.fanEvent ? "fan cycle ran" : "" })),
    ...Array.from({ length: app.nights }, (_, k) => ({ label: `${185 + k}`, v: regen ? [85, 87, 86][k] : app.recStatus("swap-station") === "accepted" ? [78, 80, 79][k] : [70, 72, 71][k], sim: true, note: "simulated future night" })),
  ];
  const n = nights[Math.min(night, nights.length - 1)];
  const yN = NIGHTS[NIGHTS.length - 2];
  const deltas = [
    ["Sleep duration", `${(FACTS.lastNight.durationMin / 60).toFixed(1)} h`, `${(yN.durationMin / 60).toFixed(1)} h`, FACTS.lastNight.durationMin < yN.durationMin - 15],
    ["Sleep quality", `${FACTS.lastNight.quality}%`, `${yN.quality}%`, FACTS.lastNight.quality < yN.quality - 4],
    ["Morning reaction time", "268 ms", `${P.pvt[P.pvt.length - 3].v} ms`, 268 > P.pvt[P.pvt.length - 3].v + 10],
    ["HRV 09:00–11:00", `${mean(S.hrv, idx(TODAY, 540), idx(TODAY, 660)).toFixed(0)} ms`, `${mean(S.hrv, idx(TODAY - 1, 540), idx(TODAY - 1, 660)).toFixed(0)} ms`, mean(S.hrv, idx(TODAY, 540), idx(TODAY, 660)) < mean(S.hrv, idx(TODAY - 1, 540), idx(TODAY - 1, 660)) - 3],
    ["Peak stress index", `${maxIn(S.stress, idx(TODAY, 400), NOW).toFixed(0)}`, `${maxIn(S.stress, idx(TODAY - 1, 400), NOW - PER_DAY).toFixed(0)}`, maxIn(S.stress, idx(TODAY, 400), NOW) > maxIn(S.stress, idx(TODAY - 1, 400), NOW - PER_DAY) + 8],
    ["Lab CO₂ peak (morning)", `${maxIn(S.co2_lab, idx(TODAY, 480), NOW).toFixed(1)} mmHg`, `${maxIn(S.co2_lab, idx(TODAY - 1, 480), NOW - PER_DAY).toFixed(1)} mmHg`, maxIn(S.co2_lab, idx(TODAY, 480), NOW) > 3],
  ] as const;
  const sessions = useMemo(() => {
    const out: { label: string; hr: number; vib: number; late: boolean }[] = [];
    for (let d = TODAY - 1; d > TODAY - 15; d--) {
      const b = SCHEDULE[d].find((x) => x.activity === "exercise");
      if (!b) continue;
      out.push({ label: `${MD0 + d}`, hr: Math.round(maxIn(S.hr, idx(d, b.start), idx(d, b.end))), vib: +maxIn(S.vib_galley, idx(d, b.start), idx(d, b.end)).toFixed(1), late: b.start >= 1170 });
    }
    return out.reverse();
  }, []);
  const overVib = sessions.filter((s) => s.vib > 5).length;
  const modDays = Array.from({ length: 14 }, (_, k) => TODAY - 13 + k).map((d) => ({
    label: `${MD0 + d}`, v: +maxIn(S[`${par}_${mod}`], idx(d, 0), Math.min(NOW, idx(d + 1, 0))).toFixed(par === "co2" ? 1 : 0),
    hit: envStatus(par, mod, maxIn(S[`${par}_${mod}`], idx(d, 0), Math.min(NOW, idx(d + 1, 0)))) !== "ok",
  }));
  const fanRows = [...FAN_NIGHTS].sort((a, b) => b - a).map((d) => {
    const nn = NIGHTS.find((x) => x.day === d)!;
    return { when: `MD ${MD0 + d} · 01:50`, a: `${nn.noisePeak} dBA in quarters`, b: `Awake within 25 min · quality ${nn.quality}%` };
  });
  const burnRows = DESAT_EVENTS.slice(-6).reverse().map((i) => {
    const before = mean(S.hr, i - 3, i);
    const after = maxIn(S.hr, i, i + 4);
    const act = blockAt(i).activity;
    return { when: fmtIdx(i, true), a: `${maxIn(S.vib_work, i, i + 2).toFixed(0)} mg · you were ${act === "sleep" ? "asleep" : act === "exercise" ? "exercising" : "working"}`, b: `Heart rate ${after - before > 0 ? "+" : ""}${(after - before).toFixed(0)} bpm${i === DESAT_EVENTS[DESAT_EVENTS.length - 1] ? " · with caution tone" : ""}` };
  });
  const learned = [
    ...Object.entries(app.hyp).map(([id, h]) => ({ at: h.savedAt, text: `Your input on “${EVENT[id]?.title ?? INSIGHT[id]?.title ?? "an event"}”: ${h.factors.join(", ") || h.flag || (h.note ? "hypothesis added" : "rating given")}`, go: () => app.go("workspace", id) })),
    ...Object.entries(app.recs).flatMap(([id, r]) => r.log.map((l) => ({ at: l.at, text: `${REC_STATUS[l.status].label.toLowerCase()}: ${REC[id].title}`, go: () => app.go("actions", id) }))),
    ...app.logs.map((l) => ({ at: l.at, text: `You logged ${l.label.toLowerCase()}: ${l.value}`, go: () => app.go("checkin") })),
  ];

  return (
    <div className="grid">
      <Glance tone="watch" label="My health history · today" title="3 changes worth a look"
        sub={<>Sleep <Dir d="down" /> · Heart rate and stress <Dir d="up" /> · Lab CO₂ <Dir d="up" /> forecast</>} />
      <div className="row wrap between">
        <Segmented options={MODES.slice(0, 3)} value={mode as "Day log"} onChange={setMode} label="View" />
        <button className={`secondary filter-btn ${moreModes ? "on" : ""}`} aria-expanded={moreModes} onClick={() => setMoreModes(!moreModes)}><Icon name="plus" size={16} /> More comparisons</button>
      </div>
      {moreModes && <div className="chips">{MODES.slice(3).map((m) => <button key={m} className={`chip ${mode === m ? "active" : ""}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>)}</div>}

      {mode === "Day log" && (() => {
        const all = EVENTS.filter((e) => Math.floor(e.i / PER_DAY) === day && (!kinds.length || kinds.includes(e.kind)));
        const list = routine || kinds.length ? all : all.filter((e) => e.priority >= 2);
        const nt = NIGHTS.find((q) => q.day === day);
        return (
          <Panel>
            <div className="row between wrap">
              <div className="row">
                <button className="icon-button" aria-label="Previous day" disabled={day <= 1} onClick={() => setDay(day - 1)}><Icon name="back" /></button>
                <div className="daylabel"><strong>Mission day {MD0 + day}</strong><span>{day === TODAY ? "Today" : day === TODAY - 1 ? "Yesterday" : `${TODAY - day} days ago`}{nt ? ` · sleep quality ${nt.quality}%` : ""}</span></div>
                <button className="icon-button" aria-label="Next day" disabled={day >= TODAY} onClick={() => setDay(day + 1)}><Icon name="chevron" /></button>
                {day !== TODAY && <button className="chip small" onClick={() => setDay(TODAY)}>Today</button>}
              </div>
              <button className={`secondary filter-btn ${filt ? "on" : ""}`} aria-expanded={filt} onClick={() => setFilt(!filt)}><Icon name="filter" size={16} /> Filter{kinds.length > 0 && <b>{kinds.length}</b>}</button>
            </div>
            {filt && (
              <div className="row wrap" style={{ marginTop: 10 }}>
                {KINDS.map((k) => (
                  <button key={k.id} className={`chip small ${kinds.includes(k.id) ? "active" : ""}`} aria-pressed={kinds.includes(k.id)} onClick={() => setKinds(kinds.includes(k.id) ? kinds.filter((q) => q !== k.id) : [...kinds, k.id])}>
                    <i className="kdot" style={{ background: k.color }} /> {k.label}
                  </button>
                ))}
              </div>
            )}
            <div className="daylog">
              {list.map((e) => {
                const dd = detail(e);
                return (
                  <button key={e.id} className={`daylog-row p${e.priority}`} onClick={() => app.go("workspace", e.id)}>
                    <time>{eventTime(e)}{e.forecast ? " · forecast" : ""}</time>
                    <span className="daylog-kind"><i className="kdot" style={{ background: KIND[e.kind].color }} /> {e.type}</span>
                    <span className="daylog-main"><strong>{e.title}</strong><em>{dd.expected ? "Expected response" : GLANCE[e.id] ? `Likely contributor: ${GLANCE[e.id].contributor}` : ""}</em></span>
                    <Icon name="chevron" />
                  </button>
                );
              })}
              {!list.length && <p className="muted">No events of this kind on this day.</p>}
            </div>
            {!kinds.length && all.length > list.length && <button className="more-btn" onClick={() => setRoutine(true)}><Icon name="chevron" size={16} /><span>Show routine events</span><em>{all.length - list.length}</em></button>}
            {routine && !kinds.length && <button className="more-btn" onClick={() => setRoutine(false)}><span>Hide routine events</span></button>}
          </Panel>
        );
      })()}

      {mode === "Today vs yesterday" && (
        <div className="grid cols-main">
          <Panel>
            <Head eyebrow="Solid = today · dashed = yesterday" title={SIG[sig].label}
              right={<Segmented options={["hrv", "hr", "stress", "fatigue"] as const} value={sig as "hrv"} onChange={setSig} compact label="Signal" names={{ hrv: "HRV", hr: "Heart rate", stress: "Stress", fatigue: "Fatigue" }} />} />
            <TimeChart series={[{ id: sig }]} compare={{ id: sig, offset: PER_DAY, label: "Yesterday" }} i0={idx(TODAY, 0)} i1={idx(TODAY + 1, 0)} hover={hover} onHover={setHover} height={260} shadeSleep
              marks={INSIGHTS.filter((x) => x.i <= NOW && x.i >= idx(TODAY, 0)).map((x) => ({ i: x.i, label: `${x.time} · ${EVENT[x.id].type}: ${x.title}`, tone: EVENT[x.id].kind, onClick: () => app.go("workspace", x.id) }))} />
          </Panel>
          <Panel>
            <Head title="What changed" />
            <table className="tbl">
              <thead><tr><th /><th>Today</th><th>Yesterday</th></tr></thead>
              <tbody>{deltas.map(([l, a, b, hit]) => <tr key={l} className={hit ? "hit" : ""}><td>{l}</td><td><b>{a}</b></td><td>{b}</td></tr>)}</tbody>
            </table>
            <p className="footnote"><Icon name="info" size={14} /> Shaded = more than your normal variation.</p>
          </Panel>
        </div>
      )}

      {mode === "Sleep periods" && (
        <div className="grid cols-main">
          <Panel>
            <Head eyebrow="Amber = fan cycle ran during sleep" title="Sleep quality, last 14 nights" right={app.nights > 0 ? <Tag tone="violet">{app.nights} SIMULATED FUTURE NIGHT{app.nights > 1 ? "S" : ""}</Tag> : undefined} />
            <Bars rows={nightRows} unit="%" max={100} picked={night} onPick={(k) => k < nights.length && setNight(k)} />
            <div className="facts">
              <Fact k="Fan nights">{FACTS.fanNightQ}% average</Fact>
              <Fact k="Quiet nights">{FACTS.calmNightQ}% average</Fact>
              <Fact k="Note">Observed pattern, not proof of cause</Fact>
            </div>
          </Panel>
          <Panel>
            <Head eyebrow="Selected night" title={`MD ${MD0 + n.day}${n.day === TODAY ? " · last night" : ""}`} right={<Ev kind="derived" />} />
            <dl className="kv">
              <div><dt>Duration</dt><dd>{Math.floor(n.durationMin / 60)} h {n.durationMin % 60} min</dd></div>
              <div><dt>Quality</dt><dd>{n.quality}%</dd></div>
              <div><dt>Awakenings</dt><dd>{n.awakenings}</dd></div>
              <div><dt>Fan cycle 01:50</dt><dd>{n.fanEvent ? `Ran · ${n.noisePeak} dBA peak` : "Did not run"}</dd></div>
              <div><dt>Evening before</dt><dd>{n.lateExercise ? "Late exercise (ended 21:00)" : "Usual schedule"}</dd></div>
            </dl>
            <button className="primary wide" onClick={() => { app.setPreset({ top: ["noise_quarters", "fan"], bottom: ["move", "hr"], days: 0.5, end: idx(n.day, 420), event: n.day === TODAY ? "sleep-0214" : n.fanEvent ? `wake-${n.day}` : undefined }); app.go("workspace"); }}><span>Open this night in the lab</span><Icon name="arrow" /></button>
          </Panel>
        </div>
      )}

      {mode === "Environment vs baseline" && (
        <Panel>
          <Head eyebrow="Now vs each module's usual at this hour" title="Environment vs baseline" />
          <table className="tbl">
            <thead><tr><th>Module</th><th>CO₂ now</th><th>usual</th><th>Noise now</th><th>usual</th><th>Temperature now</th><th>usual</th><th>Status</th></tr></thead>
            <tbody>
              {MODULES.map((m) => {
                const row = (["co2", "noise", "temp"] as const).map((p) => [S[`${p}_${m.id}`][NOW], baseline(`${p}_${m.id}`, NOW, 3)] as const);
                const st = moduleStatus(m.id, NOW);
                return (
                  <tr key={m.id} className={st !== "ok" ? "hit" : ""}>
                    <td><button className="linkish" onClick={() => app.go("environment", `co2-${m.id}`)}>{m.name}</button></td>
                    {row.map(([v, b], k) => [<td key={`v${k}`}><b>{v.toFixed(k === 1 ? 0 : 1)}</b></td>, <td key={`b${k}`} className="muted">{b.toFixed(k === 1 ? 0 : 1)}</td>])}
                    <td><span className="row tight"><StatusDot s={st} /> {ENV_WORD[st]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {mode === "Same activity" && (
        <div className="grid cols-2">
          <Panel>
            <Head eyebrow="Exercise, last 14 days · amber = late session" title="Peak heart rate per session" />
            <Bars rows={sessions.map((s) => ({ label: s.label, v: s.hr, hit: s.late, note: s.late ? "late session" : "" }))} unit="" max={160} />
            <div className="facts">
              <Fact k="Peak heart rate">Steady within {Math.max(...sessions.map((s) => s.hr)) - Math.min(...sessions.map((s) => s.hr))} bpm</Fact>
              <Fact k="Galley vibration over 5 mg">{overVib} sessions · within limits</Fact>
            </div>
          </Panel>
          <Panel>
            <Head eyebrow="Lab afternoons, last 7 days" title="Lab CO₂ and evening reaction time" right={<Ev kind="correlation" />} />
            <table className="tbl">
              <thead><tr><th>Day</th><th>{INSIGHT["co2-lab"].history.cols[0]}</th><th>{INSIGHT["co2-lab"].history.cols[1]}</th></tr></thead>
              <tbody>{INSIGHT["co2-lab"].history.rows.map((r) => <tr key={r.label} className={r.hit ? "hit" : ""}><td>{r.label}</td><td>{r.a}</td><td>{r.b}</td></tr>)}</tbody>
            </table>
            <button className="text-button" onClick={() => app.go("insights", "co2-lab")}>Open this trend <Icon name="arrow" size={14} /></button>
          </Panel>
        </div>
      )}

      {mode === "Same module" && (
        <Panel>
          <Head eyebrow="Daily peak, 14 days · amber = near or above limit" title={`${ENV_META[par].label} in ${MOD[mod].name}`}
            right={<div className="row wrap"><select className="picker" value={mod} onChange={(e) => setMod(e.target.value as ModuleId)} aria-label="Module">{MODULES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <Segmented options={["co2", "noise", "vib", "temp"] as const} value={par} onChange={setPar} compact label="Parameter" /></div>} />
          <Bars rows={modDays} unit="" />
          <p className="lede"><b>{modDays.filter((d) => d.hit).length} of 14 days</b> near or above the limit · {ENV_META[par].unit}</p>
        </Panel>
      )}

      {mode === "Same spacecraft event" && (
        <Panel>
          <Head title={evt} right={<Segmented options={["Fan cycle during sleep", "Gyro desaturation burn"] as const} value={evt} onChange={setEvt} compact label="Event type" />} />
          <table className="tbl">
            <thead><tr><th>When</th><th>Cabin</th><th>Your health</th></tr></thead>
            <tbody>{(evt === "Fan cycle during sleep" ? fanRows : burnRows).map((r) => <tr key={r.when}><td>{r.when}</td><td>{r.a}</td><td>{r.b}</td></tr>)}</tbody>
          </table>
          <p className="lede">{evt === "Fan cycle during sleep" ? <><b>{fanRows.length} times in 30 days.</b> Sleep broke up within 25 min each time. Observed pattern, not proof of cause.</> : <><b>Burns alone barely move your heart rate.</b> Only today's came with a caution tone.</>}</p>
          <button className="text-button" onClick={() => app.go("insights", evt === "Fan cycle during sleep" ? "sleep-0214" : "stress-1042")}>Open this trend <Icon name="arrow" size={14} /></button>
        </Panel>
      )}

      <Panel>
        <Head eyebrow="Astronaut input · not telemetry" title="Your input this session" right={<Ev kind="input" />} />
        {learned.length ? learned.map((l, k) => (
          <button key={k} className="list-btn" onClick={l.go}><div><strong>{l.text}</strong><span>{l.at}</span></div><Icon name="chevron" /></button>
        )) : <p className="muted">Nothing yet.</p>}
      </Panel>
    </div>
  );
}

// ============================================================================= CREW
export function Crew() {
  const app = useApp();
  const shared = app.share;
  const others = [
    { id: "chen", state: "Ready", sleep: "Shared: 7.1 h", note: "Chooses to share sleep summary" },
    { id: "okafor", state: "Ready with limits", sleep: "Not shared", note: "Shares readiness status only" },
    { id: "solberg", state: "Ready", sleep: "Not shared", note: "Shares readiness status only" },
  ];
  return (
    <div className="grid">
      <Glance tone="watch" label="Crew" title="4 of 4 ready · 2 with limits" sub="Crew see a readiness word only. Your health detail stays private."
        cells={[
          { k: "Shared issue", v: <>Quarters noise <Dir d="up" /> at 01:50</>, sub: "2 of 4 crew wake around 02:00", onClick: () => app.go("workspace", "sleep-0214") },
          { k: "Later today", v: <>Lab CO₂ <Dir d="up" /> at 16:40</>, sub: "Rivera and Chen", onClick: () => app.go("workspace", "co2-lab") },
        ]} />
      <div className="crew-cards">
        <Panel className="crew-card you">
          <div className="row"><span className="avatar you">AR</span><div><strong>Alex Rivera · you</strong><span>Commander · {MOD[CREW_NOW.rivera.module].name}</span></div></div>
          <Tag tone="amber">READY WITH LIMITS</Tag>
          <p>Readiness {READINESS.score} · usual {READINESS.usual}</p>
          <p className="eyebrow">How others see you</p>
          <div className="seen">
            <span><Icon name={shared.readiness ? "eye" : "lock"} size={14} /> {shared.readiness ? "Ready with limits" : "Readiness hidden"}</span>
            <span><Icon name={shared.sleep ? "eye" : "lock"} size={14} /> {shared.sleep ? "Sleep 6.2 h" : "Sleep private"}</span>
            <span><Icon name={shared.vitals ? "eye" : "lock"} size={14} /> {shared.vitals ? "Vitals summary" : "Vitals private"}</span>
          </div>
        </Panel>
        {others.map((o) => {
          const c = CREW.find((x) => x.id === o.id)!;
          return (
            <Panel className="crew-card" key={o.id}>
              <div className="row"><span className="avatar">{c.initials}</span><div><strong>{c.name}</strong><span>{c.role} · {MOD[CREW_NOW[o.id].module].name}</span></div></div>
              <Tag tone={o.state === "Ready" ? "green" : "amber"}>{o.state.toUpperCase()}</Tag>
              <p>{CREW_NOW[o.id].activity}</p>
              <div className="seen">
                <span><Icon name={o.sleep.startsWith("Shared") ? "eye" : "lock"} size={14} /> {o.sleep}</span>
                <span><Icon name="lock" size={14} /> Vitals private</span>
              </div>
            </Panel>
          );
        })}
      </div>
      <Panel>
        <More label="Where the shared issues are">
          <Schematic compact status={(m) => { const s = moduleStatus(m, NOW); return s === "ok" ? "none" : s; }} />
          <button className="list-btn" onClick={() => { app.setFocus({ module: "galley" }); app.go("ship"); }}>
            <div><strong>Water filter service due</strong><span>Within 36 h · unassigned</span></div><Icon name="chevron" />
          </button>
        </More>
        <More label="Mission readiness totals">
          <dl className="kv">
            <div><dt>Ready for planned duties</dt><dd>4 of 4 · 2 with limits</dd></div>
            <div><dt>Average sleep, 7 nights</dt><dd>6.6 h · target 7.5 h</dd></div>
            <div><dt>Exercise this week</dt><dd>94% of plan</dd></div>
            <div><dt>EVA systems prep 14:00</dt><dd>Pair-check advised</dd></div>
            <div><dt>Next medical conferences</dt><dd>MD 185 from 09:00</dd></div>
          </dl>
        </More>
        <More label="What the crew can see about me">
          {([["readiness", "Readiness word", "Ready, ready with limits, or not ready"], ["sleep", "Sleep summary", "Last night's duration only"], ["vitals", "Vitals summary", "Trend arrows only"], ["mood", "Mood rating", "Medical officer always sees this"]] as const).map(([k, t, d]) => (
            <div className="setting-row" key={k}>
              <span><strong>{t}</strong><small>{d}</small></span>
              <Toggle on={!!shared[k]} onChange={(v) => app.setShare(k, v)} label={`Share ${t}`} />
            </div>
          ))}
        </More>
      </Panel>
    </div>
  );
}

// ======================================================================== REFERENCE
export function Reference() {
  const [group, setGroup] = useState<"Health" | "Environment" | "Engineering">("Health");
  const rows = SIGNALS.filter((s) => (group === "Health" ? s.group === "health" : group === "Engineering" ? s.group === "eng" : s.group === "env" && (!s.module || s.module === "lab")));
  return (
    <div className="grid">
      <Panel>
        <Head level={2} title="Five labels, used everywhere" right={<Tag tone="violet">ALL DATA SIMULATED</Tag>} />
        <div className="evgrid">
          {(Object.keys(EVIDENCE) as Evidence[]).map((k) => (
            <div key={k}><Ev kind={k} /><strong>{EVIDENCE[k].label}</strong><p>{EVIDENCE[k].desc}</p></div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Head title="Look something up" />
        <More label="Glossary" count={Object.keys(GLOSSARY).length}>
          <dl className="kv stack">
            {Object.values(GLOSSARY).map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.def}</dd></div>)}
          </dl>
        </More>
        <More label="Data sources" count={SIGNALS.length}>
          <Segmented options={["Health", "Environment", "Engineering"] as const} value={group} onChange={setGroup} compact label="Data group" names={{ Engineering: "Spacecraft activity" }} />
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Signal</th><th>Source</th><th>How often</th><th>Kind</th><th>Reliability</th><th>Maturity</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.module && s.group === "env" ? s.label.split(" · ")[0] : s.label}</b> <span className="muted">{s.unit}</span>{s.module && s.group === "env" && <span className="muted"> · one per module</span>}</td>
                  <td>{s.source}</td><td>{s.cadence}</td><td><Ev kind={s.evidence} /></td><td>{s.reliability}</td>
                  <td><Tag tone={s.maturity === "Experimental" ? "violet" : s.maturity === "Demonstrated" ? "blue" : "green"}>{s.maturity.toUpperCase()}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <p className="footnote"><Icon name="info" size={14} /> Established: flown operationally. Demonstrated: flown as a demo or research payload. Experimental: research concept, never used for alerts.</p>
        </More>
        <More label="What is real and what is simulated">
          <dl className="kv stack">
            <div><dt>Real data structures</dt><dd>Telemetry categories and cabin limits follow public space-station telemetry and NASA standards.</dd></div>
            <div><dt>Research-supported links</dt><dd>CO₂ and headache; noise and sleep; sleep loss and reaction time; exercise and bone loss.</dd></div>
            <div><dt>Design assumptions</dt><dd>Vehicle layout, equipment schedule, tag names and the size of each effect.</dd></div>
            <div><dt>Simulated</dt><dd>Every crew member, health value and telemetry sample.</dd></div>
          </dl>
        </More>
        <More label="Research sources" count={REFERENCES.length}>
          {REFERENCES.map((r) => (
            <a key={r.title} className="ref" href={r.url} target="_blank" rel="noreferrer">
              <Tag>{r.topic.toUpperCase()}</Tag>
              <strong>{r.title} <Icon name="external" size={13} /></strong>
              <span>{r.src}</span>
              <p>{r.used}</p>
            </a>
          ))}
        </More>
        <More label="Assumptions" count={ASSUMPTIONS.length}>
          <ul className="plain-list">{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
        </More>
      </Panel>
    </div>
  );
}

// ========================================================================= SETTINGS
export function Settings() {
  const app = useApp();
  const s = app.settings;
  return (
    <div className="grid cols-2">
      <Panel>
        <Head title="Display" />
        {([["night", "Low-light mode", "Dark palette"], ["contrast", "High contrast", "Stronger text and borders"], ["glove", "Large touch targets", "Bigger buttons"], ["reduceMotion", "Reduce motion", "No pulsing or camera glide"]] as const).map(([k, t, d]) => (
          <div className="setting-row" key={k}>
            <span><strong>{t}</strong><small>{d}</small></span>
            <Toggle on={s[k]} onChange={(v) => app.setSettings({ [k]: v })} label={t} />
          </div>
        ))}
      </Panel>
      <Panel>
        <Head title="Data" />
        <div className="setting-row">
          <span><strong>CO₂ units</strong><small>Flight rules use mmHg</small></span>
          <Segmented options={["mmHg", "ppm"] as const} value={s.co2Unit} onChange={(v) => app.setSettings({ co2Unit: v })} compact label="CO2 units" />
        </div>
        <div className="setting-row">
          <span><strong>Sharing choices</strong><small>What the crew can see</small></span>
          <button className="secondary" onClick={() => app.go("crew")}>Open crew view</button>
        </div>
        <div className="setting-row">
          <span><strong>Reset the demo</strong><small>Clears your entries and decisions</small></span>
          <button className="secondary" onClick={() => { app.reset(); app.toast("Demo reset to the start of MD 184, 11:22."); }}><Icon name="rotate" /> Reset</button>
        </div>
        <div className="callout">
          <strong>Prototype notice</strong>
          <p>Concept prototype for NASA Space Apps. All health data and telemetry are simulated. Not a medical device.</p>
        </div>
      </Panel>
    </div>
  );
}
export { STATUS_TONE, WEAK_SCRUB_DAYS };
