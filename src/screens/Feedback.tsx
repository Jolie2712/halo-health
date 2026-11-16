import { useState } from "react";
import { useApp, type Hypothesis } from "../store";
import { Icon, Panel, Head, Ev, Tag, More } from "../ui";

/** "What do you think contributed?" Astronaut input, always labelled as such and never mixed with telemetry. */
export function Feedback({ id, contributor, options, example, compact }: { id: string; contributor?: string; options: string[]; example?: string; compact?: boolean }) {
  const app = useApp();
  const saved = app.hyp[id];
  const [factors, setFactors] = useState<string[]>(saved?.factors ?? []);
  const [note, setNote] = useState(saved?.note ?? "");
  const [rating, setRating] = useState<Hypothesis["rating"]>(saved?.rating ?? null);
  const [flag, setFlag] = useState<Hypothesis["flag"]>(saved?.flag ?? null);
  const [editing, setEditing] = useState(!saved);
  const all = [...(contributor ? [contributor] : []), ...options.filter((o) => o !== contributor), "Something the system cannot see"];
  const toggle = (f: string) => setFactors(factors.includes(f) ? factors.filter((y) => y !== f) : [...factors, f]);
  const agrees = !!contributor && factors.includes(contributor);

  if (saved && !editing)
    return (
      <Panel className="hyp saved">
        <Head eyebrow="Astronaut input · not telemetry" title="Your view is recorded" right={<Ev kind="input" />} />
        <blockquote>
          {saved.factors.length > 0 && <p>You think this contributed: <b>{saved.factors.join(", ")}</b>.</p>}
          {saved.flag && <p>You marked this event as <b>{saved.flag === "expected" ? "expected" : "unrelated to the cabin"}</b>.</p>}
          {saved.note && <p><Tag tone="blue">YOUR HYPOTHESIS</Tag> “{saved.note}”</p>}
          <footer>Alex Rivera · {saved.savedAt}{saved.rating && ` · you found the system's interpretation ${saved.rating === "useful" ? "useful" : "not useful"}`}</footer>
        </blockquote>
        <div className="callout">
          <strong>What happens next</strong>
          <p>
            {contributor && saved.factors.includes(contributor) && saved.factors.length === 1
              ? "Matches the system's view. Shared with the flight surgeon."
              : saved.flag
                ? "Kept in your history with your label. Not raised again in this context."
                : saved.rating === "not-useful" && !saved.factors.length
                  ? "Noted. Shown less prominently from now on."
                  : "Your factors are now tracked next to the system's on similar events."}
          </p>
        </div>
        <button className="secondary" onClick={() => setEditing(true)}><Icon name="edit" /> Change my answer</button>
      </Panel>
    );

  return (
    <Panel className="hyp">
      <Head eyebrow="Astronaut input · not telemetry" title="What do you think contributed?" right={<Ev kind="input" />} />
      <div className="chips">
        {all.map((o) => (
          <button key={o} className={`chip small ${factors.includes(o) ? "active" : ""}`} aria-pressed={factors.includes(o)} onClick={() => toggle(o)}>
            {factors.includes(o) && <Icon name="check" size={14} />} {o}
          </button>
        ))}
      </div>
      <More label="Add a note or mark as expected">
      <div className="row wrap fields">
        <button className={`chip small ${flag === "expected" ? "active" : ""}`} aria-pressed={flag === "expected"} onClick={() => setFlag(flag === "expected" ? null : "expected")}>Mark event as expected</button>
        <button className={`chip small ${flag === "unrelated" ? "active" : ""}`} aria-pressed={flag === "unrelated"} onClick={() => setFlag(flag === "unrelated" ? null : "unrelated")}>Not related to the cabin</button>
      </div>
      <label className="note-field">
        <span>Your note or hypothesis</span>
        <textarea rows={compact ? 2 : 3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={example ?? "Anything the telemetry would not know."} />
      </label>
      </More>
      <div className="row between wrap">
        <div className="row">
          <span className="muted">Useful?</span>
          <button className={`icon-button ${rating === "useful" ? "on" : ""}`} aria-pressed={rating === "useful"} aria-label="Useful" onClick={() => setRating("useful")}><Icon name="thumbUp" /></button>
          <button className={`icon-button ${rating === "not-useful" ? "on" : ""}`} aria-pressed={rating === "not-useful"} aria-label="Not useful" onClick={() => setRating("not-useful")}><Icon name="thumbDown" /></button>
        </div>
        <button className="primary" disabled={!factors.length && !note && !flag && !rating}
          onClick={() => {
            app.saveHyp(id, { factors, note, rating, flag, savedAt: "MD 184 · 11:22" });
            setEditing(false);
            app.toast(agrees || !factors.length ? "Your input was added to the event history." : "Recorded. Your explanation will be compared against the next similar events.");
          }}>
          Record my input
        </button>
      </div>
    </Panel>
  );
}
