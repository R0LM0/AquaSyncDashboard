import type { ReactNode } from 'react'
import { DashboardApiContext } from './dashboardApiContext'
import type { DashboardApi } from '../ports/DashboardApi'

export function DashboardApiProvider({ api, children }: { api: DashboardApi; children: ReactNode }) {
  return <DashboardApiContext.Provider value={api}>{children}</DashboardApiContext.Provider>
}
