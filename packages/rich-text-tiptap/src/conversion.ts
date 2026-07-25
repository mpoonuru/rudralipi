import {
  failure,
  richTextDocumentSchema,
  success,
  type Diagnostic,
  type DiagnosticPath,
  type Result,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMark,
  type RichTextParagraph,
} from '@rudralipi/core'
import type { JSONContent } from '@tiptap/core'

interface UnknownRecord {
  readonly [key: string]: unknown
  readonly attrs?: unknown
  readonly content?: unknown
  readonly href?: unknown
  readonly marks?: unknown
  readonly start?: unknown
  readonly text?: unknown
  readonly title?: unknown
  readonly type?: unknown
}

interface TiptapMark {
  readonly type: string
  readonly attrs?: Readonly<Record<string, unknown>>
}

const ownedMarkTypes = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'superscript',
  'subscript',
  'link',
])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function diagnostic(
  code: string,
  path: DiagnosticPath,
  details?: Readonly<Record<string, string>>,
): Diagnostic {
  return {
    code,
    messageKey: code,
    severity: 'error',
    path,
    ...(details === undefined ? {} : { details }),
  }
}

function convertMark(
  value: unknown,
  path: DiagnosticPath,
): Result<RichTextMark> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return failure([diagnostic('rich_text.invalid_mark', path)])
  }

  if (!ownedMarkTypes.has(value.type)) {
    return failure([
      diagnostic('rich_text.unsupported_mark', path, {
        type: value.type,
      }),
    ])
  }

  if (value.type !== 'link') {
    return success({ type: value.type } as RichTextMark)
  }

  if (!isRecord(value.attrs) || typeof value.attrs.href !== 'string') {
    return failure([diagnostic('rich_text.invalid_link', path)])
  }

  return success({
    type: 'link',
    attrs: {
      href: value.attrs.href,
      ...(typeof value.attrs.title === 'string'
        ? { title: value.attrs.title }
        : {}),
    },
  })
}

function convertInline(
  value: unknown,
  path: DiagnosticPath,
): Result<RichTextInline> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return failure([diagnostic('rich_text.invalid_node', path)])
  }

  if (value.type === 'hardBreak') {
    return success({ type: 'hardBreak' })
  }

  if (value.type !== 'text') {
    return failure([
      diagnostic('rich_text.unsupported_node', path, {
        type: value.type,
      }),
    ])
  }

  if (typeof value.text !== 'string') {
    return failure([diagnostic('rich_text.invalid_text', path)])
  }

  if (value.marks === undefined) {
    return success({ type: 'text', text: value.text })
  }

  if (!Array.isArray(value.marks)) {
    return failure([diagnostic('rich_text.invalid_marks', [...path, 'marks'])])
  }

  const marks: RichTextMark[] = []
  const diagnostics: Diagnostic[] = []

  for (const [index, mark] of value.marks.entries()) {
    const result = convertMark(mark, [...path, 'marks', index])
    if (result.ok) {
      marks.push(result.value)
    } else {
      diagnostics.push(...result.diagnostics)
    }
  }

  if (diagnostics.length > 0) {
    return failure(diagnostics)
  }

  return success({
    type: 'text',
    text: value.text,
    marks,
  })
}

function convertParagraph(
  value: UnknownRecord,
  path: DiagnosticPath,
): Result<RichTextParagraph> {
  const sourceContent = value.content ?? []
  if (!Array.isArray(sourceContent)) {
    return failure([
      diagnostic('rich_text.invalid_content', [...path, 'content']),
    ])
  }

  const content: RichTextInline[] = []
  const diagnostics: Diagnostic[] = []

  for (const [index, inline] of sourceContent.entries()) {
    const result = convertInline(inline, [...path, 'content', index])
    if (result.ok) {
      content.push(result.value)
    } else {
      diagnostics.push(...result.diagnostics)
    }
  }

  return diagnostics.length > 0
    ? failure(diagnostics)
    : success({ type: 'paragraph', content })
}

