import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@rudralipi/core'

import { fromTiptapDocument, toTiptapDocument } from './conversion.js'

const ownedDocument: RichTextDocument = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Rudralipi',
          marks: [
            { type: 'bold' },
            {
              type: 'link',
              attrs: {
                href: 'https://rudralipi.dev',
                title: 'Project home',
              },
            },
          ],
        },
        { type: 'hardBreak' },
        { type: 'text', text: 'Document engine' },
      ],
    },
    {
      type: 'orderedList',
      start: 3,
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Portable' }],
            },
          ],
        },
      ],
    },
  ],
}

describe('owned rich-text and Tiptap conversion', () => {
  it('round-trips every owned node and mark without HTML', () => {
    const tiptapDocument = toTiptapDocument(ownedDocument)
    const result = fromTiptapDocument(tiptapDocument)

    expect(result).toEqual({
      ok: true,
      value: ownedDocument,
      diagnostics: [],
    })
  })

  it('rejects nodes outside the owned rich-text language', () => {
    const result = fromTiptapDocument({
      type: 'doc',
      content: [
        {
          type: 'rawHtml',
          attrs: {
            html: '<script>alert(1)</script>',
          },
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'rich_text.unsupported_node',
        path: ['content', 0],
      }),
    )
  })

  it('rejects unsafe link protocols through the core schema', () => {
    const result = fromTiptapDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'unsafe',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'javascript:alert(1)',
                  },
                },
              ],
            },
          ],
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'rich_text.invalid_document',
      }),
    )
  })

  it('rejects unknown marks rather than silently losing them', () => {
    const result = fromTiptapDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'highlighted',
              marks: [{ type: 'highlight' }],
            },
          ],
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'rich_text.unsupported_mark',
        path: ['content', 0, 'content', 0, 'marks', 0],
      }),
    )
  })
})
