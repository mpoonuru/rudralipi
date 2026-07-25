# Document Model

Rudralipi stores a versioned JSON tree. The root declares schema version,
identity, locale, direction, metadata, page settings, theme, fonts, and content.
Every node has a stable identifier, a controlled block type, typed properties,
and optional bounded styling and accessibility metadata.

## Built-in blocks

The alpha supports heading, rich text, image/logo, merge field, table, columns,
divider, spacer, header, footer, signature, conditional section, and explicit
page break blocks. Nested content is allowed only where its schema declares a
container.

Rich text is a project-owned AST of documents, paragraphs, text, and controlled
marks. Tiptap is an editing adapter, not the persisted contract.

## Validation and migrations

Use `parseDocument` at every untrusted boundary. A successful result contains a
typed document and stable diagnostics; a failure contains diagnostics without a
partially trusted document. Limits bound encoded size, node count, nesting,
rich-text length, table cells, and condition complexity.

`migrateDocument` applies registered migrations one schema version at a time.
Never mutate old persisted JSON in place or silently reinterpret a stored
version. A breaking persisted change requires a migration, fixture, and release
note.

## Extensions

Extension blocks use a namespaced type and JSON-compatible payload. Registry
definitions validate payloads and declare editor/compiler/renderer capabilities.
Unknown extensions are never executed. A host may preserve an unknown node as
inert data for forward compatibility, but it must not compile or render it as
trusted content.

See [extensions](extensions.md) for the package split and compatibility rules.
