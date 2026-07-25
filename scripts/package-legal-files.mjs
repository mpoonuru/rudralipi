import { copyFile, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { cwd } from 'node:process'

const repositoryRoot = resolve(import.meta.dir, '..')
const packagesRoot = resolve(repositoryRoot, 'packages')
const markerName = '.rudralipi-pack-legal'

function resolvePackageDirectory(input) {
  const packageDirectory = resolve(
    input === '.' ? cwd() : repositoryRoot,
    input,
  )
  const packageName = relative(packagesRoot, packageDirectory)
  if (
    packageName.length === 0 ||
    isAbsolute(packageName) ||
    packageName === '..' ||
    packageName.startsWith(`..${sep}`) ||
    packageName.includes(sep)
  ) {
    throw new RangeError('Package directory must be a direct packages/ child.')
  }
  return packageDirectory
}

async function prepare(packageDirectory) {
  const marker = resolve(packageDirectory, markerName)
  const license = resolve(packageDirectory, 'LICENSE')
  const notice = resolve(packageDirectory, 'NOTICE')

  if (await Bun.file(marker).exists()) {
    await clean(packageDirectory)
  }
  if ((await Bun.file(license).exists()) || (await Bun.file(notice).exists())) {
    throw new Error('Refusing to overwrite existing package legal files.')
  }

  await copyFile(resolve(repositoryRoot, 'LICENSE'), license)
  await copyFile(resolve(repositoryRoot, 'NOTICE'), notice)
  await writeFile(marker, 'temporary package legal files\n', 'utf8')
}

async function clean(packageDirectory) {
  const marker = resolve(packageDirectory, markerName)
  if (!(await Bun.file(marker).exists())) {
    return
  }

  await rm(resolve(packageDirectory, 'LICENSE'), { force: true })
  await rm(resolve(packageDirectory, 'NOTICE'), { force: true })
  await rm(marker, { force: true })
}

const [action, packageDirectoryInput] = process.argv.slice(2)
if (
  (action !== 'prepare' && action !== 'clean') ||
  packageDirectoryInput === undefined
) {
  throw new RangeError(
    'Usage: bun scripts/package-legal-files.mjs <prepare|clean> <package-dir>',
  )
}

const packageDirectory = resolvePackageDirectory(packageDirectoryInput)
if (action === 'prepare') {
  await prepare(packageDirectory)
} else {
  await clean(packageDirectory)
}
