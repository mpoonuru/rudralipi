import {
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react'

import type {
  BlockNode,
  CommandContext,
  ConditionalExpression,
  ImageBlock,
  MergeFieldBlock,
  RichTextDocument,
  SignatureBlock,
  TableBlock,
} from '@rudralipi/core'
import type { Translator } from '@rudralipi/localization'
import type { RichTextEditorLabels } from '@rudralipi/rich-text-tiptap'

import { createBuiltInBlock } from '../block-factory.js'
import { LazyRichTextEditor } from './lazy-rich-text-editor.js'

export interface EditorAssetOption {
  readonly id: string
  readonly label: string
}

export interface EditorMergeFieldOption {
  readonly key: string
  readonly label: string
}

export interface BlockPropertiesProps {
  readonly assets: ReadonlyArray<EditorAssetOption>
  readonly context: CommandContext
  readonly mergeFields: ReadonlyArray<EditorMergeFieldOption>
  readonly node: BlockNode
  readonly onChange: (props: BlockNode['props']) => void
  readonly translate: Translator
}

interface FieldProps {
  readonly children: ReactNode
  readonly label: string
}

function Field({ children, label }: FieldProps): ReactElement {
  return (
    <label className="rudralipi-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NonEmptyTextField({
  label,
  onChange,
  value,
}: {
  readonly label: string
  readonly onChange: (value: string) => void
  readonly value: string
}): ReactElement {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <Field label={label}>
      <input
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          setDraft(nextValue)
          if (nextValue.trim().length > 0) {
            onChange(nextValue)
          }
        }}
        onBlur={() => {
          if (draft.trim().length === 0) {
            setDraft(value)
          }
        }}
        type="text"
        value={draft}
      />
    </Field>
  )
}

function emptyParagraph(text = ''): RichTextDocument {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text.length === 0 ? [] : [{ type: 'text', text }],
      },
    ],
  }
}

function richTextLabels(translate: Translator): RichTextEditorLabels {
  return {
    bold: translate('toolbar.bold'),
    bulletList: translate('toolbar.bulletList'),
    code: translate('toolbar.code'),
    italic: translate('toolbar.italic'),
    orderedList: translate('toolbar.orderedList'),
    strike: translate('toolbar.strike'),
    subscript: translate('toolbar.subscript'),
    superscript: translate('toolbar.superscript'),
    underline: translate('toolbar.underline'),
  }
}

