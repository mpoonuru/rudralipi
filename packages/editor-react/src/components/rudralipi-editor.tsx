import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'
import { useEffect, useRef, type ReactElement } from 'react'
import { useStore } from 'zustand'

import type {
  BlockNode,
  CommandContext,
  RudralipiDocument,
  SupportedLocale,
} from '@rudralipi/core'
import {
  createTranslator,
  type MessageKey,
  type TranslatorOverrides,
} from '@rudralipi/localization'

import {
  builtInBlockTypes,
  createBuiltInBlock,
  type BuiltInBlockType,
} from '../block-factory.js'
import {
  createEditorStore,
  type EditorStore,
} from '../store/create-editor-store.js'
import { BlockCard } from './block-card.js'
import {
  BlockProperties,
  type EditorAssetOption,
  type EditorMergeFieldOption,
} from './block-properties.js'
import { HeadingProperties } from './heading-properties.js'
import { LazyRichTextEditor } from './lazy-rich-text-editor.js'

const blockMessageKeys: Readonly<Record<BuiltInBlockType, MessageKey>> = {
  heading: 'block.heading',
  richText: 'block.richText',
  image: 'block.image',
  mergeField: 'block.mergeField',
  table: 'block.table',
  columns: 'block.columns',
  divider: 'block.divider',
  spacer: 'block.spacer',
  header: 'block.header',
  footer: 'block.footer',
  signature: 'block.signature',
  conditional: 'block.conditional',
  pageBreak: 'block.pageBreak',
}

export interface RudralipiEditorProps {
  readonly assets?: ReadonlyArray<EditorAssetOption>
  readonly context: CommandContext
  readonly document: RudralipiDocument
  readonly locale?: SupportedLocale
  readonly mergeFields?: ReadonlyArray<EditorMergeFieldOption>
  readonly onChange: (document: RudralipiDocument) => void
  readonly onPreview?: (document: RudralipiDocument) => void
  readonly onSave?: (document: RudralipiDocument) => void
  readonly translations?: TranslatorOverrides
}

function blockTypeLabel(
  node: BlockNode,
  translate: ReturnType<typeof createTranslator>,
): string {
  const key = blockMessageKeys[node.type as BuiltInBlockType]
  return key === undefined ? translate('block.unknown') : translate(key)
}

function richTextSummary(node: BlockNode): string {
  if (node.type !== 'richText') {
    return ''
  }

  return node.props.content.content
    .flatMap((block) =>
      block.type === 'paragraph'
        ? block.content
        : block.content.flatMap((item) =>
            item.content.flatMap((paragraph) => paragraph.content),
          ),
    )
    .map((inline) => (inline.type === 'text' ? inline.text : ' '))
    .join('')
    .trim()
}

function blockSummary(
  node: BlockNode,
  translate: ReturnType<typeof createTranslator>,
): string {
  switch (node.type) {
    case 'heading':
      return node.props.text
    case 'richText':
      return richTextSummary(node) || translate('block.richText')
    case 'image':
      return node.props.alt
    case 'mergeField':
      return node.props.field
    case 'table':
      return `${node.props.columns.length} × ${node.props.rows.length}`
    case 'columns':
      return String(node.props.columns.length)
    case 'divider':
      return `${node.props.variant} · ${node.props.weight}`
    case 'spacer':
      return node.props.size
    case 'header':
    case 'footer':
      return node.props.repeat
    case 'signature':
      return node.props.lines.map(({ label }) => label).join(', ')
    case 'conditional':
      return 'field' in node.props.condition
        ? node.props.condition.field
        : node.props.condition.op
    case 'pageBreak':
      return translate('block.pageBreak')
    default:
      return node.type
  }
}

function useEditorStore(props: RudralipiEditorProps): EditorStore {
  const onChangeRef = useRef(props.onChange)
  const externalDocumentRef = useRef(props.document)
  const storeRef = useRef<EditorStore | null>(null)
  onChangeRef.current = props.onChange

  if (storeRef.current === null) {
    storeRef.current = createEditorStore({
      context: props.context,
      document: props.document,
      ...(props.locale === undefined ? {} : { locale: props.locale }),
      onDocumentChange: (nextDocument) => {
        externalDocumentRef.current = nextDocument
        onChangeRef.current(nextDocument)
      },
    })
  }

  useEffect(() => {
    if (props.document !== externalDocumentRef.current) {
      externalDocumentRef.current = props.document
      storeRef.current?.getState().replaceDocument(props.document)
    }
  }, [props.document])

  useEffect(() => {
    if (props.locale !== undefined) {
      storeRef.current?.getState().setLocale(props.locale)
    }
  }, [props.locale])

  return storeRef.current
}

