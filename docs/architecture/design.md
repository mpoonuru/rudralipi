# Rudralipi Architecture

Status: Approved for implementation  
Release target: `0.1.0-alpha.0`  
License: Apache License 2.0

## 1. Product Definition

Rudralipi (रुद्रलिपि, “Rudra’s script/writing”) is a standalone, public,
open-source document composition and visual editing engine. It owns a portable
document format, editing contracts, deterministic compilation and rendering,
and extension interfaces. It does not own an adopting application's storage,
authorization, tenancy, business data, asset store, or PDF infrastructure.

Rudralipi must remain product-independent. In particular, it must not import,
copy, depend on, or retain history from Zentral or any PJ Telesoft product.

### 1.1 Goals

- Compose professional, data-driven, paged documents in a visual React editor.
- Persist versioned Rudralipi JSON rather than arbitrary HTML or CSS classes.
- Validate and compile the same document on a browser, Node.js server, or
  headless rendering service without importing React.
- Render deterministic semantic HTML and print CSS.
- Support controlled merge fields and conditional content without executing
  user-provided code.
- Support German, English, Italian, and Turkish from the first release.
- Provide replaceable adapters for assets, persistence, merge-field catalogs,
  authorization-aware host actions, and PDF services.
- Make schema migrations, commands, extensions, renderer behavior, and
  security policy explicit public contracts.
- Preserve accessibility and keyboard operation throughout the editor.
- Support long tables, page breaks, repeating page furniture, private assets,
  packageable fonts, and browser/PDF visual regression fixtures.

### 1.2 Non-goals for the 0.x architecture

- A freeform poster or slide canvas with arbitrary absolute positioning.
- A hosted document SaaS, account system, tenant model, or database.
- Executing scripts, templates, arbitrary expressions, stored HTML, inline
  event handlers, or unbounded custom CSS from document JSON.
- Replacing a word processor's collaborative track-changes system.
- Depending on commercial editor extensions or a cloud-only runtime.
- Pixel-identical output across different browser engines. The supported
  rendering contract is Chromium with pinned fixtures and tolerances.

## 2. Chosen Architecture

Rudralipi uses a structured paged-flow model with constrained layout
primitives. Blocks participate in normal document flow. Columns, headers,
footers, page breaks, tables, and conditional sections are explicit schema
nodes. A future positioned-overlay capability may be added as a separately
versioned block with bounded coordinates, but arbitrary positioning does not
leak into the base schema.

This is preferred over:

1. **Hybrid positioning from the start:** more flexible, but it couples editor
   geometry to renderer geometry and makes responsive editing, accessibility,
   migrations, and pagination substantially harder.
2. **Freeform canvas:** suitable for posters and slides, but a poor source model
   for long tables, merge-driven documents, semantic HTML, reflow, and reliable
   print output.

The system separates authoring state from the portable document:

```text
Host application
  -> React editor and host adapters
  -> pure commands over versioned Rudralipi JSON
  -> validation and schema migration
  -> compiler with merge data, assets, fonts, and policy
  -> renderer-neutral document IR
  -> deterministic HTML and print CSS
  -> browser preview or PDF adapter
```

The compiler and renderer are backend-authoritative. The editor preview is an
early feedback surface, not a security or output authority.

## 3. Repository and Package Boundaries

Rudralipi is a Yarn workspace monorepo using ECMAScript modules and strict
TypeScript. Package exports define the supported public surface; internal files
are not importable through package exports.

```text
packages/
  core/                 schema, migrations, commands, history, registries
  compiler/             validation, merge resolution, asset/font resolution, IR
  localization/         locale contracts and en/de/it/tr message catalogs
  editor-react/         visual editor, inspector, block palette, Zustand binding
  rich-text-tiptap/     Tiptap adapter for the owned rich-text AST
  renderer-html/        semantic HTML, preview CSS, print CSS
  adapter-gotenberg/    optional PDF transport adapter
  testing/              fixtures, contract suites, test adapters, assertions
apps/
  playground/           interactive development and save/reload demonstration
  visual-tests/         browser and PDF visual regression harness
docs/
examples/
```

