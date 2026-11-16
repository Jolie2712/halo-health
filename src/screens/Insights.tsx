// Trends: patterns that repeat. Health and context are always shown together.
import { useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Confidence, Ev, TimeChart, Legend, Schematic, Segmented, Term, Terms, Glance, More, Dir, Disclose, type Mark } from "../ui";
import { INSIGHTS, INSIGHT, REC, REC_STATUS, EVIDENCE, type Insight, SIG, GLANCE, REC_SHORT, confLabel } from "../data/content";
import { NOW, TODAY, PER_DAY, idx, MOD, MD0, dayOf } from "../data/sim";
import { EVENT, EVENTS, KIND, detail, recurrence, eventTime, eventDay, type LabEvent } from "../data/events";
import { DailyCompare, HIGHLIGHT } from "../daily";
import { Feedback } from "./Feedback";

const WIN: Record<string, [number, number, boolean]> = {
  "sleep-0214": [idx(TODAY, 30), idx(TODAY, 270), false],
  "co2-lab": [idx(TODAY, 300), idx(TODAY, 1140), true],
  "stress-1042": [idx(TODAY, 540), NOW, false],
  "exercise-hr": [idx(TODAY - 1, 1080), idx(TODAY - 1, 1320), false],
};
const LANE_TONE = { Spacecraft: "violet", Environment: "amber", Body: "blue", Activity: "neutral" } as const;
const DIR_TONE = { Worsening: "amber", Stable: "neutral", Improving: "green", New: "blue" } as const;
const RANGES = ["7 days", "14 days", "30 days"] as const;
const rangeDays = (r: (typeof RANGES)[number]) => parseInt(r, 10);

function Selection({ metric, period, event, contributor }: { metric: string; period: string; event: string; contributor: string }) {
  return (
    <div className="selection" aria-label="What is selected on this page">
      <span className="sel-lead"><Icon name="target" size={14} /> Selected</span>
      <span><small>Metric</small><b><Terms>{metric}</Terms></b></span>
      <span><small>Time period</small><b>{period}</b></span>
      <span><small>Event</small><b>{event}</b></span>
      <span><small>Potential contributor</small><b>{contributor}</b></span>
    </div>
  );
}

function List() {
  const app = useApp();
  const [rows, setRows] = useState(["sleepq", "noise_night", "co2_night", "temp_night", "stress", "exercise_gap"]);
  const [range, setRange] = useState<(typeof RANGES)[number]>("14 days");
  const [hl, setHl] = useState("sleep-0214");
  const worse = INSIGHTS.filter((x) => x.trend.direction === "Worsening");
  const top = worse[0] ?? INSIGHTS[0];
  const g = GLANCE[top.id];
  return (
    <div className="grid">
      <Glance tone={worse.length ? "watch" : "ok"} label="Trends" title={worse.length ? <>{g.metric} <Dir d={g.dir} /> · more frequent</> : "No trend is worsening"}
        sub={`${g.repeat}. An observed pattern, not a diagnosis.`}
        cells={[
          { k: "Potential contributor", v: g.contributor, sub: `Confidence: ${confLabel(top.confidence)}`, onClick: () => app.go("insights", top.id) },
          { k: "What to do", v: REC_SHORT[g.action].do, sub: REC_SHORT[g.action].benefit, primary: true, onClick: () => app.go("actions", g.action) },
        ]} />
      <div className="trend-cards">
        {INSIGHTS.map((x) => {
          const q = GLANCE[x.id];
          return (
            <button key={x.id} className={`panel pad trend-card s-${x.status}`} onClick={() => app.go("insights", x.id)}>
              <div className="row between">
                <Tag tone={x.status === "context" ? "green" : DIR_TONE[x.trend.direction]}>{x.status === "context" ? "EXPECTED" : x.trend.direction === "New" ? "NEW" : x.trend.direction.toUpperCase()}</Tag>
                {app.hyp[x.id] && <Tag tone="blue">YOUR INPUT</Tag>}
              </div>
              <h3>{q.metric} <Dir d={q.dir} /></h3>
              <p className="tc-repeat">{q.repeat}</p>
              <div className="tc-contrib">
                <span>{x.status === "context" ? "Explained by" : "Potential contributor"}</span>
                <b>{q.contributor}</b>
                <Confidence value={x.confidence} showLabel={false} />
              </div>
              <span className="linkish">Open <Icon name="arrow" size={14} /></span>
            </button>
          );
        })}
      </div>

      <Panel>
        <Head title="Day by day" right={<Segmented options={RANGES} value={range} onChange={setRange} compact label="Range" />} />
        <div className="row wrap hl-pick">
          <span className="muted small">Highlight</span>
          {INSIGHTS.map((x) => (
            <button key={x.id} className={`chip small ${hl === x.id ? "active" : ""}`} aria-pressed={hl === x.id} onClick={() => setHl(hl === x.id ? "" : x.id)}>{HIGHLIGHT[x.id].label.replace(/^(Nights|Days) (when|with) /, "").replace(/^./, (c) => c.toUpperCase())}</button>
          ))}
        </div>
        <DailyCompare rows={rows} onRows={setRows} days={rangeDays(range)} highlight={hl ? HIGHLIGHT[hl] : undefined} />
      </Panel>
    </div>
  );
}

