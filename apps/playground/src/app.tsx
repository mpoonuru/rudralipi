import { useEffect, useMemo, useState, type ReactElement } from 'react'

import {
  createDocumentFixture,
  type CommandContext,
  type Diagnostic,
  type RudralipiDocument,
  type SupportedLocale,
} from '@rudralipi/core'
import { RudralipiEditor } from '@rudralipi/editor-react'
import { default as dayjs } from 'dayjs'

import {
  createBrowserDocumentStore,
  type DocumentStoreAdapter,
} from './adapters/browser-document-store.js'
import { playgroundAssets, playgroundMergeFields } from './playground-data.js'

const locales: ReadonlyArray<{
  readonly id: SupportedLocale
  readonly label: string
}> = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'tr', label: 'Türkçe' },
]

function createCommandContext(): CommandContext {
  return {
    generateId: (prefix) => {
      const bytes = new Uint8Array(10)
      globalThis.crypto.getRandomValues(bytes)
      const suffix = [...bytes]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
      return `${prefix}-${suffix}`
    },
    nowIso: () => dayjs().toISOString(),
  }
}

function diagnosticSummary(diagnostics: ReadonlyArray<Diagnostic>): string {
  return diagnostics.map(({ code }) => code).join(', ')
}

async function loadDocument(
  store: DocumentStoreAdapter,
  fallback: RudralipiDocument,
): Promise<{
  readonly diagnostics: ReadonlyArray<Diagnostic>
  readonly document: RudralipiDocument
  readonly status: string
}> {
  const loaded = await store.load()
  if (!loaded.ok) {
    return {
      diagnostics: loaded.diagnostics,
      document: fallback,
      status: 'Stored draft was rejected; the canonical document is open.',
    }
  }
  if (loaded.value === null) {
    return {
      diagnostics: [],
      document: fallback,
      status: 'Canonical document ready.',
    }
  }
  return {
    diagnostics: loaded.diagnostics,
    document: loaded.value,
    status: 'Saved draft reloaded and validated.',
  }
}

export function App(): ReactElement {
  const canonicalDocument = useMemo(createDocumentFixture, [])
  const context = useMemo(createCommandContext, [])
  const store = useMemo(
    () => createBrowserDocumentStore(window.localStorage),
    [],
  )
  const [document, setDocument] = useState(canonicalDocument)
  const [diagnostics, setDiagnostics] = useState<ReadonlyArray<Diagnostic>>([])
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewHash, setPreviewHash] = useState<string | null>(null)
  const [status, setStatus] = useState('Opening the local document…')

  useEffect(() => {
    let active = true
    void loadDocument(store, canonicalDocument).then((loaded) => {
      if (!active) {
        return
      }
      setDocument(loaded.document)
      setDiagnostics(loaded.diagnostics)
      setStatus(loaded.status)
    })
    return () => {
      active = false
    }
  }, [canonicalDocument, store])

  const save = async (nextDocument: RudralipiDocument): Promise<void> => {
    const saved = await store.save(nextDocument)
    setDiagnostics(saved.diagnostics)
    setStatus(
      saved.ok
        ? `Saved locally at ${dayjs().format('HH:mm:ss')}.`
        : `Save rejected: ${diagnosticSummary(saved.diagnostics)}`,
    )
  }

  const reload = async (): Promise<void> => {
    const loaded = await loadDocument(store, canonicalDocument)
    setDocument(loaded.document)
    setDiagnostics(loaded.diagnostics)
    setStatus(loaded.status)
  }

  const preview = async (nextDocument: RudralipiDocument): Promise<void> => {
    setStatus('Compiling deterministic preview…')
    const { createPlaygroundPreview } = await import('./preview.js')
    const result = await createPlaygroundPreview(nextDocument)
    setDiagnostics(result.diagnostics)
    if (!result.ok) {
      setStatus(`Preview rejected: ${diagnosticSummary(result.diagnostics)}`)
      return
    }
    setPreviewHtml(result.value.documentHtml)
    setPreviewHash(result.value.hash)
    setStatus('Compiler-backed preview ready.')
  }

  const selectLocale = (locale: SupportedLocale): void => {
    setDocument((current) => ({
      ...current,
      locale,
      metadata: {
        ...current.metadata,
        modifiedAt: dayjs().toISOString(),
      },
    }))
    setStatus(`Editor language changed to ${locale.toUpperCase()}.`)
  }

  return (
    <div className="min-h-screen bg-[#F3F5FA] text-[#111827]">
      <div className="playground-signal-bar">
        <div>
          <span className="playground-signal-dot" />
          <span>{status}</span>
        </div>
        <div className="playground-controls">
          <label>
            <span className="sr-only">Editor language</span>
            <select
              aria-label="Editor language"
              onChange={(event) =>
                selectLocale(event.currentTarget.value as SupportedLocale)
              }
              value={document.locale}
            >
              {locales.map((locale) => (
                <option key={locale.id} value={locale.id}>
                  {locale.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => void reload()} type="button">
            Reload saved
          </button>
          <button
            onClick={() => {
              setDocument(createDocumentFixture())
              setDiagnostics([])
              setStatus('Canonical document restored.')
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      {diagnostics.length === 0 ? null : (
        <aside aria-label="Diagnostics" className="playground-diagnostics">
          <strong>Validation signal</strong>
          <span>{diagnosticSummary(diagnostics)}</span>
        </aside>
      )}

      <RudralipiEditor
        assets={playgroundAssets}
        context={context}
        document={document}
        locale={document.locale}
        mergeFields={playgroundMergeFields}
        onChange={(nextDocument) => {
          setDocument(nextDocument)
          setStatus('Unsaved local changes.')
        }}
        onPreview={(nextDocument) => void preview(nextDocument)}
        onSave={(nextDocument) => void save(nextDocument)}
      />

      {previewHtml === null ? null : (
        <div
          aria-label="Document preview"
          aria-modal="true"
          className="playground-preview"
          role="dialog"
        >
          <header>
            <div>
              <span>Deterministic render</span>
              <strong>Document preview</strong>
              {previewHash === null ? null : (
                <code>{previewHash.slice(0, 16)}</code>
              )}
            </div>
            <button
              aria-label="Close preview"
              onClick={() => {
                setPreviewHtml(null)
                setPreviewHash(null)
              }}
              type="button"
            >
              ×
            </button>
          </header>
          <iframe
            sandbox=""
            srcDoc={previewHtml}
            title="Compiled Rudralipi document"
          />
        </div>
      )}
    </div>
  )
}
