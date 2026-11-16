import { AppProvider, useApp, type Screen } from "./store";
import { Icon, Tag } from "./ui";
import { ALERTS, INSIGHTS, RECS, ROUTINE } from "./data/content";
import Overview from "./screens/Overview";
import Health from "./screens/Health";
import Checkin from "./screens/Checkin";
import Insights from "./screens/Insights";
import Workspace from "./screens/Workspace";
import Ship from "./screens/Ship";
import Environment from "./screens/Environment";
import Actions from "./screens/Actions";
import { Alerts, History, Crew, Reference, Settings } from "./screens/More";
import { useState } from "react";

const NAV: { group: string; items: { id: Screen; label: string; icon: string }[] }[] = [
  { group: "Me", items: [
    { id: "overview", label: "How am I doing?", icon: "home" },
    { id: "health", label: "My health", icon: "body" },
    { id: "history", label: "My health history", icon: "history" },
    { id: "checkin", label: "Check-in", icon: "clipboard" },
  ] },
  { group: "Data & Analysis", items: [
    { id: "workspace", label: "Correlation lab", icon: "link" },
    { id: "insights", label: "Trends", icon: "trend" },
    { id: "reference", label: "Evidence & sources", icon: "book" },
  ] },
  { group: "Spacecraft", items: [
    { id: "ship", label: "Spacecraft map", icon: "orbit" },
    { id: "environment", label: "Environment", icon: "wind" },
  ] },
  { group: "Act", items: [
    { id: "actions", label: "Recommendations", icon: "check" },
    { id: "alerts", label: "Alerts", icon: "bell" },
  ] },
  // Crew stands on its own, with no group heading
  { group: "", items: [{ id: "crew", label: "Crew", icon: "users" }] },
];
const TITLE: Record<Screen, [string, string]> = {
  overview: ["How am I doing?", "Mission day 184 · your state, what changed and what to do"],
  health: ["My health", "Select a body area to see what is measured and what it means"],
  checkin: ["Check-in", "Take a measurement, get a plain answer, keep your routine going"],
  insights: ["Trends", "Patterns that repeat in your health, with what was happening around you"],
  workspace: ["Correlation lab", "What happened, what changed and what may have contributed"],
  ship: ["Spacecraft map", "DST Aether · where you are, what is nearby and how it relates to you"],
  environment: ["Environment", "How might my environment be affecting my health?"],
  actions: ["Recommendations", "What could change, why, and what it costs"],
  alerts: ["Alerts", "Safety alerts and human-performance insights are kept apart"],
  history: ["My health history", "Your days, nights and events, compared with before"],
  crew: ["Crew", "Readiness and shared conditions, with private health kept private"],
  reference: ["Evidence & sources", "How to read this tool and where its numbers come from"],
  settings: ["Display & settings", "Low-light, contrast, touch size and units"],
};

function Shell() {
  const app = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const screen = TITLE[app.route.screen] ? app.route.screen : "overview";
  const openAlerts = ALERTS.filter((a) => !a.resolved && !app.ack.includes(a.id)).length;
  const badge: Partial<Record<Screen, number>> = {
    alerts: openAlerts,
    checkin: ROUTINE.filter((r) => !r.done && !app.routine.includes(r.id)).length,
  };
  const s = app.settings;
  const go = (id: Screen) => {
    app.go(id);
    setNavOpen(false);
  };
  return (
    <div className={`app-shell ${s.night ? "night" : ""} ${s.contrast ? "contrast" : ""} ${s.glove ? "glove" : ""} density-${s.density.toLowerCase()} ${s.reduceMotion ? "reduce-motion" : ""}`}>
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <button className="brand" onClick={() => go("overview")}>
          <span className="brand-mark"><Icon name="halo" size={22} /></span>
          <span>
            <strong>HALO HEALTH</strong>
            <small>DST AETHER · CREW HEALTH</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          {NAV.map((g) => (
            <div key={g.group || "solo"} className={g.group ? "" : "nav-solo"}>
              {g.group && <p>{g.group}</p>}
              {g.items.map((n) => (
                <button key={n.id} className={screen === n.id ? "active" : ""} aria-current={screen === n.id ? "page" : undefined} onClick={() => go(n.id)}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                  {!!badge[n.id] && <b>{badge[n.id]}</b>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-bottom">
          <button className={screen === "settings" ? "active" : ""} onClick={() => go("settings")}>
            <Icon name="sliders" />
            <span>Display & settings</span>
          </button>
          <button className="crew-profile" onClick={() => go("crew")}>
            <span className="avatar you">AR</span>
            <span>
              <strong>Alex Rivera</strong>
              <small>Commander · signed in</small>
            </span>
            <i className="status-pip" />
          </button>
        </div>
      </aside>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setNavOpen(!navOpen)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="top-title">
            <h1>{TITLE[screen][0]}</h1>
          </div>
          <div className="top-actions">
            <button className="sim-pill" onClick={() => go("reference")} title="All crew health data and telemetry in this prototype are simulated">
              <Tag tone="violet">SIMULATED DATA</Tag>
            </button>
            <div className="connection" title="High-gain link to Earth is up. Signal takes 7 min 42 s each way.">
              <i /> EARTH LINK
            </div>
            <div className="clock"><strong>11:22</strong><span>MD 184</span></div>
            <button className={`icon-button ${s.night ? "on" : ""}`} onClick={() => app.setSettings({ night: !s.night })} aria-label="Toggle low-light mode" aria-pressed={s.night}><Icon name="moon" /></button>
            <button className="icon-button alert-button" onClick={() => go("alerts")} aria-label={`Alerts, ${openAlerts} open`}>
              <Icon name="bell" />
              {openAlerts > 0 && <b>{openAlerts}</b>}
            </button>
          </div>
        </header>
        <main key={screen}>
          {screen === "overview" && <Overview />}
          {screen === "health" && <Health key={app.route.param} />}
          {screen === "checkin" && <Checkin />}
          {screen === "insights" && <Insights key={app.route.param} />}
          {screen === "workspace" && <Workspace key={app.route.param} />}
          {screen === "ship" && <Ship />}
          {screen === "environment" && <Environment key={app.route.param} />}
          {screen === "actions" && <Actions key={app.route.param} />}
          {screen === "alerts" && <Alerts />}
          {screen === "history" && <History key={app.route.param} />}
          {screen === "crew" && <Crew />}
          {screen === "reference" && <Reference />}
          {screen === "settings" && <Settings />}
        </main>
      </div>
      {app.toastMsg && (
        <div className="toast" role="status"><Icon name="check" /> {app.toastMsg}</div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