### 3.1 Dependency direction

```text
core <- compiler <- renderer-html <- adapter-gotenberg
  ^         ^
  |         |
localization
  ^
editor-react <- rich-text-tiptap
  ^
playground
```

- `core`, `compiler`, `renderer-html`, and `adapter-gotenberg` must never import
  React, DOM globals, Tiptap, Zustand, or editor code.
- `core` does not perform I/O.
- `compiler` receives all I/O capabilities through typed adapters.
- `renderer-html` renders only validated compiler IR.
- `editor-react` may depend on browser primitives but persists only core JSON.
- `rich-text-tiptap` maps between the owned AST and Tiptap; Tiptap/ProseMirror
  JSON is never the portable document contract.
- Adopting applications may use the headless packages without installing React.

Package-level import-boundary tests enforce these rules.

## 4. Portable Document Model

### 4.1 Root document

Every persisted document contains:

- `schemaVersion`: an integer advanced only by an explicit migration.
- `id`: an opaque document identifier generated through an injected ID source.
- `locale`: one of the document's declared BCP 47 locales.
- `direction`: `ltr` or `rtl`; current built-in locales are `ltr`.
- `metadata`: title, subject, description, and project-owned tags.
- `page`: page size, orientation, margins, bleed policy, background, and
  header/footer references.
- `theme`: controlled typography, color, spacing, border, and table tokens.
- `fonts`: packageable font declarations identified by asset references.
- `content`: an ordered list of block nodes.
- `extensions`: namespaced JSON data validated by registered extensions.

Runtime timestamps are not required to render a document. If a host records
created or modified times in metadata, they are ISO 8601 strings produced and
parsed with Day.js.

### 4.2 Common node contract

Every node has:

- a stable opaque `id`;
- a discriminating `type`;
- type-specific `props`;
- optional controlled `style` tokens;
- optional accessibility metadata;
- optional child regions declared by the node schema.

Node IDs are stable across editing and are used for selection, commands,
diagnostics, collaboration adapters, and fixture targeting. They are not DOM
IDs and are escaped before any output.

### 4.3 Built-in blocks

The first schema includes:

- `heading`
- `richText`
- `image`
- `mergeField`
- `table`
- `columns`
- `divider`
- `spacer`
- `header`
- `footer`
- `signature`
- `conditional`
- `pageBreak`

An internal `documentFragment` container is available to schema-owned nested
regions but is not shown as a user block.

Tables use explicit columns, header rows, body rows, cell spans, alignment, and
repeat-header policy. Columns use a bounded column count and normalized
fractional widths. Images and fonts reference asset IDs, not trusted URLs.
Signatures contain controlled lines, labels, optional image asset references,
and signer merge fields.

### 4.4 Rich text

The core owns a minimal rich-text AST:

- paragraphs;
- text nodes;
- hard breaks;
- bullet and ordered lists;
- list items;
- links;
- bold, italic, underline, strike, code, superscript, and subscript marks.

Marks are a closed set. Links use a validated URL policy. Raw HTML, style
attributes, arbitrary DOM attributes, scriptable URLs, and editor-specific
extension payloads are rejected.

### 4.5 Styling

Documents reference semantic tokens such as `body`, `heading.1`, `muted`,
`accent`, `space.4`, or controlled typed values with hard bounds. The schema
never accepts arbitrary Tailwind class strings. Renderer CSS class names are
implementation details derived from validated nodes and tokens.

## 5. Extensions and Plugins

An extension declares:

- a globally unique namespaced type;
- its extension API version;
- a Zod-compatible JSON schema;
- default node creation;
- pure migration functions;
- compiler contribution to renderer-neutral IR;
- optional editor contribution in `editor-react`;
- optional localization messages;
- declared capabilities such as asset access or merge-field access.

