import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from '@rudralipi/core'

import { createPlaygroundPreview } from './preview.js'

describe('playground preview pipeline', () => {
  it('compiles the versioned document before rendering isolated HTML', async () => {
    const result = await createPlaygroundPreview(createDocumentFixture())

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value.documentHtml).toContain('<!doctype html>')
    expect(result.value.documentHtml).toContain('Document heading')
    expect(result.value.documentHtml).not.toContain('<script')
    expect(result.value.hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
