export { applyCommand, applyTransaction } from './commands/apply.js'
export {
  createHistory,
  type DocumentHistory,
  type HistoryOptions,
} from './commands/history.js'
export {
  type CommandApplication,
  type CommandContext,
  type DocumentCommand,
  type NodeContainerReference,
  type NodePlacement,
  type TransactionApplication,
} from './commands/types.js'
export {
  failure,
  success,
  type Diagnostic,
  type DiagnosticPath,
  type DiagnosticSeverity,
  type Result,
} from './diagnostics.js'
export { createDocumentFixture } from './fixtures.js'
export { cloneJsonValue, type JsonPrimitive, type JsonValue } from './json.js'
export { migrateDocument, type SchemaMigration } from './migrations/migrate.js'
export {
  EXTENSION_API_VERSION,
  createBlockRegistry,
  type BlockExtensionDefinition,
  type BlockRegistry,
} from './registry.js'
export {
  blockNodeSchema,
  type BlockNode,
  type ColumnRegion,
  type ConditionalBlock,
  type ExtensionBlock,
  type FooterBlock,
  type HeaderBlock,
  type HeadingBlock,
  type ImageBlock,
  type MergeFieldBlock,
  type PageBreakBlock,
  type RichTextBlock,
  type SignatureBlock,
  type SpacerBlock,
  type TableCell,
  type TableColumn,
  type TableBlock,
  type TableRow,
} from './schema/blocks.js'
export {
  CURRENT_SCHEMA_VERSION,
  assetIdSchema,
  blockStyleSchema,
  directionSchema,
  extensionTypeSchema,
  mergeFieldKeySchema,
  nodeIdSchema,
  supportedLocaleSchema,
  type AccessibilityMetadata,
  type BlockStyle,
  type ExtensionType,
  type SupportedLocale,
  type TextDirection,
} from './schema/common.js'
export {
  rudralipiDocumentSchema,
  type RudralipiDocument,
} from './schema/document.js'
export {
  conditionalExpressionSchema,
  type ConditionalExpression,
  type ConditionalLiteral,
} from './schema/expression.js'
export {
  defaultDocumentLimits,
  parseDocument,
  type DocumentLimits,
} from './schema/parse.js'
export {
  richTextDocumentSchema,
  richTextInlineSchema,
  richTextMarkSchema,
  richTextParagraphSchema,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMark,
  type RichTextParagraph,
} from './schema/rich-text.js'
