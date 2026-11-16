import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Spark, StatusDot, Segmented, TimeChart, Provenance, STATUS_WORD, STATUS_TONE, Ev, Terms, Term, Glance, More, Dir, Fact } from "../ui";
import { EVENT } from "../data/events";
import { readings, regionStatus, type Reading } from "../data/derive";
import { METRICS, REGIONS, PASSIVE, SIG, type Region, INSIGHTS, GLANCE, REC_SHORT } from "../data/content";
import { NOW, PER_DAY, TODAY, idx, NIGHTS, hypnogram, MD0, P } from "../data/sim";

const SPOT: Record<Region, { x: number; y: number; label: string }> = {
  head: { x: 110, y: 46, label: "Brain, sleep & mood" },
  lungs: { x: 90, y: 142, label: "Breathing" },
  heart: { x: 128, y: 156, label: "Heart" },
  core: { x: 110, y: 222, label: "Metabolism" },
  muscle: { x: 90, y: 338, label: "Bones & muscles" },
  whole: { x: 176, y: 418, label: "Radiation" },
};
const short = (n: string) => n.replace(/ (estimate|index)$/, "");
const RANGES = ["Today", "24 hours", "7 days", "30 days"] as const;

function Body({ sel, onSel, st }: { sel: Region; onSel: (r: Region) => void; st: Record<Region, "ok" | "watch" | "high"> }) {
  return (
    <svg viewBox="0 0 220 470" className="body-fig" role="group" aria-label="Body map. Choose a body area.">
      <g className="body-shape">
        <circle cx="110" cy="46" r="30" />
        <path d="M97 76h26v14c0 4 4 8 10 10l26 8c9 3 14 10 15 19l8 86c1 8-4 14-11 15s-13-4-14-12l-7-66-2 0 0 96 6 150c0 10-7 17-16 17s-15-7-16-16l-9-128h-2l-9 128c-1 9-7 16-16 16s-16-7-16-17l6-150 0-96-2 0-7 66c-1 8-7 13-14 12s-12-7-11-15l8-86c1-9 6-16 15-19l26-8c6-2 10-6 10-10Z" />
      </g>
      {(Object.keys(SPOT) as Region[]).map((r) => (
        <g key={r} className={`spot st-${st[r]} ${sel === r ? "selected" : ""}`} onClick={() => onSel(r)} tabIndex={0} role="button"
          aria-label={`${REGIONS[r].name}: ${STATUS_WORD[st[r]]}`} aria-pressed={sel === r} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSel(r)}>
          {st[r] !== "ok" && <circle cx={SPOT[r].x} cy={SPOT[r].y} r="20" className="halo" />}
          <circle cx={SPOT[r].x} cy={SPOT[r].y} r="13" className="core" />
          {st[r] === "ok" ? (
            <path d={`M${SPOT[r].x - 5} ${SPOT[r].y}l4 4 6-8`} className="glyph" />
          ) : (
            <path d={`M${SPOT[r].x} ${SPOT[r].y - 6}v7M${SPOT[r].x} ${SPOT[r].y + 5}v.5`} className="glyph" />
          )}
          <text x={SPOT[r].x + (SPOT[r].x >= 110 ? 20 : -20)} y={SPOT[r].y + 4} textAnchor={SPOT[r].x >= 110 ? "start" : "end"}>{SPOT[r].label}</text>
        </g>
      ))}
    </svg>
  );
}

