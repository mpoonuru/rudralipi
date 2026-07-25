# Localization

Rudralipi ships complete editor catalogs for `en`, `de`, `it`, and `tr`.
Documents store locale-independent semantic content and choose a locale for
formatting and editor presentation; built-in UI strings are never hardcoded to
German or another single language.

Catalogs share one typed message-key contract. Missing built-in keys fail the
locale gate. Host applications may supply additional catalogs and should apply
the same completeness rule.

Merge-field date and number formatting uses the document locale. Date parsing
and manipulation uses Day.js. Persist timestamps as ISO strings, not runtime
date objects.

Text direction is an explicit document field. The alpha catalogs are
left-to-right, while the schema and renderer preserve the direction boundary
for future locale support.
