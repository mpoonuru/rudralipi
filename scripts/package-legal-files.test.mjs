import { strictEqual } from 'node:assert'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { cwd } from 'node:process'
import { test } from 'node:test'

const testPackage = 'packages/.legal-files-test'

async function runLifecycle(action) {
  const child = Bun.spawn(
    ['bun', 'scripts/package-legal-files.mjs', action, testPackage],
    {
      cwd: cwd(),
      stderr: 'pipe',
      stdout: 'pipe',
    },
  )
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ])
  strictEqual(exitCode, 0, stderr)
}

async function runLifecycleFromPackage(action) {
  const child = Bun.spawn(
    ['bun', '../../scripts/package-legal-files.mjs', action, '.'],
    {
      cwd: `${cwd()}/${testPackage}`,
      stderr: 'pipe',
      stdout: 'pipe',
    },
  )
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ])
  strictEqual(exitCode, 0, stderr)
}

test('package lifecycle stages and cleans project legal files', async () => {
  await rm(testPackage, { force: true, recursive: true })
  await mkdir(testPackage, { recursive: true })

  try {
    await runLifecycle('prepare')

    strictEqual(
      await readFile(`${testPackage}/LICENSE`, 'utf8'),
      await readFile('LICENSE', 'utf8'),
    )
    strictEqual(
      await readFile(`${testPackage}/NOTICE`, 'utf8'),
      await readFile('NOTICE', 'utf8'),
    )

    await runLifecycle('clean')
    strictEqual(await Bun.file(`${testPackage}/LICENSE`).exists(), false)
    strictEqual(await Bun.file(`${testPackage}/NOTICE`).exists(), false)
  } finally {
    await rm(testPackage, { force: true, recursive: true })
  }
})

test('package lifecycle accepts the package working directory', async () => {
  await rm(testPackage, { force: true, recursive: true })
  await mkdir(testPackage, { recursive: true })

  try {
    await runLifecycleFromPackage('prepare')
    strictEqual(await Bun.file(`${testPackage}/LICENSE`).exists(), true)
    strictEqual(await Bun.file(`${testPackage}/NOTICE`).exists(), true)

    await runLifecycleFromPackage('clean')
    strictEqual(await Bun.file(`${testPackage}/LICENSE`).exists(), false)
    strictEqual(await Bun.file(`${testPackage}/NOTICE`).exists(), false)
  } finally {
    await rm(testPackage, { force: true, recursive: true })
  }
})
