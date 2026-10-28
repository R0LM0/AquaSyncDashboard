import { lazy } from 'react'

/**
 * The map and the charts are the heaviest parts of the dashboard, so they load on
 * demand: the first paint does not wait for leaflet or recharts.
 */
export const ChangesMap = lazy(() =>
  import('./map/ChangesMap').then((module) => ({ default: module.ChangesMap })),
)

export const DailyActivityChart = lazy(() =>
  import('./charts/DailyActivityChart').then((module) => ({ default: module.DailyActivityChart })),
)

export const UserRankingChart = lazy(() =>
  import('./charts/UserRankingChart').then((module) => ({ default: module.UserRankingChart })),
)

export const RouteProgressChart = lazy(() =>
  import('./charts/RouteProgressChart').then((module) => ({ default: module.RouteProgressChart })),
)
