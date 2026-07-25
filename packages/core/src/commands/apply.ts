import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from '../diagnostics.js'
import { cloneJsonValue } from '../json.js'
import type { BlockNode } from '../schema/blocks.js'
import type { RudralipiDocument } from '../schema/document.js'
import { parseDocument } from '../schema/parse.js'
import {
  findNode,
  getNodeContainer,
  type DeepMutable,
  type MutableBlockNode,
  type MutableDocument,
} from './node-path.js'
import type {
  CommandApplication,
  CommandContext,
  DocumentCommand,
  NodePlacement,
  TransactionApplication,
} from './types.js'

function commandDiagnostic(
  code: string,
  nodeId?: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details,
    ...(nodeId === undefined ? {} : { nodeId }),
  }
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isSafeInteger(index) && index >= 0 && index <= length
}

function idPrefix(type: string): string {
  return type.replaceAll('/', '-').replaceAll('.', '-')
}

function assignFreshIds(node: MutableBlockNode, context: CommandContext): void {
  node.id = context.generateId(idPrefix(node.type))
  switch (node.type) {
    case 'table': {
      const columnIds = new Map<string, string>()
      for (const column of node.props.columns) {
        const nextId = context.generateId('column')
        columnIds.set(column.id, nextId)
        column.id = nextId
      }
      for (const row of node.props.rows) {
        row.id = context.generateId('row')
        for (const cell of row.cells) {
          cell.columnId = columnIds.get(cell.columnId) ?? cell.columnId
        }
      }
      break
    }
    case 'columns':
      for (const column of node.props.columns) {
        column.id = context.generateId('column')
        for (const child of column.content) {
          assignFreshIds(child, context)
        }
      }
      break
    case 'header':
    case 'footer':
      for (const child of node.props.content) {
        assignFreshIds(child, context)
      }
      break
    case 'signature':
      for (const line of node.props.lines) {
        line.id = context.generateId('signature-line')
      }
      break
    case 'conditional':
      for (const child of node.props.content) {
        assignFreshIds(child, context)
      }
      for (const child of node.props.otherwise) {
        assignFreshIds(child, context)
      }
      break
    default:
      break
  }
}

function finishApplication(
  draft: MutableDocument,
  inverse: DocumentCommand,
  affectedNodeIds: ReadonlyArray<string>,
  context: CommandContext,
): Result<CommandApplication> {
  const parsed = parseDocument(draft)
  if (!parsed.ok) {
    return parsed
  }
  return success({
    document: parsed.value,
    inverse,
    affectedNodeIds,
    timestamp: context.nowIso(),
  })
}

function insertNode(
  document: MutableDocument,
  placement: NodePlacement,
  node: BlockNode,
): Diagnostic | undefined {
  if (findNode(document, node.id) !== undefined) {
    return commandDiagnostic('command.duplicate_node_id', node.id)
  }
  const container = getNodeContainer(document, placement.container)
  if (container === undefined) {
    return commandDiagnostic('command.container_not_found')
  }
  if (!isValidIndex(placement.index, container.length)) {
    return commandDiagnostic('command.invalid_index', undefined, {
      index: placement.index,
      length: container.length,
    })
  }
  container.splice(placement.index, 0, cloneJsonValue(node) as MutableBlockNode)
  return undefined
}

