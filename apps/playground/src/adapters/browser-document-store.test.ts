import { beforeEach, describe, expect, it } from 'vitest'

import { createDocumentFixture } from '@rudralipi/core'

import { createBrowserDocumentStore } from './browser-document-store.js'

class TestStorage {
  readonly #values = new Map<string, string>()

  clear(): void {
    this.#values.clear()
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }
}

describe('browser document store adapter', () => {
  const storage = new TestStorage()

  beforeEach(() => {
    storage.clear()
  })

  it('saves and reloads a validated Rudralipi document', async () => {
    const adapter = createBrowserDocumentStore(storage)
    const document = createDocumentFixture()

    const saved = await adapter.save(document)
    const loaded = await adapter.load()

    expect(saved.ok).toBe(true)
    expect(loaded).toEqual({
      ok: true,
      value: document,
      diagnostics: [],
    })
  })

  it('rejects corrupted or untrusted stored JSON', async () => {
    storage.setItem('rudralipi.playground.document', '{"content":[]}')
    const loaded = await createBrowserDocumentStore(storage).load()

    expect(loaded.ok).toBe(false)
    expect(loaded.diagnostics).not.toHaveLength(0)
  })
})
