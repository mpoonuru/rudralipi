export {
  compileDocument,
  sha256Hex,
  type AssetReference,
  type AssetResolver,
  type CompileDocumentOptions,
  type ResolvedAsset,
} from './compile.js'
export {
  defaultCompilerLimits,
  evaluateCondition,
  type ConditionEvaluationOptions,
} from './conditions.js'
export {
  createMergeFieldCatalog,
  isMergeValueCompatible,
  readMergeDataField,
  resolveMergeField,
  type MergeFieldCatalog,
  type MergeFieldDefinition,
  type MergeDataRead,
  type MergeFieldFormat,
  type MergeFieldSensitivity,
  type MergeFieldValueType,
  type ResolvedMergeValue,
} from './merge-fields.js'
export {
  type CompiledDocument,
  type CompiledFont,
  type DocumentIr,
  type IrNode,
} from './ir.js'
export { type CompiledResource, type ResourceManifestEntry } from './assets.js'
export { type CompilerLimits } from './limits.js'
