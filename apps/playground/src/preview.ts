import {
  compileDocument,
  sha256Hex,
  type AssetResolver,
  type ResolvedAsset,
} from '@rudralipi/compiler'
import { success, type Result, type RudralipiDocument } from '@rudralipi/core'
import { renderHtml, type HtmlRenderResult } from '@rudralipi/renderer-html'

import {
  playgroundFieldDefinitions,
  playgroundMergeData,
} from './playground-data.js'

const transparentPixel = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218,
  99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
])

const placeholderFont = new Uint8Array([119, 79, 70, 50, 0, 0, 0, 0])

function playgroundAssetResolver(): AssetResolver {
  return {
    async resolve(reference): Promise<Result<ResolvedAsset>> {
      const isFont = reference.usage === 'font'
      const bytes = isFont ? placeholderFont : transparentPixel
      return success({
        assetId: reference.assetId,
        byteLength: bytes.byteLength,
        bytes,
        digest: await sha256Hex(bytes),
        mediaType: isFont ? 'font/woff2' : 'image/png',
        ...(isFont ? {} : { height: 1, width: 1 }),
      })
    },
  }
}

export async function createPlaygroundPreview(
  document: RudralipiDocument,
): Promise<Result<HtmlRenderResult>> {
  const compiled = await compileDocument(document, {
    assetResolver: playgroundAssetResolver(),
    fieldDefinitions: playgroundFieldDefinitions,
    mergeData: playgroundMergeData,
  })
  if (!compiled.ok) {
    return compiled
  }

  return success(
    renderHtml(compiled.value, {
      completeDocument: true,
      mode: 'preview',
    }),
  )
}
