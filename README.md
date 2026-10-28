# AquaSync Dashboard

Management web dashboard for ENACAL (Nicaragua) that follows the cadastral field work done
with the AquaSync mobile app: what each user does on each route, progress summary, map,
charts and an exportable report.

The backend is BarridoServicios; its contract lives in
`BarridoServicios/Docuemntacion/api-dashboard.md`. The UI depends only on a typed port, so it
runs against the real API (`http` mode) or against a deterministic in-memory mock (`mock`
mode, no backend needed).

## Stack

| Package | Version |
| --- | --- |
| vite | 8.3.5 |
| react / react-dom | 19.3.1 |
| typescript | 6.0.3 |
| recharts | 3.10.1 |
| leaflet / react-leaflet | 1.9.4 / 5.0.0 |
| exceljs / jspdf / jspdf-autotable | 4.4.0 / 4.2.1 / 5.0.9 |
| @microsoft/signalr | 10.0.11 |
| vitest / jsdom | 5.0.5 / 30.1.3 |
| oxlint | 1.90.0 |
| tailwindcss / @tailwindcss/vite | 4.3.3 |
| react-router-dom | 7.18.4 |
| lucide-react (icons) | 1.61.0 |
| @radix-ui (dialog, tooltip, slot, popover) | 1.3.1 / 1.4.1 / 1.5.0 / 1.3.1 |
| @fontsource-variable/manrope | 5.3.0 |
| react-leaflet-cluster | 4.1.3 |
| class-variance-authority / clsx / tailwind-merge | 0.7.1 / 2.1.1 / 3.7.0 |

Same visual stack as `admin-web`: Tailwind 4 with HSL design tokens, Radix primitives,
lucide icons and Manrope. Every proportional section (login, map, charts, tables) loads with
`React.lazy` behind a skeleton: the main entry chunk is ~478 kB. `exceljs` (~914 kB) and
`jspdf` + `jspdf-autotable` (~424 kB) only load when somebody exports a report, so they never
weigh on the dashboard. Light and dark themes share one token set; OSM tiles are darkened with a
CSS filter in the dark theme, like admin-web.

## API URL, resolved at runtime

The dashboard is served from the same server as the API, so the browser host is the API host.
`src/app/apiUrl.ts` is the single source of truth for the base URL, used by the HTTP adapter
and by the SignalR hub:

1. `VITE_API_URL` defined → used as is (local API and explicit overrides).
2. Otherwise → `${window.location.protocol}//${window.location.hostname}:${VITE_API_PORT}/`.

So one build works everywhere: opened as `http://192.168.1.15/...` it talks to
`http://192.168.1.15:8070/`; opened as `http://138.117.6.44/...` it talks to
`http://138.117.6.44:8070/`.

## Modes

| File | `VITE_API_MODE` | `VITE_API_PORT` | `VITE_API_URL` |
| --- | --- | --- | --- |
| `.env.development` | `mock` | – | – |
| `.env.test` | `http` | `7050` | – |
| `.env.production` | `http` | `8070` | – |
| `.env.localapi` | `http` | – | `http://localhost:5029/` |

Only API URLs belong in these files. Never put database passwords, connection strings or
tokens in this frontend: the dashboard only talks to the API.

## Commands

