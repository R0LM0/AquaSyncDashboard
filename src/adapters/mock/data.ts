import type { Catalogs, ChangeType } from '../../domain/types'
import { localDateKey } from '../../shared/dates'
import { createRandom, pick, randomInt, weightedPick } from './random'

export interface MockAccount {
  cuenta: string
  cliente: string
  lat: number
  lng: number
  ruta: string
}

export interface MockEvent {
  id: string
  /** ISO 8601 UTC instant. */
  fecha: string
  usuario: string
  cuenta: string
  tipoCambio: ChangeType
  origen: string
}

export interface MockDataset {
  catalogs: Catalogs
  accounts: MockAccount[]
  events: MockEvent[]
  rutaSucursal: Record<string, string>
  sucursalUgestion: Record<string, string>
}

export const MOCK_SEED = 20261027
export const MOCK_HISTORY_DAYS = 30

const cities = {
  managua: { lat: 12.1364, lng: -86.2514 },
  leon: { lat: 12.4346, lng: -86.8782 },
  chinandega: { lat: 12.6294, lng: -87.1312 },
  masaya: { lat: 11.9744, lng: -86.0942 },
  granada: { lat: 11.9299, lng: -85.956 },
  matagalpa: { lat: 12.9256, lng: -85.9175 },
} as const

const clients = [
  'Comercial La Colonia',
  'Hotel Xolotlán',
  'Farmacia San José',
  'Panadería El Trigal',
  'Taller Mecánica Nica',
  'Restaurante Los Ranchos',
  'Distribuidora López',
  'Pulpería Doña Rosa',
  'Clínica Santa Fe',
  'Cooperativa Augusto César',
  'Barbería El Estilo',
  'Librería Hispamer',
  'Ferretería El Tornillo',
  'Cafetería Aroma',
  'Veterinaria Huellas',
  'Sastrería Don Pedro',
  'Tienda La Económica',
  'Escuela Rubén Darío',
  'Iglesia San Francisco',
  'Mercado Oriental Local 245',
  'Mueblería La Nueva',
  'Repuestos El Cóndor',
  'Lavandería Burbujas',
  'Óptica Visión Clara',
  'Gimnasio Fuerza Nica',
  'Hostal Casa Blanca',
  'Soda La Tere',
  'Ciber Café Central',
  'Dulcería La Cosecha',
  'Comercial Masaya',
] as const

const changeTypeWeights: Record<ChangeType, number> = {
  FotoNueva: 52,
  FotoActualizada: 18,
  UbicacionNueva: 18,
  UbicacionCorregida: 12,
}

