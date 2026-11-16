import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RecStatus } from "./data/content";

export type Screen =
  | "overview" | "health" | "checkin" | "insights" | "workspace" | "ship" | "environment"
  | "actions" | "alerts" | "history" | "crew" | "reference" | "settings";

export type Hypothesis = {
  factors: string[];
  note: string;
  rating: "useful" | "not-useful" | null;
  flag: "expected" | "unrelated" | null;
  savedAt: string;
};
export type LogEntry = { id: string; type: string; label: string; value: string; status: "ok" | "watch" | "high"; note?: string; at: string };
export type RecState = { status: RecStatus; slot?: string; reason?: string; log: { status: RecStatus; at: string; note?: string }[] };
export type Settings = { contrast: boolean; reduceMotion: boolean; density: "Focused" | "Comfortable" | "Dense"; night: boolean; glove: boolean; co2Unit: "mmHg" | "ppm" };
export type Preset = { top: string[]; bottom: string[]; days: number; end: number; event?: string } | null;

type Persist = {
  recs: Record<string, RecState>;
  hyp: Record<string, Hypothesis>;
  logs: LogEntry[];
  ack: string[];
  routine: string[];
  settings: Settings;
  nights: number; // "learn" loop: simulated nights after the change (0-3)
  share: Record<string, boolean>;
};
const DEFAULT: Persist = {
  recs: {},
  hyp: {},
  logs: [],
  ack: [],
  routine: [],
  settings: { contrast: false, reduceMotion: false, density: "Comfortable", night: false, glove: false, co2Unit: "mmHg" },
  nights: 0,
  share: { readiness: true, sleep: false, vitals: false, mood: false },
};
const KEY = "halo-health-v1";
function load(): Persist {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULT;
}

type Route = { screen: Screen; param?: string };
function parseHash(): Route {
  try {
    const h = window.location.hash.replace(/^#\/?/, "");
    if (h) {
      const [raw, param] = h.split("/");
      // pages removed in the Halo Health revision land on the page that absorbed them
      const screen = raw === "timeline" ? "history" : raw === "engineering" ? "ship" : raw;
      if (screen !== raw) return { screen: screen as Screen };
      return { screen: screen as Screen, param: param ? decodeURIComponent(param) : undefined };
    }
  } catch {
    /* ignore */
  }
  return { screen: "overview" };
}

type App = Persist & {
  route: Route;
  go: (screen: Screen, param?: string) => void;
  setRec: (id: string, status: RecStatus, extra?: { slot?: string; reason?: string; note?: string }) => void;
  recStatus: (id: string) => RecStatus;
  saveHyp: (id: string, h: Hypothesis) => void;
  addLog: (e: Omit<LogEntry, "id" | "at">) => void;
  ackAlert: (id: string) => void;
  unackAlert: (id: string) => void;
  doRoutine: (id: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  setNights: (n: number) => void;
  setShare: (k: string, v: boolean) => void;
  preset: Preset;
  setPreset: (p: Preset) => void;
  focus: { module?: string; path?: string[]; equipment?: string } | null;
  setFocus: (f: App["focus"]) => void;
  toast: (m: string) => void;
  toastMsg: string;
  reset: () => void;
  clock: string;
};
const Ctx = createContext<App>(null as unknown as App);
export const useApp = () => useContext(Ctx);
export const NOW_LABEL = "MD 184 · 11:22";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Persist>(load);
  const [route, setRoute] = useState<Route>(parseHash);
  const [preset, setPreset] = useState<Preset>(null);
  const [focus, setFocus] = useState<App["focus"]>(null);
  const [toastMsg, setToast] = useState("");
  const timer = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, [p]);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = useCallback((screen: Screen, param?: string) => {
    setRoute({ screen, param });
    try {
      const h = `#/${screen}${param ? "/" + encodeURIComponent(param) : ""}`;
      if (window.location.hash !== h) window.history.pushState(null, "", h);
    } catch {
      /* sandboxed */
    }
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* ignore */
    }
  }, []);
  const toast = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const app = useMemo<App>(
    () => ({
      ...p,
      route,
      go,
      preset,
      setPreset,
      focus,
      setFocus,
      toast,
      toastMsg,
      clock: "11:22",
      recStatus: (id) => p.recs[id]?.status ?? "new",
      setRec: (id, status, extra) =>
        setP((s) => {
          const prev = s.recs[id] ?? { status: "new" as RecStatus, log: [] };
          return {
            ...s,
            recs: {
              ...s.recs,
              [id]: {
                status,
                slot: extra?.slot ?? prev.slot,
                reason: extra?.reason ?? prev.reason,
                log: [...prev.log, { status, at: NOW_LABEL, note: extra?.note }],
              },
            },
          };
        }),
      saveHyp: (id, h) => setP((s) => ({ ...s, hyp: { ...s.hyp, [id]: h } })),
      addLog: (e) =>
        setP((s) => ({ ...s, logs: [{ ...e, id: `log-${s.logs.length + 1}`, at: NOW_LABEL }, ...s.logs] })),
      ackAlert: (id) => setP((s) => ({ ...s, ack: s.ack.includes(id) ? s.ack : [...s.ack, id] })),
      unackAlert: (id) => setP((s) => ({ ...s, ack: s.ack.filter((x) => x !== id) })),
      doRoutine: (id) => setP((s) => ({ ...s, routine: s.routine.includes(id) ? s.routine : [...s.routine, id] })),
      setSettings: (x) => setP((s) => ({ ...s, settings: { ...s.settings, ...x } })),
      setNights: (n) => setP((s) => ({ ...s, nights: n })),
      setShare: (k, v) => setP((s) => ({ ...s, share: { ...s.share, [k]: v } })),
      reset: () => {
        setP(DEFAULT);
        setPreset(null);
        setFocus(null);
      },
    }),
    [p, route, go, preset, focus, toast, toastMsg],
  );
  return <Ctx.Provider value={app}>{children}</Ctx.Provider>;
}