Core registration rejects duplicate types and incompatible API versions.
Compiler plugins do not receive ambient filesystem, network, DOM, or process
access. The host explicitly supplies narrow capabilities. Editor-only code is
packaged separately from headless compiler code so backend consumers never
load React.

Unknown extension nodes fail closed during authoritative compilation. An editor
may preserve an unknown node as an inert, non-editable placeholder to prevent
data loss, but cannot render or export it as trusted output.

## 6. Commands, Transactions, and History

All mutations pass through typed pure commands. Initial commands include:

- insert, duplicate, move, and remove nodes;
- update validated node properties;
- replace rich-text content;
- wrap or unwrap conditional and column regions;
- update page/theme settings;
- apply a schema migration transaction.

A command returns either:

- a new immutable document plus an inverse command and affected node IDs; or
- a structured diagnostic without changing state.

Commands can be grouped into transactions. History stores bounded transactions,
not entire application state. Undo and redo replay inverse/forward commands.
Selection and transient UI state are editor concerns and are not written to
portable JSON. An injected ID generator and clock make commands deterministic
in tests. The clock uses Day.js and returns ISO strings.

## 7. Merge Fields and Conditional Content

Merge fields are identified by stable keys such as `customer.name`, not
embedded template syntax. A field definition declares:

- key, localized label, value type, and optional description;
- sensitivity classification;
- allowed formatting operations;
- example value for previews.

Supported value types are string, number, boolean, money, date, date-time,
address, image asset reference, and bounded lists of structured records.

The merge engine accepts plain data plus a field catalog. It validates values,
formats dates through Day.js and locale-aware formatters, escapes text, and
returns typed values or structured diagnostics. It never evaluates JavaScript,
property expressions, template source, or arbitrary format strings.

Conditional blocks use a small JSON expression AST with bounded depth and node
count:

- field exists;
- equality and inequality against typed literals;
- numeric comparisons;
- list emptiness;
- boolean `all`, `any`, and `not`.

Conditions cannot invoke functions, access prototypes, traverse arbitrary
properties, or perform network/file operations.

## 8. Validation, Migration, and Compilation

Compilation is a deterministic pipeline:

1. Parse untrusted JSON with strict schemas and size/depth/count limits.
2. Reject unsupported future schema versions.
3. Migrate older supported versions one version at a time with pure functions.
4. Validate migrated document invariants and registered extensions.
5. Resolve and type-check merge data.
6. Evaluate controlled conditions.
7. Resolve assets and fonts through policy-enforcing adapters.
8. Normalize the document into renderer-neutral IR.
9. Emit diagnostics, a resource manifest, and a deterministic content hash.

Validation distinguishes errors, warnings, and informational diagnostics.
Every diagnostic has a stable code, message key, JSON path, and optional node
ID. Public APIs return result objects for expected failures; they do not throw
for invalid user documents. Programmer errors and adapter contract violations
may throw typed errors.

Migrations are idempotence-tested where applicable and covered by golden
fixtures. Original JSON is never mutated. Downgrade migrations are not promised.

## 9. Asset and Font Policy

Portable documents contain opaque asset references plus declared metadata.
They do not contain authenticated URLs, filesystem paths, credentials, or
binary blobs.

The compiler uses an `AssetResolver` supplied by the host. The resolver returns
bytes or a renderer-safe URL, verified media type, length, integrity digest,
and policy metadata. Compiler policy enforces:

- permitted media types;
- byte and dimension limits;
- redirect and timeout limits in network-backed hosts;
- no implicit access to loopback, link-local, metadata-service, or private
  network destinations;
- no SVG unless explicitly sanitized by a host capability;
- digest verification for packageable resources.

Fonts are declared assets with family, weight, style, and subset policy.
Renderer output uses generated `@font-face` declarations only after successful
resolution. Missing fonts produce deterministic diagnostics and an explicit
fallback, never a silent environment-dependent choice.

## 10. HTML and Print Rendering