function Hypnogram() {
  const n = NIGHTS[NIGHTS.length - 1];
  const i0 = idx(TODAY - 1, 1350);
  const i1 = idx(TODAY, 400);
  const cells: number[] = [];
  for (let i = i0; i < i1; i++) cells.push(i < n.onset ? 0 : hypnogram[i]);
  const names = ["Awake", "Light", "Deep", "REM"];
  const row = [0, 3, 1, 2];
  return (
    <div className="hypno">
      <div className="hypno-rows">
        {row.map((st) => (
          <div key={st}>
            <span>{names[st]}</span>
            <div>
              {cells.map((c, k) => (
                <i key={k} className={c === st ? `on s${st}` : ""} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hypno-axis">
        <span>22:30</span><span>00:30</span><span>02:30</span><span>04:30</span><span>06:30</span>
      </div>
      <div className="hypno-mark" style={{ left: `calc(64px + (100% - 64px) * ${(idx(TODAY, 134) - i0) / (i1 - i0)})` }}>
        <b>02:14</b>
      </div>
    </div>
  );
}

export default function Health() {
  const app = useApp();
  const rd = useMemo(readings, []);
  const initial = METRICS.find((m) => m.id === app.route.param);
  const [region, setRegion] = useState<Region>(initial?.region ?? "head");
  const [metricId, setMetricId] = useState<string>(initial?.id ?? "sleep");
  const [range, setRange] = useState<(typeof RANGES)[number]>("7 days");
  const [cmp, setCmp] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const st = Object.fromEntries((Object.keys(REGIONS) as Region[]).map((r) => [r, regionStatus(r, rd)])) as Record<Region, "ok" | "watch" | "high">;
  const list = METRICS.filter((m) => m.region === region);
  const metric = METRICS.find((m) => m.id === metricId && m.region === region) ?? list[0];
  const r: Reading = rd[metric.id];
  const sig = metric.sig ? SIG[metric.sig] : undefined;
  const isPts = !!sig?.points;
  const win: [number, number] =
    range === "Today" ? [idx(TODAY, 0), idx(TODAY + 1, 0)] : range === "24 hours" ? [NOW - PER_DAY, NOW] : range === "7 days" ? [NOW - PER_DAY * 7, NOW] : [0, NOW];
  const related = INSIGHTS.filter((x) => x.preset.bottom.includes(metric.sig ?? "") || (metric.id === "sleep" && x.id === "sleep-0214") || (metric.id === "pvt" && x.id === "co2-lab"));
  const pickRegion = (rg: Region) => {
    setRegion(rg);
    setMetricId(METRICS.find((m) => m.region === rg)!.id);
  };
  const explain: [string, string][] = [
    ["What it is", metric.what], ["How it is measured", metric.how], ["Why it matters in space", metric.why],
    ["When to raise it", metric.flag], ["What you can do", metric.act],
  ];
  // Relevant context is brought forward for the selected metric, so nothing has to be remembered from another page.
  const ctxId = ({ sleep: "sleep-0214", hrv: "sleep-0214", fatigue: "sleep-0214", pvt: "co2-lab", stress: "stress-1042", hr: "stress-1042" } as Record<string, string>)[metric.id];
  const ctx = ctxId ? GLANCE[ctxId] : undefined;
  const off = METRICS.filter((m) => rd[m.id]?.status !== "ok" && ["sleep", "hrv", "pvt", "fatigue", "stress"].includes(m.id));
  const manual = app.logs.filter((l) => l.type === metric.id || (metric.id === "pvt" && l.type === "pvt"));

  return (
    <div className="grid">
    <Glance tone={off.length ? "watch" : "ok"} label="My health now"
      title={off.length ? <>{off.slice(0, 3).map((m, k) => <span key={m.id}>{k > 0 && " · "}{short(m.name)} <Dir d={rd[m.id].dir} /></span>)}</> : "All within your usual range"}
      sub={off.length ? "Off your baseline after a short night. Everything else is usual." : undefined}
      cells={off.length ? [
        { k: "Likely contributor", v: `${GLANCE["sleep-0214"].contributor} at 02:14`, sub: "See what happened", onClick: () => app.go("workspace", "sleep-0214") },
        { k: "What to do", v: REC_SHORT["shift-regen"].do, sub: REC_SHORT["shift-regen"].benefit, primary: true, onClick: () => app.go("actions", "shift-regen") },
      ] : []} />
    <div className="grid health-grid">
      <Panel className="body-panel">
        <Head title="Pick a body area" right={<Tag tone="violet">SIMULATED</Tag>} />
        <Body sel={region} onSel={pickRegion} st={st} />
        <div className="body-legend">
          <span><StatusDot s="ok" /> Usual</span>
          <span><StatusDot s="watch" /> Off your <Term k="baseline">baseline</Term></span>
          <span><StatusDot s="high" /> Well off</span>
        </div>
        <div className="region-list">
          {(Object.keys(REGIONS) as Region[]).map((rg) => (
            <button key={rg} className={region === rg ? "active" : ""} onClick={() => pickRegion(rg)}>
              <StatusDot s={st[rg]} />
              <span>{REGIONS[rg].name}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid">
        <Panel>
          <Head level={2} title={REGIONS[region].name} right={<Tag tone={STATUS_TONE[st[region]]}>{STATUS_WORD[st[region]].toUpperCase()}</Tag>} />
          <div className="metric-cards">
            {list.map((m) => {
              const x = rd[m.id];
              return (
                <button key={m.id} className={`metric-card st-${x.status} ${metric.id === m.id ? "active" : ""}`} onClick={() => setMetricId(m.id)} title={x.note} aria-pressed={metric.id === m.id}>
                  <div className="row between">
                    <span className="tile-name"><Terms>{short(m.name)}</Terms>{x.status !== "ok" && <Dir d={x.dir} />}</span>
                    <StatusDot s={x.status} />
                  </div>
                  <strong>
                    {x.value} <small>{x.unit}</small>
                  </strong>
                  <b className="phrase">{x.phrase}</b>
                  <Spark data={x.spark} band={x.band} height={24} color={x.status === "ok" ? "#198a62" : x.status === "watch" ? "#b77912" : "#c0392b"} />
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <Head eyebrow={<Terms>{metric.name}</Terms>} title={<>{r.value} <small className="unit">{r.unit}</small> <span className="delta">{r.phrase}</span></>}
            right={sig && <Segmented options={RANGES} value={range} onChange={setRange} compact label="Time range" />} />
          {sig ? (
            <>
              {metric.id === "sleep" && range !== "30 days" && range !== "7 days" ? (
                <Hypnogram />
              ) : (
                <TimeChart series={[{ id: sig.id }]} i0={win[0]} i1={win[1]} hover={hover} onHover={setHover} shadeSleep={!isPts && range !== "30 days"}
                  height={210} limit={sig.limit} compare={cmp && !isPts && (range === "Today" || range === "24 hours") ? { id: sig.id, offset: PER_DAY, label: "Yesterday" } : undefined}
                  marks={INSIGHTS.filter((x) => x.status !== "context").map((x) => ({ i: x.i <= NOW ? x.i : -1, label: `${x.time} · ${EVENT[x.id].type}: ${x.title}`, tone: EVENT[x.id].kind, onClick: () => app.go("workspace", x.id) }))} />
              )}
            </>
          ) : (
            <div className="plain-block">
              <p>{r.delta}. {r.note}.</p>
              <div className="week">
                {["MD 178", "MD 179", "MD 180", "MD 181", "MD 182", "MD 183", "MD 184"].map((d, k) => (
                  <div key={d} className={k === 5 ? "late" : k === 6 ? "todo" : "done"}>
                    <i>{k === 6 ? "17:30" : k === 5 ? "Late" : "Done"}</i>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {manual.length > 0 && (
            <div className="callout">
              <strong>Your entries today</strong>
              {manual.map((l) => <p key={l.id}><Ev kind="input" /> {l.at} · {l.label}: <b>{l.value}</b></p>)}
            </div>
          )}
          {ctx && (
            <div className="ctx-strip">
              <span className="fact-k">Related factors</span>
              <div className="ctx-chips">
                {ctx.factors.map((f) => <span key={f.label} className={f.flag ? "flag" : ""}><b><Terms>{f.label}</Terms></b> {f.state}</span>)}
              </div>
            </div>
          )}
          <div className="btns">
            {["bp", "glucose", "temp", "pvt", "mood"].includes(metric.id) && (
              <button className="primary" onClick={() => app.go("checkin", metric.id)}>
                <Icon name="plus" /> {metric.id === "pvt" ? "Take a reaction test" : "Log a measurement"}
              </button>
            )}
            {sig && !isPts && (
              <button className="secondary" onClick={() => { app.setPreset({ top: ["noise_work", "co2_work"], bottom: [sig.id], days: 1, end: NOW }); app.go("workspace"); }}>
                <Icon name="link" /> What was happening around me
              </button>
            )}
            {related.slice(0, 1).map((x) => (
              <button key={x.id} className="secondary" onClick={() => app.go("workspace", x.id)}>
                <Icon name="search" /> {x.title}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <More label={`About ${metric.name.toLowerCase()}`}>
            <div className="about-list">
              {explain.map(([k, v]) => <Fact key={k} k={k}><p className="about-p">{v}</p></Fact>)}
              <Fact k="In space"><p className="about-p">{REGIONS[region].space}</p></Fact>
            </div>
            {sig && <Provenance id={sig.id} age={r.age} />}
            {sig && !isPts && (range === "Today" || range === "24 hours") && metric.id !== "sleep" && (
              <label className="check">
                <input type="checkbox" checked={cmp} onChange={(e) => setCmp(e.target.checked)} /> Compare with yesterday (dashed)
              </label>
            )}
          </More>
          <More label="Experimental signals · research only" count={PASSIVE.length}>
            <Tag tone="violet">NOT VALIDATED FOR MEDICAL USE</Tag>
          <div className="passive">
            {PASSIVE.map((p) => (
              <div key={p.name}>
                <strong>{p.name}</strong>
                <span className="row tight wrap"><Tag tone="violet">PASSIVE SIGNAL</Tag><Tag tone="neutral">RESEARCH</Tag><Tag tone="neutral">{p.conf.toUpperCase()}</Tag></span>
                <span>{p.method}</span>
                <b>{p.state}</b>
                <em>{p.note}</em>
              </div>
            ))}
          </div>
          </More>
        </Panel>
      </div>
    </div>
    </div>
  );
}
export { MD0, P, Icon };
