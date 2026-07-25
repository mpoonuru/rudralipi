import { describe, expect, it } from 'vitest'

import {
  createMergeFieldCatalog,
  resolveMergeField,
  type MergeFieldDefinition,
} from './merge-fields.js'

const dateField: MergeFieldDefinition = {
  key: 'invoice.issuedOn',
  label: 'Issue date',
  valueType: 'date',
  sensitivity: 'public',
  allowedFormats: ['short', 'long'],
}

describe('resolveMergeField', () => {
  it('formats declared date fields through Day.js and the selected locale', () => {
    const result = resolveMergeField(dateField, '2026-07-25', 'de', 'short')

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'text',
        text: '25.07.2026',
      },
      diagnostics: [],
    })
  })

  it('rejects a format not permitted by the field definition', () => {
    const result = resolveMergeField(dateField, '2026-07-25', 'en', 'currency')

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'merge.format_not_allowed',
        },
      ],
    })
  })

  it('formats money without interpreting executable strings', () => {
    const moneyField: MergeFieldDefinition = {
      key: 'invoice.total',
      label: 'Total',
      valueType: 'money',
      sensitivity: 'confidential',
      allowedFormats: ['currency'],
    }
    const result = resolveMergeField(
      moneyField,
      {
        amount: 1234.5,
        currency: 'EUR',
      },
      'it',
      'currency',
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        kind: 'text',
        text: '1234,50 €',
      })
    }
  })
})

describe('createMergeFieldCatalog', () => {
  it('rejects duplicate field keys', () => {
    const result = createMergeFieldCatalog([dateField, dateField])

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'merge.duplicate_field',
        },
      ],
    })
  })
})
