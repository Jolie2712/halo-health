import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, TimeChart, Ev, Confidence, Segmented, Term, Terms, useSize, Dir, Disclose, type Mark, type ChartSeries } from "../ui";
import { SIGNALS, SIG, INSIGHT, REC, fmt, confLabel, lc, GLANCE, REC_SHORT } from "../data/content";
import { S, NOW, PER_DAY, TODAY, idx, MOD, MD0, dayOf, minOf, hhmm } from "../data/sim";
import { EVENT, DETECTED, KINDS, KIND, eventsIn, blocksIn, detail, eventTime, eventDay, type LabEvent, type EventKind } from "../data/events";
import { Feedback } from "./Feedback";

const SCALES = [
  { label: "6 h", n: 36 }, { label: "12 h", n: 72 }, { label: "24 h", n: 144 }, { label: "3 days", n: 432 }, { label: "7 days", n: 1008 },
] as const;
const ALT_COLORS = ["#c8642a", "#7557bd", "#16857f"];
const ALT_COLORS_B = ["#2f64c7", "#c0456b", "#198a62"];
const PAD = 44; // left and right chart padding, shared by the event lane so markers line up
const DAY_END = idx(TODAY + 1, 0);

const windowFor = (e: LabEvent, n: number): number => {
  let i1 = e.i - Math.round(n * 0.45) + n;
  const maxEnd = e.forecast ? DAY_END : NOW + 4;
  if (i1 > maxEnd) i1 = maxEnd;
  return Math.max(n, i1);
};
const defaultScale = (e: LabEvent) => (e.forecast ? 2 : 1);
export const trendParam = (e: LabEvent) => e.id;

