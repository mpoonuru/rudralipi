import { failure, success, type Diagnostic, type Result } from '@rudralipi/core'

import { sha256Hex } from './hash.js'
import type { CompilerLimits } from './limits.js'

export type AssetUsage = 'image' | 'signature' | 'font'

export interface AssetReference {
  readonly assetId: string
  readonly usage: AssetUsage
}

export interface ResolvedAsset {
  readonly assetId: string
  readonly mediaType: string
  readonly bytes: Uint8Array
  readonly byteLength: number
  readonly digest: string
  readonly width?: number | undefined
  readonly height?: number | undefined
}

export interface CompiledResource extends ResolvedAsset {
  readonly usage: AssetUsage
}

export interface ResourceManifestEntry {
  readonly assetId: string
  readonly usage: AssetUsage
  readonly mediaType: string
  readonly byteLength: number
  readonly digest: string
  readonly width?: number | undefined
  readonly height?: number | undefined
}

export interface AssetResolver {
  resolve(reference: AssetReference): Promise<Result<ResolvedAsset>>
}

const imageMediaTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const fontMediaTypes = new Set([
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
])

function assetDiagnostic(
  code: string,
  reference: AssetReference,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details: {
      assetId: reference.assetId,
      usage: reference.usage,
      ...details,
    },
  }
}

export async function resolveAsset(
  reference: AssetReference,
  resolver: AssetResolver,
  limits: CompilerLimits,
): Promise<Result<CompiledResource>> {
  const result = await resolver.resolve(reference)
  if (!result.ok) {
    return result
  }
  const asset = result.value
  if (
    asset.assetId !== reference.assetId ||
    asset.byteLength !== asset.bytes.byteLength
  ) {
    return failure([assetDiagnostic('asset.invalid_response', reference)])
  }
  if (asset.byteLength > limits.maxAssetBytes) {
    return failure([
      assetDiagnostic('asset.limit.bytes', reference, {
        maximum: limits.maxAssetBytes,
        actual: asset.byteLength,
      }),
    ])
  }
  const mediaTypes =
    reference.usage === 'font' ? fontMediaTypes : imageMediaTypes
  if (!mediaTypes.has(asset.mediaType)) {
    return failure([
      assetDiagnostic('asset.media_type_not_allowed', reference, {
        mediaType: asset.mediaType,
      }),
    ])
  }
  if (!/^[0-9a-f]{64}$/.test(asset.digest)) {
    return failure([assetDiagnostic('asset.invalid_digest', reference)])
  }
  const actualDigest = await sha256Hex(asset.bytes)
  if (actualDigest !== asset.digest) {
    return failure([assetDiagnostic('asset.integrity_mismatch', reference)])
  }
  if (reference.usage !== 'font') {
    if (
      asset.width === undefined ||
      asset.height === undefined ||
      !Number.isSafeInteger(asset.width) ||
      !Number.isSafeInteger(asset.height) ||
      asset.width < 1 ||
      asset.height < 1
    ) {
      return failure([assetDiagnostic('asset.invalid_dimensions', reference)])
    }
    if (
      asset.width > limits.maxImageWidth ||
      asset.height > limits.maxImageHeight
    ) {
      return failure([
        assetDiagnostic('asset.limit.dimensions', reference, {
          maximumWidth: limits.maxImageWidth,
          maximumHeight: limits.maxImageHeight,
        }),
      ])
    }
  }

  return success({
    ...asset,
    usage: reference.usage,
  })
}

export function toManifestEntry(
  resource: CompiledResource,
): ResourceManifestEntry {
  return {
    assetId: resource.assetId,
    usage: resource.usage,
    mediaType: resource.mediaType,
    byteLength: resource.byteLength,
    digest: resource.digest,
    ...(resource.width === undefined ? {} : { width: resource.width }),
    ...(resource.height === undefined ? {} : { height: resource.height }),
  }
}
