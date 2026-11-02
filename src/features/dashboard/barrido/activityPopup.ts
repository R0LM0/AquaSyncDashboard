import { escapeHtml, googleMapsSearchUrl } from '../coverage/coverageLayers'

const ICON_LOCATE =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'
const ICON_EXTERNAL =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v7H3V3h7"/></svg>'

/**
 * Compact popup body: title, muted detail lines and one row of actions ("Ver encuesta" for a
 * survey, then icon buttons for "Ubicar en el mapa" and Google Maps). Data is always escaped.
 */
export function buildPopup(
  title: string,
  lines: string[],
  lat: number,
  lng: number,
  options: { survey?: boolean } = {},
): string {
  const mapsUrl = googleMapsSearchUrl(lat, lng)
  const actions = [
    options.survey
      ? '<button type="button" class="map-popup-btn map-popup-btn--danger" data-action="survey">Ver encuesta</button>'
      : '',
    `<button type="button" class="map-popup-icon" data-action="locate" aria-label="Ubicar en el mapa" title="Ubicar en el mapa">${ICON_LOCATE}</button>`,
    mapsUrl
      ? `<a class="map-popup-icon" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir en Google Maps" title="Abrir en Google Maps">${ICON_EXTERNAL}</a>`
      : '',
  ].filter(Boolean)

  const detail = lines
    .filter(Boolean)
    .map((line) => `<div class="map-popup-line">${escapeHtml(line)}</div>`)
    .join('')

  return `<div class="map-popup"><div class="map-popup-title">${escapeHtml(title)}</div>${detail}<div class="map-popup-actions">${actions.join('')}</div></div>`
}
