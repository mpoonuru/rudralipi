import { z } from 'zod'

import {
  accessibilitySchema,
  assetIdSchema,
  blockStyleSchema,
  extensionTypeSchema,
  mergeFieldKeySchema,
  nodeIdSchema,
  type AccessibilityMetadata,
  type BlockStyle,
  type ExtensionType,
} from './common.js'
import {
  conditionalExpressionSchema,
  type ConditionalExpression,
} from './expression.js'
import { richTextDocumentSchema, type RichTextDocument } from './rich-text.js'

interface BlockBase<TType extends string, TProps> {
  readonly id: string
  readonly type: TType
  readonly props: TProps
  readonly style?: BlockStyle | undefined
  readonly accessibility?: AccessibilityMetadata | undefined
}

export type HeadingBlock = BlockBase<
  'heading',
  {
    readonly level: 1 | 2 | 3 | 4 | 5 | 6
    readonly text: string
  }
>

export type RichTextBlock = BlockBase<
  'richText',
  {
    readonly content: RichTextDocument
  }
>

export type ImageBlock = BlockBase<
  'image',
  {
    readonly assetId: string
    readonly alt: string
    readonly fit: 'contain' | 'cover'
    readonly width: 'auto' | '25%' | '50%' | '75%' | '100%'
    readonly alignment: 'start' | 'center' | 'end'
  }
>

export type MergeFieldBlock = BlockBase<
  'mergeField',
  {
    readonly field: string
    readonly fallback?: string | undefined
    readonly format: 'plain' | 'short' | 'long' | 'currency'
  }
>

export interface TableColumn {
  readonly id: string
  readonly header: string
  readonly width?: number | undefined
}

export interface TableCell {
  readonly columnId: string
  readonly content: RichTextDocument
  readonly colSpan?: number | undefined
  readonly rowSpan?: number | undefined
}

export interface TableRow {
  readonly id: string
  readonly cells: ReadonlyArray<TableCell>
}

export type TableBlock = BlockBase<
  'table',
  {
    readonly columns: ReadonlyArray<TableColumn>
    readonly rows: ReadonlyArray<TableRow>
    readonly repeatHeader: boolean
    readonly allowRowSplit: boolean
  }
>

export interface ColumnRegion {
  readonly id: string
  readonly width: number
  readonly content: ReadonlyArray<BlockNode>
}

export type ColumnsBlock = BlockBase<
  'columns',
  {
    readonly gap: 'none' | 'sm' | 'md' | 'lg'
    readonly columns: ReadonlyArray<ColumnRegion>
  }
>

export type DividerBlock = BlockBase<
  'divider',
  {
    readonly variant: 'solid' | 'dashed' | 'dotted'
    readonly weight: 'thin' | 'medium' | 'thick'
  }
>

export type SpacerBlock = BlockBase<
  'spacer',
  {
    readonly size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }
>

export type HeaderBlock = BlockBase<
  'header',
  {
    readonly content: ReadonlyArray<BlockNode>
    readonly repeat: 'all' | 'exceptFirst' | 'firstOnly'
  }
>

export type FooterBlock = BlockBase<
  'footer',
  {
    readonly content: ReadonlyArray<BlockNode>
    readonly repeat: 'all' | 'exceptFirst' | 'firstOnly'
    readonly showPageNumber: boolean
  }
>

export interface SignatureLine {
  readonly id: string
  readonly label: string
  readonly signerField?: string | undefined
  readonly imageAssetId?: string | undefined
}

export type SignatureBlock = BlockBase<
  'signature',
  {
    readonly layout: 'stacked' | 'sideBySide'
    readonly lines: ReadonlyArray<SignatureLine>
  }
>

export type ConditionalBlock = BlockBase<
  'conditional',
  {
    readonly condition: ConditionalExpression
    readonly content: ReadonlyArray<BlockNode>
    readonly otherwise: ReadonlyArray<BlockNode>
  }
>

export type PageBreakBlock = BlockBase<'pageBreak', Record<string, never>>

export type ExtensionBlock = BlockBase<
  ExtensionType,
  Readonly<Record<string, unknown>>
>

export type BlockNode =
  | HeadingBlock
  | RichTextBlock
  | ImageBlock
  | MergeFieldBlock
  | TableBlock
  | ColumnsBlock
  | DividerBlock
  | SpacerBlock
  | HeaderBlock
  | FooterBlock
  | SignatureBlock
  | ConditionalBlock
  | PageBreakBlock
  | ExtensionBlock

const commonShape = {
  id: nodeIdSchema,
  style: blockStyleSchema.optional(),
  accessibility: accessibilitySchema.optional(),
}

