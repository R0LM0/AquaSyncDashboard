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
  const actions = [
    mapsUrl
      ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>`
      : '',
    '<button type="button" data-action="locate">Ubicar en el mapa</button>',
    options.survey ? '<button type="button" data-action="survey">Ver encuesta</button>' : '',
  ].filter(Boolean)

  return [
    `<strong>${escapeHtml(title)}</strong>`,
    ...lines.filter(Boolean).map((line) => escapeHtml(line)),
    `<div class="coverage-popup-actions">${actions.join(' ')}</div>`,
  ].join('<br/>')
}
