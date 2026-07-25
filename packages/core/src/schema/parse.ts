import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from '../diagnostics.js'
import type { BlockNode } from './blocks.js'
import { rudralipiDocumentSchema, type RudralipiDocument } from './document.js'
import type { RichTextDocument } from './rich-text.js'

export interface DocumentLimits {
  readonly maxSerializedBytes: number
  readonly maxDepth: number
  readonly maxValues: number
  readonly maxBlocks: number
  readonly maxTableCells: number
  readonly maxRichTextCharacters: number
}

export const defaultDocumentLimits: Readonly<DocumentLimits> = Object.freeze({
  maxSerializedBytes: 5_000_000,
  maxDepth: 100,
  maxValues: 1_000_000,
  maxBlocks: 100_000,
  maxTableCells: 500_000,
  maxRichTextCharacters: 2_000_000,
})

interface PreflightState {
  values: number
  readonly seen: WeakSet<object>
}

function diagnostic(
  code: string,
  path: ReadonlyArray<string | number> = [],
  details?: Readonly<Record<string, string | number | boolean>>,
  nodeId?: string,
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path,
    ...(details === undefined ? {} : { details }),
    ...(nodeId === undefined ? {} : { nodeId }),
  }
}

function preflightValue(
  value: unknown,
  limits: DocumentLimits,
  state: PreflightState,
  path: ReadonlyArray<string | number>,
  depth: number,
): Diagnostic | undefined {
  state.values += 1
  if (state.values > limits.maxValues) {
    return diagnostic('document.limit.values', path, {
      maximum: limits.maxValues,
    })
  }
  if (depth > limits.maxDepth) {
    return diagnostic('document.limit.depth', path, {
      maximum: limits.maxDepth,
    })
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return undefined
  }
  if (typeof value !== 'object') {
    return diagnostic('document.unsafe_value', path)
  }
  if (state.seen.has(value)) {
    return diagnostic('document.circular_reference', path)
  }
  state.seen.add(value)

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const issue = preflightValue(
        entry,
        limits,
        state,
        [...path, index],
        depth + 1,
      )
      if (issue !== undefined) {
        return issue
      }
    }
    return undefined
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    return diagnostic('document.unsafe_object', path)
  }

  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if ('get' in descriptor || 'set' in descriptor) {
      return diagnostic('document.unsafe_accessor', [...path, key])
    }
    const issue = preflightValue(
      descriptor.value,
      limits,
      state,
      [...path, key],
      depth + 1,
    )
    if (issue !== undefined) {
      return issue
    }
  }
  return undefined
}

function utf8ByteLength(value: string): number {
  let bytes = 0
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4
      index += 1
    } else {
      bytes += 3
    }
  }
  return bytes
}

function countDocumentValues(document: RudralipiDocument): {
  blocks: number
  tableCells: number
  richTextCharacters: number
} {
  let blocks = 0
  let tableCells = 0
  let richTextCharacters = 0

  const countRichText = (richText: RichTextDocument) => {
    for (const node of richText.content) {
      if (node.type === 'paragraph') {
        for (const inline of node.content) {
          if (inline.type === 'text') {
            richTextCharacters += inline.text.length
          }
        }
      } else {
        for (const item of node.content) {
          for (const paragraph of item.content) {
            for (const inline of paragraph.content) {
              if (inline.type === 'text') {
                richTextCharacters += inline.text.length
              }
            }
          }
        }
      }
    }
  }

  const visit = (nodes: RudralipiDocument['content']) => {
    for (const node of nodes) {
      blocks += 1
      switch (node.type) {
        case 'richText':
          countRichText(node.props.content)
          break
        case 'table':
          for (const row of node.props.rows) {
            tableCells += row.cells.length
            for (const cell of row.cells) {
              countRichText(cell.content)
            }
          }
          break
        case 'columns':
          for (const column of node.props.columns) {
            visit([...column.content])
          }
          break
        case 'header':
        case 'footer':
          visit([...node.props.content])
          break
        case 'conditional':
          visit([...node.props.content])
          visit([...node.props.otherwise])
          break
        default:
          break
      }
    }
  }

  visit(document.content)
  return { blocks, tableCells, richTextCharacters }
}

