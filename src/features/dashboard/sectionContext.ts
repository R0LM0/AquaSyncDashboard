import { useOutletContext } from 'react-router-dom'
import type { DashboardData } from './useDashboardData'
import type { DashboardApi } from '@/ports/DashboardApi'
import type { Alcance, ChangeRow, Filters, MapPoint, Page } from '@/domain/types'
import type { LiveChangesState } from './useLiveChanges'

export interface SectionContextValue {
  api: DashboardApi
  filters: Filters
  /** The user's scope: where the map starts. */
  alcance: Alcance
  data?: DashboardData
  loading: boolean
  error?: string
  previousSummary?: DashboardData['summary']
  points: MapPoint[]
  changes: Page<ChangeRow>
  changesError?: string
  changesLoading: boolean
  pageNumber: number
  pageSize: number
  setPageNumber: (page: number) => void
  live: Pick<LiveChangesState, 'feed' | 'status' | 'paused' | 'togglePaused'>
  highlight: { lat: number; lng: number; id: string } | null
  refresh: () => void
  report: {
    busy: 'excel' | 'pdf' | null
    warning: string | null
    error: string | null
    exportReport: (kind: 'excel' | 'pdf') => void
  }
  /** Opens the account panel for a map point. */
  openAccount: (cuenta: string) => void
  /** Changes only when the filters change: the map re-frames on it, never on live data. */
  fitKey: string
}

export function useSectionContext(): SectionContextValue {
  return useOutletContext<SectionContextValue>()
}
