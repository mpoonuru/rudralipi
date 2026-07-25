import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HEADLESS_PACKAGES = new Set([
  'core',
  'compiler',
  'renderer-html',
  'adapter-gotenberg',
])

const BROWSER_ONLY_IMPORT = /^(react|react-dom|zustand|@tiptap\/|@dnd-kit\/)/
const PROHIBITED_IMPORT = /^(cn|cva|class-variance-authority)$/
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.worktrees',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
])

export function extractModuleSpecifiers(source) {
  const specifiers = []
  const statement =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g

  for (const match of source.matchAll(statement)) {
    specifiers.push(match[1])
  }

  return specifiers
}

export function validateImportBoundaries(imports) {
  return imports.flatMap(({ file, specifier }) => {
    const packageName = file.split('/')[1]
    const isHeadlessViolation =
      HEADLESS_PACKAGES.has(packageName) && BROWSER_ONLY_IMPORT.test(specifier)
    const isProhibited = PROHIBITED_IMPORT.test(specifier)

    return isHeadlessViolation || isProhibited
      ? [`${file} must not import ${specifier}`]
      : []
  })
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) {
      continue
    }

    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

export async function scanImportBoundaries(root) {
  const files = await collectSourceFiles(root)
  const imports = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const normalizedFile = relative(root, file).split(sep).join('/')
    for (const specifier of extractModuleSpecifiers(source)) {
      imports.push({ file: normalizedFile, specifier })
    }
  }

  return validateImportBoundaries(imports)
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  const violations = await scanImportBoundaries(process.cwd())
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation)
    }
    process.exitCode = 1
  }
}
