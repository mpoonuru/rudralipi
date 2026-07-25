# PDF and Print

Rudralipi compiles documents into deterministic renderer IR and emits semantic
HTML plus print CSS. Chromium is the alpha reference engine. Browser preview is
useful feedback, but final PDF output must use the same compiler and renderer
versions as the authoritative backend.

## Pagination contracts

- Tables may repeat header rows and prohibit row splitting.
- Explicit page-break blocks force a new page.
- Header and footer blocks are page furniture, not arbitrary fixed HTML.
- Page size, orientation, margins, spacing, colors, and typography come from
  controlled document fields.
- Fonts are resolved as packageable assets and embedded by the renderer.

The `@rudralipi/testing` package includes a 160-row stress fixture with
repeating table headers, non-splitting rows, header/footer content, and an
explicit page break.

## Gotenberg

`@rudralipi/adapter-gotenberg` posts complete HTML to the Chromium HTML route.
The adapter uses print media, CSS page size, backgrounds, console/resource
failure checks, timeouts, byte limits, PDF content-type checks, and PDF signature
checks.

Gotenberg must remain behind a host-controlled internal network boundary.
Configure outbound filtering and authenticate callers before they reach the
service. HTTPS is the adapter default; plain HTTP requires an explicit opt-in
for a protected private network.

## Visual parity

Playwright fixtures cover desktop and mobile editor rendering, save/reload,
locales, compiler preview, accessibility, and screenshot baselines. PDF
deployment tests should additionally rasterize authoritative output and compare
it against reviewed baselines using pinned Chromium/Gotenberg versions.

Exact parity is not promised across unrelated browser engines or font stacks.
Pin rendering infrastructure and fonts for reproducible output.
