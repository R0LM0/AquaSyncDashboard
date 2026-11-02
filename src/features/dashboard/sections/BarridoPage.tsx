import { useSectionContext } from '../sectionContext'
import { BarridoPanel } from '../barrido/BarridoPanel'

export default function BarridoPage() {
  const { api, filters, onSessionExpired } = useSectionContext()

  return <BarridoPanel api={api} filters={filters} onSessionExpired={onSessionExpired} />
}