function NestedContentEditor({
  content,
  context,
  label,
  onChange,
  translate,
}: {
  readonly content: ReadonlyArray<BlockNode>
  readonly context: CommandContext
  readonly label: string
  readonly onChange: (content: ReadonlyArray<BlockNode>) => void
  readonly translate: Translator
}): ReactElement {
  const move = (from: number, to: number): void => {
    if (to < 0 || to >= content.length) {
      return
    }
    const next = [...content]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) {
      return
    }
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <section aria-label={label} className="rudralipi-property-card">
      <strong className="rudralipi-property-card__title">{label}</strong>
      {content.map((node, index) => (
        <div className="rudralipi-nested-block" key={node.id}>
          {node.type === 'heading' ? (
            <Field label={`${translate('block.heading')} ${index + 1}`}>
              <input
                onChange={(event) =>
                  onChange(
                    content.map((candidate) =>
                      candidate.id === node.id
                        ? {
                            ...node,
                            props: {
                              ...node.props,
                              text: event.currentTarget.value,
                            },
                          }
                        : candidate,
                    ),
                  )
                }
                type="text"
                value={node.props.text}
              />
            </Field>
          ) : null}
          {node.type === 'richText' ? (
            <LazyRichTextEditor
              ariaLabel={`${translate('block.richText')} ${index + 1}`}
              labels={richTextLabels(translate)}
              onChange={(value) =>
                onChange(
                  content.map((candidate) =>
                    candidate.id === node.id
                      ? {
                          ...node,
                          props: {
                            content: value,
                          },
                        }
                      : candidate,
                  ),
                )
              }
              value={node.props.content}
            />
          ) : null}
          {node.type !== 'heading' && node.type !== 'richText' ? (
            <code>{node.type}</code>
          ) : null}
          <div className="rudralipi-inline-actions">
            <button
              aria-label={translate('action.moveUp')}
              className="rudralipi-icon-button"
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
              type="button"
            >
              ↑
            </button>
            <button
              aria-label={translate('action.moveDown')}
              className="rudralipi-icon-button"
              disabled={index === content.length - 1}
              onClick={() => move(index, index + 1)}
              type="button"
            >
              ↓
            </button>
            <button
              aria-label={`${translate('action.delete')} ${index + 1}`}
              className="rudralipi-icon-button"
              onClick={() =>
                onChange(content.filter(({ id }) => id !== node.id))
              }
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <div className="rudralipi-inline-actions">
        {(['heading', 'richText'] as const).map((type) => (
          <button
            className="rudralipi-button rudralipi-button--secondary"
            key={type}
            onClick={() =>
              onChange([...content, createBuiltInBlock(type, context)])
            }
            type="button"
          >
            {translate('action.add')} {translate(blockMessageKey(type))}
          </button>
        ))}
      </div>
    </section>
  )
}

function blockMessageKey(
  type: 'heading' | 'richText',
): 'block.heading' | 'block.richText' {
  return type === 'heading' ? 'block.heading' : 'block.richText'
}

function CatalogField({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string
  readonly onChange: (value: string) => void
  readonly options: ReadonlyArray<{
    readonly id: string
    readonly label: string
  }>
  readonly value: string
}): ReactElement {
  if (options.length === 0) {
    return <NonEmptyTextField label={label} onChange={onChange} value={value} />
  }

  const includesValue = options.some(({ id }) => id === value)
  return (
    <Field label={label}>
      <select
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {includesValue ? null : <option value={value}>{value}</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function ImageProperties({
  assets,
  node,
  onChange,
  translate,
}: {
  readonly assets: ReadonlyArray<EditorAssetOption>
  readonly node: ImageBlock
  readonly onChange: (props: ImageBlock['props']) => void
  readonly translate: Translator
}): ReactElement {
  const update = (
    key: keyof ImageBlock['props'],
    value: ImageBlock['props'][keyof ImageBlock['props']],
  ): void => {
    onChange({ ...node.props, [key]: value })
  }

  return (
    <div className="rudralipi-field-stack">
      <CatalogField
        label={translate('field.asset')}
        onChange={(value) => update('assetId', value)}
        options={assets}
        value={node.props.assetId}
      />
      <Field label={translate('field.alt')}>
        <input
          onChange={(event) => update('alt', event.currentTarget.value)}
          type="text"
          value={node.props.alt}
        />
      </Field>
      <Field label={translate('field.width')}>
        <select
          onChange={(event) =>
            update(
              'width',
              event.currentTarget.value as ImageBlock['props']['width'],
            )
          }
          value={node.props.width}
        >
          {['auto', '25%', '50%', '75%', '100%'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field label={translate('field.fit')}>
        <select
          onChange={(event) =>
            update(
              'fit',
              event.currentTarget.value as ImageBlock['props']['fit'],
            )
          }
          value={node.props.fit}
        >
          <option value="contain">contain</option>
          <option value="cover">cover</option>
        </select>
      </Field>
      <Field label={translate('field.alignment')}>
        <select
          onChange={(event) =>
            update(
              'alignment',
              event.currentTarget.value as ImageBlock['props']['alignment'],
            )
          }
          value={node.props.alignment}
        >
          <option value="start">start</option>
          <option value="center">center</option>
          <option value="end">end</option>
        </select>
      </Field>
    </div>
  )
}

function MergeFieldProperties({
  mergeFields,
  node,
  onChange,
  translate,
}: {
  readonly mergeFields: ReadonlyArray<EditorMergeFieldOption>
  readonly node: MergeFieldBlock
  readonly onChange: (props: MergeFieldBlock['props']) => void
  readonly translate: Translator
}): ReactElement {
  return (
    <div className="rudralipi-field-stack">
      <CatalogField
        label={translate('field.mergeField')}
        onChange={(field) => onChange({ ...node.props, field })}
        options={mergeFields.map(({ key, label }) => ({ id: key, label }))}
        value={node.props.field}
      />
      <Field label={translate('field.fallback')}>
        <input
          onChange={(event) =>
            onChange({ ...node.props, fallback: event.currentTarget.value })
          }
          type="text"
          value={node.props.fallback ?? ''}
        />
      </Field>
      <Field label={translate('field.format')}>
        <select
          onChange={(event) =>
            onChange({
              ...node.props,
              format: event.currentTarget
                .value as MergeFieldBlock['props']['format'],
            })
          }
          value={node.props.format}
        >
          {['plain', 'short', 'long', 'currency'].map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function TableProperties({
  context,
  node,
  onChange,
  translate,
}: {
  readonly context: CommandContext
  readonly node: TableBlock
  readonly onChange: (props: TableBlock['props']) => void
  readonly translate: Translator
}): ReactElement {
  const addRow = (): void => {
    onChange({
      ...node.props,
      rows: [
        ...node.props.rows,
        {
          id: context.generateId('row'),
          cells: node.props.columns.map(({ id }) => ({
            columnId: id,
            content: emptyParagraph(),
          })),
        },
      ],
    })
  }

  const addColumn = (): void => {
    const id = context.generateId('column')
    onChange({
      ...node.props,
      columns: [
        ...node.props.columns,
        {
          id,
          header: `Column ${node.props.columns.length + 1}`,
        },
      ],
      rows: node.props.rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells,
          {
            columnId: id,
            content: emptyParagraph(),
          },
        ],
      })),
    })
  }

  return (
    <div className="rudralipi-field-stack">
      <label className="rudralipi-check-field">
        <input
          checked={node.props.repeatHeader}
          onChange={(event) =>
            onChange({
              ...node.props,
              repeatHeader: event.currentTarget.checked,
            })
          }
          type="checkbox"
        />
        <span>{translate('field.repeatHeader')}</span>
      </label>
      <label className="rudralipi-check-field">
        <input
          checked={node.props.allowRowSplit}
          onChange={(event) =>
            onChange({
              ...node.props,
              allowRowSplit: event.currentTarget.checked,
            })
          }
          type="checkbox"
        />
        <span>{translate('field.allowRowSplit')}</span>
      </label>
      <div className="rudralipi-property-group">
        {node.props.columns.map((column, index) => (
          <div className="rudralipi-property-row" key={column.id}>
            <Field label={`${translate('field.columnHeader')} ${index + 1}`}>
              <input
                onChange={(event) =>
                  onChange({
                    ...node.props,
                    columns: node.props.columns.map((candidate) =>
                      candidate.id === column.id
                        ? { ...candidate, header: event.currentTarget.value }
                        : candidate,
                    ),
                  })
                }
                type="text"
                value={column.header}
              />
            </Field>
            <button
              aria-label={`${translate('action.removeColumn')} ${index + 1}`}
              className="rudralipi-icon-button"
              disabled={node.props.columns.length === 1}
              onClick={() =>
                onChange({
                  ...node.props,
                  columns: node.props.columns.filter(
                    ({ id }) => id !== column.id,
                  ),
                  rows: node.props.rows.map((row) => ({
                    ...row,
                    cells: row.cells.filter(
                      ({ columnId }) => columnId !== column.id,
                    ),
                  })),
                })
              }
              type="button"
            >
              −
            </button>
          </div>
        ))}
      </div>
      <div className="rudralipi-inline-actions">
        <button
          className="rudralipi-button rudralipi-button--secondary"
          onClick={addColumn}
          type="button"
        >
          {translate('action.addColumn')}
        </button>
        <button
          className="rudralipi-button rudralipi-button--secondary"
          onClick={addRow}
          type="button"
        >
          {translate('action.addRow')}
        </button>
      </div>
      <div className="rudralipi-property-group">
        {node.props.rows.map((row, index) => (
          <div className="rudralipi-property-card" key={row.id}>
            <div className="rudralipi-property-row">
              <strong>
                {translate('field.rows')} {index + 1}
              </strong>
              <button
                aria-label={`${translate('action.removeRow')} ${index + 1}`}
                className="rudralipi-icon-button"
                onClick={() =>
                  onChange({
                    ...node.props,
                    rows: node.props.rows.filter(({ id }) => id !== row.id),
                  })
                }
                type="button"
              >
                −
              </button>
            </div>
            {row.cells.map((cell) => {
              const column = node.props.columns.find(
                ({ id }) => id === cell.columnId,
              )
              return (
                <LazyRichTextEditor
                  ariaLabel={`${column?.header ?? cell.columnId} ${index + 1}`}
                  key={cell.columnId}
                  labels={richTextLabels(translate)}
                  onChange={(content) =>
                    onChange({
                      ...node.props,
                      rows: node.props.rows.map((candidateRow) =>
                        candidateRow.id === row.id
                          ? {
                              ...candidateRow,
                              cells: candidateRow.cells.map((candidateCell) =>
                                candidateCell.columnId === cell.columnId
                                  ? { ...candidateCell, content }
                                  : candidateCell,
                              ),
                            }
                          : candidateRow,
                      ),
                    })
                  }
                  value={cell.content}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function SignatureProperties({
  assets,
  context,
  mergeFields,
  node,
  onChange,
  translate,
}: {
  readonly assets: ReadonlyArray<EditorAssetOption>
  readonly context: CommandContext
  readonly mergeFields: ReadonlyArray<EditorMergeFieldOption>
  readonly node: SignatureBlock
  readonly onChange: (props: SignatureBlock['props']) => void
  readonly translate: Translator
}): ReactElement {
  const updateLine = (
    id: string,
    update: (
      line: SignatureBlock['props']['lines'][number],
    ) => SignatureBlock['props']['lines'][number],
  ): void => {
    onChange({
      ...node.props,
      lines: node.props.lines.map((line) =>
        line.id === id ? update(line) : line,
      ),
    })
  }

  return (
    <div className="rudralipi-field-stack">
      <Field label={translate('field.layout')}>
        <select
          onChange={(event) =>
            onChange({
              ...node.props,
              layout: event.currentTarget
                .value as SignatureBlock['props']['layout'],
            })
          }
          value={node.props.layout}
        >
          <option value="stacked">stacked</option>
          <option value="sideBySide">sideBySide</option>
        </select>
      </Field>
      {node.props.lines.map((line, index) => (
        <div className="rudralipi-property-card" key={line.id}>
          <NonEmptyTextField
            label={translate('field.signatureLabel')}
            onChange={(label) =>
              updateLine(line.id, (candidate) => ({
                ...candidate,
                label,
              }))
            }
            value={line.label}
          />
          <CatalogField
            label={translate('field.signerField')}
            onChange={(signerField) =>
              updateLine(line.id, (candidate) => ({
                ...candidate,
                signerField,
              }))
            }
            options={mergeFields.map(({ key, label }) => ({ id: key, label }))}
            value={line.signerField ?? ''}
          />
          <CatalogField
            label={translate('field.imageAsset')}
            onChange={(imageAssetId) =>
              updateLine(line.id, (candidate) => ({
                ...candidate,
                imageAssetId,
              }))
            }
            options={assets}
            value={line.imageAssetId ?? ''}
          />
          <button
            aria-label={`${translate('action.removeSignatureLine')} ${index + 1}`}
            className="rudralipi-button rudralipi-button--danger"
            disabled={node.props.lines.length === 1}
            onClick={() =>
              onChange({
                ...node.props,
                lines: node.props.lines.filter(({ id }) => id !== line.id),
              })
            }
            type="button"
          >
            {translate('action.removeSignatureLine')}
          </button>
        </div>
      ))}
      <button
        className="rudralipi-button rudralipi-button--secondary"
        onClick={() =>
          onChange({
            ...node.props,
            lines: [
              ...node.props.lines,
              {
                id: context.generateId('signature-line'),
                label: translate('block.signature'),
              },
            ],
          })
        }
        type="button"
      >
        {translate('action.addSignatureLine')}
      </button>
    </div>
  )
}

function leafCondition(
  expression: ConditionalExpression,
): Extract<ConditionalExpression, { field: string }> {
  if ('field' in expression) {
    return expression
  }
  return {
    op: 'exists',
    field: 'document.reference',
  }
}

function conditionForOperator(
  operator: ConditionalExpression['op'],
  current: ConditionalExpression,
): ConditionalExpression {
  const leaf = leafCondition(current)
  switch (operator) {
    case 'exists':
    case 'isEmpty':
      return { op: operator, field: leaf.field }
    case 'equals':
    case 'notEquals':
      return {
        op: operator,
        field: leaf.field,
        value: 'value' in leaf ? leaf.value : '',
      }
    case 'greaterThan':
    case 'greaterThanOrEqual':
    case 'lessThan':
      return {
        op: operator,
        field: leaf.field,
        value:
          'value' in leaf && typeof leaf.value === 'number' ? leaf.value : 0,
      }
    case 'all':
    case 'any':
      return {
        op: operator,
        conditions: [leaf],
      }
    case 'not':
      return {
        op: operator,
        condition: leaf,
      }
  }
}

function ConditionEditor({
  expression,
  onChange,
  translate,
}: {
  readonly expression: ConditionalExpression
  readonly onChange: (expression: ConditionalExpression) => void
  readonly translate: Translator
}): ReactElement {
  const leaf = leafCondition(expression)

  return (
    <div className="rudralipi-condition-editor">
      <Field label={translate('field.conditionOperator')}>
        <select
          onChange={(event) =>
            onChange(
              conditionForOperator(
                event.currentTarget.value as ConditionalExpression['op'],
                expression,
              ),
            )
          }
          value={expression.op}
        >
          {[
            'exists',
            'equals',
            'notEquals',
            'greaterThan',
            'greaterThanOrEqual',
            'lessThan',
            'isEmpty',
            'all',
            'any',
            'not',
          ].map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>
      </Field>
      {'field' in expression ? (
        <NonEmptyTextField
          label={translate('field.conditionField')}
          onChange={(field) => onChange({ ...expression, field })}
          value={leaf.field}
        />
      ) : null}
      {'value' in expression ? (
        <Field label={translate('field.conditionValue')}>
          <input
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              if (
                expression.op === 'greaterThan' ||
                expression.op === 'greaterThanOrEqual' ||
                expression.op === 'lessThan'
              ) {
                onChange({
                  ...expression,
                  value: Number(event.currentTarget.value),
                })
                return
              }
              const textualExpression = expression as Extract<
                ConditionalExpression,
                { op: 'equals' | 'notEquals' }
              >
              onChange({
                ...textualExpression,
                value: event.currentTarget.value,
              })
            }}
            type={typeof expression.value === 'number' ? 'number' : 'text'}
            value={expression.value === null ? '' : String(expression.value)}
          />
        </Field>
      ) : null}
      {expression.op === 'all' || expression.op === 'any' ? (
        <div className="rudralipi-property-group">
          {expression.conditions.map((condition, index) => (
            <div className="rudralipi-property-card" key={index}>
              <ConditionEditor
                expression={condition}
                onChange={(nextCondition) =>
                  onChange({
                    ...expression,
                    conditions: expression.conditions.map(
                      (candidate, candidateIndex) =>
                        candidateIndex === index ? nextCondition : candidate,
                    ),
                  })
                }
                translate={translate}
              />
              <button
                aria-label={`${translate('action.delete')} ${translate('field.condition')} ${index + 1}`}
                className="rudralipi-button rudralipi-button--danger"
                disabled={expression.conditions.length === 1}
                onClick={() =>
                  onChange({
                    ...expression,
                    conditions: expression.conditions.filter(
                      (_, candidateIndex) => candidateIndex !== index,
                    ),
                  })
                }
                type="button"
              >
                {translate('action.delete')}
              </button>
            </div>
          ))}
          <button
            className="rudralipi-button rudralipi-button--secondary"
            onClick={() =>
              onChange({
                ...expression,
                conditions: [
                  ...expression.conditions,
                  {
                    op: 'exists',
                    field: 'document.reference',
                  },
                ],
              })
            }
            type="button"
          >
            {translate('action.add')} {translate('field.condition')}
          </button>
        </div>
      ) : null}
      {expression.op === 'not' ? (
        <div className="rudralipi-property-card">
          <ConditionEditor
            expression={expression.condition}
            onChange={(condition) => onChange({ ...expression, condition })}
            translate={translate}
          />
        </div>
      ) : null}
    </div>
  )
}

function ConditionalProperties({
  context,
  node,
  onChange,
  translate,
}: {
  readonly node: Extract<BlockNode, { type: 'conditional' }>
  readonly context: CommandContext
  readonly onChange: (
    props: Extract<BlockNode, { type: 'conditional' }>['props'],
  ) => void
  readonly translate: Translator
}): ReactElement {
  const updateCondition = (next: ConditionalExpression): void =>
    onChange({ ...node.props, condition: next })

  return (
    <div className="rudralipi-field-stack">
      <ConditionEditor
        expression={node.props.condition}
        onChange={updateCondition}
        translate={translate}
      />
      <NestedContentEditor
        content={node.props.content}
        context={context}
        label={translate('field.trueContent')}
        onChange={(content) => onChange({ ...node.props, content })}
        translate={translate}
      />
      <NestedContentEditor
        content={node.props.otherwise}
        context={context}
        label={translate('field.falseContent')}
        onChange={(otherwise) => onChange({ ...node.props, otherwise })}
        translate={translate}
      />
    </div>
  )
}

export function BlockProperties({
  assets,
  context,
  mergeFields,
  node,
  onChange,
  translate,
}: BlockPropertiesProps): ReactElement | null {
  switch (node.type) {
    case 'image':
      return (
        <ImageProperties
          assets={assets}
          node={node}
          onChange={onChange}
          translate={translate}
        />
      )
    case 'mergeField':
      return (
        <MergeFieldProperties
          mergeFields={mergeFields}
          node={node}
          onChange={onChange}
          translate={translate}
        />
      )
    case 'table':
      return (
        <TableProperties
          context={context}
          node={node}
          onChange={onChange}
          translate={translate}
        />
      )
    case 'columns':
      return (
        <div className="rudralipi-field-stack">
          <Field label={translate('field.gap')}>
            <select
              onChange={(event) =>
                onChange({
                  ...node.props,
                  gap: event.currentTarget.value as typeof node.props.gap,
                })
              }
              value={node.props.gap}
            >
              {['none', 'sm', 'md', 'lg'].map((gap) => (
                <option key={gap} value={gap}>
                  {gap}
                </option>
              ))}
            </select>
          </Field>
          {node.props.columns.map((column, index) => (
            <div className="rudralipi-property-card" key={column.id}>
              <Field label={`${translate('field.columnWidth')} ${index + 1}`}>
                <input
                  max="1"
                  min="0.01"
                  onChange={(event) =>
                    onChange({
                      ...node.props,
                      columns: node.props.columns.map((candidate) =>
                        candidate.id === column.id
                          ? {
                              ...candidate,
                              width: Number(event.currentTarget.value),
                            }
                          : candidate,
                      ),
                    })
                  }
                  step="0.01"
                  type="number"
                  value={column.width}
                />
              </Field>
              <NestedContentEditor
                content={column.content}
                context={context}
                label={`${translate('field.columns')} ${index + 1}`}
                onChange={(content) =>
                  onChange({
                    ...node.props,
                    columns: node.props.columns.map((candidate) =>
                      candidate.id === column.id
                        ? { ...candidate, content }
                        : candidate,
                    ),
                  })
                }
                translate={translate}
              />
            </div>
          ))}
        </div>
      )
    case 'divider':
      return (
        <div className="rudralipi-field-stack">
          <Field label={translate('field.variant')}>
            <select
              onChange={(event) =>
                onChange({
                  ...node.props,
                  variant: event.currentTarget
                    .value as typeof node.props.variant,
                })
              }
              value={node.props.variant}
            >
              {['solid', 'dashed', 'dotted'].map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </Field>
          <Field label={translate('field.weight')}>
            <select
              onChange={(event) =>
                onChange({
                  ...node.props,
                  weight: event.currentTarget.value as typeof node.props.weight,
                })
              }
              value={node.props.weight}
            >
              {['thin', 'medium', 'thick'].map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )
    case 'spacer':
      return (
        <Field label={translate('field.size')}>
          <select
            onChange={(event) =>
              onChange({
                ...node.props,
                size: event.currentTarget.value as typeof node.props.size,
              })
            }
            value={node.props.size}
          >
            {['xs', 'sm', 'md', 'lg', 'xl'].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Field>
      )
    case 'header':
      return (
        <div className="rudralipi-field-stack">
          <Field label={translate('field.repeat')}>
            <select
              onChange={(event) =>
                onChange({
                  ...node.props,
                  repeat: event.currentTarget.value as typeof node.props.repeat,
                })
              }
              value={node.props.repeat}
            >
              {['all', 'exceptFirst', 'firstOnly'].map((repeat) => (
                <option key={repeat} value={repeat}>
                  {repeat}
                </option>
              ))}
            </select>
          </Field>
          <NestedContentEditor
            content={node.props.content}
            context={context}
            label={translate('block.header')}
            onChange={(content) => onChange({ ...node.props, content })}
            translate={translate}
          />
        </div>
      )
    case 'footer':
      return (
        <div className="rudralipi-field-stack">
          <Field label={translate('field.repeat')}>
            <select
              onChange={(event) =>
                onChange({
                  ...node.props,
                  repeat: event.currentTarget.value as typeof node.props.repeat,
                })
              }
              value={node.props.repeat}
            >
              {['all', 'exceptFirst', 'firstOnly'].map((repeat) => (
                <option key={repeat} value={repeat}>
                  {repeat}
                </option>
              ))}
            </select>
          </Field>
          <label className="rudralipi-check-field">
            <input
              checked={node.props.showPageNumber}
              onChange={(event) =>
                onChange({
                  ...node.props,
                  showPageNumber: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            <span>{translate('field.showPageNumber')}</span>
          </label>
          <NestedContentEditor
            content={node.props.content}
            context={context}
            label={translate('block.footer')}
            onChange={(content) => onChange({ ...node.props, content })}
            translate={translate}
          />
        </div>
      )
    case 'signature':
      return (
        <SignatureProperties
          assets={assets}
          context={context}
          mergeFields={mergeFields}
          node={node}
          onChange={onChange}
          translate={translate}
        />
      )
    case 'conditional':
      return (
        <ConditionalProperties
          context={context}
          node={node}
          onChange={onChange}
          translate={translate}
        />
      )
    case 'pageBreak':
    case 'heading':
    case 'richText':
      return null
    default:
      return null
  }
}
