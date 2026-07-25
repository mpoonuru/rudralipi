import { resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const testDirectories = [
  'packages/core',
  'packages/compiler',
  'packages/localization',
  'packages/testing',
  'packages/renderer-html',
  'packages/adapter-gotenberg',
  'packages/rich-text-tiptap',
  'packages/editor-react',
  'apps/playground',
  'apps/visual-tests',
]

for (const directory of testDirectories) {
  const child = Bun.spawn(['bun', 'run', 'test'], {
    cwd: resolve(repositoryRoot, directory),
    stderr: 'inherit',
    stdout: 'inherit',
  })
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`Tests failed for ${directory}.`)
  }
  process.stdout.write(`Tested ${directory}.\n`)
}
