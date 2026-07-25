import type {
  BlockNode,
  CommandContext,
  RichTextDocument,
} from '@rudralipi/core'

export type BuiltInBlockType =
  | 'heading'
  | 'richText'
  | 'image'
  | 'mergeField'
  | 'table'
  | 'columns'
  | 'divider'
  | 'spacer'
  | 'header'
  | 'footer'
  | 'signature'
  | 'conditional'
  | 'pageBreak'

export const builtInBlockTypes: ReadonlyArray<BuiltInBlockType> = [
  'heading',
  'richText',
  'image',
  'mergeField',
  'table',
  'columns',
  'divider',
  'spacer',
  'header',
  'footer',
  'signature',
  'conditional',
  'pageBreak',
]

function paragraph(text = ''): RichTextDocument {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text.length === 0 ? [] : [{ type: 'text', text }],
      },
    ],
  }
}

export function createBuiltInBlock(
  type: BuiltInBlockType,
  context: CommandContext,
): BlockNode {
  const id = context.generateId(type)

  switch (type) {
    case 'heading':
      return {
        id,
        type,
        props: {
          level: 2,
          text: 'Heading',
        },
      }
    case 'richText':
      return {
        id,
        type,
        props: {
          content: paragraph('Start composing…'),
        },
      }
    case 'image':
      return {
        id,
        type,
        props: {
          alignment: 'center',
          alt: 'Image',
          assetId: 'placeholder/image',
          fit: 'contain',
          width: '100%',
        },
      }
    case 'mergeField':
      return {
        id,
        type,
        props: {
          fallback: '—',
          field: 'document.reference',
          format: 'plain',
        },
      }
    case 'table': {
      const firstColumn = context.generateId('column')
      const secondColumn = context.generateId('column')
      return {
        id,
        type,
        props: {
          allowRowSplit: false,
          columns: [
            { id: firstColumn, header: 'Description', width: 70 },
            { id: secondColumn, header: 'Value', width: 30 },
          ],
          repeatHeader: true,
          rows: [
            {
              id: context.generateId('row'),
              cells: [
                { columnId: firstColumn, content: paragraph('Item') },
                { columnId: secondColumn, content: paragraph('Value') },
              ],
            },
          ],
        },
      }
    }
    case 'columns':
      return {
        id,
        type,
        props: {
          gap: 'md',
          columns: [
            {
              id: context.generateId('column'),
              width: 0.5,
              content: [],
            },
            {
              id: context.generateId('column'),
              width: 0.5,
              content: [],
            },
          ],
        },
      }
    case 'divider':
      return {
        id,
        type,
        props: {
          variant: 'solid',
          weight: 'thin',
        },
      }
    case 'spacer':
      return {
        id,
        type,
        props: {
          size: 'md',
        },
      }
    case 'header':
      return {
        id,
        type,
        props: {
          content: [],
          repeat: 'all',
        },
      }
    case 'footer':
      return {
        id,
        type,
        props: {
          content: [],
          repeat: 'all',
          showPageNumber: true,
        },
      }
    case 'signature':
      return {
        id,
        type,
        props: {
          layout: 'sideBySide',
          lines: [
            {
              id: context.generateId('signature-line'),
              label: 'Signature',
            },
          ],
        },
      }
    case 'conditional':
      return {
        id,
        type,
        props: {
          condition: {
            op: 'exists',
            field: 'document.reference',
          },
          content: [],
          otherwise: [],
        },
      }
    case 'pageBreak':
      return {
        id,
        type,
        props: {},
      }
  }
}
