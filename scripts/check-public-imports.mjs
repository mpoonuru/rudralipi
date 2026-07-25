import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const headlessPackages = [
  'core',
  'compiler',
  'renderer-html',
  'adapter-gotenberg',
]
const browserDependency = /^(react|react-dom|zustand|@tiptap\/|@dnd-kit\/)/
const staticImport =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
const dynamicImport = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectJavaScript(path)))
    } else if (
      entry.isFile() &&
      new Set(['.js', '.mjs']).has(extname(entry.name))
    ) {
      files.push(path)
    }
  }
  return files
}

function moduleSpecifiers(source) {
  return [...source.matchAll(staticImport), ...source.matchAll(dynamicImport)]
    .map((match) => match[1])
    .filter((specifier) => specifier !== undefined)
}

async function checkPackage(packageName) {
  const directory = join(process.cwd(), 'packages', packageName)
  const manifest = JSON.parse(
    await readFile(join(directory, 'package.json'), 'utf8'),
  )
  const declared = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  }
  const violations = Object.keys(declared)
    .filter((dependency) => browserDependency.test(dependency))
    .map(
      (dependency) =>
        `packages/${packageName}/package.json declares browser dependency ${dependency}`,
    )

  const outputDirectory = join(directory, 'dist')
  for (const file of await collectJavaScript(outputDirectory)) {
    const source = await readFile(file, 'utf8')
    for (const specifier of moduleSpecifiers(source)) {
      if (browserDependency.test(specifier)) {
        violations.push(
          `${relative(process.cwd(), file)} imports browser dependency ${specifier}`,
        )
      }
    }
  }
  return violations
}

const violations = (
  await Promise.all(headlessPackages.map(checkPackage))
).flat()

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation)
  }
  process.exitCode = 1
} else {
  process.stdout.write(
    `Verified ${headlessPackages.length} headless packages without browser runtime imports.\n`,
  )
}
