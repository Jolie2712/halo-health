import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { Icon, Tag, Panel, Head, StatusDot, Ev, STATUS_TONE, Glance, More } from "../ui";
import { ROUTINE } from "../data/content";

type Status = "ok" | "watch" | "high";
type Result = { status: Status; headline: string; guidance: string; escalate?: string; value: string; label: string; type: string };

const FORMS = [
  { id: "bp", name: "Blood pressure", icon: "heart", routine: "bp" },
  { id: "pvt", name: "Reaction test", icon: "target", routine: "pvt2" },
  { id: "glucose", name: "Blood glucose", icon: "flask", routine: "" },
  { id: "temp", name: "Temperature", icon: "alert", routine: "" },
  { id: "symptoms", name: "Symptoms", icon: "clipboard", routine: "symptoms" },
  { id: "mood", name: "Mood & sleep diary", icon: "moon", routine: "mood" },
] as const;
type FormId = (typeof FORMS)[number]["id"];

const STEPS: Record<string, string[]> = {
  bp: [
    "Go to the medical bay and restrain yourself in the seat. Rest quietly for 5 minutes.",
    "Wrap the cuff on your bare upper arm, lower edge two fingers above the elbow, at heart level.",
    "Press start. Stay still and do not talk while it inflates.",
    "Wait one minute, take a second reading, and enter the lower of the two.",
  ],
  glucose: [
    "Wash and dry your hands. Restrain the kit to the work surface.",
    "Insert a strip into the analyser. Use the lancet on the side of a fingertip.",
    "Touch the strip to the drop. The reading shows in 5 seconds.",
    "Put the lancet and strip in the sharps container.",
  ],
  temp: [
    "Use the oral thermometer from the medical bay kit with a new probe cover.",
    "Do not eat or drink for 15 minutes beforehand.",
    "Hold it under your tongue with lips closed until it beeps.",
  ],
};

function evalBp(sys: number, dia: number): Result {
  const value = `${sys}/${dia} mmHg`;
  if (sys >= 180 || dia >= 120)
    return { type: "bp", label: "Blood pressure", value, status: "high", headline: "Very high reading", guidance: "Rest for 5 minutes and repeat now. Note any headache, chest pain, vision change or shortness of breath.", escalate: "If the repeat is still this high, or you have symptoms, call the crew medical officer immediately." };
  if (sys >= 140 || dia >= 90)
    return { type: "bp", label: "Blood pressure", value, status: "high", headline: "Above the range to report", guidance: "Repeat after 5 quiet minutes. Note caffeine, exercise or stress in the last 30 minutes.", escalate: "If two readings are at or above 140/90, send them to the flight surgeon at the next link (one-way delay 7 min 42 s)." };
  if (sys >= 130 || dia >= 85)
    return { type: "bp", label: "Blood pressure", value, status: "watch", headline: "Slightly raised", guidance: "Common after a short night or a stress response like this morning's. Take another reading tomorrow morning before coffee." };
  if (sys < 90 || dia < 55)
    return { type: "bp", label: "Blood pressure", value, status: "watch", headline: "On the low side", guidance: "Drink 300 ml of water and repeat in 15 minutes. Tell the crew medical officer if you feel light-headed." };
  return { type: "bp", label: "Blood pressure", value, status: "ok", headline: "In your normal range", guidance: "Close to your mission baseline of 117/75. Next weekly reading is due on MD 191." };
}
function evalGlucose(v: number, fasting: boolean): Result {
  const value = `${v} mg/dL${fasting ? " fasting" : " after meal"}`;
  const base = { type: "glucose", label: "Blood glucose", value };
  if (v < 60) return { ...base, status: "high", headline: "Low blood sugar", guidance: "Eat 15 g of fast carbohydrate now (one fruit drink pouch) and re-test in 15 minutes.", escalate: "If you feel shaky, confused or sweaty, tell a crewmate and the crew medical officer now." };
  if (fasting ? v > 125 : v > 199) return { ...base, status: "high", headline: "Higher than the reporting level", guidance: "Log what and when you last ate. Re-test tomorrow morning before breakfast.", escalate: "Two high fasting readings in a row should go to the flight surgeon." };
  if (fasting ? v > 99 : v > 140) return { ...base, status: "watch", headline: "A little above typical", guidance: "One raised reading is not a concern. Keep the trend going with tomorrow's fasting test." };
  return { ...base, status: "ok", headline: "In the typical range", guidance: fasting ? "Fasting values of 70–99 mg/dL are typical. Yours has averaged 88 this mission." : "A normal response to a meal." };
}
function evalTemp(v: number): Result {
  const base = { type: "temp", label: "Oral temperature", value: `${v.toFixed(1)} °C` };
  if (v >= 38) return { ...base, status: "high", headline: "Fever", guidance: "Rest, drink fluids and re-check in one hour. Wear a mask in shared modules to protect the crew.", escalate: "Tell the crew medical officer today. In a closed cabin an infection spreads quickly." };
  if (v >= 37.6) return { ...base, status: "watch", headline: "Slightly raised", guidance: "Body temperature runs a little higher in spaceflight. Re-check in 2 hours and note any symptoms." };
  if (v < 35.5) return { ...base, status: "watch", headline: "Low reading", guidance: "Usually a measurement problem. Repeat with the probe well under your tongue." };
  return { ...base, status: "ok", headline: "Normal", guidance: "Within the normal range of 36.1–37.5 °C." };
}