```bash
npm install
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with the mock adapter (`mode development`) |
| `npm run dev:test` | Development server against the real **test** API (`vite --mode test`) |
| `npm run dev:local` | Development server on **port 5173** against the local API (`mode localapi`) |
| `npm test` | Runs the vitest suite once |
| `npm run test:watch` | Runs vitest in watch mode |
| `npm run lint` | oxlint |
| `npm run build:test` | `tsc -b && vite build --mode test` → output in `dist-test/` |
| `npm run build:prod` | `tsc -b && vite build --mode production` → output in `dist/` |

Both builds pass `--mode`, so each bundle is compiled for its own API port. The header shows a
visible `AMBIENTE DE PRUEBAS` badge whenever the mode is not `production`, so nobody confuses
test data with real data.

## Local mode against the local API

1. Start the API with the test databases:

   ```bash
   cd BarridoServicios
   dotnet run --launch-profile Local      # http://localhost:5029/
   ```

2. Start the dashboard on the port the local hub allows as origin:

   ```bash
   npm run dev:local                      # http://localhost:5173
   ```

3. Log in with a SIGIL user from the test environment (the same account used in SIGIL).

## Deploy

`dist-test/` and `dist/` are plain static files: copy the whole folder to the web server that
publishes the corresponding environment. No server-side rendering, no Node runtime. The API
must allow the dashboard origin in CORS, and the SignalR hub lives at
`${API}/hubs/dashboard` with the event `CambioRegistrado`.

## Screens

A collapsible sidebar (state in `localStorage`) holds the sections and, on tablets, becomes a
drawer. The top bar carries the breadcrumb, the environment chip, the live status and a refresh
button; the filter bar sits under it, collapsed by default, and every section shares the same
filters (persisted in the URL).

| Section | What it shows |
| --- | --- |
| **Resumen** | KPI cards with count-up, a 14-day sparkline and the delta against the previous period; stacked area chart by change type; distribution donut with the total in the centre; a tall map (`max(560px, 65vh)`) with the live feed beside it at the same height and its own scrolling. |
| **Mapa** | The same map filling the window (`max(600px, calc(100vh - topbar - filters))`): clustered markers coloured by change type, cadastral layers, fullscreen and "centrar en Nicaragua" buttons, plus the live feed beside it. |
| **Avance por ruta** | Radial gauge with the overall progress, animated gradient bars per route and the sortable user/route table. |
| **Usuarios** | Ranking with position, initials avatar and gradient bars, next to the per-user/per-route table. |
| **Detalle y reportes** | Paginated change detail with the Excel export and the print/PDF action. |
| Próximamente (Encuestas, Servicios nuevos, Metas) | Announced, disabled, never navigable. |

### Map controls

One icon button (`Layers`) sits in the top right, under "centrar" and fullscreen, and opens a
compact popover grouped by *Mapa base* (OpenStreetMap / Satélite), *Límites* (unidades de gestión,
sucursales), *Catastro* (predios, disabled below zoom 15 with the hint) and *Trabajo de campo*
(cambios). The chosen base map and layers persist in `localStorage`. The legend sits bottom left
and collapses into a "Leyenda" chip; the lot hints are centred at the bottom, clear of the zoom
controls and the attribution.

The map re-frames only when the filters change (or on the first load with data). Markers are
managed imperatively per account, so a live event adds or updates just its own marker: no list
rebuild, no map remount, no zoom jump.

The login is its own chunk: an original scene (field crew → cadastral server → map) drawn in
inline SVG, with data packets travelling in a canvas overlay. The scene pauses with a hidden tab,
stays static under `prefers-reduced-motion` and never intercepts the pointer. The hero title is
"Seguimiento catastral" with the gradient on the second word; the environment chip is visible on
the login too.

`src/domain/labels.ts` is the single source for the four change-type colours: charts, map markers
and legends all read it.

## Architecture

Hexagonal, with containers and presentational components:

```
src/
  domain/       types, patch labels/colors, catalog cascade, live helpers, errors
  ports/        DashboardApi (the contract the UI depends on)
  adapters/
    mock/       deterministic dataset: 6 cities, 8 routes, 8 users, 30 days, live push
    http/       DTOs + mappers for the real API, { Status, Title, Data } envelope, SignalR
  app/          apiUrl resolver, adapter selection by VITE_API_MODE, context, env badge
  features/
    auth/       SIGIL-like login, session in sessionStorage
    dashboard/  filters, KPIs, charts, map, tables, export, live activity
  shared/       date and number formatting