The HTML renderer:

- consumes compiler IR only;
- escapes all text and attributes;
- emits semantic elements where possible;
- uses stable project-owned class names and generated CSS variables;
- produces a complete document or embeddable fragment;
- can attach a restrictive Content Security Policy recommendation;
- emits no inline event handlers or executable scripts.

Preview and print modes share the same content renderer and token compiler.
Mode-specific CSS is isolated. Supported print behavior includes:

- page size, orientation, and margins through `@page`;
- explicit page breaks;
- orphan/widow hints;
- avoid-break policy for bounded blocks;
- table header repetition and deterministic cell splitting rules;
- header/footer page furniture within Chromium's supported model;
- documented overflow diagnostics for unsplittable content;
- print-safe colors and embedded fonts.

The renderer output is deterministic for identical validated input, merge data,
resource digests, renderer version, and locale. A content hash includes each of
those inputs.

## 11. PDF Adapter

`adapter-gotenberg` is optional and contains transport logic only. It accepts
already rendered HTML/CSS/resources and a typed PDF request. The adapter:

- has no document business logic;
- supports authenticated host-provided transport without persisting secrets;
- applies request size and timeout limits;
- maps remote failures to stable Rudralipi diagnostics;
- returns PDF bytes and metadata;
- records renderer provenance without sensitive request data.

The core API permits alternative Chromium, Playwright, or service adapters.
PDF behavior is tested against a pinned Chromium/Gotenberg profile. Exact PDF
binary equality is not required; page count, extracted structure, and visual
diff tolerances are.

## 12. Editor Architecture

The React editor is an embeddable controlled component. Its required host
inputs are the document, block/extension registry, locale, and change callback.
Optional adapters provide assets, merge-field catalogs, preview data,
persistence commands, and PDF export.

Zustand stores editor-session state in a vanilla store created per editor
instance. It contains selection, focus, drag state, panels, command history,
diagnostics, and preview state. The portable document remains a core value and
is changed only through commands.

The initial interface has:

- a responsive top command bar;
- searchable block palette;
- central paged document surface;
- contextual property inspector;
- document structure navigator;
- diagnostics and preview controls;
- undo/redo and keyboard command palette.

dnd-kit provides keyboard-accessible reordering and pointer drag/drop. Native
buttons, labels, landmarks, focus management, ARIA announcements, reduced
motion, contrast, and zoom behavior are first-class acceptance criteria.

The local Catalyst kit is a private visual reference only. Rudralipi components
are independently implemented with Tailwind CSS and accessible primitives.
No proprietary Catalyst source or restricted asset is copied into this public
repository. Rudralipi does not use `cn` or `cva`; small project-owned helpers
accept explicit class arrays when composition is necessary.

## 13. Localization

`localization` exposes a small framework-neutral message interface and complete
built-in catalogs for:

- `en`
- `de`
- `it`
- `tr`

English is the fallback catalog. Locale lookup never silently renders a message
key in production; missing translations are build/test failures for built-in
catalogs. Documents store semantic data rather than localized editor labels.
Host applications may register additional catalogs. Number/date formatting
uses the document locale; all date parsing and manipulation uses Day.js.

## 14. Security Model

All documents, merge data, extension payloads, and adapter results are
untrusted. The security baseline includes:

- strict parsing with unknown-key policy;
- maximum document bytes, nodes, depth, rich-text characters, table cells,
  conditional complexity, and resource bytes;
- prototype-pollution-resistant traversal;
- no `eval`, dynamic functions, template execution, or arbitrary HTML;
- URL scheme and host policy;
- escaped HTML and attribute output;
- optional sanitized SVG only through an explicit adapter;
- deterministic resource manifests;
- no credentials in documents, diagnostics, logs, snapshots, or fixtures;
- dependency and license review in CI;
- fuzz/property tests for parsers, migrations, condition evaluation, and HTML
  escaping.

The public threat model documents trust boundaries and supported deployment
assumptions before the first stable release.