function ResultCard({ r, onSave, saved }: { r: Result; onSave: () => void; saved: boolean }) {
  return (
    <div className={`result st-${r.status}`} role="status">
      <div className="row">
        <StatusDot s={r.status} />
        <Tag tone={STATUS_TONE[r.status]}>{(r.status === "ok" ? "Within your usual range" : r.status === "watch" ? "Worth a second look" : "Needs attention").toUpperCase()}</Tag>
        <strong>{r.value}</strong>
      </div>
      <h3>{r.headline}</h3>
      <p>{r.guidance}</p>
      {r.escalate && (
        <p className="escalate">
          <Icon name="alert" size={16} /> {r.escalate}
        </p>
      )}
      <button className="primary" disabled={saved} onClick={onSave}>
        {saved ? <><Icon name="check" /> Saved to your health record</> : "Save to my health record"}
      </button>
    </div>
  );
}

function Num({ label, value, set, min, max, step = 1, unit }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; unit: string }) {
  return (
    <label className="num-field">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(Math.max(min, +(value - step).toFixed(1)))}><Icon name="minus" /></button>
        <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => set(Math.min(max, +(value + step).toFixed(1)))}><Icon name="plus" /></button>
        <em>{unit}</em>
      </div>
    </label>
  );
}

function Pvt({ onDone }: { onDone: (r: Result) => void }) {
  const TRIALS = 5;
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [ms, setMs] = useState(0);
  const t0 = useRef(0);
  const timer = useRef(0);
  const raf = useRef(0);
  const arm = () => {
    setPhase("wait");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      t0.current = performance.now();
      setPhase("go");
      const tick = () => {
        setMs(Math.round(performance.now() - t0.current));
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, 1400 + Math.random() * 2600);
  };
  useEffect(() => () => { window.clearTimeout(timer.current); cancelAnimationFrame(raf.current); }, []);
  const tap = () => {
    if (phase === "idle" || phase === "early") return arm();
    if (phase === "wait") {
      window.clearTimeout(timer.current);
      return setPhase("early");
    }
    if (phase === "go") {
      cancelAnimationFrame(raf.current);
      const rt = Math.round(performance.now() - t0.current);
      const next = [...times, rt];
      setTimes(next);
      setMs(rt);
      if (next.length >= TRIALS) {
        setPhase("done");
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        const lapses = next.filter((x) => x > 355).length;
        const slow = (avg - 246) / 246;
        onDone({
          type: "pvt", label: "Reaction test", value: `${avg} ms average · ${lapses} lapse${lapses === 1 ? "" : "s"}`,
          status: slow > 0.15 || lapses >= 2 ? "high" : slow > 0.06 ? "watch" : "ok",
          headline: slow > 0.15 ? "Much slower than your baseline" : slow > 0.06 ? "Slower than your baseline" : "At your baseline",
          guidance: slow > 0.06 ? `Your baseline is 246 ms. You are ${Math.round(slow * 100)}% slower. A short night is the most likely contributor. Re-test after a 20-minute break.` : "Your baseline is 246 ms. No sign of slowed reactions.",
          escalate: slow > 0.15 ? "Before EVA systems prep at 14:00, tell M. Chen and work the checklist as a pair." : undefined,
        });
      } else arm();
    }
  };
  return (
    <div className="pvt">
      <button className={`pvt-pad ${phase}`} onClick={tap} aria-label="Reaction test target">
        {phase === "idle" && <><Icon name="target" size={36} /><b>Tap to start</b><span>Then tap again the moment the counter appears</span></>}
        {phase === "wait" && <><i className="pvt-dot" /><span>Wait for it…</span></>}
        {phase === "go" && <b className="pvt-count">{ms}</b>}
        {phase === "early" && <><b>Too soon</b><span>Tap to try that one again</span></>}
        {phase === "done" && <><Icon name="check" size={36} /><b>Test complete</b></>}
      </button>
      <div className="pvt-trials">
        {Array.from({ length: TRIALS }, (_, k) => (
          <span key={k} className={times[k] ? (times[k] > 355 ? "lapse" : "hit") : ""}>{times[k] ? `${times[k]} ms` : `Tap ${k + 1}`}</span>
        ))}
      </div>
      <p className="muted small">Demo length: 5 taps. The operational test runs for 3 minutes. Responses over 355 ms count as lapses.</p>
    </div>
  );
}