function Detail({ x, focus }: { x: Insight; focus?: LabEvent }) {
  const app = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const [alt, setAlt] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>("14 days");
  const [rows, setRows] = useState(x.trend.rows);
  const fd = focus ? detail(focus) : null;
  const otherDay = !!focus && dayOf(focus.i) !== dayOf(x.i);
  let [i0, i1, forecast] = WIN[x.id];
  if (focus && otherDay) {
    if (x.id === "sleep-0214" || x.id === "co2-lab") { const sh = (dayOf(focus.i) - dayOf(x.i)) * PER_DAY; i0 += sh; i1 += sh; }
    else { i0 = focus.i - 30; i1 = focus.i + 42; }
    i1 = Math.min(i1, NOW);
    forecast = false;
  }
  const marks: Mark[] = otherDay
    ? [{ i: focus!.i, label: `${eventTime(focus!)} ${focus!.type}: ${focus!.title}`, tone: focus!.kind, strong: true }]
    : x.chain.map((c) => ({ i: c.i, label: `${c.time} ${c.lane}: ${c.text}`, tone: LANE_TONE[c.lane], strong: !!focus && Math.abs(c.i - focus.i) <= 1 }));
  const labId = focus?.id ?? x.id;
  const checkSignals = (top?: string[], bottom?: string[]) => {
    app.setPreset({ top: top ?? x.preset.top, bottom: bottom ?? x.preset.bottom, days: x.preset.days, end: x.preset.end, event: x.id });
    app.go("workspace");
  };
  const mine = app.hyp[x.id];
  const evName = focus ? `${eventDay(focus)} ${eventTime(focus)} · ${focus.type}` : `${x.i > NOW ? "Forecast" : dayOf(x.i) === TODAY ? "Today" : "Yesterday"} ${x.time} · ${EVENT[x.id].type}`;
  const expected = x.status === "context";
  const g = GLANCE[x.id];
  return (
    <div className="grid">
      <div className="crumbs">
        <button className="text-button" onClick={() => app.go("insights")}><Icon name="back" size={14} /> All trends</button>
        <div className="row wrap">
          {INSIGHTS.map((o) => (
            <button key={o.id} className={`chip small ${o.id === x.id ? "active" : ""}`} onClick={() => app.go("insights", o.id)}>{o.time} · {o.title.split(" ").slice(0, 2).join(" ")}</button>
          ))}
        </div>
      </div>

      <Glance tone={expected ? "ok" : g.tone} label={`${evName}${otherDay ? " · part of this trend" : ""}`}
        title={<>{g.metric} <Dir d={g.dir} /> <span className="glance-tag"><Tag tone={expected ? "green" : DIR_TONE[x.trend.direction]}>{expected ? "EXPECTED RESPONSE" : x.trend.direction === "New" ? "NEW · SEEN ONCE" : x.trend.direction.toUpperCase()}</Tag></span></>}
        sub={expected ? "Consistent with exercise. Not a spacecraft-related problem." : g.click}
        cells={[
          { k: "Pattern", v: g.repeat, sub: `Last ${range}` },
          { k: expected ? "Explained by" : "Potential contributor", v: g.contributor, sub: `Confidence: ${confLabel(x.confidence)}` },
          ...(g.action ? [{ k: "What to do", v: REC_SHORT[g.action].do, sub: REC_SHORT[g.action].benefit, primary: true, onClick: () => app.go("actions", g.action) }] : [{ k: "What to do", v: "Nothing needed" }]),
        ]} />

      <Panel>
        <Head title="Is this a pattern?" right={<Ev kind="correlation" />} />
        <div className="trend-q">
          <Disclose k="Happening repeatedly?" v={g.q[0]}><p>{x.trend.repeats}</p></Disclose>
          <Disclose k="Different from my baseline?" v={g.q[1]}><p>{x.trend.baseline}</p></Disclose>
          <Disclose k="After a particular activity?" v={g.q[2]}><p>{x.trend.activity}</p></Disclose>
          <Disclose k="In a particular spacecraft area?" v={g.q[3]}><p>{x.trend.area}</p></Disclose>
          <Disclose k="Around a spacecraft event?" v={g.q[4]}><p>{x.trend.shipEvent}</p></Disclose>
          <Disclose k="Improving or worsening?" v={x.trend.direction === "New" ? "New · too early to say" : x.trend.direction}><p>{x.trend.directionText}</p></Disclose>
        </div>
      </Panel>

      <Panel>
        <Head eyebrow="Health and context together" title="Day by day" right={<Segmented options={RANGES} value={range} onChange={setRange} compact label="Range" />} />
        <DailyCompare rows={rows} onRows={setRows} days={rangeDays(range)} highlight={HIGHLIGHT[x.id]} focusDay={dayOf(focus?.i ?? Math.min(x.i, NOW))} />
      </Panel>

      <div className="grid cols-2">
        <Panel>
          <Head title={x.recs.length ? "What to do" : "No action needed"} />
          {x.recs.map((id) => {
            const r = REC[id];
            const st = app.recStatus(id);
            return (
              <button key={id} className="rec-row" onClick={() => app.go("actions", id)}>
                <span className={`rec-ic t-${r.type.split(" ")[0].toLowerCase()}`}>
                  <Icon name={r.type === "Personal" ? "user" : r.type === "Vehicle schedule" ? "calendar" : r.type === "Work plan" ? "clipboard" : "search"} />
                </span>
                <div>
                  <strong>{REC_SHORT[id]?.do ?? r.title}</strong>
                  <p>{REC_SHORT[id]?.benefit ?? r.effort}</p>
                </div>
                <Tag tone={REC_STATUS[st].tone}>{REC_STATUS[st].label}</Tag>
              </button>
            );
          })}
          {x.recs.length === 0 && <p className="lede">An expected response to exercise.</p>}
        </Panel>
        <Feedback id={x.id} contributor={expected ? undefined : x.contributor} options={x.alternatives.map((a) => a.label)} compact
          example={x.id === "sleep-0214" ? "e.g. I think the late exercise session mattered more than the noise." : undefined} />
      </div>

      <Panel>
        <Head title="More detail" />
        <More label="What happened, in order" count={x.chain.length}>
          <p>{x.happened}</p>
          <ol className="chain">
            {x.chain.map((c, k) => (
              <li key={k} className={`lane-${c.lane === "Spacecraft" ? "engineering" : c.lane.toLowerCase()} ${hover === c.i ? "hot" : ""}`} onMouseEnter={() => setHover(c.i)} onMouseLeave={() => setHover(null)}>
                <time>{c.time}</time>
                <i />
                <div>
                  <div className="row tight wrap">
                    <Tag tone={LANE_TONE[c.lane]}>{c.lane === "Spacecraft" ? "SPACECRAFT ACTIVITY" : c.lane.toUpperCase()}</Tag>
                    <Ev kind={c.evidence} />
                    {c.module && (
                      <button className="linkish small" onClick={() => { app.setFocus({ module: c.module, path: x.spatial.path, equipment: x.spatial.equipment }); app.go("ship"); }}>
                        {MOD[c.module].name}
                      </button>
                    )}
                  </div>
                  <p>{c.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </More>
        <More label="Evidence charts">
        <div className="rowlabel"><Tag tone="amber">SPACECRAFT & CABIN</Tag><Legend series={x.preset.top.map((id) => ({ id }))} /></div>
        <TimeChart series={x.preset.top.map((id) => ({ id }))} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} showForecast={forecast} height={150}
          limit={SIG[x.preset.top[0]].limit} shadeSleep />
        <div className="rowlabel"><Tag tone="blue">YOUR HEALTH</Tag><Legend series={x.preset.bottom.map((id) => ({ id }))} /></div>
        <TimeChart series={x.preset.bottom.map((id) => ({ id }))} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} height={150} shadeSleep />
          <div className="btns"><button className="secondary" onClick={() => app.go("workspace", labId)}><Icon name="link" /> Open in Correlation lab</button></div>
        </More>
        <More label="Past occurrences" count={x.history.rows.length}>
        <table className="tbl">
          <thead><tr><th>When</th><th>{x.history.cols[0]}</th><th>{x.history.cols[1]}</th></tr></thead>
          <tbody>
            {x.history.rows.map((r) => (
              <tr key={r.label} className={r.hit ? "hit" : ""}><td>{r.label}</td><td>{r.a}</td><td>{r.b}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="footnote"><Icon name="info" size={14} /> {x.history.text}</p>
        </More>
        {x.alternatives.length > 0 && (
          <More label="Alternative explanations" count={x.alternatives.length}>
            <div className="alts">
              <div className="alt lead">
                <div className="alt-bar"><i style={{ width: `${x.confidence * 100}%` }} /></div>
                <strong>{x.contributor}</strong>
                <Tag tone="amber">MOST STRONGLY ASSOCIATED FACTOR</Tag>
                {mine?.factors.includes(x.contributor) && <Tag tone="green">YOU AGREE</Tag>}
              </div>
              {x.alternatives.map((a) => (
                <div key={a.id} className={`alt ${alt === a.id ? "open" : ""}`}>
                  <button className="alt-head" aria-expanded={alt === a.id} onClick={() => setAlt(alt === a.id ? null : a.id)}>
                    <div className="alt-bar"><i style={{ width: `${a.weight * 100}%` }} /></div>
                    <strong>{a.label}</strong>
                    <Tag tone={a.verdict === "Unlikely" ? "neutral" : "blue"}>{a.verdict.toUpperCase()}</Tag>
                    {mine?.factors.includes(a.label) && <Tag tone="green">YOUR PICK</Tag>}
                    <Icon name="chevron" className="chev" />
                  </button>
                  {alt === a.id && (
                    <div className="alt-body">
                      <div>
                        <p className="eyebrow">Evidence that suggests it</p>
                        <ul>{a.for.map((t) => <li key={t}>{t}</li>)}</ul>
                      </div>
                      <div>
                        <p className="eyebrow">Evidence against it</p>
                        <ul>{a.against.map((t) => <li key={t}>{t}</li>)}</ul>
                      </div>
                      <button className="secondary" onClick={() => {
                        const env = a.signals.filter((s) => SIG[s].group !== "health");
                        const body = a.signals.filter((s) => SIG[s].group === "health");
                        checkSignals(env.length ? env : undefined, body.length ? body : undefined);
                      }}>
                        <Icon name="link" /> Check {a.signals.map((s) => SIG[s].label.toLowerCase()).join(" and ")} in the Correlation lab
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </More>
        )}
        <More label="Where on the spacecraft">
          <ol className="place-chain">
            <li><Icon name="user" size={15} /><span><small>You</small>{x.place.you}</span></li>
            <li><Icon name="bolt" size={15} /><span><small>Nearby system</small>{x.place.system}</span></li>
            <li><Icon name="pulse" size={15} /><span><small>Relevant event</small>{x.place.event}</span></li>
          </ol>
          <Schematic path={x.spatial.path} equipment={x.spatial.equipment} status={(m) => (x.spatial.path.includes(m) ? "watch" : "none")} compact />
          <p className="muted small">{x.spatial.text}</p>
          <div className="btns"><button className="secondary" onClick={() => { app.setFocus({ module: x.spatial.path[0], path: x.spatial.path, equipment: x.spatial.equipment }); app.go("ship"); }}><Icon name="orbit" /> Open 3D view</button></div>
        </More>
        <More label={`Why confidence is ${confLabel(x.confidence).toLowerCase()}`}>
          <ul className="reasons">
            {x.confidenceWhy.map((r, k) => (
              <li key={k} className={r.good ? "good" : "bad"}>
                <Icon name={r.good ? "plus" : "minus"} size={14} /> {r.text}
              </li>
            ))}
          </ul>
          <p className="footnote">
            Evidence types: {(["direct", "derived", "correlation", "inference", "input"] as const).map((k) => <span key={k} className="ev-inline"><Ev kind={k} /> {EVIDENCE[k].label}</span>)}
          </p>
        </More>
      </Panel>
    </div>
  );
}

/** Trends for an event that is not part of a detected pattern (a meal, a routine equipment run). */
function EventTrend({ e }: { e: LabEvent }) {
  const app = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>("14 days");
  const [rows, setRows] = useState(e.rows);
  const d = detail(e);
  const rec = recurrence(e);
  const days = new Set(EVENTS.filter((o) => o.type === e.type && o.title === e.title).map((o) => dayOf(o.i)));
  const i0 = Math.max(0, e.i - 30);
  const i1 = Math.min(NOW, e.i + 42);
  const marks: Mark[] = [{ i: e.i, label: `${eventTime(e)} ${e.type}: ${e.title}`, tone: e.kind, strong: true }];
  return (
    <div className="grid">
      <div className="crumbs">
        <button className="text-button" onClick={() => app.go("insights")}><Icon name="back" size={14} /> All trends</button>
        <button className="text-button" onClick={() => app.go("workspace", e.id)}><Icon name="link" size={14} /> Open in Correlation lab</button>
      </div>
      <Glance tone={d.contributor ? "watch" : "ok"} label={`${eventDay(e)} ${eventTime(e)} · ${e.type}`} title={e.title}
        sub={d.expected ? d.expected.label.charAt(0) + d.expected.label.slice(1).toLowerCase() : d.changed[0]}
        cells={[
          { k: "Health change", v: d.contributor || !d.expected ? d.changed[0] : "As expected" },
          { k: "Potential contributor", v: d.contributor ?? (d.expected ? "The activity itself" : "None identified"), sub: d.confidence != null ? `Confidence: ${confLabel(d.confidence)}` : "Not rated" },
          { k: "Seen before", v: `${rec.rows.length} recent times` },
        ]} />
      <Panel>
        <Head eyebrow="Health and context together" title="Day by day" right={<Segmented options={RANGES} value={range} onChange={setRange} compact label="Range" />} />
        <DailyCompare rows={rows} onRows={setRows} days={rangeDays(range)} highlight={{ label: `Days with this event`, on: (q) => days.has(q) }} focusDay={dayOf(e.i)} />
      </Panel>
      <Panel>
        <Head title="More detail" />
        <More label="What happened and what changed">
          <p>{d.expected?.text ?? d.happened}</p>
          <ul className="plain-list tight">{[...d.changed, ...d.info].map((c) => <li key={c}>{c}</li>)}</ul>
          {d.ship && <div className="ship-ctx"><p className="eyebrow"><Icon name="bolt" size={13} /> Spacecraft activity at the time</p><p>{d.ship}</p></div>}
        </More>
        <More label="Past occurrences" count={rec.rows.length}>
          <table className="tbl">
            <thead><tr><th>When</th><th>{rec.cols[0]}</th><th>{rec.cols[1]}</th></tr></thead>
            <tbody>{rec.rows.map((r) => <tr key={r.id} className={r.hit ? "hit" : ""}><td>{r.label}</td><td>{r.a}</td><td>{r.b}</td></tr>)}</tbody>
          </table>
          <p className="lag-line"><Icon name="trend" size={16} /> {d.history}</p>
        </More>
        <More label="Evidence charts">
          <div className="rowlabel"><Tag tone="amber">SPACECRAFT & CABIN</Tag><Legend series={e.top.map((id) => ({ id }))} /></div>
          <TimeChart series={e.top.map((id) => ({ id }))} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} height={140} shadeSleep />
          <div className="rowlabel"><Tag tone="blue">YOUR HEALTH</Tag><Legend series={e.bottom.map((id) => ({ id }))} /></div>
          <TimeChart series={e.bottom.map((id) => ({ id }))} i0={i0} i1={i1} hover={hover} onHover={setHover} marks={marks} height={140} shadeSleep />
        </More>
      </Panel>
      <Feedback id={e.id} contributor={d.contributor} options={d.others} compact />
    </div>
  );
}

export default function Insights() {
  const app = useApp();
  const p = app.route.param;
  const e = p ? EVENT[p] : undefined;
  const x = p && INSIGHT[p] ? INSIGHT[p] : e?.insight ? INSIGHT[e.insight] : undefined;
  if (x) return <Detail key={p} x={x} focus={e && e.id !== x.id ? e : undefined} />;
  if (e) return <EventTrend key={e.id} e={e} />;
  return <List />;
}
