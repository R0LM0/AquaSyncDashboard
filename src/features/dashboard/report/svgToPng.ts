/** Serializes an inline SVG chart to a PNG data URL (2× by default). */
export interface RasterizeOptions {
  scale?: number
  background?: string
}

export async function svgToPng(
  svg: SVGSVGElement,
  { scale = 2, background = '#ffffff' }: RasterizeOptions = {},
): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined

  try {
    const rect = svg.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || svg.clientWidth || 640))
    const height = Math.max(1, Math.round(rect.height || svg.clientHeight || 300))

    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    clone.style.background = background

    const markup = new XMLSerializer().serializeToString(clone)
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`

    const image = await loadImage(source)
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale

    const context = canvas.getContext('2d')
    if (!context) return undefined

    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.scale(scale, scale)
    context.drawImage(image, 0, 0, width, height)

    return canvas.toDataURL('image/png')
  } catch {
    // Snapshot is a nicety: the PDF still renders without it.
    return undefined
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo rasterizar el gráfico'))
    image.src = source
  })
}

/** Reads an SVG from the document by its `data-report-chart` marker. */
export async function chartSnapshot(name: string): Promise<string | undefined> {
  const element = document.querySelector(`[data-report-chart="${name}"] svg`)
  if (!(element instanceof SVGSVGElement)) return undefined
  return svgToPng(element)
}

/** Rasterizes `public/favicon.svg` for the report headers. */
export async function logoPng(size = 96): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined

  try {
    const response = await fetch('/favicon.svg')
    if (!response.ok) return undefined

    const markup = await response.text()
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
    const image = await loadImage(source)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) return undefined

    context.drawImage(image, 0, 0, size, size)
    return canvas.toDataURL('image/png')
  } catch {
    return undefined
  }
}
