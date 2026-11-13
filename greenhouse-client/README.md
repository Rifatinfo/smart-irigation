# Greenhouse Controller — Dashboard

Next.js (App Router) dashboard for the Smart Irrigation controller. It shows live data from the ESP32 through the
`greenhouse-server` API. Originally exported from [Magic Patterns](https://www.magicpatterns.com/os/cfEGb9YX5jVRZZW6HCFake?file=2R6e8hBtkcFzNEmRywHTV3).

## Getting started

1. Start the backend first (`../greenhouse-server`, see its README: `npm run db:deploy`, `npm run seed`, `npm run dev`).
2. `npm install`
3. `npm run dev` and open http://localhost:3000. Sign in with the admin account created by `npm run seed`.

Production: `npm run build` then `npm start`.

### Backend address

By default the dashboard calls the API on **the same host it was opened from, port 5000**:
`http://localhost:3000` → `http://localhost:5000`, `http://192.168.0.10:3000` (a phone on the LAN) → `http://192.168.0.10:5000`.
If the API runs elsewhere, create `.env.local` with:

```
NEXT_PUBLIC_API_URL=https://api.example.com
```

(It is read at build time, so rebuild after changing it.)

## Routes

| URL           | Screen |
| ------------- | ------ |
| `/`           | redirects to `/login` (see `next.config.ts`) |
| `/login`      | Sign in. Signed-in users go straight to the dashboard |
| `/dashboard`  | Live readings, device states, 24 h trends, recent activity, weekly totals |
| `/sensors`    | Sensor history (24 h / 7 d / 30 d): statistics, charts, CSV export |
| `/automation` | Pump / grow-light / buzzer rules, automatic or manual control, pump runs |
| `/activity`   | Alerts (acknowledge / silence) and the full activity log with filters |
| `/settings`   | Controller status, API key, upload interval, sensor calibration, notifications, account |

## How the data flows

```
ESP32 --POST /device/readings--> greenhouse-server --PostgreSQL
                                        |
                       REST (summary, history, settings…) + Server-Sent Events (/stream)
                                        v
                         GreenhouseProvider (this app) --> every page
```

- `src/lib/api.ts`: typed API client (cookie login, automatic token refresh).
- `src/components/providers/GreenhouseProvider.tsx`: wraps every signed-in page. It checks the login (redirects to `/login`),
  loads the summary and settings, then keeps them live from the realtime stream. If the stream is unavailable it falls
  back to polling every 10 s. `useHistory(range)` loads chart/statistics data, and `useNow()` keeps "12s ago" labels ticking.
- New alerts can raise desktop notifications (Settings → Notifications; saved per browser).

## Structure

```
src/
  app/
    (auth)/login/page.tsx      Sign-in page
    (dashboard)/layout.tsx     GreenhouseProvider + sidebar shell shared by all signed-in pages
    (dashboard)/<route>/page.tsx
  components/
    providers/                 GreenhouseProvider, useHistory, useNow
    layout/                    AppShell, PageHeader, PageContent, NotificationBell, sidebar/*
    ui/                        Panel, PanelHeader, StatusPill, Segmented, Switch, PrimaryButton, TextLink…
    charts/                    LineChart, SensorLineChart, DailyBarChart
    activity/                  ActivityItem, AlertsPanel, ActivityLogPanel
    login/  dashboard/  sensors/  automation/  settings/
  lib/
    api.ts                     API client and response types
    data.ts                    Metric metadata, formatting, log/statistics helpers
    notifications.ts           Desktop-notification preferences
    navigation.ts              Sidebar items
    sensor-history.ts          Sensor-history labels and chart helpers
public/icons/                  Sidebar route icons (1 Dashboard, 2 Settings, 3 Automation, 4 Sensor history)
```

### Conventions

- Each `page.tsx` is a **server component** that composes the page from section components and exports its own `metadata`.
- Interactive pieces are small `'use client'` components. Page-level providers hold state shared by the header and the body:
  `LiveReadingsProvider`, `SensorRangeProvider` (also loads the range's history), `AutomationProvider` (unsaved rule edits),
  `SettingsProvider` (unsaved settings edits). Save buttons send only the fields that changed.
- On tablet and desktop the dashboard's four sensor cards fill exactly the visible area below the header.
  `<PageContent>` is a CSS size container and the grid uses `100cqh`; on short screens (`short:` variant in `globals.css`) the card footers are hidden.
