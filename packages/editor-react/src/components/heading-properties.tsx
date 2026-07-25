import type { ChangeEvent, ReactElement } from 'react'

import type { HeadingBlock } from '@rudralipi/core'
import type { Translator } from '@rudralipi/localization'

export interface HeadingPropertiesProps {
  readonly node: HeadingBlock
  readonly onChange: (props: HeadingBlock['props']) => void
  readonly translate: Translator
}

export function HeadingProperties({
  node,
  onChange,
  translate,
}: HeadingPropertiesProps): ReactElement {
  const updateText = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange({
      ...node.props,
      text: event.currentTarget.value,
    })
  }

  const updateLevel = (event: ChangeEvent<HTMLSelectElement>): void => {
    const level = Number(event.currentTarget.value)
    if (level < 1 || level > 6) {
      return
    }
    onChange({
      ...node.props,
      level: level as HeadingBlock['props']['level'],
    })
  }

  return (
    <div className="rudralipi-field-stack">
      <label className="rudralipi-field">
        <span>{translate('field.text')}</span>
        <input onChange={updateText} type="text" value={node.props.text} />
      </label>
      <label className="rudralipi-field">
        <span>{translate('field.level')}</span>
        <select onChange={updateLevel} value={node.props.level}>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              H{level}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