function buildCatalogs(): Catalogs {
  return {
    ugestiones: [
      { id: 'UG-01', nombre: 'Unidad de Gestión Managua' },
      { id: 'UG-02', nombre: 'Unidad de Gestión Occidente' },
      { id: 'UG-03', nombre: 'Unidad de Gestión Norte' },
    ],
    sucursales: [
      { id: 'SU-101', nombre: 'Sucursal Managua', ugestionId: 'UG-01' },
      { id: 'SU-102', nombre: 'Sucursal Masaya', ugestionId: 'UG-01' },
      { id: 'SU-103', nombre: 'Sucursal Granada', ugestionId: 'UG-01' },
      { id: 'SU-201', nombre: 'Sucursal León', ugestionId: 'UG-02' },
      { id: 'SU-202', nombre: 'Sucursal Chinandega', ugestionId: 'UG-02' },
      { id: 'SU-301', nombre: 'Sucursal Matagalpa', ugestionId: 'UG-03' },
    ],
    filiales: [
      { id: 'FL-MGA', nombre: 'Filial Managua' },
      { id: 'FL-LEO', nombre: 'Filial León' },
      { id: 'FL-CHI', nombre: 'Filial Chinandega' },
      { id: 'FL-MAS', nombre: 'Filial Masaya' },
      { id: 'FL-GRA', nombre: 'Filial Granada' },
      { id: 'FL-MAT', nombre: 'Filial Matagalpa' },
    ],
    zonas: [
      { id: 'Z-MGA-1', nombre: 'Zona Managua Centro', filial: 'Filial Managua' },
      { id: 'Z-MGA-2', nombre: 'Zona Managua Norte', filial: 'Filial Managua' },
      { id: 'Z-LEO-1', nombre: 'Zona León Norte', filial: 'Filial León' },
      { id: 'Z-CHI-1', nombre: 'Zona Chinandega Centro', filial: 'Filial Chinandega' },
      { id: 'Z-MAS-1', nombre: 'Zona Masaya Centro', filial: 'Filial Masaya' },
      { id: 'Z-GRA-1', nombre: 'Zona Granada Centro', filial: 'Filial Granada' },
      { id: 'Z-MAT-1', nombre: 'Zona Matagalpa Centro', filial: 'Filial Matagalpa' },
    ],
    rutas: [
      { id: 'RT-MGA-01', nombre: 'Ruta MGA-01', filial: 'Filial Managua', zona: 'Zona Managua Centro' },
      { id: 'RT-MGA-02', nombre: 'Ruta MGA-02', filial: 'Filial Managua', zona: 'Zona Managua Norte' },
      { id: 'RT-MGA-03', nombre: 'Ruta MGA-03', filial: 'Filial Managua', zona: 'Zona Managua Centro' },
      { id: 'RT-LEO-01', nombre: 'Ruta LEÓN-01', filial: 'Filial León', zona: 'Zona León Norte' },
      { id: 'RT-CHI-01', nombre: 'Ruta CHIN-01', filial: 'Filial Chinandega', zona: 'Zona Chinandega Centro' },
      { id: 'RT-MAS-01', nombre: 'Ruta MAS-01', filial: 'Filial Masaya', zona: 'Zona Masaya Centro' },
      { id: 'RT-GRA-01', nombre: 'Ruta GRA-01', filial: 'Filial Granada', zona: 'Zona Granada Centro' },
      { id: 'RT-MAT-01', nombre: 'Ruta MAT-01', filial: 'Filial Matagalpa', zona: 'Zona Matagalpa Centro' },
    ],
    usuarios: [
      { id: 'jmedina', nombre: 'José Medina' },
      { id: 'mlopez', nombre: 'María López' },
      { id: 'rcorea', nombre: 'Rafael Corea' },
      { id: 'asilva', nombre: 'Ana Silva' },
      { id: 'cpalacios', nombre: 'Carlos Palacios' },
      { id: 'lurbina', nombre: 'Lucía Urbina' },
      { id: 'fmendoza', nombre: 'Francisco Mendoza' },
      { id: 'dmartinez', nombre: 'Dora Martínez' },
    ],
  }
}

export const rutaSucursal: Record<string, string> = {
  'RT-MGA-01': 'SU-101',
  'RT-MGA-02': 'SU-101',
  'RT-MGA-03': 'SU-101',
  'RT-LEO-01': 'SU-201',
  'RT-CHI-01': 'SU-202',
  'RT-MAS-01': 'SU-102',
  'RT-GRA-01': 'SU-103',
  'RT-MAT-01': 'SU-301',
}

/** One field user per route, so per-user progress never double counts an account. */
export const usuarioRuta: Record<string, string> = {
  jmedina: 'RT-MGA-01',
  mlopez: 'RT-MGA-02',
  rcorea: 'RT-MGA-03',
  asilva: 'RT-LEO-01',
  cpalacios: 'RT-CHI-01',
  lurbina: 'RT-MAS-01',
  fmendoza: 'RT-GRA-01',
  dmartinez: 'RT-MAT-01',
}

const rutaCity: Record<string, { lat: number; lng: number }> = {
  'RT-MGA-01': cities.managua,
  'RT-MGA-02': cities.managua,
  'RT-MGA-03': cities.managua,
  'RT-LEO-01': cities.leon,
  'RT-CHI-01': cities.chinandega,
  'RT-MAS-01': cities.masaya,
  'RT-GRA-01': cities.granada,
  'RT-MAT-01': cities.matagalpa,
}

