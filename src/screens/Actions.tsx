import { useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, Confidence, Modal, Segmented, Ev, Schematic, More, Disclose, Dir } from "../ui";
import { RECS, REC, REC_STATUS, INSIGHT, FACTS, GLANCE, REC_SHORT, type Rec, type RecStatus } from "../data/content";
import { MOD } from "../data/sim";

const OPEN: RecStatus[] = ["new", "reviewed"];
const PROGRESS: RecStatus[] = ["accepted", "scheduled", "sent", "approved", "planned", "shared", "investigating"];
const FILTERS = ["To review", "In progress", "Closed", "All"] as const;
const ICON = { "Vehicle schedule": "calendar", Personal: "user", "Work plan": "clipboard", Investigation: "search" } as const;

function Learn({ r }: { r: Rec }) {
  const app = useApp();
  const regen = ["approved", "scheduled"].includes(app.recStatus("shift-regen"));
  const swap = app.recStatus("swap-station") === "accepted";
  if (r.insight !== "sleep-0214" || (!regen && !swap && app.recStatus("night-compare") !== "investigating")) return null;
  const noise = regen ? [48, 47, 48] : swap ? [57, 58, 57] : [63, 62, 63];
  const qual = regen ? [85, 87, 86] : swap ? [78, 80, 79] : [70, 72, 71];
  const n = app.nights;
  const conf = regen || swap ? [0.66, 0.7, 0.76, 0.82][n] : [0.66, 0.68, 0.7, 0.72][n];
  return (
    <Panel className="learn">
      <Head title="Did the change help?" right={<Tag tone="violet">DEMO · SIMULATED NIGHTS</Tag>} />
      <p className="lede">{regen ? "Cycle now runs in the daytime." : swap ? "You are sleeping in station 4." : "No change made yet. Watching only."}</p>
      <table className="tbl">
        <thead><tr><th>Sleep period</th><th>Peak noise</th><th>Awakenings</th><th>Sleep quality</th></tr></thead>
        <tbody>
          <tr className="hit"><td>MD 184 · before</td><td>63 dBA</td><td>3</td><td>71%</td></tr>
          {[0, 1, 2].slice(0, n).map((k) => (
            <tr key={k}><td>MD {185 + k} · after</td><td>{noise[k]} dBA</td><td>{regen ? 1 : swap ? 2 : 3}</td><td>{qual[k]}%</td></tr>
          ))}
        </tbody>
      </table>
      <div className="row between wrap">
        <Confidence value={conf} />
        <div className="btns">
          {n > 0 && <button className="quiet" onClick={() => app.setNights(0)}>Reset</button>}
          <button className="primary" disabled={n >= 3} onClick={() => app.setNights(n + 1)}><Icon name="play" /> {n >= 3 ? "3 nights compared" : `Simulate night ${n + 1}`}</button>
        </div>
      </div>
      {n >= 3 && (
        <div className="callout">
          <strong>{regen || swap ? "Better sleep on 3 of 3 nights after the change" : "Pattern repeated on 3 of 3 nights"}</strong>
          <p>Confidence {conf >= 0.75 ? "moved from moderate to high" : "stays moderate"}. Still an observed pattern, from a small sample.</p>
        </div>
      )}
    </Panel>
  );
}

