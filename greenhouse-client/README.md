# Greenhouse Controller

Next.js (App Router) version of [this design](https://www.magicpatterns.com/os/cfEGb9YX5jVRZZW6HCFake?file=2R6e8hBtkcFzNEmRywHTV3), originally exported from [Magic Patterns](https://magicpatterns.com).

## Getting started

1. `npm install`
2. `npm run dev` and open http://localhost:3000

Production: `npm run build` then `npm start`.

## Routes

| URL           | Screen |
| ------------- | ------ |
| `/`           | redirects to `/login` (see `next.config.ts`) |
| `/login`      | Sign in (password: `greenhouse`) |
| `/dashboard`  | Dashboard — also `?state=watering` and `?state=heat-alarm` demo scenarios |
| `/sensors`    | Sensor history |
| `/automation` | Automation rules |
| `/settings`   | Settings |

## Structure

```
src/
  app/
    layout.tsx                 <html>/<body>, fonts, title template
    globals.css                Tailwind v4 theme tokens (colours, fonts)
    (auth)/login/page.tsx      Sign-in page
    (dashboard)/layout.tsx     Sidebar shell shared by all signed-in pages
    (dashboard)/<route>/page.tsx
  components/
    layout/                    AppShell, PageHeader, PageContent, sidebar/*
    ui/                        Panel, PanelHeader, StatusPill, Segmented, Switch, PrimaryButton, TextLink…
    charts/                    LineChart, SensorLineChart, DailyBarChart
    activity/                  ActivityItem
    login/  dashboard/  sensors/  automation/  settings/
public/icons/                  Sidebar route icons (1 Dashboard, 2 Settings, 3 Automation, 4 Sensor history)
  lib/
    data.ts                    Simulated controller data, thresholds, helpers
    navigation.ts              Sidebar items
    sensor-history.ts          Sensor-history formatting and statistics
    format.ts
```

### Conventions

- Each `page.tsx` is a **server component** that composes the page from section components and exports its own `metadata`.
- Interactive pieces are small `'use client'` components. When the header and the body of a page share state
  (e.g. the selected time range on Sensor history), a page-level provider holds it:
  `LiveReadingsProvider`, `SensorRangeProvider`, `AutomationProvider`, `SettingsProvider`.
- Sidebar route icons are the images in `public/icons/` (mapped in `src/lib/navigation.ts`), rendered with `next/image`.
- The page header holds the sidebar toggle (left) and the notification bell (right, `NotificationBell`), which opens a dropdown of the latest alerts.
- On tablet and desktop the dashboard's four sensor cards fill exactly the visible area below the header, so all four are seen at a glance.
  `<PageContent>` is a CSS size container and the grid uses `100cqh`; on short screens (`short:` variant in `globals.css`) the card footers are hidden.
- Navigation uses `next/link`; the active sidebar item comes from `usePathname()`.

