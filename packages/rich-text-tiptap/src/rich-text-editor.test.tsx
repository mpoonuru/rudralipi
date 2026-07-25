import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@rudralipi/core'

import { RichTextEditor } from './rich-text-editor.js'

const value: RichTextDocument = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Compose <script> safely',
          marks: [{ type: 'bold' }],
        },
      ],
    },
  ],
}

describe('RichTextEditor', () => {
  it('renders owned JSON as editable text without interpreting stored HTML', async () => {
    render(
      <RichTextEditor
        ariaLabel="Document body"
        onChange={vi.fn()}
        value={value}
      />,
    )

    const editor = await screen.findByRole('textbox', {
      name: 'Document body',
    })

    expect(editor).toHaveTextContent('Compose <script> safely')
    expect(editor.querySelector('script')).toBeNull()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeEnabled()
  })

  it('provides a read-only presentation mode', async () => {
    render(
      <RichTextEditor
        ariaLabel="Document body"
        onChange={vi.fn()}
        readOnly
        value={value}
      />,
    )

    const editor = await screen.findByRole('textbox', {
      name: 'Document body',
    })

    expect(editor).toHaveAttribute('contenteditable', 'false')
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled()
  })
})