/** Accounts carry the route name (what the UI shows), so map the user's route id. */
function rutaNombreDeUsuario(catalogs: Catalogs, usuario: string): string {
  const rutaId = usuarioRuta[usuario]
  return catalogs.rutas.find((ruta) => ruta.id === rutaId)?.nombre ?? ''
}

function buildAccounts(catalogs: Catalogs, random: () => number): MockAccount[] {
  const accounts: MockAccount[] = []
  let sequence = 110_001

  for (const ruta of catalogs.rutas) {
    const center = rutaCity[ruta.id]
    const total = randomInt(random, 14, 19)
    for (let index = 0; index < total; index += 1) {
      accounts.push({
        cuenta: `CTA-${sequence}`,
        cliente: pick(random, clients),
        lat: Number((center.lat + (random() - 0.5) * 0.06).toFixed(6)),
        lng: Number((center.lng + (random() - 0.5) * 0.06).toFixed(6)),
        ruta: ruta.nombre,
      })
      sequence += 1
    }
  }

  return accounts
}

function buildEvents(
  catalogs: Catalogs,
  accounts: MockAccount[],
  random: () => number,
  today: Date,
): MockEvent[] {
  const events: MockEvent[] = []
  let sequence = 1

  for (let dayOffset = 0; dayOffset < MOCK_HISTORY_DAYS; dayOffset += 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset)
    const eventsToday = randomInt(random, 9, 17)

    for (let index = 0; index < eventsToday; index += 1) {
      const usuario = pick(random, catalogs.usuarios).id
      const ruta = rutaNombreDeUsuario(catalogs, usuario)
      const routeAccounts = accounts.filter((account) => account.ruta === ruta)
      const account = pick(random, routeAccounts)
      const fecha = new Date(day)
      fecha.setHours(randomInt(random, 7, 17), randomInt(random, 0, 59), randomInt(random, 0, 59), 0)

      events.push({
        id: `CAMB-${`${sequence}`.padStart(6, '0')}`,
        fecha: fecha.toISOString(),
        usuario,
        cuenta: account.cuenta,
        tipoCambio: weightedPick(random, changeTypeWeights),
        origen: random() < 0.12 ? 'AquaSync Offline' : 'AquaSync',
      })
      sequence += 1
    }
  }

  return events
}

export function buildMockDataset(today: Date = new Date()): MockDataset {
  const random = createRandom(MOCK_SEED)
  const catalogs = buildCatalogs()
  const accounts = buildAccounts(catalogs, random)
  const events = buildEvents(catalogs, accounts, random, today)
  const sucursalUgestion = Object.fromEntries(
    catalogs.sucursales.map((sucursal) => [sucursal.id, sucursal.ugestionId]),
  )

  return {
    catalogs,
    accounts,
    events,
    rutaSucursal,
    sucursalUgestion,
  }
}

/** Builds the next simulated field change for an already-built dataset. */
export function buildLiveEvent(
  dataset: MockDataset,
  random: () => number,
  now: Date = new Date(),
): MockEvent {
  const usuario = pick(random, dataset.catalogs.usuarios).id
  const ruta = rutaNombreDeUsuario(dataset.catalogs, usuario)
  const account = pick(
    random,
    dataset.accounts.filter((candidate) => candidate.ruta === ruta),
  )

  return {
    id: `CAMB-LIVE-${`${Date.now()}`.slice(-8)}-${randomInt(random, 1000, 9999)}`,
    fecha: now.toISOString(),
    usuario,
    cuenta: account.cuenta,
    tipoCambio: weightedPick(random, changeTypeWeights),
    origen: random() < 0.15 ? 'AquaSync Offline' : 'AquaSync',
  }
}

export function formatDayKey(date: Date): string {
  return localDateKey(date)
}
