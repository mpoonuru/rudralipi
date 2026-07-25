import type { BlockNode, RichTextBlock } from '../schema/blocks.js'
import type { RudralipiDocument } from '../schema/document.js'

export type NodeContainerReference =
  | {
      readonly kind: 'document'
    }
  | {
      readonly kind: 'block'
      readonly blockId: string
      readonly region: 'content' | 'otherwise'
    }
  | {
      readonly kind: 'column'
      readonly blockId: string
      readonly columnId: string
    }

export interface NodePlacement {
  readonly container: NodeContainerReference
  readonly index: number
}

export interface CommandContext {
  readonly generateId: (prefix: string) => string
  readonly nowIso: () => string
}

export type DocumentCommand =
  | {
      readonly type: 'node.insert'
      readonly placement: NodePlacement
      readonly node: BlockNode
    }
  | {
      readonly type: 'node.remove'
      readonly nodeId: string
    }
  | {
      readonly type: 'node.move'
      readonly nodeId: string
      readonly placement: NodePlacement
    }
  | {
      readonly type: 'node.duplicate'
      readonly nodeId: string
      readonly placement?: NodePlacement | undefined
    }
  | {
      readonly type: 'node.updateProps'
      readonly nodeId: string
      readonly props: unknown
    }
  | {
      readonly type: 'richText.replace'
      readonly nodeId: string
      readonly content: RichTextBlock['props']['content']
    }
  | {
      readonly type: 'page.update'
      readonly page: RudralipiDocument['page']
    }
  | {
      readonly type: 'theme.update'
      readonly theme: RudralipiDocument['theme']
    }

export interface CommandApplication {
  readonly document: RudralipiDocument
  readonly inverse: DocumentCommand
  readonly affectedNodeIds: ReadonlyArray<string>
  readonly timestamp: string
}

export interface TransactionApplication {
  readonly document: RudralipiDocument
  readonly commands: ReadonlyArray<DocumentCommand>
  readonly inverse: ReadonlyArray<DocumentCommand>
  readonly affectedNodeIds: ReadonlyArray<string>
  readonly timestamp: string
}
