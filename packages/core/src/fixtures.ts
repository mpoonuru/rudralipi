import type { RudralipiDocument } from './schema/document.js'
import type { RichTextDocument } from './schema/rich-text.js'

function paragraph(text: string): RichTextDocument {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  }
}

export function createDocumentFixture(): RudralipiDocument {
  return {
    schemaVersion: 1,
    id: 'document-canonical',
    locale: 'en',
    direction: 'ltr',
    metadata: {
      title: 'Canonical Rudralipi document',
      subject: 'All built-in blocks',
      description: 'A deterministic fixture containing every built-in block.',
      tags: ['canonical', 'alpha'],
      createdAt: '2026-07-25T00:00:00.000Z',
      modifiedAt: '2026-07-25T00:00:00.000Z',
    },
    page: {
      size: 'A4',
      orientation: 'portrait',
      marginsMm: {
        top: 20,
        right: 18,
        bottom: 20,
        left: 18,
      },
      background: '#FFFFFF',
      headerId: 'header-main',
      footerId: 'footer-main',
    },
    theme: {
      colors: {
        text: '#101828',
        muted: '#667085',
        accent: '#7C3AED',
        critical: '#B42318',
        background: '#FFFFFF',
        border: '#D0D5DD',
      },
      typography: {
        bodyFont: 'Inter',
        headingFont: 'Inter',
        baseSizePt: 10,
        lineHeight: 1.5,
      },
      spacingMm: {
        xs: 1,
        sm: 2,
        md: 4,
        lg: 8,
        xl: 12,
      },
    },
    fonts: [
      {
        assetId: 'font/inter-regular',
        family: 'Inter',
        weight: 400,
        style: 'normal',
      },
    ],
    content: [
      {
        id: 'header-main',
        type: 'header',
        props: {
          repeat: 'all',
          content: [
            {
              id: 'header-text',
              type: 'richText',
              props: {
                content: paragraph('Rudralipi'),
              },
            },
          ],
        },
      },
      {
        id: 'heading-1',
        type: 'heading',
        props: {
          level: 1,
          text: 'Document heading',
        },
        style: {
          spaceAfter: 'md',
          tone: 'accent',
        },
      },
      {
        id: 'rich-text-1',
        type: 'richText',
        props: {
          content: paragraph('A safe rich-text paragraph.'),
        },
      },
      {
        id: 'image-1',
        type: 'image',
        props: {
          assetId: 'image/logo',
          alt: 'Rudralipi logo',
          fit: 'contain',
          width: '50%',
          alignment: 'center',
        },
      },
      {
        id: 'merge-field-1',
        type: 'mergeField',
        props: {
          field: 'customer.name',
          fallback: 'Customer',
          format: 'plain',
        },
      },
      {
        id: 'table-1',
        type: 'table',
        props: {
          columns: [
            {
              id: 'description',
              header: 'Description',
              width: 70,
            },
            {
              id: 'amount',
              header: 'Amount',
              width: 30,
            },
          ],
          rows: [
            {
              id: 'row-1',
              cells: [
                {
                  columnId: 'description',
                  content: paragraph('Service'),
                },
                {
                  columnId: 'amount',
                  content: paragraph('100.00'),
                },
              ],
            },
          ],
          repeatHeader: true,
          allowRowSplit: false,
        },
      },
      {
        id: 'columns-1',
        type: 'columns',
        props: {
          gap: 'md',
          columns: [
            {
              id: 'column-left',
              width: 0.5,
              content: [
                {
                  id: 'column-left-text',
                  type: 'richText',
                  props: {
                    content: paragraph('Left column'),
                  },
                },
              ],
            },
            {
              id: 'column-right',
              width: 0.5,
              content: [
                {
                  id: 'column-right-text',
                  type: 'richText',
                  props: {
                    content: paragraph('Right column'),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        id: 'divider-1',
        type: 'divider',
        props: {
          variant: 'solid',
          weight: 'thin',
        },
      },
      {
        id: 'spacer-1',
        type: 'spacer',
        props: {
          size: 'md',
        },
      },
      {
        id: 'signature-1',
        type: 'signature',
        props: {
          layout: 'sideBySide',
          lines: [
            {
              id: 'signature-customer',
              label: 'Customer',
              signerField: 'customer.name',
            },
            {
              id: 'signature-company',
              label: 'Company',
              imageAssetId: 'signature/company',
            },
          ],
        },
      },
      {
        id: 'conditional-1',
        type: 'conditional',
        props: {
          condition: {
            op: 'equals',
            field: 'customer.isBusiness',
            value: true,
          },
          content: [
            {
              id: 'business-copy',
              type: 'richText',
              props: {
                content: paragraph('Business customer'),
              },
            },
          ],
          otherwise: [
            {
              id: 'consumer-copy',
              type: 'richText',
              props: {
                content: paragraph('Private customer'),
              },
            },
          ],
        },
      },
      {
        id: 'page-break-1',
        type: 'pageBreak',
        props: {},
      },
      {
        id: 'footer-main',
        type: 'footer',
        props: {
          repeat: 'all',
          showPageNumber: true,
          content: [
            {
              id: 'footer-text',
              type: 'richText',
              props: {
                content: paragraph('Confidential'),
              },
            },
          ],
        },
      },
    ],
    extensions: {},
  }
}
