import { rm } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { cwd } from 'node:process'

const repositoryRoot = resolve(import.meta.dir, '..')
const packagesRoot = resolve(repositoryRoot, 'packages')
const packageDirectory = resolve(cwd())
const packageName = relative(packagesRoot, packageDirectory)

if (
  packageName.length === 0 ||
  isAbsolute(packageName) ||
  packageName === '..' ||
  packageName.startsWith(`..${sep}`) ||
  packageName.includes(sep)
) {
  throw new RangeError('Package output cleanup requires a packages/ child.')
}

await rm(resolve(packageDirectory, 'dist'), {
  force: true,
  recursive: true,
})
