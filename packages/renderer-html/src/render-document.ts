import type {
  CompiledDocument,
  CompiledResource,
  ResourceManifestEntry,
} from '@rudralipi/compiler'

import { escapeHtml } from './escape.js'
import { renderNode } from './render-node.js'
import { createRendererCss, type RenderMode } from './styles.js'

export interface HtmlRenderOptions {
  readonly mode: RenderMode
  readonly completeDocument?: boolean | undefined
}

export interface HtmlRenderResult {
  readonly html: string
  readonly css: string
  readonly documentHtml: string
  readonly contentSecurityPolicy: string
  readonly resourceManifest: ReadonlyArray<ResourceManifestEntry>
  readonly hash: string
}

const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

function resourceMap(
  resources: ReadonlyArray<CompiledResource>,
): ReadonlyMap<string, CompiledResource> {
  return new Map(resources.map((resource) => [resource.assetId, resource]))
}

export function renderHtml(
  compiled: CompiledDocument,
  options: HtmlRenderOptions,
): HtmlRenderResult {
  const resources = resourceMap(compiled.resources)
  const content = compiled.ir.content
    .map((node) => renderNode(node, { resources }))
    .join('')
  const html = `<main class="rl-document" data-rudralipi-document="${escapeHtml(compiled.ir.documentId)}" data-rudralipi-hash="${compiled.hash}">${content}</main>`
  const css = createRendererCss(compiled, options.mode)
  const documentHtml =
    options.completeDocument === false
      ? html
      : `<!doctype html><html lang="${compiled.ir.locale}" dir="${compiled.ir.direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(contentSecurityPolicy)}"><title>${escapeHtml(compiled.ir.metadata.title)}</title><style>${css}</style></head><body>${html}</body></html>`

  return {
    html,
    css,
    documentHtml,
    contentSecurityPolicy,
    resourceManifest: compiled.resourceManifest,
    hash: compiled.hash,
  }
}
