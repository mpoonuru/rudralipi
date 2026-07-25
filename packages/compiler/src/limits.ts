export interface CompilerLimits {
  readonly maxConditionDepth: number
  readonly maxConditionNodes: number
  readonly maxListItems: number
  readonly maxAssetBytes: number
  readonly maxImageWidth: number
  readonly maxImageHeight: number
  readonly maxResolvedAssets: number
}

export const defaultCompilerLimits: Readonly<CompilerLimits> = Object.freeze({
  maxConditionDepth: 20,
  maxConditionNodes: 200,
  maxListItems: 10_000,
  maxAssetBytes: 20_000_000,
  maxImageWidth: 20_000,
  maxImageHeight: 20_000,
  maxResolvedAssets: 100,
})