## 15. Testing and Verification

Each package has unit and contract tests. Repository gates include:

- strict TypeScript typecheck;
- formatting and lint checks;
- package-boundary and export-surface tests;
- schema and migration golden fixtures;
- command/inverse/undo-redo tests;
- merge-field and conditional security tests;
- renderer escaping and deterministic snapshot tests;
- asset and font policy contract tests;
- editor keyboard, drag/drop, selection, and save/reload integration tests;
- complete `en`, `de`, `it`, and `tr` catalog tests;
- browser preview fixtures at supported viewport sizes;
- PDF fixtures for long tables, repeated headers, explicit breaks,
  headers/footers, private assets, embedded fonts, and overflow diagnostics;
- browser/PDF visual regression thresholds;
- package builds and clean consumer import tests.

An implementation increment is complete only when its proportional gates pass.
The project is not declared production-ready merely because source builds.

## 16. Dependencies and Ownership Policy

The intended primitives are:

- React for the optional editor view;
- dnd-kit for accessible drag/drop;
- Tiptap open-source packages for rich-text editing;
- Zustand for editor-session state;
- Zod for runtime schemas;
- Tailwind CSS for editor styling;
- Day.js for all date/time handling;
- Vitest and Testing Library for unit/integration tests;
- Playwright for browser and visual fixtures.

Only permissively licensed packages are admitted. Paid Tiptap extensions,
Tiptap cloud services, Puck, and GrapesJS are not runtime dependencies.
Third-party source is not copied unless a deliberate review records its
license, need, modifications, attribution, and notice obligations.

`THIRD_PARTY_NOTICES.md` records direct runtime/tooling dependencies and any
adapted source. Lockfile changes are reviewed for license drift.

## 17. Licensing and Releases

Rudralipi uses Apache License 2.0. It permits commercial and private reuse,
modification, distribution, and sublicensing while providing an explicit
contributor patent grant and patent-litigation termination protection. Compared
with MIT, it is longer and imposes clearer notice/state-changes obligations. It
is not compatible with GPLv2-only code without an additional compatibility
path, so Rudralipi will not accept GPLv2-only dependencies or copied code.

Versions follow Semantic Versioning. Early releases use prerelease identifiers,
starting at `0.1.0-alpha.0`. During `0.x`, breaking schema or extension changes
are allowed only with release notes and migrations when persisted documents are
affected. A `1.0.0` release requires stabilized schema, extension, compiler,
renderer, and migration contracts plus the full verification matrix.

## 18. Delivery Sequence

1. Repository policy, licensing, workspace, strict build, and package boundaries.
2. Core schema, block registry, migrations, commands, history, and fixtures.
3. Merge-field/conditional engine and compiler IR.
4. Deterministic HTML/print renderer and security tests.
5. React editor shell, block editing, rich text, and save/reload proof.
6. Localization completion and accessibility tests.
7. Asset/font policy and private-resource fixtures.
8. Gotenberg adapter, PDF fixtures, and visual regression harness.
9. Public documentation, examples, release automation, and alpha release gates.

Each sequence item produces a usable vertical increment and does not weaken the
package boundaries established above.

## 19. Acceptance Criteria

The initial alpha is acceptable when:

- all built-in block types can be created, edited, reordered, serialized, and
  reloaded without data loss;
- invalid/untrusted JSON fails with stable diagnostics;
- schema migrations and undo/redo pass their contract suites;
- merge fields and conditions resolve without executable templates;
- the same fixture produces deterministic HTML in browser and Node.js;
- editor controls and messages work in `en`, `de`, `it`, and `tr`;
- raw HTML, unsafe links, arbitrary class strings, and unauthorized assets are
  rejected;
- long-table, header/footer, page-break, private-asset, font, and overflow PDF
  fixtures are exercised;
- a clean consumer can import headless packages without React;
- typecheck, tests, builds, save/reload tests, security tests, and proportional
  visual/PDF checks pass.
