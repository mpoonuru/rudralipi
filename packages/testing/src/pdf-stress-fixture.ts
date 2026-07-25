import {
  createDocumentFixture,
  type RichTextDocument,
  type RudralipiDocument,
  type TableRow,
} from '@rudralipi/core'

function paragraph(text: string): RichTextDocument {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  }
}

function row(index: number): TableRow {
  const sequence = index + 1
  return {
    id: `stress-row-${sequence}`,
    cells: [
      {
        columnId: 'description',
        content: paragraph(
          `Line ${sequence}: deterministic pagination contract with wrapping content.`,
        ),
      },
      {
        columnId: 'amount',
        content: paragraph(`${sequence}.00`),
      },
    ],
  }
}

export function createPdfStressFixture(): RudralipiDocument {
  const fixture = createDocumentFixture()
  return {
    ...fixture,
    id: 'document-pdf-stress',
    metadata: {
      ...fixture.metadata,
      title: 'Rudralipi PDF stress fixture',
      description:
        'Long-table, repeating-header, footer, and explicit page-break contract.',
      tags: ['canonical', 'pdf', 'visual-regression'],
    },
    content: fixture.content.map((node) =>
      node.type === 'table'
        ? {
            ...node,
            props: {
              ...node.props,
              allowRowSplit: false,
              repeatHeader: true,
              rows: Array.from({ length: 160 }, (_, index) => row(index)),
            },
          }
        : node,
    ),
  }
}
