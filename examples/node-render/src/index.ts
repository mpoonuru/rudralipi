import { compileDocument } from '@rudralipi/compiler'
import {
  createDocumentFixture,
  failure,
  type RudralipiDocument,
} from '@rudralipi/core'
import { renderHtml } from '@rudralipi/renderer-html'

function createHeadlessDocument(): RudralipiDocument {
  const fixture = createDocumentFixture()
  return {
    ...fixture,
    content: fixture.content.filter((node) => node.type === 'heading'),
    fonts: [],
    page: {
      background: fixture.page.background,
      marginsMm: fixture.page.marginsMm,
      orientation: fixture.page.orientation,
      size: fixture.page.size,
    },
  }
}

const compiled = await compileDocument(createHeadlessDocument(), {
  assetResolver: {
    async resolve(reference) {
      return failure([
        {
          code: 'asset.not_available',
          messageKey: 'diagnostics.asset.not_available',
          path: [],
          severity: 'error',
          details: { assetId: reference.assetId },
        },
      ])
    },
  },
  mergeData: {},
})

if (!compiled.ok) {
  throw new Error(
    `Compilation failed: ${compiled.diagnostics.map(({ code }) => code).join(', ')}`,
  )
}

const rendered = renderHtml(compiled.value, {
  completeDocument: true,
  mode: 'print',
})

process.stdout.write(rendered.documentHtml)