function PropertiesPanel({
  assets,
  context,
  mergeFields,
  selected,
  store,
  translate,
}: {
  readonly assets: ReadonlyArray<EditorAssetOption>
  readonly context: CommandContext
  readonly mergeFields: ReadonlyArray<EditorMergeFieldOption>
  readonly selected: BlockNode | undefined
  readonly store: EditorStore
  readonly translate: ReturnType<typeof createTranslator>
}): ReactElement {
  if (selected === undefined) {
    return (
      <p className="rudralipi-empty-state">{translate('status.noSelection')}</p>
    )
  }

  const updateProps = (props: unknown): void => {
    store.getState().execute({
      type: 'node.updateProps',
      nodeId: selected.id,
      props,
    })
  }

  return (
    <div className="rudralipi-properties__content">
      <div className="rudralipi-properties__identity">
        <span>{blockTypeLabel(selected, translate)}</span>
        <code>{selected.id}</code>
      </div>
      {selected.type === 'heading' ? (
        <HeadingProperties
          node={selected}
          onChange={updateProps}
          translate={translate}
        />
      ) : null}
      {selected.type === 'richText' ? (
        <LazyRichTextEditor
          ariaLabel={translate('block.richText')}
          labels={{
            bold: translate('toolbar.bold'),
            bulletList: translate('toolbar.bulletList'),
            code: translate('toolbar.code'),
            italic: translate('toolbar.italic'),
            orderedList: translate('toolbar.orderedList'),
            strike: translate('toolbar.strike'),
            subscript: translate('toolbar.subscript'),
            superscript: translate('toolbar.superscript'),
            underline: translate('toolbar.underline'),
          }}
          onChange={(content) => {
            store.getState().execute({
              type: 'richText.replace',
              nodeId: selected.id,
              content,
            })
          }}
          value={selected.props.content}
        />
      ) : null}
      <BlockProperties
        assets={assets}
        context={context}
        mergeFields={mergeFields}
        node={selected}
        onChange={updateProps}
        translate={translate}
      />
      {selected.type === 'pageBreak' ||
      blockMessageKeys[selected.type as BuiltInBlockType] === undefined ? (
        <p className="rudralipi-empty-state">
          {blockSummary(selected, translate)}
        </p>
      ) : null}
      <div className="rudralipi-properties__actions">
        <button
          className="rudralipi-button rudralipi-button--secondary"
          onClick={() => {
            store.getState().execute({
              type: 'node.duplicate',
              nodeId: selected.id,
            })
          }}
          type="button"
        >
          {translate('action.duplicate')}
        </button>
        <button
          className="rudralipi-button rudralipi-button--danger"
          onClick={() => {
            const result = store.getState().execute({
              type: 'node.remove',
              nodeId: selected.id,
            })
            if (result.ok) {
              store.getState().selectNode(null)
            }
          }}
          type="button"
        >
          {translate('action.delete')}
        </button>
      </div>
    </div>
  )
}

