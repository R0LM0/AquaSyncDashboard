import { useSectionContext } from '../sectionContext'
import { ServiciosPanel } from '../servicios/ServiciosPanel'

export default function ServiciosNuevosPage() {
  const { api, filters, onSessionExpired } = useSectionContext()

  return <ServiciosPanel api={api} filters={filters} onSessionExpired={onSessionExpired} />
}
