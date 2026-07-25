import { useSortable } from '@dnd-kit/react/sortable'
import type { ReactElement } from 'react'

import type { BlockNode } from '@rudralipi/core'

export interface BlockCardProps {
  readonly index: number
  readonly isFirst: boolean
  readonly isLast: boolean
  readonly label: string
  readonly node: BlockNode
  readonly onMoveDown: () => void
  readonly onMoveUp: () => void
  readonly onSelect: () => void
  readonly selected: boolean
  readonly summary: string
  readonly labels: {
    readonly drag: string
    readonly moveDown: string
    readonly moveUp: string
  }
}

export function BlockCard({
  index,
  isFirst,
  isLast,
  label,
  labels,
  node,
  onMoveDown,
  onMoveUp,
  onSelect,
  selected,
  summary,
}: BlockCardProps): ReactElement {
  const { handleRef, isDragging, ref } = useSortable({
    id: node.id,
    index,
  })

  const stateClasses = [
    selected ? 'is-selected' : '',
    isDragging ? 'is-dragging' : '',
  ]
    .filter((value) => value.length > 0)
    .join(' ')

  return (
    <article
      aria-label={`${label}: ${summary}`}
      className={`rudralipi-block ${stateClasses}`}
      data-testid={`block-${node.id}`}
      ref={ref}
    >
      <button
        aria-label={`${label}: ${summary}`}
        aria-pressed={selected}
        className="rudralipi-block__select"
        onClick={onSelect}
        type="button"
      >
        <span className="rudralipi-block__eyebrow">{label}</span>
        <span className="rudralipi-block__summary">{summary}</span>
      </button>
      <div className="rudralipi-block__actions">
        <button
          aria-label={labels.drag}
          className="rudralipi-icon-button rudralipi-block__handle"
          ref={handleRef}
          title={labels.drag}
          type="button"
        >
          ⠿
        </button>
        <button
          aria-label={labels.moveUp}
          className="rudralipi-icon-button"
          disabled={isFirst}
          onClick={onMoveUp}
          type="button"
        >
          ↑
        </button>
        <button
          aria-label={labels.moveDown}
          className="rudralipi-icon-button"
          disabled={isLast}
          onClick={onMoveDown}
          type="button"
        >
          ↓
        </button>
      </div>
    </article>
  )
}
