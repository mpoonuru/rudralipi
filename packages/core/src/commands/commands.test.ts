import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from '../fixtures.js'
import { applyCommand, applyTransaction } from './apply.js'
import type { CommandContext } from './types.js'

function createContext(): CommandContext {
  let sequence = 0
  return {
    generateId: (prefix) => {
      sequence += 1
      return `${prefix}-${sequence}`
    },
    nowIso: () => '2026-07-25T12:00:00.000Z',
  }
}

describe('applyCommand', () => {
  it('inserts a node and returns an inverse that restores the document', () => {
    const original = createDocumentFixture()
    const context = createContext()
    const inserted = applyCommand(
      original,
      {
        type: 'node.insert',
        placement: {
          container: {
            kind: 'document',
          },
          index: 1,
        },
        node: {
          id: 'heading-inserted',
          type: 'heading',
          props: {
            level: 2,
            text: 'Inserted',
          },
        },
      },
      context,
    )

    expect(inserted.ok).toBe(true)
    if (!inserted.ok) {
      return
    }
    expect(inserted.value.document.content[1]?.id).toBe('heading-inserted')

    const restored = applyCommand(
      inserted.value.document,
      inserted.value.inverse,
      context,
    )
    expect(restored.ok).toBe(true)
    if (restored.ok) {
      expect(restored.value.document).toEqual(original)
    }
  })

  it('moves a node into a nested column and returns it to its original place', () => {
    const original = createDocumentFixture()
    const context = createContext()
    const moved = applyCommand(
      original,
      {
        type: 'node.move',
        nodeId: 'divider-1',
        placement: {
          container: {
            kind: 'column',
            blockId: 'columns-1',
            columnId: 'column-left',
          },
          index: 1,
        },
      },
      context,
    )

    expect(moved.ok).toBe(true)
    if (!moved.ok) {
      return
    }
    const columns = moved.value.document.content.find(
      ({ id }) => id === 'columns-1',
    )
    expect(columns?.type).toBe('columns')
    if (columns?.type === 'columns') {
      expect(columns.props.columns[0]?.content[1]?.id).toBe('divider-1')
    }

    const restored = applyCommand(
      moved.value.document,
      moved.value.inverse,
      context,
    )
    expect(restored.ok).toBe(true)
    if (restored.ok) {
      expect(restored.value.document).toEqual(original)
    }
  })

  it('rejects invalid property updates without changing the source document', () => {
    const original = createDocumentFixture()
    const snapshot = structuredClone(original)
    const result = applyCommand(
      original,
      {
        type: 'node.updateProps',
        nodeId: 'heading-1',
        props: {
          level: 1,
          text: 'Unsafe',
          className: 'fixed inset-0',
        },
      },
      createContext(),
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document.invalid',
        },
      ],
    })
    expect(original).toEqual(snapshot)
  })

  it('rolls back an entire transaction when one command fails', () => {
    const original = createDocumentFixture()
    const result = applyTransaction(
      original,
      [
        {
          type: 'node.remove',
          nodeId: 'spacer-1',
        },
        {
          type: 'node.remove',
          nodeId: 'missing-node',
        },
      ],
      createContext(),
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'command.node_not_found',
        },
      ],
    })
    expect(original.content.some(({ id }) => id === 'spacer-1')).toBe(true)
  })
})
