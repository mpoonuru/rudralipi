# Contributing to Rudralipi

Rudralipi welcomes focused issues and pull requests that preserve its
product-independent architecture.

## Development rules

- Use Yarn only.
- Use Day.js for every date/time operation.
- Use named ECMAScript imports and ESM-only packages.
- Do not add `cn`, `cva`, arbitrary stored HTML, arbitrary stored CSS classes,
  executable templates, or paid editor extensions.
- Keep headless packages free of React and browser dependencies.
- Add a failing behavior test before implementation.
- Run `yarn verify` before submitting a change.
- Do not include secrets, authenticated URLs, customer data, private assets, or
  unrelated product code in code, tests, fixtures, logs, or documentation.
- Keep source, documentation, Git references, commit metadata, contribution
  trailers, release notes, and pull requests project-owned and neutral. Do not
  include tool, vendor, model, or automation attribution.

Contributions are submitted under the Apache License 2.0.

## Workspace workflow

```sh
corepack enable
yarn install --immutable
yarn verify
```

Use `yarn workspace <package-name> test` for a focused test and
`yarn verify:release` before a release-candidate pull request. Browser snapshots
are reviewed artifacts: update them only when the visible change is intentional
and explain the design impact in the pull request.

## Architecture changes

Changes to persisted JSON, commands, extension contracts, compiler behavior, or
rendered output require:

1. a behavior test that demonstrates the old and new contract;
2. a sequential migration when stored documents are affected;
3. updated public documentation and release notes;
4. proportional security, browser, print, or visual fixtures.

Keep public exports narrow. Framework-neutral packages may depend only on other
framework-neutral packages; adopting applications provide I/O through typed
adapters.