function validateDocumentInvariants(
  document: RudralipiDocument,
): ReadonlyArray<Diagnostic> {
  const nodesById = new Map<string, BlockNode>()
  const visit = (
    nodes: ReadonlyArray<BlockNode>,
    path: ReadonlyArray<string | number>,
  ): Diagnostic | undefined => {
    for (const [index, node] of nodes.entries()) {
      const nodePath = [...path, index]
      if (nodesById.has(node.id)) {
        return diagnostic(
          'document.duplicate_node_id',
          [...nodePath, 'id'],
          undefined,
          node.id,
        )
      }
      nodesById.set(node.id, node)

      let issue: Diagnostic | undefined
      switch (node.type) {
        case 'columns':
          for (const [columnIndex, column] of node.props.columns.entries()) {
            issue = visit(column.content, [
              ...nodePath,
              'props',
              'columns',
              columnIndex,
              'content',
            ])
            if (issue !== undefined) {
              return issue
            }
          }
          break
        case 'header':
        case 'footer':
          issue = visit(node.props.content, [...nodePath, 'props', 'content'])
          break
        case 'conditional':
          issue = visit(node.props.content, [...nodePath, 'props', 'content'])
          if (issue === undefined) {
            issue = visit(node.props.otherwise, [
              ...nodePath,
              'props',
              'otherwise',
            ])
          }
          break
        default:
          break
      }
      if (issue !== undefined) {
        return issue
      }
    }
    return undefined
  }

  const duplicate = visit(document.content, ['content'])
  if (duplicate !== undefined) {
    return [duplicate]
  }

  if (
    document.page.headerId !== undefined &&
    nodesById.get(document.page.headerId)?.type !== 'header'
  ) {
    return [
      diagnostic('document.invalid_header_reference', ['page', 'headerId']),
    ]
  }
  if (
    document.page.footerId !== undefined &&
    nodesById.get(document.page.footerId)?.type !== 'footer'
  ) {
    return [
      diagnostic('document.invalid_footer_reference', ['page', 'footerId']),
    ]
  }
  return []
}

export function parseDocument(
  input: unknown,
  overrides: Partial<DocumentLimits> = {},
): Result<RudralipiDocument> {
  const limits: DocumentLimits = {
    ...defaultDocumentLimits,
    ...overrides,
  }
  const unsafe = preflightValue(
    input,
    limits,
    {
      values: 0,
      seen: new WeakSet<object>(),
    },
    [],
    0,
  )
  if (unsafe !== undefined) {
    return failure([unsafe])
  }

  const serialized = JSON.stringify(input)
  if (
    serialized === undefined ||
    utf8ByteLength(serialized) > limits.maxSerializedBytes
  ) {
    return failure([
      diagnostic('document.limit.serialized_bytes', [], {
        maximum: limits.maxSerializedBytes,
      }),
    ])
  }

  const parsed = rudralipiDocumentSchema.safeParse(input)
  if (!parsed.success) {
    return failure(
      parsed.error.issues.map((issue) =>
        diagnostic(
          'document.invalid',
          issue.path.map((part) =>
            typeof part === 'symbol' ? String(part) : part,
          ),
        ),
      ),
    )
  }

  const counts = countDocumentValues(parsed.data)
  if (counts.blocks > limits.maxBlocks) {
    return failure([
      diagnostic('document.limit.blocks', [], {
        maximum: limits.maxBlocks,
      }),
    ])
  }
  if (counts.tableCells > limits.maxTableCells) {
    return failure([
      diagnostic('document.limit.table_cells', [], {
        maximum: limits.maxTableCells,
      }),
    ])
  }
  if (counts.richTextCharacters > limits.maxRichTextCharacters) {
    return failure([
      diagnostic('document.limit.rich_text_characters', [], {
        maximum: limits.maxRichTextCharacters,
      }),
    ])
  }

  const invariantDiagnostics = validateDocumentInvariants(parsed.data)
  if (invariantDiagnostics.length > 0) {
    return failure(invariantDiagnostics)
  }

  return success(parsed.data)
}
