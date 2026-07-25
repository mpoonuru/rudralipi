import { failure, success, type Diagnostic, type Result } from '@rudralipi/core'
import type { HtmlRenderResult } from '@rudralipi/renderer-html'

export type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export interface GotenbergAdapterOptions {
  readonly allowInsecureHttp?: boolean
  readonly endpoint: string
  readonly fetcher?: FetchImplementation
  readonly maxHtmlBytes?: number
  readonly maxPdfBytes?: number
  readonly timeoutMs?: number
}

export interface GotenbergRenderOptions {
  readonly outputFilename?: string
  readonly traceId?: string
}

export interface GotenbergPdf {
  readonly bytes: Uint8Array
  readonly contentType: 'application/pdf'
  readonly filename: string
  readonly sourceHash: string
  readonly traceId?: string
}

export interface GotenbergAdapter {
  render(
    result: HtmlRenderResult,
    options?: GotenbergRenderOptions,
  ): Promise<Result<GotenbergPdf>>
}

const defaultMaxHtmlBytes = 10 * 1024 * 1024
const defaultMaxPdfBytes = 100 * 1024 * 1024
const defaultTimeoutMs = 60_000
const safeHeaderValue = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/
const safeFilename = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/

function diagnostic(
  code: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    path: [],
    severity: 'error',
    details,
  }
}

function positiveSafeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer.`)
  }
  return value
}

function conversionUrl(endpoint: string, allowInsecureHttp: boolean): string {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new RangeError('The Gotenberg endpoint must be a valid URL.')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new RangeError('The Gotenberg endpoint must use HTTP or HTTPS.')
  }
  if (url.protocol === 'http:' && !allowInsecureHttp) {
    throw new RangeError(
      'The Gotenberg endpoint uses insecure HTTP; opt in explicitly.',
    )
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new RangeError(
      'Credentials must not be embedded in the Gotenberg endpoint.',
    )
  }
  if (url.search.length > 0 || url.hash.length > 0) {
    throw new RangeError(
      'The Gotenberg endpoint must not contain a query or fragment.',
    )
  }

  const basePath = url.pathname.replace(/\/+$/, '')
  url.pathname = `${basePath}/forms/chromium/convert/html`
  return url.toString()
}

function responseLength(response: Response): number | undefined {
  const header = response.headers.get('content-length')
  if (header === null || !/^\d+$/.test(header)) {
    return undefined
  }
  const value = Number(header)
  return Number.isSafeInteger(value) ? value : undefined
}

function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 37 &&
    bytes[1] === 80 &&
    bytes[2] === 68 &&
    bytes[3] === 70 &&
    bytes[4] === 45
  )
}

export function createGotenbergAdapter({
  allowInsecureHttp = false,
  endpoint,
  fetcher = globalThis.fetch,
  maxHtmlBytes = defaultMaxHtmlBytes,
  maxPdfBytes = defaultMaxPdfBytes,
  timeoutMs = defaultTimeoutMs,
}: GotenbergAdapterOptions): GotenbergAdapter {
  const url = conversionUrl(endpoint, allowInsecureHttp)
  const htmlLimit = positiveSafeInteger(maxHtmlBytes, 'maxHtmlBytes')
  const pdfLimit = positiveSafeInteger(maxPdfBytes, 'maxPdfBytes')
  const requestTimeout = positiveSafeInteger(timeoutMs, 'timeoutMs')

  return {
    async render(result, options = {}): Promise<Result<GotenbergPdf>> {
      const filename = options.outputFilename ?? 'rudralipi-document'
      if (!safeFilename.test(filename)) {
        return failure([diagnostic('gotenberg.invalid_output_filename')])
      }
      if (
        options.traceId !== undefined &&
        !safeHeaderValue.test(options.traceId)
      ) {
        return failure([diagnostic('gotenberg.invalid_trace_id')])
      }

      const htmlFile = new Blob([result.documentHtml], {
        type: 'text/html;charset=utf-8',
      })
      if (htmlFile.size > htmlLimit) {
        return failure([
          diagnostic('gotenberg.html_too_large', {
            actual: htmlFile.size,
            maximum: htmlLimit,
          }),
        ])
      }

      const form = new FormData()
      form.append('files', htmlFile, 'index.html')
      form.append('preferCssPageSize', 'true')
      form.append('printBackground', 'true')
      form.append('failOnConsoleExceptions', 'true')
      form.append('failOnResourceLoadingFailed', 'true')
      form.append('emulatedMediaType', 'print')

      const headers: Record<string, string> = {
        'Gotenberg-Output-Filename': filename,
        ...(options.traceId === undefined
          ? {}
          : { 'Gotenberg-Trace': options.traceId }),
      }
      const controller = new AbortController()
      const timeout = globalThis.setTimeout(() => {
        controller.abort()
      }, requestTimeout)

      let response: Response
      try {
        response = await fetcher(url, {
          body: form,
          headers,
          method: 'POST',
          signal: controller.signal,
        })
      } catch {
        return failure([
          diagnostic(
            controller.signal.aborted
              ? 'gotenberg.request_timeout'
              : 'gotenberg.transport_failed',
          ),
        ])
      } finally {
        globalThis.clearTimeout(timeout)
      }

      if (!response.ok) {
        return failure([
          diagnostic('gotenberg.request_failed', {
            status: response.status,
          }),
        ])
      }

      const contentType = response.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase()
      if (contentType !== 'application/pdf') {
        return failure([
          diagnostic('gotenberg.invalid_content_type', {
            contentType: contentType ?? 'missing',
          }),
        ])
      }

      const declaredLength = responseLength(response)
      if (declaredLength !== undefined && declaredLength > pdfLimit) {
        return failure([
          diagnostic('gotenberg.pdf_too_large', {
            actual: declaredLength,
            maximum: pdfLimit,
          }),
        ])
      }

      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength > pdfLimit) {
        return failure([
          diagnostic('gotenberg.pdf_too_large', {
            actual: bytes.byteLength,
            maximum: pdfLimit,
          }),
        ])
      }
      if (!isPdf(bytes)) {
        return failure([diagnostic('gotenberg.invalid_pdf_signature')])
      }

      const traceId = response.headers.get('gotenberg-trace') ?? undefined
      return success({
        bytes,
        contentType: 'application/pdf',
        filename: `${filename}.pdf`,
        sourceHash: result.hash,
        ...(traceId === undefined ? {} : { traceId }),
      })
    },
  }
}
