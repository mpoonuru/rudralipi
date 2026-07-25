import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { useEffect, useRef, type ReactElement } from 'react'

import type { Diagnostic, RichTextDocument } from '@rudralipi/core'

import { fromTiptapDocument, toTiptapDocument } from './conversion.js'

export interface RichTextEditorLabels {
  readonly bold: string
  readonly italic: string
  readonly underline: string
  readonly strike: string
  readonly code: string
  readonly superscript: string
  readonly subscript: string
  readonly bulletList: string
  readonly orderedList: string
}

const defaultLabels: RichTextEditorLabels = {
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  code: 'Inline code',
  superscript: 'Superscript',
  subscript: 'Subscript',
  bulletList: 'Bullet list',
  orderedList: 'Ordered list',
}

export interface RichTextEditorProps {
  readonly ariaLabel: string
  readonly labels?: Partial<RichTextEditorLabels>
  readonly onChange: (value: RichTextDocument) => void
  readonly onDiagnostics?: (diagnostics: ReadonlyArray<Diagnostic>) => void
  readonly readOnly?: boolean
  readonly value: RichTextDocument
}

interface ToolbarButtonProps {
  readonly active: boolean
  readonly disabled: boolean
  readonly label: string
  readonly onPress: () => void
  readonly symbol: string
}

function ToolbarButton({
  active,
  disabled,
  label,
  onPress,
  symbol,
}: ToolbarButtonProps): ReactElement {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className="rudralipi-rich-text__tool"
      disabled={disabled}
      onClick={onPress}
      title={label}
      type="button"
    >
      {symbol}
    </button>
  )
}

function toolbar(
  editor: Editor,
  labels: RichTextEditorLabels,
  disabled: boolean,
): ReactElement {
  const controls = [
    {
      label: labels.bold,
      symbol: 'B',
      active: editor.isActive('bold'),
      run: (): void => {
        editor.chain().focus().toggleBold().run()
      },
    },
    {
      label: labels.italic,
      symbol: 'I',
      active: editor.isActive('italic'),
      run: (): void => {
        editor.chain().focus().toggleItalic().run()
      },
    },
    {
      label: labels.underline,
      symbol: 'U',
      active: editor.isActive('underline'),
      run: (): void => {
        editor.chain().focus().toggleUnderline().run()
      },
    },
    {
      label: labels.strike,
      symbol: 'S',
      active: editor.isActive('strike'),
      run: (): void => {
        editor.chain().focus().toggleStrike().run()
      },
    },
    {
      label: labels.code,
      symbol: '</>',
      active: editor.isActive('code'),
      run: (): void => {
        editor.chain().focus().toggleCode().run()
      },
    },
    {
      label: labels.superscript,
      symbol: 'x²',
      active: editor.isActive('superscript'),
      run: (): void => {
        editor.chain().focus().toggleSuperscript().run()
      },
    },
    {
      label: labels.subscript,
      symbol: 'x₂',
      active: editor.isActive('subscript'),
      run: (): void => {
        editor.chain().focus().toggleSubscript().run()
      },
    },
    {
      label: labels.bulletList,
      symbol: '•',
      active: editor.isActive('bulletList'),
      run: (): void => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      label: labels.orderedList,
      symbol: '1.',
      active: editor.isActive('orderedList'),
      run: (): void => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
  ]

  return (
    <div
      aria-label="Rich text formatting"
      className="rudralipi-rich-text__toolbar"
      role="toolbar"
    >
      {controls.map((control) => (
        <ToolbarButton
          active={control.active}
          disabled={disabled}
          key={control.label}
          label={control.label}
          onPress={control.run}
          symbol={control.symbol}
        />
      ))}
    </div>
  )
}

export function RichTextEditor({
  ariaLabel,
  labels,
  onChange,
  onDiagnostics,
  readOnly = false,
  value,
}: RichTextEditorProps): ReactElement {
  const onChangeRef = useRef(onChange)
  const onDiagnosticsRef = useRef(onDiagnostics)
  onChangeRef.current = onChange
  onDiagnosticsRef.current = onDiagnostics

  const editor = useEditor({
    content: toTiptapDocument(value),
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        undoRedo: false,
      }),
      Superscript,
      Subscript,
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        class: 'rudralipi-rich-text__surface',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const result = fromTiptapDocument(updatedEditor.getJSON())
      if (result.ok) {
        onChangeRef.current(result.value)
        if (result.diagnostics.length > 0) {
          onDiagnosticsRef.current?.(result.diagnostics)
        }
      } else {
        onDiagnosticsRef.current?.(result.diagnostics)
      }
    },
  })

  useEffect(() => {
    if (editor === null) {
      return
    }

    editor.setEditable(!readOnly)
    editor.setOptions({
      editorProps: {
        attributes: {
          'aria-label': ariaLabel,
          'aria-multiline': 'true',
          class: 'rudralipi-rich-text__surface',
          role: 'textbox',
        },
      },
    })
  }, [ariaLabel, editor, readOnly])

  useEffect(() => {
    if (editor === null) {
      return
    }

    const incoming = toTiptapDocument(value)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, {
        emitUpdate: false,
      })
    }
  }, [editor, value])

  const resolvedLabels: RichTextEditorLabels = {
    ...defaultLabels,
    ...labels,
  }

  return (
    <div className="rudralipi-rich-text">
      {editor === null ? null : toolbar(editor, resolvedLabels, readOnly)}
      <EditorContent editor={editor} />
    </div>
  )
}