export function RudralipiEditor(props: RudralipiEditorProps): ReactElement {
  const store = useEditorStore(props)
  const state = useStore(store, (snapshot) => snapshot)
  const translate = createTranslator(state.locale, props.translations)
  const selected = state.document.content.find(
    ({ id }) => id === state.selectedNodeId,
  )

  const move = (node: BlockNode, from: number, to: number): void => {
    if (to < 0 || to >= state.document.content.length || from === to) {
      return
    }
    const result = store.getState().execute({
      type: 'node.move',
      nodeId: node.id,
      placement: {
        container: { kind: 'document' },
        index: to,
      },
    })
    if (result.ok) {
      store.getState().setAnnouncement(
        translate('status.blockMoved', {
          values: {
            block: blockTypeLabel(node, translate),
            position: to + 1,
          },
        }),
      )
    }
  }

  const handleDragEnd = ({ canceled, operation }: DragEndEvent): void => {
    const { source } = operation
    if (
      canceled ||
      source === null ||
      source === undefined ||
      !isSortable(source)
    ) {
      return
    }
    const node = state.document.content[source.initialIndex]
    if (node !== undefined) {
      move(node, source.initialIndex, source.index)
    }
  }

  return (
    <section
      aria-label={translate('a11y.editorLabel')}
      className="rudralipi-editor"
      lang={state.locale}
      role="application"
    >
      <header className="rudralipi-command-rail">
        <div className="rudralipi-brand">
          <span aria-hidden="true" className="rudralipi-brand__mark">
            रु
          </span>
          <div>
            <strong>{translate('app.title')}</strong>
            <span>{state.document.metadata.title}</span>
          </div>
        </div>
        <nav
          aria-label={translate('a11y.editorLabel')}
          className="rudralipi-command-rail__actions"
        >
          <button
            aria-label={translate('toolbar.undo')}
            className="rudralipi-icon-button"
            disabled={!state.canUndo}
            onClick={() => store.getState().undo()}
            type="button"
          >
            ↶
          </button>
          <button
            aria-label={translate('toolbar.redo')}
            className="rudralipi-icon-button"
            disabled={!state.canRedo}
            onClick={() => store.getState().redo()}
            type="button"
          >
            ↷
          </button>
          {props.onPreview === undefined ? null : (
            <button
              className="rudralipi-button rudralipi-button--secondary"
              onClick={() => props.onPreview?.(store.getState().document)}
              type="button"
            >
              {translate('toolbar.preview')}
            </button>
          )}
          {props.onSave === undefined ? null : (
            <button
              className="rudralipi-button rudralipi-button--primary"
              onClick={() => props.onSave?.(store.getState().document)}
              type="button"
            >
              {translate('toolbar.save')}
            </button>
          )}
          <span className="rudralipi-locale">
            {translate(`locale.${state.locale}`)}
          </span>
        </nav>
      </header>

      <div className="rudralipi-workspace">
        <aside
          aria-labelledby="rudralipi-blocks-title"
          className="rudralipi-panel rudralipi-palette"
          data-testid="rudralipi-palette"
        >
          <div className="rudralipi-panel__heading">
            <span className="rudralipi-panel__index">01</span>
            <h2 id="rudralipi-blocks-title">{translate('panel.blocks')}</h2>
          </div>
          <div className="rudralipi-palette__grid">
            {builtInBlockTypes.map((type) => {
              const label = translate(blockMessageKeys[type])
              return (
                <button
                  aria-label={`${translate('action.add')} ${label}`}
                  className="rudralipi-palette__item"
                  key={type}
                  onClick={() => {
                    const node = createBuiltInBlock(type, props.context)
                    const result = store.getState().execute({
                      type: 'node.insert',
                      node,
                      placement: {
                        container: { kind: 'document' },
                        index: store.getState().document.content.length,
                      },
                    })
                    if (result.ok) {
                      store.getState().selectNode(node.id)
                    }
                  }}
                  type="button"
                >
                  <span aria-hidden="true">＋</span>
                  {label}
                </button>
              )
            })}
          </div>
        </aside>

        <main
          aria-labelledby="rudralipi-structure-title"
          className="rudralipi-canvas"
        >
          <div className="rudralipi-canvas__heading">
            <div>
              <span className="rudralipi-panel__index">02</span>
              <h2 id="rudralipi-structure-title">
                {translate('panel.structure')}
              </h2>
            </div>
            <span>{state.document.page.size}</span>
          </div>
          <div className="rudralipi-paper">
            <div aria-hidden="true" className="rudralipi-document-spine">
              <span>{state.document.content.length}</span>
            </div>
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="rudralipi-block-list">
                {state.document.content.map((node, index) => (
                  <BlockCard
                    index={index}
                    isFirst={index === 0}
                    isLast={index === state.document.content.length - 1}
                    key={node.id}
                    label={blockTypeLabel(node, translate)}
                    labels={{
                      drag: translate('a11y.dragInstructions'),
                      moveDown: translate('action.moveDown'),
                      moveUp: translate('action.moveUp'),
                    }}
                    node={node}
                    onMoveDown={() => move(node, index, index + 1)}
                    onMoveUp={() => move(node, index, index - 1)}
                    onSelect={() => {
                      store.getState().selectNode(node.id)
                      store.getState().setAnnouncement(
                        translate('a11y.blockSelected', {
                          values: {
                            block: blockTypeLabel(node, translate),
                          },
                        }),
                      )
                    }}
                    selected={node.id === state.selectedNodeId}
                    summary={blockSummary(node, translate)}
                  />
                ))}
              </div>
            </DragDropProvider>
          </div>
        </main>

        <aside
          aria-labelledby="rudralipi-properties-title"
          className="rudralipi-panel rudralipi-properties"
          data-testid="rudralipi-properties"
        >
          <div className="rudralipi-panel__heading">
            <span className="rudralipi-panel__index">03</span>
            <h2 id="rudralipi-properties-title">
              {translate('panel.properties')}
            </h2>
          </div>
          <PropertiesPanel
            assets={props.assets ?? []}
            context={props.context}
            mergeFields={props.mergeFields ?? []}
            selected={selected}
            store={store}
            translate={translate}
          />
        </aside>
      </div>
      <p
        aria-atomic="true"
        aria-live="polite"
        className="rudralipi-sr-only"
        role="status"
      >
        {state.announcement}
      </p>
    </section>
  )
}
