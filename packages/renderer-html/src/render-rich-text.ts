import type {
  RichTextDocument,
  RichTextInline,
  RichTextMark,
} from '@rudralipi/core'

import { escapeHtml, isSafeLink } from './escape.js'

function renderMark(content: string, mark: RichTextMark): string {
  switch (mark.type) {
    case 'bold':
      return `<strong>${content}</strong>`
    case 'italic':
      return `<em>${content}</em>`
    case 'underline':
      return `<u>${content}</u>`
    case 'strike':
      return `<s>${content}</s>`
    case 'code':
      return `<code>${content}</code>`
    case 'superscript':
      return `<sup>${content}</sup>`
    case 'subscript':
      return `<sub>${content}</sub>`
    case 'link':
      return isSafeLink(mark.attrs.href)
        ? `<a href="${escapeHtml(mark.attrs.href)}"${
            mark.attrs.title === undefined
              ? ''
              : ` title="${escapeHtml(mark.attrs.title)}"`
          } rel="noopener noreferrer">${content}</a>`
        : content
  }
}

function renderInline(node: RichTextInline): string {
  if (node.type === 'hardBreak') {
    return '<br>'
  }
  let content = escapeHtml(node.text)
  for (const mark of [...(node.marks ?? [])].reverse()) {
    content = renderMark(content, mark)
  }
  return content
}

function renderParagraphContent(
  content: ReadonlyArray<RichTextInline>,
): string {
  return content.map(renderInline).join('')
}

export function renderRichText(document: RichTextDocument): string {
  return document.content
    .map((node) => {
      if (node.type === 'paragraph') {
        return `<p>${renderParagraphContent(node.content)}</p>`
      }
      const tag = node.type === 'orderedList' ? 'ol' : 'ul'
      const start =
        node.type === 'orderedList' && node.start !== undefined
          ? ` start="${node.start}"`
          : ''
      const items = node.content
        .map(
          (item) =>
            `<li>${item.content
              .map(
                (paragraph) =>
                  `<p>${renderParagraphContent(paragraph.content)}</p>`,
              )
              .join('')}</li>`,
        )
        .join('')
      return `<${tag}${start}>${items}</${tag}>`
    })
    .join('')
}
