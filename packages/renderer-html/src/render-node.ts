import type { CompiledResource, IrNode } from '@rudralipi/compiler'

import { escapeHtml } from './escape.js'
import { renderRichText } from './render-rich-text.js'
import { resourceDataUrl } from './resources.js'

export interface NodeRenderContext {
  readonly resources: ReadonlyMap<string, CompiledResource>
}

function classes(node: IrNode, ...additional: ReadonlyArray<string>): string {
  const values = ['rl-block', `rl-${node.type}`, ...additional]
  if (node.style?.textAlign !== undefined) {
    values.push(`rl-align-${node.style.textAlign}`)
  }
  if (node.style?.tone !== undefined) {
    values.push(`rl-tone-${node.style.tone}`)
  }
  if (node.style?.spaceBefore !== undefined) {
    values.push(`rl-space-before-${node.style.spaceBefore}`)
  }
  if (node.style?.spaceAfter !== undefined) {
    values.push(`rl-space-after-${node.style.spaceAfter}`)
  }
  if (node.style?.keepTogether === true) {
    values.push('rl-keep-together')
  }
  return values.join(' ')
}

function attributes(node: IrNode): string {
  const accessibility =
    node.accessibility?.label === undefined
      ? ''
      : ` aria-label="${escapeHtml(node.accessibility.label)}"`
  return ` class="${classes(node)}" data-rudralipi-node="${escapeHtml(node.id)}"${accessibility}`
}

function renderChildren(
  children: ReadonlyArray<IrNode>,
  context: NodeRenderContext,
): string {
  return children.map((child) => renderNode(child, context)).join('')
}

export function renderNode(node: IrNode, context: NodeRenderContext): string {
  switch (node.type) {
    case 'heading': {
      const tag = `h${node.level}`
      return `<${tag}${attributes(node)}>${escapeHtml(node.text)}</${tag}>`
    }
    case 'richText':
      return `<div${attributes(node)}>${renderRichText(node.content)}</div>`
    case 'image': {
      const resource = context.resources.get(node.resourceId)
      if (resource === undefined) {
        return `<figure${attributes(node)} data-rudralipi-missing-resource="true"></figure>`
      }
      return `<figure${attributes(node)} data-width="${escapeHtml(node.width)}" data-alignment="${node.alignment}"><img src="${resourceDataUrl(resource)}" alt="${escapeHtml(node.alt)}" data-fit="${node.fit}"></figure>`
    }
    case 'text':
      return `<p${attributes(node)}>${escapeHtml(node.text)}</p>`
    case 'table': {
      const headers = node.columns
        .map(
          (column) =>
            `<th scope="col" data-column="${escapeHtml(column.id)}">${escapeHtml(column.header)}</th>`,
        )
        .join('')
      const rows = node.rows
        .map(
          (row) =>
            `<tr data-row="${escapeHtml(row.id)}">${row.cells
              .map(
                (cell) =>
                  `<td data-column="${escapeHtml(cell.columnId)}"${
                    cell.colSpan === undefined
                      ? ''
                      : ` colspan="${cell.colSpan}"`
                  }${
                    cell.rowSpan === undefined
                      ? ''
                      : ` rowspan="${cell.rowSpan}"`
                  }>${renderRichText(cell.content)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('')
      return `<table${attributes(node)} data-allow-row-split="${String(node.allowRowSplit)}"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    }
    case 'columns': {
      const template = node.columns.map(({ width }) => `${width}fr`).join(' ')
      const columns = node.columns
        .map(
          (column) =>
            `<div class="rl-column" data-column="${escapeHtml(column.id)}">${renderChildren(column.children, context)}</div>`,
        )
        .join('')
      return `<div${attributes(node)} data-gap="${node.gap}" style="grid-template-columns: ${template}">${columns}</div>`
    }
    case 'divider':
      return `<hr${attributes(node)} data-variant="${node.variant}" data-weight="${node.weight}">`
    case 'spacer':
      return `<div${attributes(node)} data-size="${node.size}" aria-hidden="true"></div>`
    case 'header':
      return `<header${attributes(node)} data-repeat="${node.repeat}">${renderChildren(node.children, context)}</header>`
    case 'footer':
      return `<footer${attributes(node)} data-repeat="${node.repeat}">${renderChildren(node.children, context)}${
        node.showPageNumber
          ? '<span class="rl-page-number" aria-label="Page number"></span>'
          : ''
      }</footer>`
    case 'signature':
      return `<section${attributes(node)} data-layout="${node.layout}">${node.lines
        .map((line) => {
          const image =
            line.imageResourceId === undefined
              ? ''
              : (() => {
                  const resource = context.resources.get(line.imageResourceId)
                  return resource === undefined
                    ? ''
                    : `<img src="${resourceDataUrl(resource)}" alt="">`
                })()
          return `<div class="rl-signature-line" data-line="${escapeHtml(line.id)}">${image}${
            line.signerText === undefined
              ? ''
              : `<span class="rl-signature-name">${escapeHtml(line.signerText)}</span>`
          }<span class="rl-signature-label">${escapeHtml(line.label)}</span></div>`
        })
        .join('')}</section>`
    case 'group':
      return `<section${attributes(node)} data-source-type="${node.sourceType}">${renderChildren(node.children, context)}</section>`
    case 'pageBreak':
      return `<div${attributes(node)} data-rudralipi-page-break="true" aria-hidden="true"></div>`
  }
}
