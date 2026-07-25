# Rudralipi Alpha Roadmap

Status: implemented and under release-candidate verification
Release target: `0.1.0-alpha.0`

The first alpha establishes a complete vertical slice from versioned document
JSON through editing, compilation, HTML/print rendering, and optional PDF
transport. The alpha is deliberately explicit about unstable contracts: schema
and extension changes remain possible until the `1.0.0` stability gates are
met.

## Delivered

- Apache-2.0 Bun workspace with strict TypeScript and package-boundary gates.
- Versioned, runtime-validated document schema covering every built-in block.
- Sequential migrations, block registry, immutable commands, transactions,
  bounded undo, and redo.
- Backend-authoritative compiler with controlled merge fields and conditions,
  asset/font policy, limits, diagnostics, canonical hashing, and renderer IR.
- Deterministic semantic HTML, Content Security Policy, preview CSS, and print
  CSS.
- Complete English, German, Italian, and Turkish editor catalogs.
- Controlled React editor with accessible sorting, per-instance Zustand state,
  an owned rich-text AST, and a replaceable Tiptap adapter.
- Standalone playground proving edit, save, validation, reload, localization,
  and compiler-backed preview.
- Defensive Gotenberg adapter with transport, payload, timeout, response, and
  endpoint controls.
- Unit, integration, security, accessibility, browser, desktop/mobile visual,
  long-table, header/footer, and page-break fixtures.

## Alpha release gates

Every alpha candidate must pass:

1. frozen Bun installation;
2. formatting, lint, dependency-boundary, and strict type checks;
3. package and repository tests;
4. production builds;
5. public headless-import and localization completeness checks;
6. browser edit/save/reload, localization, preview, accessibility, and visual
   regression tests;
7. a clean worktree review with no generated build output or private material.

Run the full local gate with:

```sh
bun run verify:release
```

## Next contract milestones

- `0.1.x alpha`: harden diagnostics, migrations, host adapters, and fixture
  coverage while accepting documented breaking changes.
- `0.2.x alpha`: introduce extension conformance kits and broaden print/PDF
  parity fixtures.
- `0.x beta`: freeze schema and extension candidates, publish migration and
  compatibility guarantees, and validate package consumers.
- `1.0.0`: stabilize schema, migrations, compiler IR policy, renderer output
  contracts, extension API, and support policy.

No milestone promotes editor preview to a trust boundary. Validation,
compilation, authorization-aware adapters, and final rendering remain
authoritative outside the editor.
