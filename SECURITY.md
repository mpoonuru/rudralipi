# Security Policy

## Supported versions

Rudralipi is pre-alpha. Security fixes are applied to the latest development
line until the first published release establishes a version support matrix.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private
security advisory workflow for this repository and include:

- affected package and version or commit;
- a minimal reproduction using synthetic data;
- expected and observed trust-boundary behavior;
- potential impact;
- any safe mitigation already identified.

Never include production credentials, personal data, private documents, or
authenticated asset URLs in a report.

## Security boundaries

Documents, merge data, extension payloads, adapter results, URLs, assets, and
fonts are untrusted. The backend/headless compiler and renderer remain
authoritative even when an editor preview appears valid.

Rudralipi does not execute document scripts, templates, arbitrary expressions,
stored HTML, event handlers, or arbitrary CSS classes. Rendered HTML escapes
text and attributes, emits a restrictive Content Security Policy, and embeds
only compiler-approved resources.

Host applications are responsible for authorization, tenant isolation,
persistence, asset access, merge-data access, network egress, and PDF-service
deployment. Adapter inputs must use opaque identifiers rather than signed URLs
or credentials stored in documents.

## PDF deployment

Treat Gotenberg as an internal rendering service. Do not expose it directly to
untrusted public traffic. Place authentication, request limits, network policy,
and observability at the host boundary; restrict outbound access; and keep
private credentials out of Rudralipi documents and diagnostics. The adapter
defaults to HTTPS, rejects embedded endpoint credentials, limits payload and
response sizes, applies a timeout, and validates PDF responses.
