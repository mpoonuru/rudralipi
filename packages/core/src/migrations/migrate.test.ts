import { describe, expect, it } from 'vitest'

import { createDocumentFixture } from '../fixtures.js'
import { migrateDocument, type SchemaMigration } from './migrate.js'

const versionZeroToOne: SchemaMigration = {
  fromVersion: 0,
  toVersion: 1,
  migrate: (input) => ({
    ...input,
    schemaVersion: 1,
  }),
}

describe('migrateDocument', () => {
  it('migrates one schema version at a time without mutating input', () => {
    const input = {
      ...createDocumentFixture(),
      schemaVersion: 0,
    }
    const snapshot = structuredClone(input)

    const result = migrateDocument(input, [versionZeroToOne], 1)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(1)
    }
    expect(input).toEqual(snapshot)
  })

  it('rejects a missing migration link', () => {
    const input = {
      ...createDocumentFixture(),
      schemaVersion: 0,
    }

    const result = migrateDocument(input, [], 1)

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'migration.missing_link',
          details: {
            fromVersion: 0,
            targetVersion: 1,
          },
        },
      ],
    })
  })

  it('rejects unsupported future documents without running migrations', () => {
    const result = migrateDocument(
      {
        ...createDocumentFixture(),
        schemaVersion: 2,
      },
      [versionZeroToOne],
      1,
    )

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'migration.future_version',
        },
      ],
    })
  })
})
