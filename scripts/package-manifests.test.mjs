import { deepStrictEqual, strictEqual } from 'node:assert'
import { test } from 'node:test'

const packageDirectories = [
  'adapter-gotenberg',
  'compiler',
  'core',
  'editor-react',
  'localization',
  'renderer-html',
  'rich-text-tiptap',
  'testing',
]

const commonPublishedFiles = [
  'dist/**/*.d.ts',
  'dist/**/*.js',
  'LICENSE',
  'NOTICE',
  'README.md',
]

async function readManifest(packageDirectory) {
  return Bun.file(`packages/${packageDirectory}/package.json`).json()
}

test('published package manifests expose portable metadata and clean files', async () => {
  for (const packageDirectory of packageDirectories) {
    const manifest = await readManifest(packageDirectory)
    const expectedFiles =
      packageDirectory === 'editor-react'
        ? [...commonPublishedFiles, 'dist/**/*.css'].sort()
        : [...commonPublishedFiles].sort()

    strictEqual(manifest.types, './dist/index.d.ts', manifest.name)
    strictEqual(manifest.engines?.node, '>=22.12.0', manifest.name)
    deepStrictEqual([...manifest.files].sort(), expectedFiles, manifest.name)
    strictEqual(
      manifest.scripts?.prepack,
      'bun ../../scripts/package-legal-files.mjs prepare .',
      manifest.name,
    )
    strictEqual(
      manifest.scripts?.postpack,
      'bun ../../scripts/package-legal-files.mjs clean .',
      manifest.name,
    )
    strictEqual(
      await Bun.file(`packages/${packageDirectory}/README.md`).exists(),
      true,
      `${manifest.name} README`,
    )
  }
})

test('published Rudralipi packages pin internal alpha dependencies exactly', async () => {
  for (const packageDirectory of packageDirectories) {
    const manifest = await readManifest(packageDirectory)
    for (const [dependency, version] of Object.entries(
      manifest.dependencies ?? {},
    )) {
      if (dependency.startsWith('@rudralipi/')) {
        strictEqual(version, 'workspace:*', `${manifest.name} -> ${dependency}`)
      }
    }
  }
})

test('React packages support the Zentral React 19.1 baseline', async () => {
  for (const packageDirectory of ['editor-react', 'rich-text-tiptap']) {
    const manifest = await readManifest(packageDirectory)
    strictEqual(manifest.peerDependencies?.react, '>=19.1.0 <20')
    strictEqual(manifest.peerDependencies?.['react-dom'], '>=19.1.0 <20')
  }
})
