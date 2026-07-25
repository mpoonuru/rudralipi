import {
  failure,
  parseDocument,
  success,
  type Diagnostic,
  type Result,
  type RudralipiDocument,
} from '@rudralipi/core'

export const playgroundStorageKey = 'rudralipi.playground.document'

export interface DocumentStoreAdapter {
  load(): Promise<Result<RudralipiDocument | null>>
  save(document: RudralipiDocument): Promise<Result<RudralipiDocument>>
}

function storageDiagnostic(code: string): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    path: [],
    severity: 'error',
  }
}

export function createBrowserDocumentStore(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): DocumentStoreAdapter {
  return {
    async load(): Promise<Result<RudralipiDocument | null>> {
      let serialized: string | null
      try {
        serialized = storage.getItem(playgroundStorageKey)
      } catch {
        return failure([storageDiagnostic('storage.read_failed')])
      }

      if (serialized === null) {
        return success(null)
      }

      let input: unknown
      try {
        input = JSON.parse(serialized)
      } catch {
        return failure([storageDiagnostic('storage.invalid_json')])
      }

      return parseDocument(input)
    },
    async save(document): Promise<Result<RudralipiDocument>> {
      const parsed = parseDocument(document)
      if (!parsed.ok) {
        return parsed
      }

      try {
        storage.setItem(playgroundStorageKey, JSON.stringify(parsed.value))
      } catch {
        return failure([storageDiagnostic('storage.write_failed')])
      }
      return success(parsed.value)
    },
  }
}
