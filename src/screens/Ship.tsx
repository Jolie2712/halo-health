import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Segmented, Schematic, StatusDot, ENV_WORD, STATUS_TONE, Spark, seriesSlice, Terms, Confidence, More, Dir } from "../ui";
import { EVENTS, KIND } from "../data/events";
import Ship3D from "./Ship3D";
import { ENV_META, envStatus, INSIGHTS, SUBSYSTEMS, SIG, REC, lc, GLANCE, REC_SHORT } from "../data/content";
import { S, NOW, PER_DAY, TODAY, idx, MOD, MODULES, CREW, CREW_NOW, fmtIdx, type ModuleId, type EnvParam, ENV_PARAMS } from "../data/sim";

const LAYERS = ["Status", "CO₂", "Noise", "Temperature", "Vibration"] as const;
const LAYER_PARAM: Record<string, EnvParam | null> = { Status: null, "CO₂": "co2", Noise: "noise", Temperature: "temp", Vibration: "vib" };
const COL = { ok: "#9fb0c3", watch: "#e0a52e", high: "#d9553f" };

export function moduleStatus(m: ModuleId, t: number): "ok" | "watch" | "high" {
  let worst: "ok" | "watch" | "high" = "ok";
  for (const p of ["co2", "noise", "temp", "vib"] as const) {
    const s = envStatus(p, m, S[`${p}_${m}`][t]);
    if (s === "high") return "high";
    if (s === "watch") worst = "watch";
  }
  return worst;
}

