import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const packageDirectories = [
  'core',
  'compiler',
  'localization',
  'testing',
  'renderer-html',
  'adapter-gotenberg',
  'rich-text-tiptap',
  'editor-react',
]

async function run(command, cwd) {
  const child = Bun.spawn(command, {
    cwd,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) {
    throw new Error(stderr || stdout || `${command[0]} failed.`)
  }
  return stdout
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function packPackages(archiveDirectory) {
  const archives = new Map()

  for (const packageDirectory of packageDirectories) {
    const before = new Set(await readdir(archiveDirectory))
    const packageRoot = resolve(repositoryRoot, 'packages', packageDirectory)
    await run(
      ['bun', 'pm', 'pack', '--destination', archiveDirectory, '--quiet'],
      packageRoot,
    )
    const created = (await readdir(archiveDirectory)).filter(
      (entry) => !before.has(entry) && entry.endsWith('.tgz'),
    )
    assertCondition(
      created.length === 1,
      `Expected one archive for @rudralipi/${packageDirectory}.`,
    )
    archives.set(
      `@rudralipi/${packageDirectory}`,
      resolve(archiveDirectory, created[0]),
    )
  }

  return archives
}

const esmConsumer = `
import { failure } from '@rudralipi/core'
import { compileDocument } from '@rudralipi/compiler'
import { renderHtml } from '@rudralipi/renderer-html'
import { createDocumentFixture } from '@rudralipi/testing'

const fixture = createDocumentFixture()
const { headerId: ignoredHeaderId, footerId: ignoredFooterId, ...page } =
  fixture.page
void ignoredHeaderId
void ignoredFooterId
const document = {
  ...fixture,
  fonts: [],
  page,
  content: fixture.content.filter(({ type }) => type === 'heading'),
}
const compiled = await compileDocument(document, {
  assetResolver: async () => failure([]),
  mergeData: {},
})
if (!compiled.ok) {
  throw new Error(
    \`The isolated ESM consumer could not compile a document: \${JSON.stringify(compiled.diagnostics)}\`,
  )
}
const rendered = renderHtml(compiled.value, {
  completeDocument: true,
  mode: 'print',
})
if (!rendered.documentHtml.startsWith('<!doctype html>')) {
  throw new Error('The isolated ESM consumer did not render complete HTML.')
}
if (rendered.hash !== compiled.value.hash) {
  throw new Error('The isolated ESM consumer produced an inconsistent hash.')
}
`

const commonJsConsumer = `
void (async () => {
  const [{ parseDocument }, { createDocumentFixture }] = await Promise.all([
    import('@rudralipi/core'),
    import('@rudralipi/testing'),
  ])
  const parsed = parseDocument(createDocumentFixture())
  if (!parsed.ok) {
    throw new Error('The CommonJS consumer could not dynamically load Rudralipi.')
  }
})()
`

const reactConsumer = `
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

import { createDocumentFixture } from '@rudralipi/core'
import { RudralipiEditor } from '@rudralipi/editor-react'

const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: 'https://rudralipi.local/',
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.navigator = dom.window.navigator
globalThis.Element = dom.window.Element
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Node = dom.window.Node
globalThis.AbortController = dom.window.AbortController
globalThis.AbortSignal = dom.window.AbortSignal
globalThis.MutationObserver = dom.window.MutationObserver
globalThis.getComputedStyle = dom.window.getComputedStyle
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const fixture = createDocumentFixture()
const { headerId: ignoredHeaderId, footerId: ignoredFooterId, ...page } =
  fixture.page
void ignoredHeaderId
void ignoredFooterId
const documentValue = {
  ...fixture,
  fonts: [],
  page,
  content: fixture.content.filter(({ type }) => type === 'heading'),
}
const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('The React consumer fixture has no root element.')
}
const root = createRoot(rootElement)
let sequence = 0
await act(async () => {
  root.render(
    createElement(RudralipiEditor, {
      context: {
        generateId: (prefix) => {
          sequence += 1
          return \`\${prefix}-consumer-\${sequence}\`
        },
        nowIso: () => '2026-07-25T12:00:00.000Z',
      },
      document: documentValue,
      locale: 'en',
      onChange: () => {},
    }),
  )
})
const application = document.querySelector('[role="application"]')
if (application === null || application.getAttribute('lang') !== 'en') {
  throw new Error('The React 19.1 consumer did not render the editor.')
}
if (!application.textContent?.includes('Document heading')) {
  throw new Error('The React 19.1 consumer did not render document content.')
}
await act(async () => root.unmount())
dom.window.close()
`

const temporaryRoot = await mkdtemp(
  join(tmpdir(), 'rudralipi-package-consumers-'),
)
const archiveDirectory = resolve(temporaryRoot, 'archives')
const consumerDirectory = resolve(temporaryRoot, 'consumer')

try {
  await Promise.all([
    mkdir(archiveDirectory, { recursive: true }),
    mkdir(consumerDirectory, { recursive: true }),
  ])
  await run(
    ['bun', 'scripts/build-workspace.mjs', '--packages-only'],
    repositoryRoot,
  )
  const archives = await packPackages(archiveDirectory)
  const dependencies = Object.fromEntries(
    [...archives].map(([name, archive]) => [name, `file:${archive}`]),
  )
  await writeFile(
    resolve(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'rudralipi-isolated-consumer',
        private: true,
        type: 'module',
        dependencies: {
          ...dependencies,
          jsdom: '26.1.0',
          react: '19.1.0',
          'react-dom': '19.1.0',
        },
        overrides: dependencies,
      },
      null,
      2,
    )}\n`,
  )
  await Promise.all([
    writeFile(resolve(consumerDirectory, 'esm-consumer.mjs'), esmConsumer),
    writeFile(
      resolve(consumerDirectory, 'commonjs-consumer.cjs'),
      commonJsConsumer,
    ),
    writeFile(resolve(consumerDirectory, 'react-consumer.mjs'), reactConsumer),
  ])

  await run(['bun', 'install', '--exact'], consumerDirectory)
  assertCondition(
    (await readFile(resolve(consumerDirectory, 'bun.lock'), 'utf8')).includes(
      '@rudralipi/core',
    ),
    'The isolated consumer lockfile does not contain Rudralipi.',
  )
  await run(['bun', 'install', '--frozen-lockfile'], consumerDirectory)
  await run(['bun', 'esm-consumer.mjs'], consumerDirectory)
  await run(['node', 'commonjs-consumer.cjs'], consumerDirectory)
  await run(['bun', 'react-consumer.mjs'], consumerDirectory)

  process.stdout.write(
    'Verified isolated ESM, CommonJS, and React 19.1 consumers.\n',
  )
} finally {
  await rm(temporaryRoot, { force: true, recursive: true })
}