const headingSchema = z.strictObject({
  ...commonShape,
  type: z.literal('heading'),
  props: z.strictObject({
    level: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    text: z.string().max(10_000),
  }),
})

const richTextSchema = z.strictObject({
  ...commonShape,
  type: z.literal('richText'),
  props: z.strictObject({
    content: richTextDocumentSchema,
  }),
})

const imageSchema = z.strictObject({
  ...commonShape,
  type: z.literal('image'),
  props: z.strictObject({
    assetId: assetIdSchema,
    alt: z.string().max(1_024),
    fit: z.enum(['contain', 'cover']),
    width: z.enum(['auto', '25%', '50%', '75%', '100%']),
    alignment: z.enum(['start', 'center', 'end']),
  }),
})

const mergeFieldSchema = z.strictObject({
  ...commonShape,
  type: z.literal('mergeField'),
  props: z.strictObject({
    field: mergeFieldKeySchema,
    fallback: z.string().max(10_000).optional(),
    format: z.enum(['plain', 'short', 'long', 'currency']),
  }),
})

const tableSchema = z.strictObject({
  ...commonShape,
  type: z.literal('table'),
  props: z.strictObject({
    columns: z
      .strictObject({
        id: nodeIdSchema,
        header: z.string().max(1_000),
        width: z.number().positive().max(100).optional(),
      })
      .array()
      .min(1)
      .max(100),
    rows: z
      .strictObject({
        id: nodeIdSchema,
        cells: z
          .strictObject({
            columnId: nodeIdSchema,
            content: richTextDocumentSchema,
            colSpan: z.number().int().min(1).max(100).optional(),
            rowSpan: z.number().int().min(1).max(10_000).optional(),
          })
          .array()
          .min(1)
          .max(100),
      })
      .array()
      .max(100_000),
    repeatHeader: z.boolean(),
    allowRowSplit: z.boolean(),
  }),
})

const dividerSchema = z.strictObject({
  ...commonShape,
  type: z.literal('divider'),
  props: z.strictObject({
    variant: z.enum(['solid', 'dashed', 'dotted']),
    weight: z.enum(['thin', 'medium', 'thick']),
  }),
})

const spacerSchema = z.strictObject({
  ...commonShape,
  type: z.literal('spacer'),
  props: z.strictObject({
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']),
  }),
})

const signatureSchema = z.strictObject({
  ...commonShape,
  type: z.literal('signature'),
  props: z.strictObject({
    layout: z.enum(['stacked', 'sideBySide']),
    lines: z
      .strictObject({
        id: nodeIdSchema,
        label: z.string().trim().min(1).max(256),
        signerField: mergeFieldKeySchema.optional(),
        imageAssetId: assetIdSchema.optional(),
      })
      .array()
      .min(1)
      .max(20),
  }),
})

const pageBreakSchema = z.strictObject({
  ...commonShape,
  type: z.literal('pageBreak'),
  props: z.strictObject({}),
})

export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() => {
  const columnsSchema = z.strictObject({
    ...commonShape,
    type: z.literal('columns'),
    props: z.strictObject({
      gap: z.enum(['none', 'sm', 'md', 'lg']),
      columns: z
        .strictObject({
          id: nodeIdSchema,
          width: z.number().positive().max(1),
          content: blockNodeSchema.array().max(10_000),
        })
        .array()
        .min(2)
        .max(4),
    }),
  })

  const headerSchema = z.strictObject({
    ...commonShape,
    type: z.literal('header'),
    props: z.strictObject({
      content: blockNodeSchema.array().max(1_000),
      repeat: z.enum(['all', 'exceptFirst', 'firstOnly']),
    }),
  })

  const footerSchema = z.strictObject({
    ...commonShape,
    type: z.literal('footer'),
    props: z.strictObject({
      content: blockNodeSchema.array().max(1_000),
      repeat: z.enum(['all', 'exceptFirst', 'firstOnly']),
      showPageNumber: z.boolean(),
    }),
  })

  const conditionalSchema = z.strictObject({
    ...commonShape,
    type: z.literal('conditional'),
    props: z.strictObject({
      condition: conditionalExpressionSchema,
      content: blockNodeSchema.array().max(10_000),
      otherwise: blockNodeSchema.array().max(10_000),
    }),
  })

  return z.union([
    z.discriminatedUnion('type', [
      headingSchema,
      richTextSchema,
      imageSchema,
      mergeFieldSchema,
      tableSchema,
      columnsSchema,
      dividerSchema,
      spacerSchema,
      headerSchema,
      footerSchema,
      signatureSchema,
      conditionalSchema,
      pageBreakSchema,
    ]),
    z.strictObject({
      ...commonShape,
      type: extensionTypeSchema,
      props: z.record(z.string().min(1).max(256), z.unknown()),
    }),
  ])
})