export default function Ship() {
  const app = useApp();
  const f = app.focus;
  const [selected, setSelected] = useState<ModuleId>((f?.module as ModuleId) ?? (app.route.param as ModuleId) ?? "work");
  const [layer, setLayer] = useState<(typeof LAYERS)[number]>("Status");
  const [view, setView] = useState<"3D" | "Plan">("3D");
  const [crew, setCrew] = useState(true);
  const [t, setT] = useState(NOW);
  const [path, setPath] = useState<ModuleId[] | undefined>(f?.path as ModuleId[] | undefined);
  const [equipment, setEquipment] = useState<string | undefined>(f?.equipment);
  const [openSys, setOpenSys] = useState<string | null>(null);
  const api = useRef<{ zoom: (f: number) => void; reset: () => void } | null>(null);
  useEffect(() => {
    if (f) {
      if (f.module) setSelected(f.module as ModuleId);
      setPath(f.path as ModuleId[] | undefined);
      setEquipment(f.equipment);
      app.setFocus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const param = LAYER_PARAM[layer];
  const statusOf = useCallback((m: ModuleId) => (param ? envStatus(param, m, S[`${param}_${m}`][t]) : moduleStatus(m, t)), [param, t]);
  const colorOf = useCallback((m: ModuleId) => COL[statusOf(m)], [statusOf]);
  const labelOf = useMemo(() => (param ? (m: ModuleId) => `${S[`${param}_${m}`][t].toFixed(ENV_META[param].dec)} ${ENV_META[param].unit}` : undefined), [param, t]);
  const mod = MOD[selected];
  const here = CREW.filter((c) => CREW_NOW[c.id].module === selected);
  const events = EVENTS.filter((e) => (e.module === selected || (!e.module && e.kind === "spacecraft")) && e.priority >= 2 && e.i <= t && e.i > t - PER_DAY).slice(-6).reverse();
  const insights = INSIGHTS.filter((x) => x.spatial.path.includes(selected));
  const systems = SUBSYSTEMS.filter((s) => s.module === selected || mod.systems.includes(s.id));
  const story = path && INSIGHTS.find((x) => x.spatial.path.join() === path.join());

  return (
    <div className="grid cols-side ship-grid">
      <Panel className="ship-panel" pad={false}>
        <div className="ship-tools">
          <Segmented options={LAYERS} value={layer} onChange={setLayer} compact label="Map layer" />
          <div className="row">
            <label className="check dark"><input type="checkbox" checked={crew} onChange={(e) => setCrew(e.target.checked)} /> Crew</label>
            <Segmented options={["3D", "Plan"] as const} value={view} onChange={setView} compact label="View" />
            {view === "3D" && (
              <div className="zoom">
                <button aria-label="Zoom in" onClick={() => api.current?.zoom(0.82)}><Icon name="plus" /></button>
                <button aria-label="Zoom out" onClick={() => api.current?.zoom(1.2)}><Icon name="minus" /></button>
                <button aria-label="Reset view" onClick={() => api.current?.reset()}><Icon name="rotate" /></button>
              </div>
            )}
          </div>
        </div>
        {path && (
          <div className="ship-story">
            <Icon name="link" />
            <div>
              <strong>{story ? `${story.place.you} → ${story.place.system} → ${story.place.event}` : `${path.map((m) => MOD[m].name).join(" → ")}${equipment ? ` → ${equipment}` : ""}`}</strong>
            </div>
            <button className="icon-button dark" aria-label="Clear highlighted path" onClick={() => { setPath(undefined); setEquipment(undefined); }}><Icon name="close" /></button>
          </div>
        )}
        <div className="ship-stage">
          {view === "3D" ? (
            <Ship3D selected={selected} onSelect={setSelected} colorOf={colorOf} labelOf={labelOf} path={path} equipment={equipment} showCrew={crew} api={api}
              reduceMotion={app.settings.reduceMotion} onFail={() => setView("Plan")} />
          ) : (
            <div className="plan-wrap">
              <Schematic selected={selected} onSelect={setSelected} status={statusOf} path={path} equipment={equipment} crew={crew} valueFor={labelOf} />
            </div>
          )}
        </div>
        <div className="ship-foot">
          <div className="map-legend">
            <span><i className="sw" style={{ background: COL.ok }} /> Within limits</span>
            <span><i className="sw" style={{ background: COL.watch }} /> Approaching limit</span>
            <span><i className="sw" style={{ background: COL.high }} /> Above limit</span>
            {crew && <span><i className="sw round you" /> You</span>}
            {crew && <span><i className="sw round" /> Crew</span>}
            {view === "3D" && <span className="hint">Drag to rotate · click a module</span>}
          </div>
          <div className="time-scrub">
            <span>Conditions at <b>{t === NOW ? "now · 11:22" : fmtIdx(t, true)}</b></span>
            <input type="range" min={NOW - PER_DAY} max={NOW} step={1} value={t} onChange={(e) => setT(+e.target.value)} aria-label="Time of conditions shown" />
            <div className="row">
              <button className={`chip small ${t === idx(TODAY, 120) ? "active" : ""}`} onClick={() => { setT(idx(TODAY, 120)); setLayer("Noise"); setSelected("quarters"); setPath(["quarters", "service"]); setEquipment("Ventilation fan B"); }}>02:00 fan cycle</button>
              <button className={`chip small ${t === idx(TODAY, 610) ? "active" : ""}`} onClick={() => { setT(idx(TODAY, 610)); setLayer("CO₂"); setSelected("lab"); setPath(undefined); setEquipment(undefined); }}>10:10 lab CO₂</button>
              <button className={`chip small ${t === idx(TODAY, 640) ? "active" : ""}`} onClick={() => { setT(idx(TODAY, 640)); setLayer("Vibration"); setSelected("work"); setPath(undefined); setEquipment(undefined); }}>10:40 burn</button>
              <button className={`chip small ${t === NOW ? "active" : ""}`} onClick={() => setT(NOW)}>Now</button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid">
        <Panel>
          <Head level={2} title={mod.name} right={<Tag tone={STATUS_TONE[moduleStatus(selected, t)]}>{ENV_WORD[moduleStatus(selected, t)].toUpperCase()}</Tag>} />
          <p className="eyebrow">{t === NOW ? "Now" : fmtIdx(t, true)}</p>
          <div className="cond">
            {ENV_PARAMS.map((p) => {
              const v = S[`${p}_${selected}`][t];
              const st = envStatus(p, selected, v);
              return (
                <button key={p} onClick={() => app.go("environment", `${p}-${selected}`)} title={ENV_META[p].note}>
                  <span><Terms>{ENV_META[p].label}</Terms></span>
                  <strong>{v.toFixed(ENV_META[p].dec)} <small>{ENV_META[p].unit}</small></strong>
                  <Spark data={seriesSlice(`${p}_${selected}`, t - 72, t + 1, 36)} height={20} color={st === "ok" ? "#55667d" : st === "watch" ? "#b77912" : "#c0392b"} />
                  <StatusDot s={st} />
                </button>
              );
            })}
          </div>
          <p className="eyebrow">Who is here</p>
          <div className="who">
            {here.length ? here.map((c) => (
              <div key={c.id}><span className={`avatar ${c.you ? "you" : ""}`}>{c.initials}</span><div><strong>{c.you ? "You" : c.name}</strong><span>{CREW_NOW[c.id].activity}</span></div></div>
            )) : <span className="muted">Nobody. {selected === "quarters" ? "Next use: 21:00 personal time." : ""}</span>}
          </div>
        </Panel>
        {insights.filter((x) => x.status !== "context").slice(0, 1).map((x) => (
          <Panel key={x.id} className="place-panel">
            <Head eyebrow="Link to your health" title={<>{GLANCE[x.id].metric} <Dir d={GLANCE[x.id].dir} /></>} right={<Confidence value={x.confidence} showLabel={false} />} />
            <ol className="place-chain">
              <li><Icon name="user" size={15} /><span><small>{x.spatial.path[0] === "quarters" ? "Sleeping area" : "Your position"}</small>{x.place.you}</span></li>
              <li><Icon name="bolt" size={15} /><span><small>Nearby system</small>{x.place.system}</span></li>
              <li><Icon name="pulse" size={15} /><span><small>Relevant event</small>{x.place.event}</span></li>
            </ol>
            {x.recs[0] && (
              <button className="secondary wide" onClick={() => app.go("actions", x.recs[0])}>
                <span><small>What to do</small>{REC_SHORT[x.recs[0]].do}</span><Icon name="arrow" />
              </button>
            )}
            <div className="btns">
              <button className="secondary" onClick={() => { setPath(x.spatial.path); setEquipment(x.spatial.equipment); setSelected(x.spatial.path[0]); }}><Icon name="orbit" /> Highlight on map</button>
              <button className="secondary" onClick={() => app.go("workspace", x.id)}><Icon name="link" /> See the event</button>
            </div>
          </Panel>
        ))}
        <Panel>
          <More label="About this module"><p>{mod.purpose}</p></More>
          <More label="Nearby systems" count={systems.length}>
          {systems.map((s) => (
            <div key={s.id} className={`sys ${openSys === s.id ? "open" : ""}`}>
              <button className="list-btn" aria-expanded={openSys === s.id} onClick={() => setOpenSys(openSys === s.id ? null : s.id)}>
                <div>
                  <strong>{s.name} <Tag tone={s.state === "Nominal" ? "green" : "amber"}>{s.state.toUpperCase()}</Tag></strong>
                  <span>{s.crew.split(". ")[0].replace(/\.$/, "")}</span>
                </div>
                <Icon name="chevron" className="chev" />
              </button>
              {openSys === s.id && (
                <div className="sys-body">
                  <p>{s.plain}</p>
                  <dl className="kv">
                    {s.items.slice(0, 4).map((it) => (
                      <div key={it.tag}><dt>{it.label}<small>{it.note}</small></dt><dd>{it.sig ? `${S[it.sig][t].toFixed(SIG[it.sig].dec)} ${SIG[it.sig].unit}` : it.value}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ))}
          <p className="muted small">Next to: {mod.neighbours.map((n) => (
            <button key={n} className="linkish small" onClick={() => setSelected(n)}>{MOD[n].name}</button>
          ))}</p>
          </More>
          <More label="Last 24 hours here" count={insights.length + events.filter((e) => !insights.some((x) => x.id === e.id)).length}>
          {insights.map((x) => (
            <button key={x.id} className="list-btn hot" onClick={() => app.go("workspace", x.id)}>
              <div>
                <strong>{x.time} · {x.title}</strong>
                <span>Likely contributor: {GLANCE[x.id].contributor}</span>
              </div>
              <Icon name="chevron" />
            </button>
          ))}
          {events.filter((e) => !insights.some((x) => x.id === e.id)).map((e) => (
            <button key={e.id} className="list-btn" onClick={() => app.go("workspace", e.id)}>
              <div>
                <strong><i className="kdot" style={{ background: KIND[e.kind].color }} /> {fmtIdx(e.i, e.i < idx(TODAY, 0))} · {e.type}</strong>
                <span>{e.title}</span>
              </div>
              <Icon name="chevron" />
            </button>
          ))}
          {!insights.length && !events.length && <p className="muted">Nothing recorded.</p>}
          </More>
        </Panel>
      </div>
    </div>
  );
}
export { MODULES };
