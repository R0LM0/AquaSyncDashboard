import { useCallback, useMemo, useRef, useState } from "react";
import { FileText, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { BarridoAsignacion, Filters } from "@/domain/types";
import type { DashboardApi } from "@/ports/DashboardApi";
import { formatDateTime, formatNumber } from "@/shared/format";
import { cn } from "@/lib/utils";
import { downloadBlob } from "../report/download";
import { EmptyState } from "../EmptyState";
import {
  TRAFFIC_COLORS,
  TRAFFIC_LABELS,
} from "../coverage/ranking/routeRanking";
import {
  ActivityMap,
  type ActivityFocus,
  type ActivityMapPoint,
} from "./ActivityMap";
import { buildPopup } from "./activityPopup";
import { SurveyPanel } from "./SurveyPanel";
import {
  DayChart,
  DeviceTable,
  ExportButtons,
  Kpi,
  TD,
  THEAD,
  THEAD_ROW,
  Th,
} from "./ActivityParts";
import {
  activityFileName,
  aliasColor,
  assignmentKeyOf,
  assignmentLight,
  collectAliases,
  filterAssignments,
  filterWorkedAccounts,
  hasLocation,
  limitRows,
  sortWorkedAccounts,
  type WorkedAccount,
} from "./activity";
import { useActivityRefresh, useActivityResource } from "./useActivityResource";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PENDING_COLOR = "#64748b";

/** The assignment picked in the table: it holds only for the filters it was picked under. */
interface Picked {
  filtersKey: string;
  key: string;
}

export interface BarridoPanelProps {
  api: DashboardApi;
  filters: Filters;
  onSessionExpired: () => void;
}

/** Barrido: assignments with progress, the activity of the phones and the pending accounts. */
export function BarridoPanel({
  api,
  filters,
  onSessionExpired,
}: BarridoPanelProps) {
  const refreshToken = useActivityRefresh(api, "barrido");
  const filtersKey = JSON.stringify(filters);
  // The selection lives in component state, never in the URL.
  const [picked, setPicked] = useState<Picked | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [query, setQuery] = useState("");
  const [workedQuery, setWorkedQuery] = useState("");
  const [focus, setFocus] = useState<ActivityFocus | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const nonce = useRef(0);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const assignments = useActivityResource({
    key: filtersKey,
    load: useCallback(
      (signal: AbortSignal) =>
        api.barridoAsignaciones(JSON.parse(filtersKey) as Filters, signal),
      [api, filtersKey],
    ),
    fallbackError: "No se pudieron cargar las asignaciones del barrido",
    onSessionExpired,
    refreshToken,
  });

  const rows = useMemo(() => assignments.data ?? [], [assignments.data]);
  const selected: BarridoAsignacion | null = useMemo(
    () =>
      picked && picked.filtersKey === filtersKey
        ? (rows.find((row) => assignmentKeyOf(row) === picked.key) ?? null)
        : null,
    [picked, filtersKey, rows],
  );
  const selectedKey = selected ? assignmentKeyOf(selected) : "todas";

  const activity = useActivityResource({
    key: assignments.status === "ready" ? `${filtersKey}#${selectedKey}` : null,
    load: useCallback(
      (signal: AbortSignal) =>
        api.barridoActividad(
          JSON.parse(filtersKey) as Filters,
          selected
            ? {
                cliBarridoId: selected.cliBarridoId,
                periodo: selected.periodoId,
              }
            : {},
          signal,
        ),
      [api, filtersKey, selected],
    ),
    fallbackError: "No se pudo cargar la actividad del barrido",
    onSessionExpired,
    refreshToken,
  });

  const pendingActive = Boolean(selected) && showPending;
  const pending = useActivityResource({
    key: pendingActive && selected ? `pend#${selectedKey}` : null,
    load: useCallback(
      (signal: AbortSignal) =>
        selected
          ? api.barridoPendientes(
              {
                usrId: selected.usrId,
                cliBarridoId: selected.cliBarridoId,
                periodo: selected.periodoId,
              },
              signal,
            )
          : Promise.resolve([]),
      [api, selected],
    ),
    fallbackError: "No se pudieron cargar las cuentas pendientes",
    onSessionExpired,
    refreshToken,
  });

  const data = activity.data;
  const order = useMemo(
    () =>
      collectAliases(
        data?.dispositivos ?? [],
        data?.porDia ?? [],
        data?.puntos ?? [],
      ),
    [data],
  );
  const table = useMemo(() => filterAssignments(rows, query), [rows, query]);
  const worked = useMemo(() => sortWorkedAccounts(data?.puntos ?? []), [data]);
  const workedTable = useMemo(
    () => limitRows(filterWorkedAccounts(worked, workedQuery)),
    [worked, workedQuery],
  );

  const points = useMemo<ActivityMapPoint[]>(() => {
    const surveys: ActivityMapPoint[] = (data?.puntos ?? [])
      .flatMap((point, index) => (hasLocation(point) ? [{ point, index }] : []))
      .map(({ point, index }) => ({
        id: `p-${index}`,
        lat: point.lat,
        lng: point.lng,
        color: aliasColor(point.alias, order),
        kind: "registro",
        surveyId: point.referenciaId || undefined,
        popup: buildPopup(
          `Cuenta ${point.cuenta}`,
          [
            point.catastro && `N° catastral ${point.catastro}`,
            point.alias,
            formatDateTime(point.fecha),
          ],
          point.lat,
          point.lng,
          { survey: Boolean(point.referenciaId) },
        ),
      }));
    const open: ActivityMapPoint[] =
      pendingActive && pending.data
        ? pending.data.filter(hasLocation).map((account) => ({
            id: `n-${account.cuentaNro}`,
            lat: account.lat,
            lng: account.lng,
            color: PENDING_COLOR,
            kind: "pendiente",
            popup: buildPopup(
              `Cuenta ${account.cuentaNro} (pendiente)`,
              [
                account.catastro && `N° catastral ${account.catastro}`,
                account.cliente || "Sin nombre de cliente",
                account.direccion || "Sin dirección",
              ],
              account.lat,
              account.lng,
            ),
          }))
        : [];
    return [...surveys, ...open];
  }, [data, order, pendingActive, pending.data]);

  async function exportReport(kind: "excel" | "pdf") {
    if (!data) return;
    setBusy(kind);
    setExportError(null);
    try {
      const generatedAt = new Date();
      const report = {
        asignaciones: rows,
        seleccion: selected,
        actividad: data,
        pendientes: pendingActive ? (pending.data ?? null) : null,
      };
      if (kind === "excel") {
        const { buildBarridoWorkbook } = await import("./barridoExcel");
        const buffer = await buildBarridoWorkbook(
          report,
          generatedAt,
        ).xlsx.writeBuffer();
        downloadBlob(
          new Blob([buffer], { type: XLSX_MIME }),
          activityFileName("Barrido", "xlsx", generatedAt),
        );
      } else {
        const { buildBarridoPdf } = await import("./barridoPdf");
        buildBarridoPdf(report, generatedAt).save(
          activityFileName("Barrido", "pdf", generatedAt),
        );
      }
    } catch {
      setExportError("No se pudo generar el reporte. Intentá de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  function locate(row: WorkedAccount) {
    nonce.current += 1;
    setFocus({ id: `p-${row.index}`, nonce: nonce.current });
    mapRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  function pick(row: BarridoAsignacion) {
    const key = assignmentKeyOf(row);
    setPicked(
      selected && assignmentKeyOf(selected) === key
        ? null
        : { filtersKey, key },
    );
  }

  if (assignments.status === "idle" || assignments.status === "loading") {
    return (
      <div className="space-y-3" data-testid="barrido-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (assignments.status === "error") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Barrido</CardTitle>
            <CardDescription>
              Asignaciones y actividad de los celulares
            </CardDescription>
          </div>
        </CardHeader>
        <p role="alert" className="text-sm font-semibold text-danger">
          {assignments.error}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <CardHeader>
          <div>
            <CardTitle>Asignaciones de barrido</CardTitle>
            <CardDescription>
              Tocá una asignación para ver su actividad y sus cuentas
              pendientes. Sin selección se muestra todo el filtro
            </CardDescription>
          </div>
          {selected ? (
            <Button variant="outline" size="sm" onClick={() => setPicked(null)}>
              Ver todas las asignaciones
            </Button>
          ) : null}
        </CardHeader>

        {rows.length === 0 ? (
          <EmptyState
            title="No hay asignaciones de barrido"
            detail="Probá con otra unidad de gestión, sucursal o usuario."
          />
        ) : (
          <>
            <div className="sm:w-72">
              <Input
                aria-label="Buscar asignación por usuario, ruta o período"
                placeholder="Usuario, ruta o período"
                icon={<Search className="size-4" aria-hidden="true" />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <ul
              className="flex flex-wrap gap-4 text-xs font-semibold text-muted-fg"
              aria-label="Semáforo de avance"
            >
              {(
                Object.keys(TRAFFIC_LABELS) as Array<
                  keyof typeof TRAFFIC_LABELS
                >
              ).map((light) => (
                <li key={light} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: TRAFFIC_COLORS[light] }}
                    aria-hidden="true"
                  />
                  {TRAFFIC_LABELS[light]}
                </li>
              ))}
            </ul>
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Asignaciones de barrido con su avance
                </caption>
                <thead className={THEAD}>
                  <tr className={THEAD_ROW}>
                    <Th>Semáforo</Th>
                    <Th>Usuario</Th>
                    <Th>Ruta</Th>
                    <Th>Período</Th>
                    <Th numeric>Asignadas</Th>
                    <Th numeric>Encuestadas</Th>
                    <Th numeric>Pendientes</Th>
                    <Th numeric>Avance</Th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => {
                    const light = assignmentLight(row);
                    const isSelected =
                      selected !== null &&
                      assignmentKeyOf(selected) === assignmentKeyOf(row);
                    return (
                      <tr
                        key={assignmentKeyOf(row)}
                        tabIndex={0}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:outline-none",
                          isSelected && "bg-primary/10",
                        )}
                        onClick={() => pick(row)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ")
                            return;
                          event.preventDefault();
                          pick(row);
                        }}
                      >
                        <td className={TD}>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ background: TRAFFIC_COLORS[light] }}
                              aria-hidden="true"
                            />
                            {TRAFFIC_LABELS[light]}
                          </span>
                        </td>
                        <td className={`${TD} font-semibold text-fg`}>
                          {row.usuario}
                        </td>
                        <td
                          className={TD}
                        >{`${row.filial}-${row.zona}-${row.ruta}`}</td>
                        <td className={TD}>{row.periodo}</td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {formatNumber(row.asignadas)}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {formatNumber(row.encuestadas)}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {formatNumber(row.pendientes)}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {row.avance.toFixed(1)} %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {table.length === 0 ? (
                <EmptyState title="Ninguna asignación coincide con la búsqueda" />
              ) : null}
            </div>
          </>
        )}
      </Card>

      {activity.status === "loading" || activity.status === "idle" ? (
        <Card className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[280px] w-full" />
        </Card>
      ) : activity.status === "error" || !data ? (
        <Card>
          <p role="alert" className="text-sm font-semibold text-danger">
            {activity.error ?? "No se pudo cargar la actividad del barrido"}
          </p>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <CardHeader>
              <div>
                <CardTitle>Actividad de los celulares</CardTitle>
                <CardDescription>
                  {selected
                    ? `${selected.usuario} · ruta ${selected.filial}-${selected.zona}-${selected.ruta} · ${selected.periodo}`
                    : "Todas las asignaciones del filtro"}
                </CardDescription>
              </div>
              <ExportButtons
                busy={busy}
                onExport={(kind) => void exportReport(kind)}
              />
            </CardHeader>

            {exportError ? (
              <p role="alert" className="text-xs font-semibold text-danger">
                {exportError}
              </p>
            ) : null}

            <dl className="grid grid-cols-3 gap-3">
              <Kpi
                label="Encuestas"
                value={formatNumber(data.resumen.encuestas)}
              />
              <Kpi label="Hoy" value={formatNumber(data.resumen.hoy)} />
              <Kpi
                label="Dispositivos"
                value={formatNumber(data.resumen.dispositivos)}
              />
            </dl>

            <div>
              <p className="mb-2 text-xs font-bold text-muted-fg">
                Encuestas por día y dispositivo
              </p>
              <DayChart
                porDia={data.porDia}
                order={order}
                emptyTitle="Sin encuestas en el período"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-muted-fg">
                Dispositivos
              </p>
              <DeviceTable
                devices={data.dispositivos}
                countLabel="Encuestas"
                order={order}
              />
            </div>
          </Card>

          <Card className="space-y-3">
            <CardHeader>
              <div>
                <CardTitle>Cuentas trabajadas</CardTitle>
                <CardDescription>
                  Del más reciente al más antiguo. Usá Ubicar para verla en el
                  mapa
                </CardDescription>
              </div>
            </CardHeader>
            {worked.length === 0 ? (
              <EmptyState title="Todavía no hay cuentas trabajadas en el período" />
            ) : (
              <>
                <div className="sm:w-72">
                  <Input
                    aria-label="Buscar cuenta trabajada por cuenta, N° catastral o dispositivo"
                    placeholder="Cuenta, N° catastral o dispositivo"
                    icon={<Search className="size-4" aria-hidden="true" />}
                    value={workedQuery}
                    onChange={(event) => setWorkedQuery(event.target.value)}
                  />
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">Cuentas trabajadas</caption>
                    <thead className={THEAD}>
                      <tr className={THEAD_ROW}>
                        <Th>Cuenta</Th>
                        <Th>N° catastral</Th>
                        <Th>Dispositivo</Th>
                        <Th>Fecha</Th>
                        <Th>Mapa</Th>
                        <Th>Encuesta</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {workedTable.shown.map((row) => (
                        <tr key={row.index}>
                          <td className={`${TD} font-semibold text-fg`}>
                            {row.cuenta}
                          </td>
                          <td className={TD}>{row.catastro || "—"}</td>
                          <td className={TD}>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2.5 rounded-full"
                                style={{
                                  background: aliasColor(row.alias, order),
                                }}
                                aria-hidden="true"
                              />
                              {row.alias}
                            </span>
                          </td>
                          <td
                            className={`${TD} whitespace-nowrap text-muted-fg`}
                          >
                            {formatDateTime(row.fecha)}
                          </td>
                          <td className={TD}>
                            {hasLocation(row) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => locate(row)}
                                aria-label={`Ubicar la cuenta ${row.cuenta} en el mapa`}
                              >
                                <MapPin aria-hidden="true" />
                                Ubicar
                              </Button>
                            ) : (
                              <span className="text-muted-fg">
                                Sin ubicación
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            {row.referenciaId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSurveyId(row.referenciaId)}
                                aria-label={`Ver la encuesta de la cuenta ${row.cuenta}`}
                              >
                                <FileText aria-hidden="true" />
                                Ver encuesta
                              </Button>
                            ) : (
                              <span className="text-muted-fg">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {workedTable.shown.length === 0 ? (
                    <EmptyState title="Ninguna cuenta coincide con la búsqueda" />
                  ) : null}
                </div>
                {workedTable.hidden > 0 ? (
                  <p className="text-xs text-muted-fg">
                    Mostrando {formatNumber(workedTable.shown.length)} de{" "}
                    {formatNumber(
                      workedTable.shown.length + workedTable.hidden,
                    )}
                    ; usá el buscador o exportá a Excel
                  </p>
                ) : null}
              </>
            )}
          </Card>

          <Card className="space-y-3">
            <CardHeader>
              <div>
                <CardTitle>Mapa de encuestas</CardTitle>
                <CardDescription>
                  Cada punto es una encuesta, del color de su dispositivo
                  {data.puntos.length >= 5000
                    ? ". Se muestran las primeras 5.000"
                    : ""}
                </CardDescription>
              </div>
            </CardHeader>
            {pending.status === "error" && pendingActive ? (
              <p role="alert" className="text-xs font-semibold text-danger">
                {pending.error}
              </p>
            ) : null}
            <div ref={mapRef}>
              <ActivityMap
                points={points}
                fitKey={`${filtersKey}#${selectedKey}#${pendingActive && pending.data ? "p" : ""}`}
                legend={order.map((alias) => ({
                  label: alias,
                  color: aliasColor(alias, order),
                }))}
                focus={focus}
                pending={
                  selected
                    ? {
                        on: showPending,
                        busy:
                          showPending &&
                          (pending.status === "loading" ||
                            pending.status === "idle"),
                        count: pending.data?.length ?? null,
                        onToggle: () => setShowPending((current) => !current),
                      }
                    : undefined
                }
                emptyTitle="Ninguna encuesta tiene ubicación"
                emptyDetail="Los puntos aparecen cuando un celular envía una encuesta con coordenadas."
                ariaLabel="Mapa de encuestas del barrido"
                ugestionId={filters.ugestionId}
                sucursalId={filters.sucursalId}
                desde={filters.desde}
                hasta={filters.hasta}
                onOpenSurvey={setSurveyId}
              />
            </div>
            {!selected ? (
              <p className="text-xs text-muted-fg">
                Elegí una asignación para mostrar sus cuentas pendientes en el
                mapa.
              </p>
            ) : null}
          </Card>
        </>
      )}
      <SurveyPanel
        surveyId={surveyId}
        open={surveyId !== null}
        onClose={() => setSurveyId(null)}
        onSessionExpired={onSessionExpired}
      />
    </div>
  );
}
