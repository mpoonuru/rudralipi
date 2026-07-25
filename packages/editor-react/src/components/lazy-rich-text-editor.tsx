import { lazy, Suspense, type ReactElement } from 'react'

import type { RichTextEditorProps } from '@rudralipi/rich-text-tiptap'

const TiptapRichTextEditor = lazy(async () => {
  const adapter = await import('@rudralipi/rich-text-tiptap')
  return { default: adapter.RichTextEditor }
})

export function LazyRichTextEditor(props: RichTextEditorProps): ReactElement {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          aria-label={props.ariaLabel}
          className="rudralipi-rich-text__loading"
        />
      }
    >
      <TiptapRichTextEditor {...props} />
    </Suspense>
  )
}
