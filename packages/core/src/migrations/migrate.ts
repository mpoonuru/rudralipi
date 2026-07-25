import { failure, type Diagnostic, type Result } from '../diagnostics.js'
import { cloneJsonValue } from '../json.js'
import { CURRENT_SCHEMA_VERSION } from '../schema/common.js'
import { parseDocument } from '../schema/parse.js'
import type { RudralipiDocument } from '../schema/document.js'
import type { SchemaMigration } from './types.js'

export type { SchemaMigration } from './types.js'

function migrationDiagnostic(
  code: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details,
  }
}

function readSchemaVersion(input: unknown): number | undefined {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null)
  ) {
    return undefined
  }
  const descriptor = Object.getOwnPropertyDescriptor(input, 'schemaVersion')
  return descriptor !== undefined &&
    'value' in descriptor &&
    typeof descriptor.value === 'number' &&
    Number.isSafeInteger(descriptor.value) &&
    descriptor.value >= 0
    ? descriptor.value
    : undefined
}

export function migrateDocument(
  input: unknown,
  migrations: ReadonlyArray<SchemaMigration>,
  targetVersion = CURRENT_SCHEMA_VERSION,
): Result<RudralipiDocument> {
  const inputVersion = readSchemaVersion(input)
  if (inputVersion === undefined) {
    return failure([migrationDiagnostic('migration.invalid_input')])
  }
  if (targetVersion !== CURRENT_SCHEMA_VERSION) {
    return failure([
      migrationDiagnostic('migration.unsupported_target', {
        targetVersion,
        supportedVersion: CURRENT_SCHEMA_VERSION,
      }),
    ])
  }
  if (inputVersion > targetVersion) {
    return failure([
      migrationDiagnostic('migration.future_version', {
        inputVersion,
        targetVersion,
      }),
    ])
  }
  if (inputVersion === targetVersion) {
    return parseDocument(input)
  }

  const bySourceVersion = new Map<number, SchemaMigration>()
  for (const migration of migrations) {
    if (
      migration.toVersion !== migration.fromVersion + 1 ||
      bySourceVersion.has(migration.fromVersion)
    ) {
      return failure([
        migrationDiagnostic('migration.invalid_definition', {
          fromVersion: migration.fromVersion,
          toVersion: migration.toVersion,
        }),
      ])
    }
    bySourceVersion.set(migration.fromVersion, migration)
  }

  let current: unknown
  try {
    current = cloneJsonValue(input)
  } catch {
    return failure([migrationDiagnostic('migration.invalid_input')])
  }
  let currentVersion = inputVersion
  while (currentVersion < targetVersion) {
    const migration = bySourceVersion.get(currentVersion)
    if (migration === undefined) {
      return failure([
        migrationDiagnostic('migration.missing_link', {
          fromVersion: currentVersion,
          targetVersion,
        }),
      ])
    }
    try {
      current = migration.migrate(
        cloneJsonValue(current) as Readonly<Record<string, unknown>>,
      )
    } catch {
      return failure([
        migrationDiagnostic('migration.execution_failed', {
          fromVersion: migration.fromVersion,
          toVersion: migration.toVersion,
        }),
      ])
    }
    const migratedVersion = readSchemaVersion(current)
    if (migratedVersion !== migration.toVersion) {
      return failure([
        migrationDiagnostic('migration.invalid_output', {
          fromVersion: migration.fromVersion,
          expectedVersion: migration.toVersion,
        }),
      ])
    }
    currentVersion = migratedVersion
  }

  return parseDocument(current)
}
