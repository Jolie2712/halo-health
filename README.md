# Halo Health

**A self-health tool for astronauts on long missions that links changes in their own body to what is happening on the spacecraft.**

Built for the NASA Space Apps Challenge 2026, for the challenge on health monitoring software that helps astronauts assess and act on their own health during long-duration missions.

- **Try it online:** [jolie2712.github.io/halo-health](https://jolie2712.github.io/halo-health/)
- **Try it offline:** download [`docs/index.html`](docs/index.html) and open it in a browser (the whole app is in that one file).
- **Demo video (30 s):** [`media/halo-health-demo-30s.mp4`](media/halo-health-demo-30s.mp4)

> **All crew health data in this prototype is simulated.** The crew, the spacecraft (the fictional deep-space transit vehicle *DST Aether*) and every reading come from a seeded simulation in `src/data/sim.ts`. No real person's data is used, and the app labels simulated data as such.

---

## The problem

On long missions astronauts carry much of the responsibility for spotting health changes in themselves. Their body data (sleep, heart rate, blood pressure, mood, reaction time) and the spacecraft's data (CO₂, noise, temperature, equipment schedules) live in separate systems, so nothing connects "I keep waking at 02:14" to "a fan near my sleep station cycles on at night".

## What Halo Health does

1. **See** how you are doing at a glance: one status strip per screen, colour coded against your own baseline.
2. **Understand** what changed: trends over time and a day-by-day comparison of health and context.
3. **Find a likely contributor:** the Correlation lab lines up a health change with cabin conditions and spacecraft activity, and shows confidence as Low, Moderate or High. It never claims causation; it uses wording such as "associated with" and "possible contributing factor".
4. **Act:** recommended (never commanded) actions with trade-offs, alerts, and the option to share with the flight surgeon.

Other parts: a daily check-in, a clickable 3D spacecraft map (three.js), environment readings against NASA limits, plain-language explanations for every term, and an Evidence & sources page.

### Navigation

- **Me:** How am I doing?, My health, My health history, Check-in
- **Data & Analysis:** Correlation lab, Trends, Evidence & sources
- **Spacecraft:** Spacecraft map, Environment
- **Act:** Recommendations, Alerts
- **Crew**

### Design approach

The interface is designed glance-first, for a highly capable user who may be tired, stressed or have ADHD: clear, then important, then actionable.

- Every screen opens with one glance strip: status, what changed, likely contributor, what to do.
- One filled blue button per screen, and it is always the action.
- Three levels of detail, never shown at once: glance strip and cards, one-line answers, then telemetry and evidence behind `More` expanders.
- No text smaller than 12 px.

## Run it

Requirements: Node.js 22 and pnpm 10 (versions are pinned in `.mise.toml`).

```bash
pnpm install
pnpm dev                 # development server at http://localhost:8443 (set PORT to change)
```

Build the single-file version (everything inlined into one HTML file):

```bash
npx tsc --noEmit -p .
npx vite build -c vite.standalone.config.ts
# output: dist-standalone/index.html
```

`pnpm build` produces a normal multi-file build in `dist/`.

The project was started in Figma Make. The `.figma/` folder, `vite.config.ts`, `index.html` and the `package.json` scripts are kept as Make expects, so this repository can be imported back into Figma Make.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/data/sim.ts` | Seeded simulation: schedule, equipment, cabin and body data (30 days, 10-minute samples) |
| `src/data/content.ts` | Signals, metrics, detected changes, recommendations, alerts, glossary, references |
| `src/data/events.ts` | One labelled event model (exercise, sleep, meals, work, environment, spacecraft, communication, medical) used by every chart marker |
| `src/data/derive.ts` | Current readings and contextual status wording |
| `src/daily.tsx` | Day-by-day comparison of health and context used in Trends |
| `src/store.tsx` | App state, hash routing, saved locally in the browser (`localStorage`) |
| `src/ui.tsx` | Shared components, SVG charts, glance strip and term tooltips |
| `src/screens/` | The screens (`Ship3D.tsx` is the three.js spacecraft) |
| `docs/` | The built single-file prototype, served by GitHub Pages |
| `media/` | The 30-second demo video |

Stack: React 19, TypeScript, Vite 8, Tailwind CSS v4, three.js.

## Resources used

Thresholds and explanations in the app come from these sources (also listed in the app under **Evidence & sources**):

- NASA Human Research Program, [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- NASA OCHMO, [OCHMO-TB-004 Carbon Dioxide technical brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf)
- NASA OCHMO, [OCHMO-TB-035 Acoustics technical brief](https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf)
- NASA, [NASA-STD-3001 Volume 2: Human Factors, Habitability and Environmental Health](https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-2-rev-d-with-signature.pdf)
- NASA HRP, [Exploration Medical Capability Clinical Decision Support System Concept of Operations](https://ntrs.nasa.gov/citations/20220017856)
- NASA, [Counteracting bone and muscle loss in microgravity](https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/)
- Canadian Space Agency, [Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp)
- Law J. et al. (2014), CO₂ levels and reported headaches on the ISS, *J. Occup. Environ. Med.* 56(5) ([summary](https://sciencedaily.com/releases/2014/05/140501100922.htm))
- Barger L. et al. (2014), Sleep deficiency in astronauts, *The Lancet Neurology* 13(9) ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/))
- Basner M. et al., [Cognition test battery and Reaction Self-Test](https://www.med.upenn.edu/uep/cognition.html) (University of Pennsylvania / NASA)
- Zeitlin C. et al. (2013), [Energetic particle radiation in transit to Mars](https://www.science.org/doi/10.1126/science.1235989), *Science* 340(6136)
- [ISS Mimic](https://github.com/ISS-Mimic/Mimic) and ISS Live public telemetry, for realistic categories of vehicle telemetry (tag names in this prototype are invented)

## Limitations

- This is a prototype for a hackathon, not a medical device. It does not diagnose and does not replace a flight surgeon.
- Associations shown in the Correlation lab come from simulated data and are illustrations of the method, not findings.
