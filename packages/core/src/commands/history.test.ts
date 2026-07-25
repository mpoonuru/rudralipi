import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from '../fixtures.js'
import { createHistory } from './history.js'
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

const insertedHeading = {
  id: 'heading-history',
  type: 'heading',
  props: {
    level: 2,
    text: 'History',
  },
} as const

describe('createHistory', () => {
  it('undoes and redoes an insertion without changing node identity', () => {
    const history = createHistory(createDocumentFixture(), {
      limit: 20,
      context: createContext(),
    })

    history.execute({
      type: 'node.insert',
      placement: {
        container: {
          kind: 'document',
        },
        index: 0,
      },
      node: insertedHeading,
    })
    expect(history.current.content[0]?.id).toBe('heading-history')

    history.undo()
    expect(
      history.current.content.some(({ id }) => id === 'heading-history'),
    ).toBe(false)

    history.redo()
    expect(history.current.content[0]?.id).toBe('heading-history')
  })

  it('clears redo entries after a new successful command', () => {
    const history = createHistory(createDocumentFixture(), {
      limit: 20,
      context: createContext(),
    })
    history.execute({
      type: 'node.remove',
      nodeId: 'spacer-1',
    })
    history.undo()
    expect(history.canRedo).toBe(true)

    history.execute({
      type: 'node.remove',
      nodeId: 'divider-1',
    })

    expect(history.canRedo).toBe(false)
  })

  it('retains only the configured number of transactions', () => {
    const history = createHistory(createDocumentFixture(), {
      limit: 1,
      context: createContext(),
    })
    history.execute({
      type: 'node.remove',
      nodeId: 'spacer-1',
    })
    history.execute({
      type: 'node.remove',
      nodeId: 'divider-1',
    })

    history.undo()
    expect(history.current.content.some(({ id }) => id === 'divider-1')).toBe(
      true,
    )
    history.undo()
    expect(history.current.content.some(({ id }) => id === 'spacer-1')).toBe(
      false,
    )
  })
})
