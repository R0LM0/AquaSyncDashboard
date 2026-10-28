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
| xlsx (SheetJS) | 0.18.5 |
| @microsoft/signalr | 10.0.11 |
| vitest / jsdom | 5.0.5 / 30.1.3 |
| oxlint | 1.90.0 |

The map and the charts load with `React.lazy` (skeleton while they arrive) and SheetJS only
loads when somebody clicks "Exportar Excel", which keeps the main chunk small. The PDF path is
a print stylesheet plus `window.print()`. Styling is plain CSS with design tokens (light and
dark through `prefers-color-scheme`).

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

### Errors

| Response | What the dashboard does |
| --- | --- |
| `400` | Shows the envelope `Title` (invalid filters, pagination, blank credentials), also on the detail table |
| `401` at login | `Usuario o contraseña incorrectos` |
| `401`/`403` elsewhere | Closes the session and returns to the login |
| `503` | `Servicio no disponible` |

The token is restored from `sessionStorage` on reload, so a refresh does not log anybody out.

## Tests

Vitest + Testing Library + jsdom, 73 tests: mock filters (route, user, date range, change
type, gestión/sucursal), summary consistency against the detail rows, cascading catalogs,
filters ↔ URL round trip, API URL resolution (override, internal IP, public IP, https),
per-endpoint contract tests with the JSON examples of the API doc, `CambioRegistrado`
mapping, login validation and dashboard entry, live updates/pause/unmount timer cleanup, and
the pure Excel row builder.
