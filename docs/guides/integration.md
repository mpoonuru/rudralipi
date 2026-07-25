# Integration Guide

Rudralipi separates portable document behavior from application concerns. A
host owns persistence, authorization, tenancy, merge data, assets, and PDF
infrastructure.

## Headless pipeline

1. Parse or migrate untrusted JSON with `@rudralipi/core`.
2. Resolve authorized merge fields and opaque asset identifiers.
3. Compile with `@rudralipi/compiler`.
4. Render with `@rudralipi/renderer-html`.
5. Deliver HTML or pass the complete result to a PDF adapter.

The compiler receives merge data and an `AssetResolver`. The resolver must
authorize the current request before returning bytes and metadata. Do not store
credentials or signed asset URLs in a document.

```ts
import { failure } from '@rudralipi/core'
import { compileDocument } from '@rudralipi/compiler'
import { renderHtml } from '@rudralipi/renderer-html'

const compiled = await compileDocument(document, {
  assetResolver: {
    async resolve(reference) {
      return failure([
        {
          code: 'asset.not_available',
          messageKey: 'diagnostics.asset.not_available',
          path: [],
          severity: 'error',
          details: { assetId: reference.assetId },
        },
      ])
    },
  },
  mergeData: {},
})

if (compiled.ok) {
  const rendered = renderHtml(compiled.value, {
    completeDocument: true,
    mode: 'print',
  })
  // Send rendered.documentHtml to an authorized response or PDF boundary.
}
```

## React editor

`RudralipiEditor` is controlled: pass the current document and persist only the
validated value received through `onChange`. Give each editor its own command
context. Import `@rudralipi/editor-react/styles.css` once in the host UI.

The editor preview is advisory. Save endpoints must parse the document again,
apply authorization and quota policy, and persist only the accepted version.

## Adapter contract

Adapters should return Rudralipi `Result` values with stable diagnostic codes.
They must not leak response bodies, credentials, private URLs, or document data
into diagnostics. Timeouts, byte limits, allowed protocols, and authorization
belong in every I/O adapter.
