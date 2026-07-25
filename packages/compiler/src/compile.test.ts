import { createDocumentFixture, success, type Result } from '@rudralipi/core'
import { describe, expect, it } from 'vitest'

import {
  compileDocument,
  sha256Hex,
  type AssetReference,
  type AssetResolver,
  type ResolvedAsset,
} from './compile.js'
import {
  createMergeFieldCatalog,
  type MergeFieldDefinition,
} from './merge-fields.js'

const fieldDefinitions: ReadonlyArray<MergeFieldDefinition> = [
  {
    key: 'customer.name',
    label: 'Customer name',
    valueType: 'string',
    sensitivity: 'confidential',
    allowedFormats: ['plain'],
  },
  {
    key: 'customer.isBusiness',
    label: 'Business customer',
    valueType: 'boolean',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
]

function catalog() {
  const result = createMergeFieldCatalog(fieldDefinitions)
  if (!result.ok) {
    throw new Error('Test catalog must be valid.')
  }
  return result.value
}

function createAssetResolver(digestOverride?: string): AssetResolver {
  return {
    async resolve(reference: AssetReference): Promise<Result<ResolvedAsset>> {
      const bytes = new Uint8Array([reference.assetId.length, 2, 3, 4])
      const mediaType = reference.usage === 'font' ? 'font/woff2' : 'image/png'
      return success({
        assetId: reference.assetId,
        mediaType,
        bytes,
        byteLength: bytes.byteLength,
        digest: digestOverride ?? (await sha256Hex(bytes)),
        ...(reference.usage === 'font'
          ? {}
          : {
              width: 640,
              height: 320,
            }),
      })
    },
  }
}

function compilerOptions(digestOverride?: string) {
  return {
    catalog: catalog(),
    mergeData: {
      customer: {
        name: 'Ada Lovelace',
        isBusiness: true,
      },
    },
    assetResolver: createAssetResolver(digestOverride),
  } as const
}

describe('compileDocument', () => {
  it('produces the same hash for equivalent compilation inputs', async () => {
    const fixture = createDocumentFixture()
    const first = await compileDocument(fixture, compilerOptions())
    const second = await compileDocument(fixture, compilerOptions())

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.value.hash).toMatch(/^[0-9a-f]{64}$/)
      expect(first.value.hash).toBe(second.value.hash)
      expect(first.value.resourceManifest).toEqual(
        second.value.resourceManifest,
      )
    }
  })

  it('resolves merge fields and selects the true conditional branch', async () => {
    const result = await compileDocument(
      createDocumentFixture(),
      compilerOptions(),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.value.ir.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: 'Ada Lovelace',
        }),
        expect.objectContaining({
          type: 'group',
          sourceType: 'conditional',
          children: [
            expect.objectContaining({
              id: 'business-copy',
            }),
          ],
        }),
      ]),
    )
    expect(JSON.stringify(result.value.ir)).not.toContain('Private customer')
  })

  it('rejects resolver digest mismatches', async () => {
    const result = await compileDocument(
      createDocumentFixture(),
      compilerOptions('0'.repeat(64)),
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'asset.integrity_mismatch',
        },
      ],
    })
  })

  it('fails closed for extension nodes without a compiler contribution', async () => {
    const fixture = createDocumentFixture()
    const result = await compileDocument(
      {
        ...fixture,
        content: [
          ...fixture.content,
          {
            id: 'extension-unsupported',
            type: 'vendor/card',
            props: {
              title: 'Opaque',
            },
          },
        ],
      },
      compilerOptions(),
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'compiler.extension_unsupported',
          nodeId: 'extension-unsupported',
        },
      ],
    })
  })
})
