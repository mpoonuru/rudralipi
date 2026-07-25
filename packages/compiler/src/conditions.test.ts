import { describe, expect, it } from 'vitest'

import {
  createMergeFieldCatalog,
  type MergeFieldDefinition,
} from './merge-fields.js'
import { defaultCompilerLimits, evaluateCondition } from './conditions.js'

const fields: ReadonlyArray<MergeFieldDefinition> = [
  {
    key: 'customer.isBusiness',
    label: 'Business customer',
    valueType: 'boolean',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
  {
    key: 'invoice.total',
    label: 'Total',
    valueType: 'number',
    sensitivity: 'confidential',
    allowedFormats: ['plain'],
  },
]

function catalog() {
  const result = createMergeFieldCatalog(fields)
  if (!result.ok) {
    throw new Error('Test catalog must be valid.')
  }
  return result.value
}

describe('evaluateCondition', () => {
  it('evaluates bounded typed boolean and numeric expressions', () => {
    const result = evaluateCondition(
      {
        op: 'all',
        conditions: [
          {
            op: 'equals',
            field: 'customer.isBusiness',
            value: true,
          },
          {
            op: 'greaterThan',
            field: 'invoice.total',
            value: 100,
          },
        ],
      },
      {
        customer: {
          isBusiness: true,
        },
        invoice: {
          total: 150,
        },
      },
      {
        catalog: catalog(),
        limits: defaultCompilerLimits,
      },
    )

    expect(result).toEqual({
      ok: true,
      value: true,
      diagnostics: [],
    })
  })

  it('does not traverse undeclared or prototype paths', () => {
    const result = evaluateCondition(
      {
        op: 'exists',
        field: '__proto__.polluted',
      },
      Object.create({
        polluted: true,
      }) as Readonly<Record<string, unknown>>,
      {
        catalog: catalog(),
        limits: defaultCompilerLimits,
      },
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'condition.unknown_field',
        },
      ],
    })
  })

  it('rejects expressions beyond the configured node limit', () => {
    const result = evaluateCondition(
      {
        op: 'all',
        conditions: [
          {
            op: 'exists',
            field: 'customer.isBusiness',
          },
          {
            op: 'exists',
            field: 'invoice.total',
          },
        ],
      },
      {},
      {
        catalog: catalog(),
        limits: {
          ...defaultCompilerLimits,
          maxConditionNodes: 2,
        },
      },
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'condition.limit.nodes',
        },
      ],
    })
  })
})
