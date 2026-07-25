import { describe, expect, it } from 'vitest'

import { renderHtml } from './render-document.js'
import { createCompiledFixture } from './test-support/compiled-fixture.test-support.js'

describe('renderHtml', () => {
  it('renders deterministic semantic complete HTML', async () => {
    const compiled = await createCompiledFixture()
    const first = renderHtml(compiled, {
      mode: 'preview',
      completeDocument: true,
    })
    const second = renderHtml(compiled, {
      mode: 'preview',
      completeDocument: true,
    })

    expect(first).toEqual(second)
    expect(first.documentHtml).toContain('<html lang="en" dir="ltr">')
    expect(first.html).toContain('<h1')
    expect(first.html).toContain('<table')
    expect(first.html).toContain('<figure')
    expect(first.html).toContain('data:image/png;base64,')
    expect(first.contentSecurityPolicy).toContain("script-src 'none'")
  })

  it('emits print contracts for tables and explicit page breaks', async () => {
    const result = renderHtml(await createCompiledFixture(), {
      mode: 'print',
      completeDocument: true,
    })

    expect(result.css).toContain('thead { display: table-header-group; }')
    expect(result.css).toContain('break-before: page')
    expect(result.html).toContain('data-rudralipi-page-break')
    expect(result.css).toContain('@page')
    expect(result.css).toContain(
      '.rl-header { position: running(rudralipi-header); }',
    )
  })

  it('uses the configured page dimensions in preview mode', async () => {
    const compiled = await createCompiledFixture()
    const result = renderHtml(
      {
        ...compiled,
        ir: {
          ...compiled.ir,
          page: {
            ...compiled.ir.page,
            size: 'Letter',
            orientation: 'landscape',
          },
        },
      },
      {
        mode: 'preview',
      },
    )

    expect(result.css).toContain('width: 11in')
    expect(result.css).toContain('min-height: 8.5in')
  })
})
