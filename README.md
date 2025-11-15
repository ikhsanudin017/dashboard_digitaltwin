# Amikom Room Digital Twin (SPA)

Single-page app for monitoring a classroom (room-101) with real-time dashboard, history replay, alerts, and a simple 3D digital twin.

## Stack

- Vue 3 (Composition API) + Vite
- Tailwind CSS (darkMode: class) + CSS variables
- Pinia state
- Chart.js + vue-chartjs
- dayjs (+timezone, relativeTime)
- Three.js scene
- mqtt (WebSocket)
- ESLint + Prettier
- Vitest + Vue Test Utils

## Getting Started

1. Copy `.env.example` to `.env` and adjust if needed.
2. Install deps and run:

```
pnpm install
pnpm dev
```

Open the URL printed by Vite.

## Features

- Light/Dark theme with toggle in the header. Preference persists to `localStorage` and reapplies on reload.
- Responsive layout: left sidebar (320px on desktop) and main panel on the right. On ≤1024px, sidebar becomes off-canvas with a burger toggle.
- Real-time cards and charts for Temperature/RH and Power/kWh.
- History + Replay: pick a range, load synthetic history, play/pause/stop, speed 0.5×/1×/2×/5×, and seek via slider.
- Alerts list with filter and acknowledge.
- Simple Three.js scene: room box, AC (clickable with popover), sensor indicator scales to temp; AC color reflects latest severity.
- Live vs Mock modes: Mock generates data every second (default). Live can connect to a broker via the Connection panel.

## MQTT Topics (room-101)

- `campus/amikom/room/room-101/env` → `{ ts, temp_c, rh }`
- `campus/amikom/room/room-101/power` → `{ ts, watt, kwh_total }`
- `campus/amikom/room/room-101/occupancy` → `{ ts, count, confidence }`
- `campus/amikom/room/room-101/alerts` → `{ ts, type, value, threshold, severity }`

QoS: env/power=1, occupancy=0.

## Tests

Run unit tests for stores:

```
pnpm test
```

Included tests:

- Ingest order & buffer for env series
- Replay start/stop updates state and emits events
- Power spike detection via median + 3*IQR

## Notes

- Tailwind uses CSS variables declared in `src/styles/theme.css` and applies via `theme-light` / `theme-dark` on the `<html>` element.
- Charts use decimation for smooth performance with up to 5000 points per series.

