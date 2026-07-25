# Extension Contracts

An extension is split into replaceable capabilities:

- a framework-neutral schema and migration definition;
- a compiler implementation that emits controlled renderer IR;
- an optional renderer implementation for an approved IR node;
- an optional React editor and inspector;
- localization catalogs and conformance fixtures.

No headless extension may import React, Tiptap, Zustand, dnd-kit, DOM globals, or
editor packages. UI extensions must not place arbitrary HTML, scripts, CSS, or
class strings into document JSON.

Extension types are namespaced and registered against the explicit extension
API version. Hosts should reject duplicate registrations and unsupported API
versions. Unknown extensions remain inert; they do not gain compiler or renderer
authority merely because an editor can display them.

Before publishing an extension, test parse failures, byte/depth limits,
migration order, deterministic compilation, HTML escaping, unavailable assets,
unknown payload fields, and editor save/reload behavior.
