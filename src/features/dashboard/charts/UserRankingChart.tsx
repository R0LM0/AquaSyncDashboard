import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyProgress } from '../../../domain/types'

export function UserRankingChart({ daily }: { daily: DailyProgress[] }) {
  const data = useMemo(() => {
    const users = new Map<string, number>()
    for (const row of daily) {
      users.set(row.usuario, (users.get(row.usuario) ?? 0) + row.cambios)
    }

    return [...users.entries()]
      .map(([usuario, cambios]) => ({ usuario, cambios }))
      .sort((a, b) => b.cambios - a.cambios)
      .slice(0, 8)
  }, [daily])

  if (data.length === 0) return <p className="empty">Sin usuarios con actividad.</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="usuario" width={92} />
        <Tooltip />
        <Bar dataKey="cambios" name="Cambios" fill="#1d6fb8" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
