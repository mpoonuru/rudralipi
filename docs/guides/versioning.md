# Versioning

Rudralipi follows Semantic Versioning. Early releases use `alpha` and `beta`
prerelease identifiers while persisted schema, extension, compiler, and renderer
contracts stabilize.

During `0.x`, a breaking public API change requires release notes. A persisted
document change additionally requires a sequential migration and golden
fixtures. Removing a migration path for a previously published stored version
is not allowed.

`1.0.0` requires stable document and extension contracts, migration guarantees,
backend/browser parity fixtures, security limits, package consumer tests, and a
published supported-version policy.
