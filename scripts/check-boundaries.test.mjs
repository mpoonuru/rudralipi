import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  extractModuleSpecifiers,
  scanImportBoundaries,
  validateImportBoundaries,
} from './check-boundaries.mjs'

test('headless packages reject browser-only imports', () => {
  const violations = validateImportBoundaries([
    {
      file: 'packages/core/src/example.ts',
      specifier: 'react',
    },
    {
      file: 'packages/compiler/src/compile.ts',
      specifier: '@tiptap/core',
    },
    {
      file: 'packages/editor-react/src/editor.tsx',
      specifier: 'react',
    },
  ])

  assert.deepEqual(violations, [
    'packages/core/src/example.ts must not import react',
    'packages/compiler/src/compile.ts must not import @tiptap/core',
  ])
})

test('all packages reject prohibited class composition dependencies', () => {
  const violations = validateImportBoundaries([
    {
      file: 'packages/editor-react/src/button.tsx',
      specifier: 'class-variance-authority',
    },
    {
      file: 'apps/playground/src/app.tsx',
      specifier: 'cn',
    },
  ])

  assert.deepEqual(violations, [
    'packages/editor-react/src/button.tsx must not import class-variance-authority',
    'apps/playground/src/app.tsx must not import cn',
  ])
})

test('module extraction detects static imports and re-exports', () => {
  const imports = extractModuleSpecifiers(`
    import { create } from 'zustand'
    import type { ReactNode } from "react"
    export { Editor } from './editor.js'
  `)

  assert.deepEqual(imports, ['zustand', 'react', './editor.js'])
})

test('repository scan reports source-file boundary violations', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'rudralipi-boundaries-'))
  t.after(async () => {
    await rm(root, { recursive: true, force: true })
  })
  const sourceDirectory = join(root, 'packages', 'core', 'src')
  await mkdir(sourceDirectory, { recursive: true })
  await writeFile(
    join(sourceDirectory, 'unsafe.ts'),
    "import { createElement } from 'react'\n",
    'utf8',
  )

  const violations = await scanImportBoundaries(root)

  assert.deepEqual(violations, [
    'packages/core/src/unsafe.ts must not import react',
  ])
})