function Picker({ group, chosen, onAdd }: { group: "ship" | "body"; chosen: string[]; onAdd: (id: string) => void }) {
  const opts = SIGNALS.filter((s) => (group === "body" ? s.group === "health" && !s.points : s.group !== "health") && !chosen.includes(s.id));
  const env = opts.filter((s) => s.group === "env");
  const eng = opts.filter((s) => s.group === "eng");
  return (
    <select className="picker" value="" aria-label={`Add ${group === "ship" ? "spacecraft or cabin" : "health"} signal`} onChange={(e) => e.target.value && onAdd(e.target.value)} disabled={chosen.length >= 3}>
      <option value="">{chosen.length >= 3 ? "Maximum of 3 signals" : "+ Add signal"}</option>
      {group === "body" ? opts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>) : (
        <>
          <optgroup label="Cabin environment">{env.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
          <optgroup label="Spacecraft activity">{eng.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        </>
      )}
    </select>
  );
}

/** The five answers every event marker gives on hover. Clicking it opens the matching section in Trends. */
function EventPopup({ e, onOpen }: { e: LabEvent; onOpen: () => void }) {
  const d = detail(e);
  const g = e.insight && e.id === e.insight ? GLANCE[e.id] : undefined;
  return (
    <button className="ev-pop-body" onClick={onOpen}>
      <span className="ev-pop-head"><i style={{ background: KIND[e.kind].color }} /><b>{eventTime(e)} · {e.type}</b><em>{eventDay(e)}</em></span>
      {d.expected && <span className="ev-pop-expected">{d.expected.label}</span>}
      <span className="ev-pop-row"><small>What happened</small>{g?.happened ?? d.happened}</span>
      <span className="ev-pop-row"><small>Health change</small>{g?.changed ?? d.changed[0]}</span>
      <span className="ev-pop-row"><small>Potential contributor</small>{d.contributor ? (g?.contributor ?? d.contributor) : d.expected ? "The activity itself" : "None identified"}</span>
      <span className="ev-pop-row"><small>Other possibilities</small>{d.others.length ? d.others.slice(0, 3).map(lc).join(", ") : "None suggested"}</span>
      <span className="ev-pop-row"><small>Confidence</small>{d.confidence == null ? "Not rated" : confLabel(d.confidence)}</span>
      <span className="ev-pop-go">Open in Trends <Icon name="arrow" size={13} /></span>
    </button>
  );
}

function EventLane({ events, i0, i1, sel, hidden, onSelect, onOpen, dropped }: {
  events: LabEvent[]; i0: number; i1: number; sel: string | null; hidden: EventKind[]; onSelect: (e: LabEvent) => void; onOpen: (e: LabEvent) => void; dropped: (n: number) => void;
}) {
  const [ref, w] = useSize<HTMLDivElement>();
  const [pop, setPop] = useState<string | null>(null);
  const timer = useRef(0);
  const span = i1 - i0;
  const x = (i: number) => PAD + ((i - i0) / span) * Math.max(10, w - PAD * 2);
  const ROWS = 3;
  const placed = useMemo(() => {
    if (!w) return [];
    const order = [...events].sort((a, b) => (a.id === sel ? -1 : b.id === sel ? 1 : b.priority - a.priority || a.i - b.i));
    const rows: [number, number][][] = Array.from({ length: ROWS }, () => []);
    const out: { e: LabEvent; left: number; row: number; width: number }[] = [];
    for (const e of order) {
      const width = Math.min(w - 8, e.type.length * 6.4 + 34);
      const left = Math.max(2, Math.min(x(e.i) - 9, w - width - 2));
      const row = rows.findIndex((r) => r.every(([a, b]) => left > b + 4 || left + width < a - 4));
      if (row < 0) continue;
      rows[row].push([left, left + width]);
      out.push({ e, left, row, width });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, w, i0, i1, sel]);
  useEffect(() => dropped(events.length - placed.length), [events.length, placed.length, dropped]);
  const blocks = blocksIn(i0, Math.min(i1, DAY_END));
  const popped = placed.find((p) => p.e.id === pop);
  const open = (id: string) => { window.clearTimeout(timer.current); setPop(id); };
  const close = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setPop(null), 220); };

  return (
    <div className="ev-lane" ref={ref} onMouseLeave={close}>
      <div className="ev-pills" style={{ height: ROWS * 28 }}>
        {placed.map(({ e, left, row }) => (
          <button key={e.id} className={`ev-pill ${sel === e.id ? "sel" : ""} ${e.forecast ? "forecast" : ""}`} style={{ left, top: row * 28, "--k": KIND[e.kind].color } as React.CSSProperties}
            onMouseEnter={() => open(e.id)} onFocus={() => open(e.id)} onBlur={close} onClick={() => { onSelect(e); open(e.id); }}
            aria-label={`${eventTime(e)} ${e.type}: ${e.title}`}>
            <Icon name={KIND[e.kind].icon} size={13} /> {e.type}
          </button>
        ))}
        {placed.map(({ e, row }) => <i key={`s${e.id}`} className="ev-stem" style={{ left: x(e.i), top: row * 28 + 24, height: (ROWS - row) * 28 - 24, background: KIND[e.kind].color }} />)}
      </div>
      <div className="ev-strip" aria-label="What you were doing">
        {w > 0 && blocks.map(({ b, i0: a, i1: z, kind }) => {
          const width = x(z) - x(a);
          return (
            <span key={`${b.day}-${b.start}`} className={hidden.includes(kind) ? "off" : ""} style={{ left: x(a), width: Math.max(1, width - 1), background: KIND[kind].color }}
              title={`${hhmm(b.start)} to ${hhmm(b.end)} · ${b.label} · ${MOD[b.module].name}${a > NOW ? " (planned)" : ""}`}>
              {width > 58 && b.label.split(" · ")[0].replace("Post-sleep & breakfast", "Breakfast")}
            </span>
          );
        })}
      </div>
      {popped && (
        <div className="ev-pop" style={{ left: Math.min(Math.max(x(popped.e.i), 150), Math.max(150, w - 150)), top: popped.row * 28 + 28 }} onMouseEnter={() => open(popped.e.id)} onMouseLeave={close}>
          <EventPopup e={popped.e} onOpen={() => onOpen(popped.e)} />
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const app = useApp();
  const preset = useRef(app.preset).current;
  const routed = app.route.param && EVENT[app.route.param] ? EVENT[app.route.param] : null;
  const first = routed ?? (preset?.event ? EVENT[preset.event] : null) ?? (preset ? null : EVENT["sleep-0214"]);
  const [sel, setSel] = useState<string | null>(first?.id ?? null);
  const [top, setTop] = useState<string[]>(preset && !routed ? preset.top : first!.top);
  const [bottom, setBottom] = useState<string[]>(preset && !routed ? preset.bottom : first!.bottom);
  const [scale, setScale] = useState(() => (first ? defaultScale(first) : Math.max(0, SCALES.findIndex((s) => s.n >= (preset?.days ?? 1) * PER_DAY))));
  const [end, setEnd] = useState(() => (first ? windowFor(first, SCALES[defaultScale(first)].n) : preset!.end));
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<EventKind[]>([]);
  const [nDropped, setDropped] = useState(0);
  const [edit, setEdit] = useState(false); // filters and signal pickers stay out of the way until asked for
  useEffect(() => { if (app.preset) app.setPreset(null); /* used once */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = SCALES[scale].n;
  const i1 = Math.min(DAY_END, Math.max(n, end));
  const i0 = i1 - n;
  const inWin = useMemo(() => eventsIn(i0, i1).filter((e) => e.priority >= (n >= 432 ? 2 : 1)), [i0, i1, n]);
  const visible = useMemo(() => inWin.filter((e) => !hidden.includes(e.kind)), [inWin, hidden]);
  const event = sel ? EVENT[sel] : visible.slice().sort((a, b) => b.priority - a.priority || b.i - a.i)[0] ?? null;
  const d = event ? detail(event) : null;
  const x = event?.insight && event.id === event.insight ? INSIGHT[event.insight] : undefined;
  const pattern = event?.insight ? INSIGHT[event.insight] : undefined;

  const pick = (e: LabEvent, recentre = false) => {
    setSel(e.id);
    setTop(e.top);
    setBottom(e.bottom);
    if (recentre || e.i < i0 || e.i > i1) { const s = recentre ? defaultScale(e) : scale; setScale(s); setEnd(windowFor(e, SCALES[s].n)); }
  };
  const changeScale = (label: string) => {
    const s = SCALES.findIndex((q) => q.label === label);
    setScale(s);
    setEnd(event ? windowFor(event, SCALES[s].n) : Math.max(SCALES[s].n, i1));
  };
  const pan = (dir: number) => setEnd(Math.min(DAY_END, Math.max(n, i1 + dir * Math.round(n / 2))));
  const openTrend = (e: LabEvent) => app.go("insights", trendParam(e));

  const marks: Mark[] = visible.map((e) => ({ i: e.i, label: `${eventTime(e)} · ${e.type}: ${e.title}`, tone: e.kind, strong: e.id === event?.id }));
  const mask = useMemo(() => {
    if (!hidden.length) return [];
    return [
      ...blocksIn(i0, i1).filter((b) => hidden.includes(b.kind)).map((b) => ({ i0: b.i0, i1: b.i1 })),
      ...inWin.filter((e) => hidden.includes(e.kind) && (e.kind === "environment" || e.kind === "spacecraft")).map((e) => ({ i0: e.i, i1: e.i + Math.max(2, e.dur) })),
    ];
  }, [hidden, i0, i1, inWin]);
  const topSeries: ChartSeries[] = top.map((id, k) => ({ id, color: top.length > 1 ? ALT_COLORS[k] : SIG[id].color }));
  const botSeries: ChartSeries[] = bottom.map((id, k) => ({ id, color: bottom.length > 1 ? ALT_COLORS_B[k] : SIG[id].color }));
  const chip = (id: string, k: number, row: "top" | "bottom") => (
    <span key={id} className="sigchip">
      <i style={{ background: (row === "top" ? topSeries : botSeries)[k].color }} />
      <Terms>{SIG[id].label}</Terms> <em>{SIG[id].unit}</em>
      {hover != null && hover <= NOW && <b>{fmt(id, S[id][hover])}</b>}
      {edit && <button aria-label={`Remove ${SIG[id].label}`} onClick={() => (row === "top" ? setTop(top.filter((q) => q !== id)) : setBottom(bottom.filter((q) => q !== id)))}><Icon name="close" size={12} /></button>}
    </span>
  );
  const forecast = i1 > NOW + 1;

  const g = x ? GLANCE[x.id] : undefined;
  const rec0 = pattern?.recs[0];

  return (
    <div className="grid cols-side lab">
      <div className="grid">
        <Panel>
          <Head title="Pick an event" />
          <div className="ev-select">
            {DETECTED.map((e) => (
              <button key={e.id} className={`ev-card ${event?.id === e.id ? "active" : ""}`} aria-pressed={event?.id === e.id} onClick={() => pick(e, true)} style={{ "--k": KIND[e.kind].color } as React.CSSProperties}>
                <span><Icon name={KIND[e.kind].icon} size={14} /> {e.type}</span>
                <strong>{eventDay(e) === "Today" ? "" : `${eventDay(e)} · `}{eventTime(e)}</strong>
                <em>{GLANCE[e.id] ? <>{GLANCE[e.id].metric} <Dir d={GLANCE[e.id].dir} /></> : e.title}</em>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="row between wrap lab-bar">
            <div className="row wrap">
              <button className="icon-button" aria-label="Earlier" onClick={() => pan(-1)} disabled={i0 <= 0}><Icon name="back" /></button>
              <div className="daylabel"><strong>MD {MD0 + dayOf(i0)} {hhmm(minOf(i0))} to {dayOf(i1 - 1) !== dayOf(i0) ? `MD ${MD0 + dayOf(i1 - 1)} ` : ""}{hhmm(minOf(i1) || 1440)}</strong>{forecast && <span>Dashed = forecast</span>}</div>
              <button className="icon-button" aria-label="Later" onClick={() => pan(1)} disabled={i1 >= DAY_END}><Icon name="chevron" /></button>
            </div>
            <div className="row wrap">
              <Segmented options={SCALES.map((s) => s.label)} value={SCALES[scale].label} onChange={changeScale} compact label="Time scale" />
              <button className={`secondary filter-btn ${edit ? "on" : ""}`} aria-expanded={edit} onClick={() => setEdit(!edit)}>
                <Icon name="filter" size={16} /> Filter{hidden.length > 0 && <b>{hidden.length} hidden</b>}
              </button>
            </div>
          </div>

          {edit && (
            <div className="ev-filters" role="group" aria-label="Show or hide kinds of event">
              <span>Show</span>
              {KINDS.map((k) => {
                const off = hidden.includes(k.id);
                return (
                  <button key={k.id} className={`chip small ev-filter ${off ? "off" : "active"}`} aria-pressed={!off} style={{ "--k": k.color } as React.CSSProperties}
                    onClick={() => setHidden(off ? hidden.filter((h) => h !== k.id) : [...hidden, k.id])} title={off ? `Show ${k.label}` : `Hide ${k.label}`}>
                    <i /> {k.label}
                  </button>
                );
              })}
              {hidden.length > 0 && <button className="text-button" onClick={() => setHidden([])}>Show all</button>}
            </div>
          )}
          {hidden.length > 0 && <p className="footnote lab-hidden"><Icon name="eye" size={14} /> Hidden: {hidden.map((h) => KIND[h].label).join(", ")}. Greyed out on the charts.</p>}

          <EventLane events={visible} i0={i0} i1={i1} sel={event?.id ?? null} hidden={hidden} onSelect={(e) => pick(e)} onOpen={openTrend} dropped={setDropped} />

          <div className="ws-row">
            <div className="ws-rowhead">
              <Tag tone="amber">SPACECRAFT & CABIN</Tag>
              {top.map((id, k) => chip(id, k, "top"))}
              {edit && <Picker group="ship" chosen={top} onAdd={(id) => setTop([...top, id])} />}
            </div>
            {top.length ? <TimeChart series={topSeries} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} mask={mask} padR={PAD} height={180} shadeSleep showForecast={forecast} limit={top.length === 1 ? SIG[top[0]].limit : undefined} />
              : <div className="chart-empty">Add a spacecraft or cabin signal.</div>}
          </div>
          <div className="ws-row">
            <div className="ws-rowhead">
              <Tag tone="blue">YOUR HEALTH</Tag>
              {bottom.map((id, k) => chip(id, k, "bottom"))}
              {edit && <Picker group="body" chosen={bottom} onAdd={(id) => setBottom([...bottom, id])} />}
            </div>
            {bottom.length ? <TimeChart series={botSeries} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} mask={mask} padR={PAD} height={180} shadeSleep />
              : <div className="chart-empty">Add a health signal.</div>}
          </div>
          <p className="footnote">
            <Icon name="info" size={14} /> Point at a marker for a summary. Select it to analyse it. Grey bands = sleep.
            {nDropped > 0 && ` ${nDropped} routine event${nDropped > 1 ? "s" : ""} hidden at this scale.`}
          </p>
        </Panel>
        {event && d && (
          <Feedback key={event.id} id={event.id} contributor={d.contributor} options={d.others} compact
              example={event.id === "sleep-0214" ? "e.g. I think the late exercise session mattered more than the noise." : undefined} />
        )}
      </div>

      <div className="grid">
        {event && d ? (
          <Panel className="ev-analysis" key={event.id}>
            <div className="row wrap">
              <Tag tone="neutral"><i className="kdot" style={{ background: KIND[event.kind].color }} /> {event.type.toUpperCase()}</Tag>
              <Tag tone={event.forecast ? "amber" : "blue"}>{event.forecast ? "FORECAST" : `${eventDay(event).toUpperCase()} · ${eventTime(event)}`}</Tag>
            </div>
            {/* first view: the simplest useful version */}
            <h2 className="ev-title">{g ? <>{g.metric} <Dir d={g.dir} />{/^\d/.test(g.amount) && <> {g.amount}</>}</> : event.title}</h2>
            {g && <p className="ev-phrase">{g.phrase}{event.module ? ` · ${MOD[event.module].name}` : ""}</p>}
            {d.expected ? (
              <div className="expected">
                <strong><Icon name="check" size={14} /> {d.expected.label}</strong>
              </div>
            ) : d.contributor ? (
              <div className="contrib">
                <span>Potential contributor <Ev kind="inference" compact /></span>
                <b>{g?.contributor ?? d.contributor}</b>
                {d.confidence != null && <Confidence value={d.confidence} />}
              </div>
            ) : (
              <div className="expected neutral"><strong>No health change linked</strong></div>
            )}
            {rec0 && (
              <button className="primary wide" onClick={() => app.go("actions", rec0)}>
                <span><small>What to do</small>{REC_SHORT[rec0]?.do ?? REC[rec0].title}</span><Icon name="arrow" />
              </button>
            )}

            {/* second view: one line each, full answer on click */}
            <div className="disc-list">
              <Disclose k="What happened?" v={g?.happened ?? d.happened}>
                {g && <p>{d.happened}</p>}
                {d.expected && <p>{d.expected.text}</p>}
                {d.ship && <div className="ship-ctx"><p className="eyebrow"><Icon name="bolt" size={13} /> Spacecraft activity at the time</p><p>{d.ship}</p></div>}
                {!g && !d.expected && !d.ship && <p>{d.happened}</p>}
              </Disclose>
              <Disclose k="What changed?" v={g?.changed ?? d.changed[0]}>
                <ul className="plain-list tight">{d.changed.map((c) => <li key={c}>{c}</li>)}</ul>
              </Disclose>
              <Disclose k="Possible contributing factors" v={d.contributor ? (g?.contributor ?? d.contributor) : d.expected ? "The activity itself" : "None identified"}>
                {g && (
                  <div className="ctx-chips">
                    {g.factors.map((f) => <span key={f.label} className={f.flag ? "flag" : ""}><b><Terms>{f.label}</Terms></b> {f.state}</span>)}
                  </div>
                )}
                {g && <p>{g.click}</p>}
                {x && <p className="muted">{x.association}</p>}
                {d.info.length > 0 && <ul className="plain-list tight">{d.info.map((c) => <li key={c}>{c}</li>)}</ul>}
              </Disclose>
              {(x?.alternatives.length || d.others.length > 0) ? (
                <Disclose k="Alternative explanations" v={g?.alts ?? d.others.slice(0, 3).join(", ")}>
                  {x ? (
                    <ul className="alt-mini">
                      {x.alternatives.map((a) => (
                        <li key={a.id}><b>{a.label}</b><Tag tone={a.verdict === "Unlikely" ? "neutral" : "blue"}>{a.verdict.toUpperCase()}</Tag><span>{a.against[0]}</span></li>
                      ))}
                    </ul>
                  ) : <p>{d.others.join(", ")}.</p>}
                </Disclose>
              ) : null}
              <Disclose k="Historical pattern" v={g?.history ?? d.history}>
                {g && <p>{d.history}</p>}
                <p className="muted">An observed pattern, not proof of cause.</p>
              </Disclose>
              <Disclose k="Confidence" v={d.confidence != null ? confLabel(d.confidence) : "Not rated"}>
                <p>{d.confWhy}</p>
              </Disclose>
            </div>
            <div className="btns">
              <button className="secondary" onClick={() => openTrend(event)}><Icon name="trend" /> See trend</button>
              {pattern && <button className="secondary" onClick={() => { app.setFocus({ module: pattern.spatial.path[0], path: pattern.spatial.path, equipment: pattern.spatial.equipment }); app.go("ship"); }}><Icon name="orbit" /> Show where</button>}
            </div>
          </Panel>
        ) : (
          <Panel>
            <Head title="Select a marker" />
            <p className="lede">Pick any labelled marker above the charts.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
