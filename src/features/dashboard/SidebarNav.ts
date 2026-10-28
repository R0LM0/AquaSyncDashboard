import {
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  MapPinned,
  Route,
  Target,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  to: string
  label: string
  icon: LucideIcon
}

export interface UpcomingItem {
  id: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'resumen', to: '/resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'mapa', to: '/mapa', label: 'Mapa', icon: MapPinned },
  { id: 'rutas', to: '/avance-por-ruta', label: 'Avance por ruta', icon: Route },
  { id: 'usuarios', to: '/usuarios', label: 'Usuarios', icon: Users },
  { id: 'reportes', to: '/detalle-y-reportes', label: 'Detalle y reportes', icon: FileSpreadsheet },
]

/** Announced but not built: rendered disabled, never navigable. */
export const UPCOMING_ITEMS: readonly UpcomingItem[] = [
  { id: 'encuestas', label: 'Encuestas', icon: ClipboardList },
  { id: 'servicios-nuevos', label: 'Servicios nuevos', icon: Wrench },
  { id: 'metas', label: 'Metas', icon: Target },
]

export const SIDEBAR_KEY = 'aquasync.sidebar.collapsed'

export function readSidebarCollapsed(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

export function saveSidebarCollapsed(collapsed: boolean, storage: Storage = localStorage): void {
  try {
    storage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
  } catch {
    /* private mode: the choice just does not persist */
  }
}

/** Section title for the topbar, from the active route. */
export function sectionLabel(pathname: string): string {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? 'Resumen'
}