function convertBlock(
  value: unknown,
  path: DiagnosticPath,
): Result<RichTextDocument['content'][number]> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return failure([diagnostic('rich_text.invalid_node', path)])
  }

  if (value.type === 'paragraph') {
    return convertParagraph(value, path)
  }

  if (value.type !== 'bulletList' && value.type !== 'orderedList') {
    return failure([
      diagnostic('rich_text.unsupported_node', path, {
        type: value.type,
      }),
    ])
  }

  if (!Array.isArray(value.content)) {
    return failure([
      diagnostic('rich_text.invalid_content', [...path, 'content']),
    ])
  }

  const content: Array<{
    type: 'listItem'
    content: RichTextParagraph[]
  }> = []
  const diagnostics: Diagnostic[] = []

  for (const [itemIndex, item] of value.content.entries()) {
    const itemPath: DiagnosticPath = [...path, 'content', itemIndex]
    if (
      !isRecord(item) ||
      item.type !== 'listItem' ||
      !Array.isArray(item.content)
    ) {
      diagnostics.push(diagnostic('rich_text.invalid_list_item', itemPath))
      continue
    }

    const paragraphs: RichTextParagraph[] = []
    for (const [paragraphIndex, paragraph] of item.content.entries()) {
      const paragraphPath: DiagnosticPath = [
        ...itemPath,
        'content',
        paragraphIndex,
      ]
      if (!isRecord(paragraph) || paragraph.type !== 'paragraph') {
        diagnostics.push(
          diagnostic('rich_text.unsupported_node', paragraphPath, {
            type:
              isRecord(paragraph) && typeof paragraph.type === 'string'
                ? paragraph.type
                : 'unknown',
          }),
        )
        continue
      }

      const result = convertParagraph(paragraph, paragraphPath)
      if (result.ok) {
        paragraphs.push(result.value)
      } else {
        diagnostics.push(...result.diagnostics)
      }
    }

    content.push({ type: 'listItem', content: paragraphs })
  }

  if (diagnostics.length > 0) {
    return failure(diagnostics)
  }

  const start =
    value.type === 'orderedList' &&
    isRecord(value.attrs) &&
    typeof value.attrs.start === 'number'
      ? value.attrs.start
      : undefined

  return success({
    type: value.type,
    ...(start === undefined ? {} : { start }),
    content,
  })
}

export function fromTiptapDocument(value: unknown): Result<RichTextDocument> {
  if (
    !isRecord(value) ||
    value.type !== 'doc' ||
    !Array.isArray(value.content)
  ) {
    return failure([diagnostic('rich_text.invalid_document', [])])
  }

  const content: RichTextDocument['content'][number][] = []
  const diagnostics: Diagnostic[] = []

  for (const [index, block] of value.content.entries()) {
    const result = convertBlock(block, ['content', index])
    if (result.ok) {
      content.push(result.value)
    } else {
      diagnostics.push(...result.diagnostics)
    }
  }

  if (diagnostics.length > 0) {
    return failure(diagnostics)
  }

  const parsed = richTextDocumentSchema.safeParse({
    type: 'doc',
    content,
  })

  if (!parsed.success) {
    return failure(
      parsed.error.issues.map((issue) =>
        diagnostic(
          'rich_text.invalid_document',
          issue.path.filter(
            (segment): segment is string | number =>
              typeof segment === 'string' || typeof segment === 'number',
          ),
        ),
      ),
    )
  }

  return success(parsed.data)
}

function toTiptapMark(mark: RichTextMark): TiptapMark {
  if (mark.type === 'link') {
    return {
      type: 'link',
      attrs: {
        href: mark.attrs.href,
        ...(mark.attrs.title === undefined ? {} : { title: mark.attrs.title }),
      },
    }
  }

  return { type: mark.type }
}

function toTiptapInline(inline: RichTextInline): JSONContent {
  if (inline.type === 'hardBreak') {
    return { type: 'hardBreak' }
  }

  return {
    type: 'text',
    text: inline.text,
    ...(inline.marks === undefined
      ? {}
      : { marks: inline.marks.map(toTiptapMark) }),
  }
}

function toTiptapParagraph(paragraph: RichTextParagraph): JSONContent {
  return {
    type: 'paragraph',
    content: paragraph.content.map(toTiptapInline),
  }
}

export function toTiptapDocument(document: RichTextDocument): JSONContent {
  return {
    type: 'doc',
    content: document.content.map((block) => {
      if (block.type === 'paragraph') {
        return toTiptapParagraph(block)
      }

      return {
        type: block.type,
        ...(block.type === 'orderedList' && block.start !== undefined
          ? {
              attrs: {
                start: block.start,
              },
            }
          : {}),
        content: block.content.map((item) => ({
          type: 'listItem',
          content: item.content.map(toTiptapParagraph),
        })),
      }
    }),
  }
}
