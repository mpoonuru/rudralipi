import { describe, expect, it, vi } from 'vitest'

import type { HtmlRenderResult } from '@rudralipi/renderer-html'

import {
  createGotenbergAdapter,
  type FetchImplementation,
} from './gotenberg-adapter.js'

const renderResult: HtmlRenderResult = {
  contentSecurityPolicy: "default-src 'none'",
  css: '@page { size: A4; }',
  documentHtml: '<!doctype html><html><body>Rudralipi</body></html>',
  hash: 'a'.repeat(64),
  html: '<main>Rudralipi</main>',
  resourceManifest: [],
}

const pdfBytes = new Uint8Array([
  37, 80, 68, 70, 45, 49, 46, 55, 10, 37, 226, 227, 207, 211, 10,
])

describe('Gotenberg adapter', () => {
  it('posts a hardened multipart request to the HTML conversion route', async () => {
    const fetcher = vi.fn<FetchImplementation>(async (_input, init) => {
      const form = init?.body
      expect(form).toBeInstanceOf(FormData)
      if (!(form instanceof FormData)) {
        throw new Error('Expected FormData.')
      }
      expect(form.get('preferCssPageSize')).toBe('true')
      expect(form.get('printBackground')).toBe('true')
      expect(form.get('failOnConsoleExceptions')).toBe('true')
      expect(form.get('failOnResourceLoadingFailed')).toBe('true')
      expect(form.get('emulatedMediaType')).toBe('print')
      const html = form.get('files')
      expect(html).toBeInstanceOf(File)
      if (html instanceof File) {
        expect(html.name).toBe('index.html')
        expect(await html.text()).toBe(renderResult.documentHtml)
      }

      return new Response(pdfBytes, {
        headers: {
          'content-type': 'application/pdf',
          'gotenberg-trace': 'trace-safe',
        },
        status: 200,
      })
    })
    const adapter = createGotenbergAdapter({
      allowInsecureHttp: true,
      endpoint: 'http://127.0.0.1:3000',
      fetcher,
    })

    const result = await adapter.render(renderResult, {
      outputFilename: 'rudralipi-document',
      traceId: 'trace-request-1',
    })

    expect(result.ok).toBe(true)
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/forms/chromium/convert/html',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Gotenberg-Output-Filename': 'rudralipi-document',
          'Gotenberg-Trace': 'trace-request-1',
        },
      }),
    )
    if (result.ok) {
      expect(result.value.bytes).toEqual(pdfBytes)
      expect(result.value.traceId).toBe('trace-safe')
    }
  })

  it('requires an explicit opt-in for insecure HTTP endpoints', () => {
    expect(() =>
      createGotenbergAdapter({
        endpoint: 'http://gotenberg.internal:3000',
        fetcher: vi.fn<FetchImplementation>(),
      }),
    ).toThrow(/insecure HTTP/i)
  })

  it('rejects non-PDF and oversized responses', async () => {
    const invalidType = createGotenbergAdapter({
      endpoint: 'https://gotenberg.internal',
      fetcher: vi.fn<FetchImplementation>(
        async () =>
          new Response('not a PDF', {
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    })
    const invalidResult = await invalidType.render(renderResult)
    expect(invalidResult).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'gotenberg.invalid_content_type' }],
    })

    const oversized = createGotenbergAdapter({
      endpoint: 'https://gotenberg.internal',
      maxPdfBytes: 8,
      fetcher: vi.fn<FetchImplementation>(
        async () =>
          new Response(pdfBytes, {
            headers: { 'content-type': 'application/pdf' },
          }),
      ),
    })
    const oversizedResult = await oversized.render(renderResult)
    expect(oversizedResult).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'gotenberg.pdf_too_large' }],
    })
  })
})
