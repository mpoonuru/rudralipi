import {
  createHistory,
  type CommandContext,
  type Diagnostic,
  type DocumentCommand,
  type Result,
  type RudralipiDocument,
  type SupportedLocale,
} from '@rudralipi/core'
import { createStore, type StoreApi } from 'zustand/vanilla'

export interface EditorStoreOptions {
  readonly context: CommandContext
  readonly document: RudralipiDocument
  readonly historyLimit?: number
  readonly locale?: SupportedLocale
  readonly onDocumentChange?: (document: RudralipiDocument) => void
}

export interface EditorStoreState {
  readonly announcement: string
  readonly canRedo: boolean
  readonly canUndo: boolean
  readonly diagnostics: ReadonlyArray<Diagnostic>
  readonly document: RudralipiDocument
  readonly locale: SupportedLocale
  readonly selectedNodeId: string | null
  execute(
    command: DocumentCommand | ReadonlyArray<DocumentCommand>,
  ): Result<RudralipiDocument>
  redo(): Result<RudralipiDocument>
  replaceDocument(document: RudralipiDocument): void
  selectNode(nodeId: string | null): void
  setAnnouncement(message: string): void
  setLocale(locale: SupportedLocale): void
  undo(): Result<RudralipiDocument>
}

export type EditorStore = StoreApi<EditorStoreState>

export function createEditorStore({
  context,
  document,
  historyLimit = 100,
  locale = document.locale,
  onDocumentChange,
}: EditorStoreOptions): EditorStore {
  let history = createHistory(document, {
    context,
    limit: historyLimit,
  })

  return createStore<EditorStoreState>((set) => {
    const publish = (
      result: Result<RudralipiDocument>,
      emit: boolean,
    ): Result<RudralipiDocument> => {
      if (!result.ok) {
        set({ diagnostics: result.diagnostics })
        return result
      }

      set({
        canRedo: history.canRedo,
        canUndo: history.canUndo,
        diagnostics: result.diagnostics,
        document: result.value,
      })
      if (emit) {
        onDocumentChange?.(result.value)
      }
      return result
    }

    return {
      announcement: '',
      canRedo: false,
      canUndo: false,
      diagnostics: [],
      document,
      locale,
      selectedNodeId: null,
      execute: (command) => publish(history.execute(command), true),
      redo: () => publish(history.redo(), true),
      replaceDocument: (nextDocument) => {
        history = createHistory(nextDocument, {
          context,
          limit: historyLimit,
        })
        set({
          announcement: '',
          canRedo: false,
          canUndo: false,
          diagnostics: [],
          document: nextDocument,
          locale: nextDocument.locale,
          selectedNodeId: null,
        })
      },
      selectNode: (nodeId) => {
        set({ selectedNodeId: nodeId })
      },
      setAnnouncement: (announcement) => {
        set({ announcement })
      },
      setLocale: (nextLocale) => {
        set({ locale: nextLocale })
      },
      undo: () => publish(history.undo(), true),
    }
  })
}
