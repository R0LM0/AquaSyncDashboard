import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { UserRouteProgress } from '../../../domain/types'
import { formatPercent } from '../../../shared/format'

export function RouteProgressChart({ progress }: { progress: UserRouteProgress[] }) {
  const data = useMemo(() => {
    const routes = new Map<string, { ruta: string; trabajadas: number; total: number }>()

    for (const row of progress) {
      const current = routes.get(row.ruta) ?? { ruta: row.ruta, trabajadas: 0, total: row.cuentasRuta }
      current.trabajadas += row.cuentasTrabajadas
      current.total = Math.max(current.total, row.cuentasRuta)
      routes.set(row.ruta, current)
    }

    return [...routes.values()]
      .map((route) => ({
        ruta: route.ruta,
        avance: route.total > 0 ? Math.min(100, Math.round((route.trabajadas / route.total) * 100)) : 0,
      }))
      .sort((a, b) => b.avance - a.avance)
  }, [progress])

  if (data.length === 0) return <p className="empty">Sin rutas con avance en el período.</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="ruta" minTickGap={8} />
        <YAxis allowDecimals={false} domain={[0, 100]} width={44} unit="%" />
        <Tooltip formatter={(value) => formatPercent(Number(value))} />
        <Bar dataKey="avance" name="Avance" fill="#2f9e8f" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