export default function Checkin() {
  const app = useApp();
  const p = app.route.param;
  const startForm = (FORMS.find((f) => f.id === p || f.routine === p)?.id ?? "bp") as FormId;
  const [form, setForm] = useState<FormId>(startForm);
  const [sys, setSys] = useState(124);
  const [dia, setDia] = useState(79);
  const [glu, setGlu] = useState(118);
  const [fasting, setFasting] = useState(false);
  const [temp, setTemp] = useState(36.8);
  const [sym, setSym] = useState<string[]>([]);
  const [sev, setSev] = useState(1);
  const [mood, setMood] = useState(3);
  const [sleepH, setSleepH] = useState(6);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setForm(startForm); }, [startForm]);
  useEffect(() => { setResult(null); setSaved(false); }, [form]);

  const isDone = (id: string) => ROUTINE.find((r) => r.id === id)?.done || app.routine.includes(id);
  const done = ROUTINE.filter((r) => isDone(r.id));
  const points = done.reduce((s, r) => s + r.points, 0);
  const total = ROUTINE.reduce((s, r) => s + r.points, 0);
  const save = () => {
    if (!result) return;
    app.addLog({ type: result.type, label: result.label, value: result.value, status: result.status, note });
    const rt = FORMS.find((f) => f.id === form)?.routine;
    if (rt) app.doRoutine(rt);
    setSaved(true);
    app.toast(`${result.label} saved. It now appears in My health.`);
  };
  const evalSymptoms = (): Result => {
    const has = (s: string) => sym.includes(s);
    const value = sym.length ? `${sym.join(", ")} · ${["mild", "moderate", "severe"][sev - 1]}` : "No symptoms";
    const base = { type: "symptoms", label: "Symptoms", value };
    if (!sym.length) return { ...base, status: "ok", headline: "Nothing to report", guidance: "Logged. A clear check is useful too: it marks today as symptom-free for later comparisons." };
    if (sev === 3 || has("Chest pain") || has("Vision change"))
      return { ...base, status: "high", headline: "Tell the crew medical officer now", guidance: "Stop what you are doing and move to the medical bay.", escalate: "Dr Solberg is in the medical bay. A summary of this entry and your last 24 hours of vitals is ready to share with her." };
    if (has("Headache"))
      return { ...base, status: "watch", headline: "Headache logged", guidance: "You were in the science lab this morning when CO₂ peaked at 3.2 mmHg. Halo Health has linked this entry to the lab CO₂ investigation so the pattern can be checked. Drink water and avoid the lab until the afternoon session if you can." };
    return { ...base, status: "watch", headline: "Logged", guidance: "Halo Health will look for cabin or schedule changes around the time this started. Add another entry if it gets worse." };
  };

  const left = ROUTINE.filter((r) => !isDone(r.id));
  const nextUp = left[0];
  const nextForm = nextUp && FORMS.find((x) => x.routine === nextUp.id || x.id === nextUp.id);
  return (
    <div className="grid">
    <Glance tone={left.length ? "watch" : "ok"} label="Check-in · today" title={left.length ? `${left.length} left to do` : "All done for today"} sub={`${done.length} of ${ROUTINE.length} done`}
      cells={nextUp && nextForm ? [{ k: "Next", v: nextUp.name, sub: `${nextUp.when} · ${nextUp.mins} min`, primary: true, onClick: () => setForm(nextForm.id) }] : []} />
    <div className="grid cols-side-l">
      <div className="grid">
        <Panel>
          <Head title="Today" right={<Tag tone="green">{points} / {total} PTS</Tag>} />
          <div className="progress big"><i style={{ width: `${(points / total) * 100}%` }} /></div>
          <div className="routine">
            {ROUTINE.map((r) => {
              const d = isDone(r.id);
              const f = FORMS.find((x) => x.routine === r.id || x.id === r.id);
              return (
                <button key={r.id} className={d ? "done" : ""} disabled={!f || (d && r.kind === "auto")} onClick={() => f && setForm(f.id)}>
                  <span className="rcheck">{d && <Icon name="check" size={14} />}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <span>{d && !r.done ? "Done just now" : r.when}{r.mins ? ` · ${r.mins} min` : ""}</span>
                  </div>
                  <em>+{r.points}</em>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel>
          <More label="Streaks and badges">
          <div className="streaks">
            <div><strong>12</strong><span>day check-in streak</span></div>
            <div><strong>5/6</strong><span>exercise sessions this week</span></div>
            <div><strong>27</strong><span>of 30 nights wearing the sensor</span></div>
          </div>
          <div className="badges">
            <span className="badge on" title="Thirty days of complete morning checks"><Icon name="star" /> Baseline builder</span>
            <span className="badge on" title="Gave your input on 10 detected events"><Icon name="search" /> Investigator</span>
            <span className={`badge ${app.logs.length ? "on" : ""}`} title="Log a measurement the system prompted you for"><Icon name="heart" /> On the cuff</span>
            <span className={`badge ${Object.keys(app.hyp).length ? "on" : ""}`} title="Record your own hypothesis on an event"><Icon name="edit" /> Second opinion</span>
          </div>
          </More>
        </Panel>
      </div>

      <Panel className="form-panel">
        <div className="form-tabs" role="tablist">
          {FORMS.map((f) => (
            <button key={f.id} role="tab" aria-selected={form === f.id} className={form === f.id ? "active" : ""} onClick={() => setForm(f.id)}>
              <Icon name={f.icon} /> {f.name}
            </button>
          ))}
        </div>


        {form === "bp" && (
          <>
            <Head eyebrow="Due today" title="Blood pressure" right={<Ev kind="input" />} />
            <div className="row wrap fields">
              <Num label="Top number (systolic)" value={sys} set={setSys} min={70} max={220} unit="mmHg" />
              <Num label="Bottom number (diastolic)" value={dia} set={setDia} min={40} max={140} unit="mmHg" />
            </div>
            <button className="primary" onClick={() => { setResult(evalBp(sys, dia)); setSaved(false); }}>Check this reading</button>
          </>
        )}
        {form === "glucose" && (
          <>
            <Head title="Blood glucose" right={<Ev kind="input" />} />
            <div className="row wrap fields">
              <Num label="Reading" value={glu} set={setGlu} min={30} max={400} unit="mg/dL" />
              <label className="check"><input type="checkbox" checked={fasting} onChange={(e) => setFasting(e.target.checked)} /> Fasting (no food for 8 hours)</label>
            </div>
            <button className="primary" onClick={() => { setResult(evalGlucose(glu, fasting)); setSaved(false); }}>Check this reading</button>
          </>
        )}
        {form === "temp" && (
          <>
            <Head title="Temperature" right={<Ev kind="input" />} />
            <div className="row wrap fields">
              <Num label="Temperature" value={temp} set={setTemp} min={34} max={42} step={0.1} unit="°C" />
            </div>
            <button className="primary" onClick={() => { setResult(evalTemp(temp)); setSaved(false); }}>Check this reading</button>
          </>
        )}
        {form === "symptoms" && (
          <>
            <Head title="Anything bothering you?" right={<Ev kind="input" />} />
            <div className="chips">
              {["Headache", "Stuffy head", "Eye strain", "Vision change", "Back pain", "Nausea", "Trouble concentrating", "Chest pain", "Low mood"].map((s) => (
                <button key={s} className={`chip ${sym.includes(s) ? "active" : ""}`} aria-pressed={sym.includes(s)} onClick={() => setSym(sym.includes(s) ? sym.filter((x) => x !== s) : [...sym, s])}>{s}</button>
              ))}
            </div>
            {sym.length > 0 && (
              <div className="row fields">
                <span className="muted">How strong?</span>
                {["Mild", "Moderate", "Severe"].map((s, k) => (
                  <button key={s} className={`chip ${sev === k + 1 ? "active" : ""}`} onClick={() => setSev(k + 1)}>{s}</button>
                ))}
              </div>
            )}
            <button className="primary" onClick={() => { setResult(evalSymptoms()); setSaved(false); }}>{sym.length ? "Check and log" : "Log no symptoms"}</button>
          </>
        )}
        {form === "mood" && (
          <>
            <Head eyebrow="Private · you and the medical officer" title="How are you feeling?" right={<Ev kind="input" />} />
            <div className="moods">
              {["Very low", "Low", "Okay", "Good", "Very good"].map((m, k) => (
                <button key={m} className={mood === k + 1 ? "active" : ""} aria-pressed={mood === k + 1} onClick={() => setMood(k + 1)}>
                  <b>{k + 1}</b>
                  <span>{m}</span>
                </button>
              ))}
            </div>
            <div className="row wrap fields">
              <Num label="Hours slept, as it felt" value={sleepH} set={setSleepH} min={0} max={12} step={0.5} unit="h" />
            </div>
            <button className="primary" onClick={() => {
              setSaved(false);
              setResult({ type: "mood", label: "Mood & sleep diary", value: `Mood ${mood}/5 · felt like ${sleepH} h sleep`, status: mood <= 2 ? "watch" : "ok",
                headline: mood <= 2 ? "Thanks for being straight about it" : "Logged",
                guidance: mood <= 2 ? "A low day after a short night is common. Your personal time tonight is protected from 21:00. If this lasts 5 days, a private psychological conference is available." : `Your actigraph recorded 6 h 12 min. You felt like ${sleepH} h. The gap between the two is useful to the flight surgeon.` });
            }}>Save check-in</button>
          </>
        )}
        {form === "pvt" && (
          <>
            <Head title="Tap when the counter appears" right={<Ev kind="direct" />} />
            <Pvt key={String(saved)} onDone={(r) => { setResult(r); setSaved(false); }} />
          </>
        )}
        {STEPS[form] && (
          <More label="How to measure" count={STEPS[form].length}>
            <ol className="steps">
              {STEPS[form].map((s, k) => <li key={k}>{s}</li>)}
            </ol>
          </More>
        )}
        {form !== "pvt" && (
          <More label="Add a note">
            <label className="note-field">
              <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. coffee 20 minutes ago" />
            </label>
          </More>
        )}
        {result && <ResultCard r={result} onSave={save} saved={saved} />}

        {app.logs.length > 0 && (
          <div className="loglist">
            <p className="eyebrow">Entered this session</p>
            {app.logs.slice(0, 5).map((l) => (
              <div key={l.id}>
                <StatusDot s={l.status} />
                <span>{l.at}</span>
                <strong>{l.label}</strong>
                <span>{l.value}</span>
                {l.note && <em>“{l.note}”</em>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
    </div>
  );
}