export function applyCommand(
  document: RudralipiDocument,
  command: DocumentCommand,
  context: CommandContext,
): Result<CommandApplication> {
  const draft = cloneJsonValue(document) as MutableDocument

  switch (command.type) {
    case 'node.insert': {
      const issue = insertNode(draft, command.placement, command.node)
      if (issue !== undefined) {
        return failure([issue])
      }
      return finishApplication(
        draft,
        {
          type: 'node.remove',
          nodeId: command.node.id,
        },
        [command.node.id],
        context,
      )
    }
    case 'node.remove': {
      const located = findNode(draft, command.nodeId)
      if (located === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      const [removed] = located.container.splice(located.placement.index, 1)
      if (removed === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      return finishApplication(
        draft,
        {
          type: 'node.insert',
          placement: located.placement,
          node: removed,
        },
        [command.nodeId],
        context,
      )
    }
    case 'node.move': {
      const located = findNode(draft, command.nodeId)
      if (located === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      const originalPlacement = located.placement
      const [moved] = located.container.splice(located.placement.index, 1)
      if (moved === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      const target = getNodeContainer(draft, command.placement.container)
      if (target === undefined) {
        return failure([commandDiagnostic('command.container_not_found')])
      }
      if (!isValidIndex(command.placement.index, target.length)) {
        return failure([
          commandDiagnostic('command.invalid_index', undefined, {
            index: command.placement.index,
            length: target.length,
          }),
        ])
      }
      target.splice(command.placement.index, 0, moved)
      return finishApplication(
        draft,
        {
          type: 'node.move',
          nodeId: command.nodeId,
          placement: originalPlacement,
        },
        [command.nodeId],
        context,
      )
    }
    case 'node.duplicate': {
      const located = findNode(draft, command.nodeId)
      if (located === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      const duplicate = cloneJsonValue(located.node)
      assignFreshIds(duplicate, context)
      const placement = command.placement ?? {
        container: located.placement.container,
        index: located.placement.index + 1,
      }
      const issue = insertNode(
        draft,
        placement,
        duplicate as DeepMutable<BlockNode>,
      )
      if (issue !== undefined) {
        return failure([issue])
      }
      return finishApplication(
        draft,
        {
          type: 'node.remove',
          nodeId: duplicate.id,
        },
        [duplicate.id],
        context,
      )
    }
    case 'node.updateProps': {
      const located = findNode(draft, command.nodeId)
      if (located === undefined) {
        return failure([
          commandDiagnostic('command.node_not_found', command.nodeId),
        ])
      }
      const previousProps = cloneJsonValue(located.node.props)
      located.container[located.placement.index] = {
        ...located.node,
        props: cloneJsonValue(command.props),
      } as MutableBlockNode
      return finishApplication(
        draft,
        {
          type: 'node.updateProps',
          nodeId: command.nodeId,
          props: previousProps,
        },
        [command.nodeId],
        context,
      )
    }
    case 'richText.replace': {
      const located = findNode(draft, command.nodeId)
      if (located?.node.type !== 'richText') {
        return failure([
          commandDiagnostic('command.rich_text_node_required', command.nodeId),
        ])
      }
      const previousContent = cloneJsonValue(located.node.props.content)
      located.node.props.content = cloneJsonValue(command.content)
      return finishApplication(
        draft,
        {
          type: 'richText.replace',
          nodeId: command.nodeId,
          content: previousContent,
        },
        [command.nodeId],
        context,
      )
    }
    case 'page.update': {
      const previousPage = cloneJsonValue(draft.page)
      draft.page = cloneJsonValue(command.page)
      return finishApplication(
        draft,
        {
          type: 'page.update',
          page: previousPage,
        },
        [],
        context,
      )
    }
    case 'theme.update': {
      const previousTheme = cloneJsonValue(draft.theme)
      draft.theme = cloneJsonValue(command.theme)
      return finishApplication(
        draft,
        {
          type: 'theme.update',
          theme: previousTheme,
        },
        [],
        context,
      )
    }
  }
}

export function applyTransaction(
  document: RudralipiDocument,
  commands: ReadonlyArray<DocumentCommand>,
  context: CommandContext,
): Result<TransactionApplication> {
  let current = document
  const inverse: DocumentCommand[] = []
  const affected = new Set<string>()
  let timestamp = context.nowIso()

  for (const command of commands) {
    const result = applyCommand(current, command, context)
    if (!result.ok) {
      return result
    }
    current = result.value.document
    inverse.unshift(result.value.inverse)
    timestamp = result.value.timestamp
    for (const nodeId of result.value.affectedNodeIds) {
      affected.add(nodeId)
    }
  }

  return success({
    document: current,
    commands: [...commands],
    inverse,
    affectedNodeIds: [...affected],
    timestamp,
  })
}
