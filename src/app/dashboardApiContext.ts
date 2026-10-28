import { createContext, useContext } from 'react'
import type { DashboardApi } from '../ports/DashboardApi'

export const DashboardApiContext = createContext<DashboardApi | null>(null)

export function useDashboardApi(): DashboardApi {
  const api = useContext(DashboardApiContext)
  if (!api) throw new Error('useDashboardApi debe usarse dentro de DashboardApiProvider')
  return api
}
