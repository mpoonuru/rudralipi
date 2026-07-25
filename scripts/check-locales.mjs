import { builtInCatalogs } from '../packages/localization/dist/index.js'

const referenceKeys = Object.keys(builtInCatalogs.en).sort()
const violations = []

for (const [locale, catalog] of Object.entries(builtInCatalogs)) {
  const keys = Object.keys(catalog).sort()
  const missing = referenceKeys.filter((key) => !(key in catalog))
  const excess = keys.filter((key) => !(key in builtInCatalogs.en))
  const empty = keys.filter((key) => catalog[key].trim().length === 0)

  if (missing.length > 0) {
    violations.push(`${locale} is missing: ${missing.join(', ')}`)
  }
  if (excess.length > 0) {
    violations.push(`${locale} has unknown keys: ${excess.join(', ')}`)
  }
  if (empty.length > 0) {
    violations.push(`${locale} has empty messages: ${empty.join(', ')}`)
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation)
  }
  process.exitCode = 1
} else {
  process.stdout.write(
    `Verified ${Object.keys(builtInCatalogs).length} complete locale catalogs with ${referenceKeys.length} messages each.\n`,
  )
}