export default function Actions() {
  const app = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [id, setId] = useState(app.route.param && REC[app.route.param] ? app.route.param : RECS[0].id);
  const [modal, setModal] = useState<null | "approval" | "plan" | "dismiss">(null);
  const [slot, setSlot] = useState("");
  const [to, setTo] = useState("Mission control");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const r = REC[id];
  const st = app.recStatus(id);
  const rs = app.recs[id];
  const shown = RECS.filter((x) => {
    const s = app.recStatus(x.id);
    return filter === "All" || (filter === "To review" && OPEN.includes(s)) || (filter === "In progress" && PROGRESS.includes(s)) || (filter === "Closed" && ["dismissed", "done"].includes(s));
  });
  const set = (status: RecStatus, msg: string, extra?: { slot?: string; reason?: string; note?: string }) => {
    app.setRec(id, status, extra);
    app.toast(msg);
    setModal(null);
    setNote("");
  };
  const closed = st === "dismissed" || st === "done";
  const k = REC_SHORT[id];
  const answers: [string, React.ReactNode, React.ReactNode][] = [
    ["What?", r.title, r.what],
    ["Why?", k.why, r.why],
    ["When?", <>{k.when}{rs?.slot && <> <Tag tone="green">CHOSEN: {rs.slot}</Tag></>}</>, r.when],
    ["Where?", k.where, r.where],
    ["Potential benefit", k.benefit, r.impact],
    ["Trade-offs", k.cost, r.tradeoffs],
  ];
  const groups: [string, RecStatus[]][] = [["To review", OPEN], ["In progress", PROGRESS], ["Closed", ["dismissed", "done"]]];
  const g = GLANCE[r.insight];

  return (
    <div className="grid cols-side-l">
      <div className="grid">
        <Panel>
          <Head title="Recommendations" />
          <div className="rec-list">
            {groups.map(([name, sts]) => {
              const list = RECS.filter((x) => sts.includes(app.recStatus(x.id)));
              if (!list.length) return null;
              return (
                <div key={name} className="rec-group">
                  <p className="fact-k">{name} <em>{list.length}</em></p>
                  {list.map((x) => (
                    <button key={x.id} className={`rec-item ${id === x.id ? "active" : ""} ${name === "Closed" ? "closed" : ""}`} aria-pressed={id === x.id} onClick={() => setId(x.id)}>
                      <span className={`rec-ic t-${x.type.split(" ")[0].toLowerCase()}`}><Icon name={ICON[x.type]} /></span>
                      <div>
                        <strong>{REC_SHORT[x.id].do}</strong>
                        <span>{REC_SHORT[x.id].benefit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid">
        <Panel key={id}>
          <div className="row wrap">
            <Tag tone="neutral">{r.type.toUpperCase()}</Tag>
            <Tag tone={REC_STATUS[st].tone}>{REC_STATUS[st].label}</Tag>
          </div>
          <h2 className="rec-title">{k.do}</h2>
          <button className="rec-from" onClick={() => app.go("workspace", r.insight)}>
            <span>For</span> <b>{g.metric} <Dir d={g.dir} /></b> <span>· likely contributor</span> <b>{g.contributor}</b> <Icon name="arrow" size={14} />
          </button>

          <div className="workflow">
            {!closed && r.primary === "approval" && st !== "sent" && st !== "approved" && (
              <button className="primary" onClick={() => { setSlot(r.slots?.[0] ?? ""); setModal("approval"); }}><Icon name="send" /> Send for approval</button>
            )}
            {!closed && r.primary === "plan" && st !== "planned" && (
              <button className="primary" onClick={() => { setSlot(r.slots?.[0] ?? ""); setModal("plan"); }}><Icon name="calendar" /> Add to work plan</button>
            )}
            {!closed && r.primary === "accept" && st !== "accepted" && <button className="primary" onClick={() => set("accepted", "Accepted. Added to tonight's pre-sleep checklist.")}><Icon name="check" /> Accept</button>}
            {!closed && r.primary === "investigate" && st !== "investigating" && <button className="primary" onClick={() => set("investigating", "Comparison started. Review on MD 187.")}><Icon name="search" /> Start the comparison</button>}
            {!closed && r.primary === "measure" && (
              <button className="primary" onClick={() => { app.setRec(id, "accepted"); app.go("checkin", id === "bp-now" ? "bp" : "pvt"); }}><Icon name="clipboard" /> {id === "bp-now" ? "Take the reading now" : "Open reaction test"}</button>
            )}
            {st === "sent" && (
              <button className="primary" onClick={() => set("approved", "Mission control approved the change. The planner has been updated.", { note: "Approved by mission control (flight director + thermal). Simulated reply." })}>
                <Icon name="play" /> Demo: receive mission control's reply
              </button>
            )}
            {st === "approved" && <button className="primary" onClick={() => set("done", "Marked as done.")}><Icon name="check" /> Mark as done</button>}
            {!closed ? <button className="secondary" onClick={() => setModal("dismiss")}>Dismiss</button> : <button className="secondary" onClick={() => set("reviewed", "Reopened.")}>Reopen</button>}
          </div>
          <p className="control"><Icon name="lock" size={16} /> {r.control.split(". ")[0].replace(/\.$/, "")}.</p>

          {st === "sent" && (
            <div className="callout amber-callout">
              <strong>Waiting for {to.toLowerCase()}</strong>
              <p>Sent 11:22. Earliest reply 11:38. Nothing on board has changed yet.</p>
            </div>
          )}
          {st === "dismissed" && rs?.reason && <div className="callout"><strong>You dismissed this</strong><p>Reason: {rs.reason}.</p></div>}

          <div className="disc-list">
            {answers.map(([q, short, full]) => (
              <Disclose key={q} k={q} v={short}><p>{full}</p></Disclose>
            ))}
            <Disclose k="Confidence" v={<Confidence value={r.confidence} showLabel={false} />}>
              <Confidence value={r.confidence} />
              <p>Effort: {r.effort}. {r.control}</p>
            </Disclose>
          </div>
        </Panel>

        <Learn r={r} />

        <Panel>
          <More label="Other options">
            <div className="btns">
              {st === "new" && <button className="secondary" onClick={() => set("reviewed", "Marked as reviewed.")}><Icon name="eye" /> Mark as reviewed</button>}
              {!closed && (
                <button className="secondary" onClick={() => { if (OPEN.includes(st)) set("shared", "Shared with mission control with the evidence attached."); else { app.setRec(id, st, { note: "Shared with mission control" }); app.toast("Shared with mission control with the evidence attached."); } }}>
                  <Icon name="external" /> Share with mission control
                </button>
              )}
              <button className="secondary" onClick={() => app.go("insights", r.insight)}><Icon name="trend" /> See the trend</button>
            </div>
          </More>
          <More label={`Where · ${r.modules.map((m) => MOD[m].short).join(" → ")}`}>
            <Schematic compact path={r.modules.length > 1 ? r.modules : undefined} status={(m) => (r.modules.includes(m) ? "watch" : "none")} crew={false} />
            <div className="btns"><button className="secondary" onClick={() => { app.setFocus({ module: r.modules[0], path: INSIGHT[r.insight].spatial.path, equipment: INSIGHT[r.insight].spatial.equipment }); app.go("ship"); }}><Icon name="orbit" /> Open 3D view</button></div>
          </More>
          <More label="Activity log" count={(rs?.log?.length ?? 0) + 1}>
            <ol className="reclog">
              <li><time>MD 184 · 06:31</time><span>Recommended by Halo Health <Ev kind="inference" /></span></li>
              {(rs?.log ?? []).map((l, n) => (
                <li key={n}><time>{l.at}</time><span>{REC_STATUS[l.status].label.charAt(0) + REC_STATUS[l.status].label.slice(1).toLowerCase()} by Alex Rivera {l.note && <em>· {l.note}</em>} <Ev kind="input" /></span></li>
              ))}
            </ol>
          </More>
        </Panel>
      </div>

      {modal === "approval" && (
        <Modal title="Send for approval" eyebrow={<Tag tone="amber">REQUEST · NOTHING CHANGES UNTIL APPROVED</Tag>} onClose={() => setModal(null)}
          footer={<><button className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary" onClick={() => set("sent", `Request sent to ${to.toLowerCase()}.`, { slot, note: `Sent to ${to}${note ? ` · “${note}”` : ""}` })}><Icon name="send" /> Send request</button></>}>
          <p className="lede">{r.what}</p>
          <p className="eyebrow">Send to</p>
          <Segmented options={["Mission control", "Commander only"] as const} value={to as "Mission control"} onChange={setTo} label="Approver" />
          {r.slots && (
            <>
              <p className="eyebrow" style={{ marginTop: 16 }}>Preferred new window</p>
              <div className="chips">{r.slots.map((s) => <button key={s} className={`chip ${slot === s ? "active" : ""}`} onClick={() => setSlot(s)}>{s}</button>)}</div>
            </>
          )}
          <p className="eyebrow" style={{ marginTop: 16 }}>Attached automatically</p>
          <ul className="attach">
            <li><Icon name="check" size={14} /> Evidence chart: {INSIGHT[r.insight].preset.top.length + INSIGHT[r.insight].preset.bottom.length} signals around {INSIGHT[r.insight].time}</li>
            <li><Icon name="check" size={14} /> Pattern history ({FACTS.fanNights14} occurrences in 14 days)</li>
            <li><Icon name="check" size={14} /> Trade-offs: {r.tradeoffs.split(/\.\s/)[0].replace(/\.$/, "")}.</li>
            <li><Icon name="lock" size={14} /> Health data summarised, not raw</li>
          </ul>
          <label className="note-field"><span>Note to the approver (optional)</span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fifth night in seven. Requesting a trial from tonight." /></label>
        </Modal>
      )}
      {modal === "plan" && (
        <Modal title="Add to work plan" eyebrow={<Tag tone="blue">CREW PLAN CHANGE</Tag>} onClose={() => setModal(null)}
          footer={<><button className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary" onClick={() => set("planned", `Added to today's plan${slot ? ` at ${slot}` : ""}. Your plan is updated.`, { slot })}><Icon name="calendar" /> Add to plan</button></>}>
          <p className="lede">{r.what}</p>
          {r.slots && (
            <>
              <p className="eyebrow">Choose a time</p>
              <div className="chips">{r.slots.map((s) => <button key={s} className={`chip ${slot === s ? "active" : ""}`} onClick={() => setSlot(s)}>{s}</button>)}</div>
            </>
          )}
          <div className="callout"><strong>Before you confirm</strong><p>{r.tradeoffs}</p></div>
        </Modal>
      )}
      {modal === "dismiss" && (
        <Modal title="Dismiss this recommendation" onClose={() => setModal(null)}
          footer={<><button className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary" disabled={!reason} onClick={() => set("dismissed", "Dismissed. Your reason is recorded.", { reason })}>Dismiss</button></>}>
          <p className="lede">Why?</p>
          <div className="chips">
            {["Not practical right now", "I do not think this is the cause", "Already handled another way", "Risk to another system", "Not worth the crew time"].map((x) => (
              <button key={x} className={`chip ${reason === x ? "active" : ""}`} onClick={() => setReason(x)}>{x}</button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
