import { resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const publishableDirectories = [
  'packages/core',
  'packages/compiler',
  'packages/localization',
  'packages/testing',
  'packages/renderer-html',
  'packages/adapter-gotenberg',
  'packages/rich-text-tiptap',
  'packages/editor-react',
]
const applicationDirectories = [
  'examples/node-render',
  'apps/playground',
  'apps/visual-tests',
]

async function build(directory) {
  const child = Bun.spawn(['bun', 'run', 'build'], {
    cwd: resolve(repositoryRoot, directory),
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) {
    throw new Error(stderr || stdout || `Build failed for ${directory}.`)
  }
  process.stdout.write(`Built ${directory}.\n`)
}

const directories = process.argv.includes('--packages-only')
  ? publishableDirectories
  : [...publishableDirectories, ...applicationDirectories]

for (const directory of directories) {
  await build(directory)
}
