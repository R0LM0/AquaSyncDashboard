import { escapeHtml, googleMapsSearchUrl } from '../coverage/coverageLayers'

/**
 * Popup body: the lines, the Google Maps link, the "Ubicar" button and, for a survey, "Ver encuesta".
 * Data is always escaped.
 */
export function buildPopup(
  title: string,
  lines: string[],
  lat: number,
  lng: number,
  options: { survey?: boolean } = {},
): string {
  const mapsUrl = googleMapsSearchUrl(lat, lng)
  const survey = options.survey
    ? '<div class="map-popup-actions"><button type="button" class="map-popup-btn map-popup-btn--danger" data-action="survey">Ver encuesta</button></div>'
    : ''
  const actions = [
    '<button type="button" class="map-popup-btn" data-action="locate">Ubicar en el mapa</button>',
    mapsUrl
      ? `<a class="map-popup-btn" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>`
      : '',
  ].filter(Boolean)

  return [
    `<strong>${escapeHtml(title)}</strong>`,
    ...lines.filter(Boolean).map((line) => escapeHtml(line)),
  ]
    .join('<br/>')
    .concat(survey, `<div class="map-popup-actions">${actions.join('')}</div>`)
}
