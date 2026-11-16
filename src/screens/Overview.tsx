import { useMemo } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Spark, StatusDot, Confidence, ENV_WORD, Terms, Term, Dir, More } from "../ui";
import { readings, whereNow } from "../data/derive";
import { INSIGHTS, RECS, READINESS, ENV_META, envStatus, ALERTS, ROUTINE, GLANCE, REC_SHORT } from "../data/content";
import { S, NOW, hhmm } from "../data/sim";

const TILE = [
  { id: "sleep", label: "Sleep" },
  { id: "fatigue", label: "Fatigue" },
  { id: "stress", label: "Stress" },
  { id: "pvt", label: "Reaction time" },
  { id: "hrv", label: "Recovery" },
];
const REC_ICON = { Personal: "user", "Vehicle schedule": "calendar", "Work plan": "clipboard", Investigation: "search" } as const;

/** Level 1: status and the one thing that matters. Level 2: changes and actions. Level 3 stays one click away. */
export default function Overview() {
  const app = useApp();
  const rd = useMemo(readings, []);
  const w = whereNow();
  const open = INSIGHTS.filter((x) => x.status !== "context");
  const mod = w.module.id;
  const env = (["co2", "noise", "temp", "light"] as const).map((p) => ({ p, v: S[`${p}_${mod}`][NOW], st: envStatus(p, mod, S[`${p}_${mod}`][NOW]) }));
  const routineDue = ROUTINE.filter((r) => !r.done && !app.routine.includes(r.id));
  const activeAlerts = ALERTS.filter((a) => !a.resolved && !app.ack.includes(a.id));
  const todo = ["shift-regen", "co2-dualbed"].map((id) => RECS.find((r) => r.id === id)!).filter((r) => ["new", "reviewed"].includes(app.recStatus(r.id)));
  const top = GLANCE["sleep-0214"];

  return (
    <div className="grid">
      <section className="hero panel">
        <div className="hero-main">
          <Tag tone="amber">OK FOR DUTY · RECOVERY ↓</Tag>
          <h2>You are okay for today.</h2>
          <div className="hero-cells">
            <div>
              <span>What changed</span>
              <strong>Sleep <Dir d="down" /> · Recovery <Dir d="down" /></strong>
              <small>Short, broken night</small>
            </div>
            <button onClick={() => app.go("workspace", "sleep-0214")}>
              <span>Likely contributor</span>
              <strong>{top.contributor} at 02:14</strong>
              <small>See what happened <Icon name="arrow" size={13} /></small>
            </button>
            <button className="do" onClick={() => app.go("actions", "shift-regen")}>
              <span>What to do</span>
              <strong>{REC_SHORT["shift-regen"].do}</strong>
              <small>Review this action <Icon name="arrow" size={13} /></small>
            </button>
          </div>
        </div>
        <div className="hero-score">
          <div className="score-ring" style={{ "--score": `${READINESS.score * 3.6}deg` } as React.CSSProperties}>
            <span>
              <strong>{READINESS.score}</strong>
              <small><Term k="readiness">readiness</Term></small>
            </span>
          </div>
          <div className="hero-score-note">
            <span>Your usual: {READINESS.usual}</span>
          </div>
        </div>
      </section>

      <section>
        <Head title="Right now" right={<span className="updated">vs your own <Term k="baseline">baseline</Term></span>} />
        <div className="tiles">
          {TILE.map((t) => {
            const r = rd[t.id];
            return (
              <button key={t.id} className={`tile st-${r.status}`} onClick={() => app.go("health", t.id)} title={r.delta}>
                <div className="tile-top">
                  <span className="tile-name"><Terms>{t.label}</Terms>{r.status !== "ok" && <Dir d={r.dir} />}</span>
                  <StatusDot s={r.status} />
                </div>
                <div className="tile-value">
                  {r.value} <small>{r.unit}</small>
                </div>
                <div className="tile-phrase">{r.phrase}</div>
                <Spark data={r.spark} band={r.band} color={r.status === "ok" ? "#198a62" : r.status === "watch" ? "#b77912" : "#c0392b"} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid cols-2">
        <Panel>
          <Head title="Needs attention" right={<span className="count-pill">{open.length}</span>} />
          <div className="insight-list">
            {open.map((x) => {
              const g = GLANCE[x.id];
              return (
                <button key={x.id} className="insight-row" onClick={() => app.go("workspace", x.id)}>
                  <time>{x.time}</time>
                  <div>
                    <strong>{g.metric} <Dir d={g.dir} /></strong>
                    <p>Likely contributor: <b>{g.contributor}</b></p>
                  </div>
                  <Confidence value={x.confidence} showLabel={false} />
                  <Icon name="chevron" />
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <Head title="To do" right={<button className="text-button" onClick={() => app.go("actions")}>All actions <Icon name="arrow" size={14} /></button>} />
          <div className="need-list">
            {todo.map((r) => (
              <button key={r.id} className="need" onClick={() => app.go("actions", r.id)}>
                <Icon name={REC_ICON[r.type]} />
                <div>
                  <strong>{REC_SHORT[r.id].do}</strong>
                  <span>{REC_SHORT[r.id].benefit}</span>
                </div>
                <Icon name="chevron" />
              </button>
            ))}
            {routineDue.slice(0, 2).map((r) => (
              <button key={r.id} className="need" onClick={() => app.go("checkin", r.id)}>
                <Icon name="clipboard" />
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.when} · {r.mins} min</span>
                </div>
                <Icon name="chevron" />
              </button>
            ))}
            {activeAlerts.length > 0 && (
              <button className="need" onClick={() => app.go("alerts")}>
                <Icon name="bell" />
                <div>
                  <strong>{activeAlerts.length} alerts</strong>
                  <span>None critical</span>
                </div>
                <Icon name="chevron" />
              </button>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <More label={`Around you now · ${w.module.name} · next ${hhmm(w.next.start)} ${w.next.label}`}>
          <div className="envmini">
            {env.map((e) => (
              <button key={e.p} onClick={() => app.go("environment", e.p)}>
                <span><Terms>{ENV_META[e.p].label}</Terms></span>
                <strong>
                  {e.v.toFixed(ENV_META[e.p].dec)} <small>{ENV_META[e.p].unit}</small>
                </strong>
                <span className="row tight">
                  <StatusDot s={e.st} /> {ENV_WORD[e.st]}
                </span>
              </button>
            ))}
          </div>
          <div className="btns">
            <button className="secondary" onClick={() => { app.setFocus({ module: mod }); app.go("ship"); }}><Icon name="orbit" /> Show on the ship</button>
            <button className="secondary" onClick={() => app.go("environment")}><Icon name="wind" /> Effect on my health</button>
          </div>
        </More>
      </Panel>
    </div>
  );
}
