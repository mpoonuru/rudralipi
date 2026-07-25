import { strictEqual } from 'node:assert'
import { test } from 'node:test'

test(
  'all publishable package archives pass the release artifact contract',
  { timeout: 120_000 },
  async () => {
    const child = Bun.spawn(['bun', 'scripts/check-package-artifacts.mjs'], {
      cwd: process.cwd(),
      stderr: 'pipe',
      stdout: 'pipe',
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])

    strictEqual(exitCode, 0, stderr || stdout)
    strictEqual(stdout.includes('Verified 8 clean package archives.'), true)
  },
)
