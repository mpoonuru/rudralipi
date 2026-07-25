import { createDocumentFixture, success } from '@rudralipi/core'
import { describe, expect, it } from 'vitest'

import { compileDocument, sha256Hex, type AssetResolver } from './compile.js'
import { createMergeFieldCatalog } from './merge-fields.js'

function emptyCatalog() {
  const result = createMergeFieldCatalog([
    {
      key: 'customer.name',
      label: 'Customer',
      valueType: 'string',
      sensitivity: 'confidential',
      allowedFormats: ['plain'],
    },
    {
      key: 'customer.isBusiness',
      label: 'Business',
      valueType: 'boolean',
      sensitivity: 'internal',
      allowedFormats: ['plain'],
    },
  ])
  if (!result.ok) {
    throw new Error('Test catalog must be valid.')
  }
  return result.value
}

describe('asset policy', () => {
  it('rejects SVG unless a future explicit sanitizer capability is supplied', async () => {
    const resolver: AssetResolver = {
      async resolve(reference) {
        const bytes = new Uint8Array([60, 115, 118, 103, 62])
        return success({
          assetId: reference.assetId,
          mediaType:
            reference.usage === 'font' ? 'font/woff2' : 'image/svg+xml',
          bytes,
          byteLength: bytes.byteLength,
          digest: await sha256Hex(bytes),
          width: 100,
          height: 100,
        })
      },
    }

    const result = await compileDocument(createDocumentFixture(), {
      catalog: emptyCatalog(),
      mergeData: {
        customer: {
          name: 'Customer',
          isBusiness: false,
        },
      },
      assetResolver: resolver,
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'asset.media_type_not_allowed',
        },
      ],
    })
  })

  it('rejects resources larger than the configured byte limit', async () => {
    const resolver: AssetResolver = {
      async resolve(reference) {
        const bytes = new Uint8Array([1, 2, 3, 4])
        return success({
          assetId: reference.assetId,
          mediaType: reference.usage === 'font' ? 'font/woff2' : 'image/png',
          bytes,
          byteLength: bytes.byteLength,
          digest: await sha256Hex(bytes),
          width: 10,
          height: 10,
        })
      },
    }

    const result = await compileDocument(createDocumentFixture(), {
      catalog: emptyCatalog(),
      mergeData: {
        customer: {
          name: 'Customer',
          isBusiness: false,
        },
      },
      assetResolver: resolver,
      limits: {
        maxAssetBytes: 3,
      },
    })

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'asset.limit.bytes',
        },
      ],
    })
  })
})
