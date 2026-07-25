import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from '../fixtures.js'
import { parseDocument } from './parse.js'

describe('parseDocument', () => {
  it('accepts the canonical document with every built-in block', () => {
    const result = parseDocument(createDocumentFixture())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.content.map(({ type }) => type)).toEqual([
        'header',
        'heading',
        'richText',
        'image',
        'mergeField',
        'table',
        'columns',
        'divider',
        'spacer',
        'signature',
        'conditional',
        'pageBreak',
        'footer',
      ])
    }
  })

  it('rejects raw HTML blocks', () => {
    const result = parseDocument({
      ...createDocumentFixture(),
      content: [
        {
          id: 'unsafe',
          type: 'html',
          props: {
            html: '<script>alert(1)</script>',
          },
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.invalid',
          severity: 'error',
        },
      ],
    })
  })

  it('rejects arbitrary class strings on otherwise valid blocks', () => {
    const fixture = createDocumentFixture()
    const result = parseDocument({
      ...fixture,
      content: [
        {
          ...fixture.content[1],
          className: 'fixed inset-0 bg-red-500',
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.invalid',
          severity: 'error',
        },
      ],
    })
  })

  it('rejects objects with inherited properties before schema traversal', () => {
    const input = Object.create({
      schemaVersion: 1,
    }) as Record<string, unknown>
    input['id'] = 'inherited-document'

    const result = parseDocument(input)

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.unsafe_object',
          path: [],
        },
      ],
    })
  })

  it('enforces configured serialized-size limits', () => {
    const result = parseDocument(createDocumentFixture(), {
      maxSerializedBytes: 32,
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.limit.serialized_bytes',
        },
      ],
    })
  })

  it('rejects duplicate node identifiers across nested regions', () => {
    const fixture = createDocumentFixture()
    const result = parseDocument({
      ...fixture,
      content: [
        ...fixture.content,
        {
          id: 'heading-1',
          type: 'heading',
          props: {
            level: 2,
            text: 'Duplicate identifier',
          },
        },
      ],
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.duplicate_node_id',
          nodeId: 'heading-1',
        },
      ],
    })
  })

  it('requires page furniture references to target the matching block type', () => {
    const fixture = createDocumentFixture()
    const result = parseDocument({
      ...fixture,
      page: {
        ...fixture.page,
        headerId: 'footer-main',
      },
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.invalid_header_reference',
          path: ['page', 'headerId'],
        },
      ],
    })
  })
})
