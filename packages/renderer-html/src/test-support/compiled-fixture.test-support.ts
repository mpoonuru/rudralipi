import {
  compileDocument,
  createMergeFieldCatalog,
  sha256Hex,
  type AssetResolver,
  type CompiledDocument,
} from '@rudralipi/compiler'
import { createDocumentFixture, success } from '@rudralipi/core'

export async function createCompiledFixture(
  customerName = 'Ada Lovelace',
): Promise<CompiledDocument> {
  const catalog = createMergeFieldCatalog([
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
  if (!catalog.ok) {
    throw new Error('Test catalog must be valid.')
  }
  const assetResolver: AssetResolver = {
    async resolve(reference) {
      const bytes = new Uint8Array([reference.assetId.length, 7, 8, 9])
      return success({
        assetId: reference.assetId,
        mediaType: reference.usage === 'font' ? 'font/woff2' : 'image/png',
        bytes,
        byteLength: bytes.byteLength,
        digest: await sha256Hex(bytes),
        ...(reference.usage === 'font'
          ? {}
          : {
              width: 640,
              height: 320,
            }),
      })
    },
  }
  const result = await compileDocument(createDocumentFixture(), {
    catalog: catalog.value,
    mergeData: {
      customer: {
        name: customerName,
        isBusiness: true,
      },
    },
    assetResolver,
  })
  if (!result.ok) {
    throw new Error('Test document must compile.')
  }
  return result.value
}
