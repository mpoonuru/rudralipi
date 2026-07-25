import type { BlockNode } from '../schema/blocks.js'
import type { RudralipiDocument } from '../schema/document.js'
import type { NodeContainerReference, NodePlacement } from './types.js'

export type DeepMutable<T> =
  T extends ReadonlyArray<infer TItem>
    ? Array<DeepMutable<TItem>>
    : T extends object
      ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
      : T

export type MutableDocument = DeepMutable<RudralipiDocument>
export type MutableBlockNode = DeepMutable<BlockNode>
export type MutableBlockList = Array<MutableBlockNode>

export interface LocatedNode {
  readonly node: MutableBlockNode
  readonly container: MutableBlockList
  readonly placement: NodePlacement
}

function findInList(
  nodes: MutableBlockList,
  nodeId: string,
  reference: NodeContainerReference,
): LocatedNode | undefined {
  for (const [index, node] of nodes.entries()) {
    if (node.id === nodeId) {
      return {
        node,
        container: nodes,
        placement: {
          container: reference,
          index,
        },
      }
    }

    let located: LocatedNode | undefined
    switch (node.type) {
      case 'columns':
        for (const column of node.props.columns) {
          located = findInList(column.content, nodeId, {
            kind: 'column',
            blockId: node.id,
            columnId: column.id,
          })
          if (located !== undefined) {
            return located
          }
        }
        break
      case 'header':
      case 'footer':
        located = findInList(node.props.content, nodeId, {
          kind: 'block',
          blockId: node.id,
          region: 'content',
        })
        break
      case 'conditional':
        located = findInList(node.props.content, nodeId, {
          kind: 'block',
          blockId: node.id,
          region: 'content',
        })
        if (located === undefined) {
          located = findInList(node.props.otherwise, nodeId, {
            kind: 'block',
            blockId: node.id,
            region: 'otherwise',
          })
        }
        break
      default:
        break
    }
    if (located !== undefined) {
      return located
    }
  }
  return undefined
}

export function findNode(
  document: MutableDocument,
  nodeId: string,
): LocatedNode | undefined {
  return findInList(document.content, nodeId, {
    kind: 'document',
  })
}

export function getNodeContainer(
  document: MutableDocument,
  reference: NodeContainerReference,
): MutableBlockList | undefined {
  if (reference.kind === 'document') {
    return document.content
  }
  const parent = findNode(document, reference.blockId)?.node
  if (parent === undefined) {
    return undefined
  }
  if (reference.kind === 'column') {
    return parent.type === 'columns'
      ? parent.props.columns.find(({ id }) => id === reference.columnId)
          ?.content
      : undefined
  }
  if (reference.region === 'otherwise') {
    return parent.type === 'conditional' ? parent.props.otherwise : undefined
  }
  switch (parent.type) {
    case 'header':
    case 'footer':
    case 'conditional':
      return parent.props.content
    default:
      return undefined
  }
}
