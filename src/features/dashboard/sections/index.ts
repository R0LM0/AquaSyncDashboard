import { lazy } from 'react'

/**
 * One chunk per section: the layout and the login never download the map, the
 * charts or the tables they do not need.
 */
export const ResumenPage = lazy(() => import('./ResumenPage'))
export const MapaPage = lazy(() => import('./MapaPage'))
export const RutasPage = lazy(() => import('./RutasPage'))
export const UsuariosPage = lazy(() => import('./UsuariosPage'))
export const ReportesPage = lazy(() => import('./ReportesPage'))
