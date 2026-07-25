import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'bun:test'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

describe('packed package consumers', () => {
  it('supports isolated ESM, CommonJS dynamic import, and React 19.1 consumers', () => {
    const result = spawnSync('bun', ['scripts/check-package-consumers.mjs'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 180_000,
    })

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain(
      'Verified isolated ESM, CommonJS, and React 19.1 consumers.',
    )
  }, 185_000)
})
