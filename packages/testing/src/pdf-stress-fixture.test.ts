import { describe, expect, it } from 'vitest'

import { parseDocument } from '@rudralipi/core'

import { createPdfStressFixture } from './pdf-stress-fixture.js'

describe('createPdfStressFixture', () => {
  it('provides a valid long-table, header, footer, and page-break contract', () => {
    const document = createPdfStressFixture()
    const parsed = parseDocument(document)
    const table = document.content.find(({ type }) => type === 'table')

    expect(parsed.ok).toBe(true)
    expect(table?.type).toBe('table')
    if (table?.type === 'table') {
      expect(table.props.rows).toHaveLength(160)
      expect(table.props.repeatHeader).toBe(true)
      expect(table.props.allowRowSplit).toBe(false)
    }
    expect(document.page.headerId).toBe('header-main')
    expect(document.page.footerId).toBe('footer-main')
    expect(document.content.some(({ type }) => type === 'pageBreak')).toBe(true)
  })
})
