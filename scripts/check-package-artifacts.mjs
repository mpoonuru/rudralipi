import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const repositoryRoot = resolve(import.meta.dir, '..')
const releaseVersion = '0.1.0-alpha.0'
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

async function archiveText(archive, entry) {
  return run(['tar', '-xOf', archive, entry], repositoryRoot)
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function validateArchive(archive, packageDirectory) {
  const listing = (await run(['tar', '-tzf', archive], repositoryRoot))
    .split('\n')
    .filter(Boolean)
  const entries = new Set(listing)
  const label = `@rudralipi/${packageDirectory}`

  for (const required of [
    'package/package.json',
    'package/README.md',
    'package/LICENSE',
    'package/NOTICE',
    'package/dist/index.js',
    'package/dist/index.d.ts',
  ]) {
    assertCondition(entries.has(required), `${label} is missing ${required}.`)
  }
  if (packageDirectory === 'editor-react') {
    assertCondition(
      entries.has('package/dist/styles.css'),
      `${label} is missing its stylesheet.`,
    )
  }

  const forbidden = listing.filter(
    (entry) =>
      entry.includes('test-setup') ||
      entry.includes('.test.') ||
      entry.includes('.spec.') ||
      entry.includes('.tsbuildinfo') ||
      entry.endsWith('.map') ||
      entry.startsWith('package/src/'),
  )
  assertCondition(
    forbidden.length === 0,
    `${label} contains forbidden files: ${forbidden.join(', ')}`,
  )

  const manifest = JSON.parse(
    await archiveText(archive, 'package/package.json'),
  )
  assertCondition(manifest.name === label, `${label} has the wrong name.`)
  assertCondition(
    manifest.version === releaseVersion,
    `${label} has the wrong version.`,
  )
  assertCondition(
    manifest.types === './dist/index.d.ts',
    `${label} has no portable types entry.`,
  )
  assertCondition(
    manifest.engines?.node === '>=22.12.0',
    `${label} has the wrong Node engine.`,
  )
  assertCondition(
    !JSON.stringify(manifest).includes('workspace:'),
    `${label} contains unresolved workspace dependencies.`,
  )
  for (const [dependency, version] of Object.entries(
    manifest.dependencies ?? {},
  )) {
    if (dependency.startsWith('@rudralipi/')) {
      assertCondition(
        version === releaseVersion,
        `${label} does not pin ${dependency} exactly.`,
      )
    }
  }

  assertCondition(
    (await archiveText(archive, 'package/LICENSE')) ===
      (await readFile(resolve(repositoryRoot, 'LICENSE'), 'utf8')),
    `${label} license differs from the project license.`,
  )
  assertCondition(
    (await archiveText(archive, 'package/NOTICE')) ===
      (await readFile(resolve(repositoryRoot, 'NOTICE'), 'utf8')),
    `${label} notice differs from the project notice.`,
  )
}

const archiveDirectory = await mkdtemp(
  join(tmpdir(), 'rudralipi-package-audit-'),
)

try {
  await run(
    ['bun', 'scripts/build-workspace.mjs', '--packages-only'],
    repositoryRoot,
  )
  for (const packageDirectory of packageDirectories) {
    const before = new Set(await readdir(archiveDirectory))
    const cwd = resolve(repositoryRoot, 'packages', packageDirectory)
    await run(
      ['bun', 'pm', 'pack', '--destination', archiveDirectory, '--quiet'],
      cwd,
    )
    const created = (await readdir(archiveDirectory)).filter(
      (entry) => !before.has(entry) && entry.endsWith('.tgz'),
    )
    assertCondition(
      created.length === 1,
      `Expected one archive for @rudralipi/${packageDirectory}.`,
    )
    await validateArchive(
      resolve(archiveDirectory, created[0]),
      packageDirectory,
    )
    assertCondition(
      !(await Bun.file(resolve(cwd, 'LICENSE')).exists()) &&
        !(await Bun.file(resolve(cwd, 'NOTICE')).exists()),
      `@rudralipi/${packageDirectory} left temporary legal files behind.`,
    )
  }

  process.stdout.write(
    `Verified ${packageDirectories.length} clean package archives.\n`,
  )
} finally {
  await rm(archiveDirectory, { force: true, recursive: true })
}