```

PascalCase DTOs are mapped to the camelCase domain types **only** inside `adapters/http`; no
screen knows the wire format. Swapping the adapter is one line in
`src/app/createDashboardApi.ts`.

### Filters

`ugestionId`, `sucursalId`, `filial`, `zona`, `ruta`, `usuario`, `desde`, `hasta`,
`tipoCambio`. They are persisted in the URL query string (`?ruta=...&desde=...`), so a view
can be shared or reloaded. Catalogs cascade: gestión → sucursal, filial → zona → ruta.

### Real time

`DashboardApi.subscribeChanges(onChange, onStatus)` is the only live entry point.

- Mock: emits a simulated change every 5–10 s and appends it to its own data.
- HTTP: `@microsoft/signalr` against `${API}hubs/dashboard` with `withAutomaticReconnect`,
  JWT via `accessTokenFactory` (the server reads `access_token`) and the event
  `CambioRegistrado`.

All of it sits behind `useLiveChanges`; screens only get a feed, a counter delta and a status.
A matching change updates the counters and the feed immediately, adds the point to the map with
a brief highlight and refreshes the authoritative data at most once every 5 s. While the
channel is down and not paused, data is refreshed every 60 s; a lost event is never resent, so
a reconnect re-queries the reports.

### Reports (Excel and PDF)

`Exportar` opens a menu with the two formats; both are built from the same pure content model
(`src/features/dashboard/report/reportContent.ts`) and styled in separate builders:

- **Excel** (`exceljs`): a "Resumen" cover with the brand band and logo, readable filters and the
  KPI block; "Avance por ruta" with a coloured frozen header, autofilter, fitted widths, data bars
  on the progress column and a bold totals row; "Detalle de cambios" with real dates and the change
  type in its own colour; "Actividad diaria" ready to chart. Workbook properties and a landscape,
  fit-to-width print setup with page numbers.
- **PDF** (`jspdf` + `jspdf-autotable`): A4 landscape cover with the band, the logo, the filters box,
  the KPI cards and the three charts rasterized at 2× on a light background, then the route and
  change tables with a coloured header, zebra rows, the type in its colour and a repeated header.
  Every page carries "Página X de Y", who generated it and the environment.

Above 20,000 detail rows the menu warns and suggests narrowing the period; the export still runs.
A toast confirms the file and a clear message appears if it fails.

### Runtime environment (one production build, two servers)

`npm run build:prod` produces a single bundle that can point at either API, chosen on the login
with a `Pruebas | Producción` control (Producción by default):

| Environment | API port (same host as the dashboard) |
| --- | --- |
| Producción | 8070 |
| Pruebas | 7050 |

The choice is stored in `localStorage` (`aquasync.ambiente`) and `src/app/apiUrl.ts` is still the
only place that resolves the URL, now also for the SignalR hub. Each environment keeps its own
session (`aquasync.dashboard.session.<environment>`), so switching never reuses the other token and
logging out only closes the current one. In Pruebas the dashboard shows a thin amber band
("Estás viendo datos de pruebas"). Mock (`npm run dev`), the local API (`npm run dev:local`) and
`build:test` keep their fixed target and the switch is hidden.

### Errors

| Response | What the dashboard does |
| --- | --- |
| `400` | Shows the envelope `Title` (invalid filters, pagination, blank credentials), also on the detail table |
| `401` at login | `Usuario o contraseña incorrectos` |
| `401`/`403` elsewhere | Closes the session and returns to the login |
| `503` | `Servicio no disponible` |

The token is restored from `sessionStorage` on reload, so a refresh does not log anybody out.

## Tests

Vitest + Testing Library + jsdom, 210 tests: mock filters (route, user, date range, change
type, gestión/sucursal), summary consistency against the detail rows, cascading catalogs,
filters ↔ URL round trip, API URL resolution (override, internal IP, public IP, https),
per-endpoint contract tests with the JSON examples of the API doc, `CambioRegistrado`
mapping, login validation and dashboard entry, live updates/pause/unmount timer cleanup, and
the pure Excel row builder.
