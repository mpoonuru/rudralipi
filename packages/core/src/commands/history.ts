import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from '../diagnostics.js'
import type { RudralipiDocument } from '../schema/document.js'
import { applyTransaction } from './apply.js'
import type { CommandContext, DocumentCommand } from './types.js'

interface HistoryEntry {
  readonly forward: ReadonlyArray<DocumentCommand>
  readonly inverse: ReadonlyArray<DocumentCommand>
  readonly timestamp: string
}

export interface DocumentHistory {
  readonly current: RudralipiDocument
  readonly canUndo: boolean
  readonly canRedo: boolean
  execute(
    command: DocumentCommand | ReadonlyArray<DocumentCommand>,
  ): Result<RudralipiDocument>
  undo(): Result<RudralipiDocument>
  redo(): Result<RudralipiDocument>
  clear(): void
}

export interface HistoryOptions {
  readonly limit: number
  readonly context: CommandContext
}

function historyDiagnostic(code: string): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
  }
}

export function createHistory(
  initialDocument: RudralipiDocument,
  options: HistoryOptions,
): DocumentHistory {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1) {
    throw new RangeError('History limit must be a positive safe integer.')
  }

  let current = initialDocument
  const undoEntries: HistoryEntry[] = []
  const redoEntries: HistoryEntry[] = []

  const applyEntry = (
    entry: HistoryEntry,
    direction: 'undo' | 'redo',
  ): Result<RudralipiDocument> => {
    const commands = direction === 'undo' ? entry.inverse : entry.forward
    const result = applyTransaction(current, commands, options.context)
    if (!result.ok) {
      return result
    }
    current = result.value.document
    return success(current)
  }

  return {
    get current() {
      return current
    },
    get canUndo() {
      return undoEntries.length > 0
    },
    get canRedo() {
      return redoEntries.length > 0
    },
    execute(
      command: DocumentCommand | ReadonlyArray<DocumentCommand>,
    ): Result<RudralipiDocument> {
      const commands = Array.isArray(command) ? command : [command]
      const result = applyTransaction(current, commands, options.context)
      if (!result.ok) {
        return result
      }
      current = result.value.document
      undoEntries.push({
        forward: result.value.commands,
        inverse: result.value.inverse,
        timestamp: result.value.timestamp,
      })
      if (undoEntries.length > options.limit) {
        undoEntries.shift()
      }
      redoEntries.length = 0
      return success(current)
    },
    undo(): Result<RudralipiDocument> {
      const entry = undoEntries.at(-1)
      if (entry === undefined) {
        return failure([historyDiagnostic('history.nothing_to_undo')])
      }
      const result = applyEntry(entry, 'undo')
      if (!result.ok) {
        return result
      }
      undoEntries.pop()
      redoEntries.push(entry)
      return result
    },
    redo(): Result<RudralipiDocument> {
      const entry = redoEntries.at(-1)
      if (entry === undefined) {
        return failure([historyDiagnostic('history.nothing_to_redo')])
      }
      const result = applyEntry(entry, 'redo')
      if (!result.ok) {
        return result
      }
      redoEntries.pop()
      undoEntries.push(entry)
      return result
    },
    clear(): void {
      undoEntries.length = 0
      redoEntries.length = 0
    },
  }
}
