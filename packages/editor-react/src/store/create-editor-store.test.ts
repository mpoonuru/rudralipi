import { describe, expect, it, vi } from 'vitest'

import { createDocumentFixture, type CommandContext } from '@rudralipi/core'

import { createEditorStore } from './create-editor-store.js'

function context(): CommandContext {
  let sequence = 0

  return {
    generateId: (prefix) => {
      sequence += 1
      return `${prefix}-${sequence}`
    },
    nowIso: () => '2026-07-25T12:00:00.000Z',
  }
}

describe('createEditorStore', () => {
  it('isolates state and history for every editor instance', () => {
    const first = createEditorStore({
      document: createDocumentFixture(),
      context: context(),
    })
    const second = createEditorStore({
      document: createDocumentFixture(),
      context: context(),
    })

    first.getState().selectNode('heading-1')
    first.getState().execute({
      type: 'node.updateProps',
      nodeId: 'heading-1',
      props: {
        level: 2,
        text: 'Instance one',
      },
    })

    expect(first.getState().selectedNodeId).toBe('heading-1')
    expect(first.getState().document.content[1]).toMatchObject({
      props: { text: 'Instance one' },
    })
    expect(second.getState().selectedNodeId).toBeNull()
    expect(second.getState().document.content[1]).toMatchObject({
      props: { text: 'Document heading' },
    })
  })

  it('emits successful edits and exposes undo and redo state', () => {
    const onDocumentChange = vi.fn()
    const store = createEditorStore({
      document: createDocumentFixture(),
      context: context(),
      onDocumentChange,
    })

    const changed = store.getState().execute({
      type: 'node.remove',
      nodeId: 'spacer-1',
    })

    expect(changed.ok).toBe(true)
    expect(store.getState().canUndo).toBe(true)
    expect(onDocumentChange).toHaveBeenCalledOnce()

    store.getState().undo()
    expect(store.getState().canRedo).toBe(true)
    expect(
      store.getState().document.content.some(({ id }) => id === 'spacer-1'),
    ).toBe(true)

    store.getState().redo()
    expect(
      store.getState().document.content.some(({ id }) => id === 'spacer-1'),
    ).toBe(false)
    expect(onDocumentChange).toHaveBeenCalledTimes(3)
  })

  it('keeps a controlled external replacement out of local history', () => {
    const store = createEditorStore({
      document: createDocumentFixture(),
      context: context(),
    })
    const replacement = {
      ...createDocumentFixture(),
      metadata: {
        ...createDocumentFixture().metadata,
        title: 'Loaded document',
      },
    }

    store.getState().replaceDocument(replacement)

    expect(store.getState().document.metadata.title).toBe('Loaded document')
    expect(store.getState().canUndo).toBe(false)
    expect(store.getState().canRedo).toBe(false)
  })

  it('reports rejected commands without emitting a document', () => {
    const onDocumentChange = vi.fn()
    const store = createEditorStore({
      document: createDocumentFixture(),
      context: context(),
      onDocumentChange,
    })

    const rejected = store.getState().execute({
      type: 'node.remove',
      nodeId: 'missing',
    })

    expect(rejected.ok).toBe(false)
    expect(store.getState().diagnostics).toContainEqual(
      expect.objectContaining({ code: 'command.node_not_found' }),
    )
    expect(onDocumentChange).not.toHaveBeenCalled()
  })
})
