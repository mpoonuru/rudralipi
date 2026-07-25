import { z } from 'zod'
import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from './fixtures.js'
import { createBlockRegistry } from './registry.js'
import { parseDocument } from './schema/parse.js'

const calloutExtension = {
  type: 'example/callout',
  apiVersion: 1,
  propsSchema: z.strictObject({
    message: z.string().min(1),
    tone: z.enum(['info', 'warning']),
  }),
  createDefaultProps: () => ({
    message: 'Important',
    tone: 'info' as const,
  }),
} as const

describe('createBlockRegistry', () => {
  it('rejects duplicate extension types', () => {
    const result = createBlockRegistry([calloutExtension, calloutExtension])

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'registry.duplicate_type',
          details: {
            type: 'example/callout',
          },
        },
      ],
    })
  })

  it('validates registered extension properties', () => {
    const result = createBlockRegistry([calloutExtension])
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(
      result.value.validateNode({
        id: 'extension-1',
        type: 'example/callout',
        props: {
          message: '',
          tone: 'critical',
        },
      }),
    ).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'registry.invalid_props',
          nodeId: 'extension-1',
        },
      ],
    })
  })

  it('preserves an unknown namespaced node during portable parsing', () => {
    const fixture = createDocumentFixture()
    const result = parseDocument({
      ...fixture,
      content: [
        ...fixture.content,
        {
          id: 'extension-unknown',
          type: 'vendor/unknown',
          props: {
            opaque: true,
          },
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.content.at(-1)).toMatchObject({
        id: 'extension-unknown',
        type: 'vendor/unknown',
      })
    }
  })
})
