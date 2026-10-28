import { ChevronLeft, ChevronRight, LogOut, Moon, Sun, Waves } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { buildInfo, formatBuildInfo } from '@/app/buildInfo'
import type { Theme } from '@/app/theme'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import type { Session } from '@/domain/types'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, UPCOMING_ITEMS } from './SidebarNav'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  session: Session
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => void
  /** Called after navigating on a small screen (closes the drawer). */
  onNavigate?: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  session,
  theme,
  onToggleTheme,
  onLogout,
  onNavigate,
}: SidebarProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex h-full flex-col gap-2 border-r border-border-subtle bg-surface/85 px-2.5 py-4 backdrop-blur',
          collapsed ? 'items-center' : 'items-stretch',
        )}
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div className={cn('mb-2 flex items-center gap-2', collapsed ? 'justify-center' : 'px-2')}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.9)]">
            <Waves className="size-5" aria-hidden="true" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-fg">SIGIL</p>
              <p className="truncate text-[11px] text-muted-fg">Catastro · ENACAL</p>
            </div>
          ) : null}
        </div>

        <nav aria-label="Secciones" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ id, to, label, icon: Icon }) => (
            <NavItemLink
              key={id}
              to={to}
              label={label}
              collapsed={collapsed}
              onNavigate={onNavigate}
              icon={<Icon className="size-[18px]" aria-hidden="true" />}
            />
          ))}

          <div
            className={cn(
              'mt-4 mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-fg/80',
              collapsed && 'sr-only',
            )}
          >
            Próximamente
          </div>

          {UPCOMING_ITEMS.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              aria-disabled="true"
              data-testid={`upcoming-${id}`}
              title={`${label} · Próximamente`}
              className={cn(
                'flex cursor-not-allowed items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-fg/60',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {!collapsed ? (
                <>
                  <span className="truncate">{label}</span>
                  <span className="ml-auto rounded-full border border-border-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    Pronto
                  </span>
                </>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="mt-2 flex flex-col gap-1 border-t border-border-subtle pt-3">
          <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'px-2')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-fg">
              {initials(session.nombre)}
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{session.nombre}</p>
                <p className="truncate text-[11px] text-muted-fg">{session.usuario}</p>
              </div>
            ) : null}
          </div>

          <div className={cn('mt-1 flex gap-1', collapsed ? 'flex-col' : 'items-center')}>
            <IconAction
              label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              collapsed={collapsed}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </IconAction>
            <IconAction label="Salir" collapsed={collapsed} onClick={onLogout}>
              <LogOut />
            </IconAction>
            <IconAction
              label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              collapsed={collapsed}
              onClick={onToggleCollapsed}
              className={collapsed ? undefined : 'ml-auto'}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconAction>
          </div>
          <p
            className={cn('mt-1 truncate text-[10px] text-muted-fg/80', collapsed ? 'text-center' : 'px-2')}
            title={formatBuildInfo(buildInfo)}
            data-testid="build-info"
          >
            {collapsed ? `v${buildInfo.version}` : formatBuildInfo(buildInfo)}
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}

function NavItemLink({
  to,
  label,
  icon,
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  icon: ReactNode
  collapsed: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)]'
            : 'text-muted-fg hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      {icon}
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  )

  return collapsed ? (
    <Tooltip content={label} side="right">
      <span className="inline-flex">{link}</span>
    </Tooltip>
  ) : (
    link
  )
}

function IconAction({
  label,
  children,
  onClick,
  collapsed,
  className,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  collapsed: boolean
  className?: string
}) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className={className}
    >
      {children}
    </Button>
  )

  return collapsed ? (
    <Tooltip content={label} side="right">
      <span className="inline-flex">{button}</span>
    </Tooltip>
  ) : (
    button
  )
}

function initials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
