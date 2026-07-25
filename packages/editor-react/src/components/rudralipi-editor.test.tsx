import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  createDocumentFixture,
  type CommandContext,
  type RudralipiDocument,
} from '@rudralipi/core'

import { RudralipiEditor } from './rudralipi-editor.js'

function context(): CommandContext {
  let sequence = 0

  return {
    generateId: (prefix) => {
      sequence += 1
      return `${prefix}-editor-${sequence}`
    },
    nowIso: () => '2026-07-25T12:00:00.000Z',
  }
}

function latestDocument(
  callback: ReturnType<typeof vi.fn<(document: RudralipiDocument) => void>>,
): RudralipiDocument {
  const call = callback.mock.calls.at(-1)
  if (call === undefined) {
    throw new Error('Expected the editor to emit a document.')
  }
  return call[0]
}

describe('RudralipiEditor', () => {
  it('renders a localized three-surface editor with an accessible application shell', () => {
    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        locale="de"
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('application', {
        name: 'Rudralipi-Dokumenteditor',
      }),
    ).toHaveAttribute('lang', 'de')
    expect(
      screen.getByRole('heading', { name: 'Bausteine' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Dokumentstruktur' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Eigenschaften' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rückgängig' })).toBeDisabled()
  })

  it('selects and edits a heading through owned commands', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        onChange={onChange}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Heading: Document heading',
      }),
    )

    const properties = screen.getByTestId('rudralipi-properties')
    const text = within(properties).getByRole('textbox', { name: 'Text' })
    await user.clear(text)
    await user.type(text, 'A composed future')

    expect(latestDocument(onChange).content[1]).toMatchObject({
      id: 'heading-1',
      props: {
        text: 'A composed future',
      },
    })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })

  it('edits assets and merge fields through host-provided catalogs', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        assets={[
          { id: 'image/logo', label: 'Rudralipi logo' },
          { id: 'image/seal', label: 'Company seal' },
        ]}
        context={context()}
        document={createDocumentFixture()}
        mergeFields={[
          { key: 'customer.name', label: 'Customer name' },
          { key: 'customer.company', label: 'Company name' },
        ]}
        onChange={onChange}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Image: Rudralipi logo',
      }),
    )
    const properties = screen.getByTestId('rudralipi-properties')
    const alt = within(properties).getByRole('textbox', {
      name: 'Alternative text',
    })
    await user.clear(alt)
    await user.type(alt, 'Company seal')
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Asset' }),
      'image/seal',
    )

    expect(latestDocument(onChange).content[3]).toMatchObject({
      type: 'image',
      props: {
        alt: 'Company seal',
        assetId: 'image/seal',
      },
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Merge field: customer.name',
      }),
    )
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Field' }),
      'customer.company',
    )

    expect(latestDocument(onChange).content[4]).toMatchObject({
      type: 'mergeField',
      props: {
        field: 'customer.company',
      },
    })
  })

  it('provides owned controls for tables, layout, signatures, and conditions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        onChange={onChange}
      />,
    )

    const properties = screen.getByTestId('rudralipi-properties')
    await user.click(screen.getByRole('button', { name: 'Table: 2 × 1' }))
    await user.click(
      within(properties).getByRole('button', { name: 'Add row' }),
    )
    expect(latestDocument(onChange).content[5]).toMatchObject({
      type: 'table',
      props: {
        rows: [{}, {}],
      },
    })

    await user.click(
      screen.getByRole('button', { name: 'Divider: solid · thin' }),
    )
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Variant' }),
      'dashed',
    )
    expect(latestDocument(onChange).content[7]).toMatchObject({
      type: 'divider',
      props: {
        variant: 'dashed',
      },
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Signature: Customer, Company',
      }),
    )
    const signatureLabel = within(properties).getAllByRole('textbox', {
      name: 'Signature label',
    })[0]
    if (signatureLabel === undefined) {
      throw new Error('Expected a signature label field.')
    }
    await user.clear(signatureLabel)
    await user.type(signatureLabel, 'Authorized signer')
    expect(latestDocument(onChange).content[9]).toMatchObject({
      type: 'signature',
      props: {
        lines: [{ label: 'Authorized signer' }, {}],
      },
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Conditional section: customer.isBusiness',
      }),
    )
    const conditionField = within(properties).getByRole('textbox', {
      name: 'Condition field',
    })
    await user.clear(conditionField)
    await user.type(conditionField, 'customer.hasContract')
    expect(latestDocument(onChange).content[10]).toMatchObject({
      type: 'conditional',
      props: {
        condition: {
          field: 'customer.hasContract',
        },
      },
    })

    await user.selectOptions(
      within(properties).getByRole('combobox', {
        name: 'Condition operator',
      }),
      'all',
    )
    await user.click(
      within(properties).getByRole('button', {
        name: 'Add Condition',
      }),
    )
    expect(latestDocument(onChange).content[10]).toMatchObject({
      type: 'conditional',
      props: {
        condition: {
          op: 'all',
          conditions: [{}, {}],
        },
      },
    })
  })

  it('edits column, spacing, header, and footer composition settings', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        onChange={onChange}
      />,
    )

    const properties = screen.getByTestId('rudralipi-properties')
    await user.click(screen.getByRole('button', { name: 'Columns: 2' }))
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Gap' }),
      'lg',
    )
    expect(latestDocument(onChange).content[6]).toMatchObject({
      type: 'columns',
      props: { gap: 'lg' },
    })

    await user.click(screen.getByRole('button', { name: 'Spacer: md' }))
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Size' }),
      'xl',
    )
    expect(latestDocument(onChange).content[8]).toMatchObject({
      type: 'spacer',
      props: { size: 'xl' },
    })

    await user.click(screen.getByRole('button', { name: 'Header: all' }))
    await user.selectOptions(
      within(properties).getByRole('combobox', { name: 'Repeat' }),
      'exceptFirst',
    )
    expect(latestDocument(onChange).content[0]).toMatchObject({
      type: 'header',
      props: { repeat: 'exceptFirst' },
    })

    await user.click(screen.getByRole('button', { name: 'Footer: all' }))
    await user.click(
      within(properties).getByRole('checkbox', {
        name: 'Show page number',
      }),
    )
    expect(latestDocument(onChange).content[12]).toMatchObject({
      type: 'footer',
      props: { showPageNumber: false },
    })
  })

  it('composes nested header and conditional branch content', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        onChange={onChange}
      />,
    )

    const properties = screen.getByTestId('rudralipi-properties')
    await user.click(screen.getByRole('button', { name: 'Header: all' }))
    const headerContent = within(properties).getByRole('region', {
      name: 'Header',
    })
    await user.click(
      within(headerContent).getByRole('button', {
        name: 'Add Heading',
      }),
    )
    expect(latestDocument(onChange).content[0]).toMatchObject({
      type: 'header',
      props: {
        content: [{ type: 'richText' }, { type: 'heading' }],
      },
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Conditional section: customer.isBusiness',
      }),
    )
    const otherwise = within(properties).getByRole('region', {
      name: 'Otherwise',
    })
    await user.click(
      within(otherwise).getByRole('button', {
        name: 'Add Rich text',
      }),
    )
    expect(latestDocument(onChange).content[10]).toMatchObject({
      type: 'conditional',
      props: {
        otherwise: [{ type: 'richText' }, { type: 'richText' }],
      },
    })
  })

  it('adds and reorders blocks without relying on pointer input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(document: RudralipiDocument) => void>()

    render(
      <RudralipiEditor
        context={context()}
        document={createDocumentFixture()}
        onChange={onChange}
      />,
    )

    const palette = screen.getByTestId('rudralipi-palette')
    await user.click(
      within(palette).getByRole('button', {
        name: 'Add Heading',
      }),
    )

    expect(latestDocument(onChange).content.at(-1)).toMatchObject({
      type: 'heading',
      props: {
        text: 'Heading',
      },
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Heading: Document heading',
      }),
    )
    const selected = screen.getByTestId('block-heading-1')
    await user.click(
      within(selected).getByRole('button', {
        name: 'Move down',
      }),
    )

    expect(latestDocument(onChange).content[2]?.id).toBe('heading-1')
    expect(screen.getByText('Heading moved to position 3.')).toBeInTheDocument()
  })

  it('resets local history when a controlled replacement arrives', async () => {
    const user = userEvent.setup()
    const fixture = createDocumentFixture()
    const { rerender } = render(
      <RudralipiEditor
        context={context()}
        document={fixture}
        onChange={vi.fn()}
      />,
    )

    const firstPaletteButton = screen
      .getByTestId('rudralipi-palette')
      .querySelector('button')
    if (firstPaletteButton === null) {
      throw new Error('Expected the block palette to contain a button.')
    }
    await user.click(firstPaletteButton)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()

    const replacement: RudralipiDocument = {
      ...fixture,
      metadata: {
        ...fixture.metadata,
        title: 'Replacement',
      },
    }
    rerender(
      <RudralipiEditor
        context={context()}
        document={replacement}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Replacement')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})
