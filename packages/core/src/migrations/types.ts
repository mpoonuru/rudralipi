export interface SchemaMigration {
  readonly fromVersion: number
  readonly toVersion: number
  readonly migrate: (input: Readonly<Record<string, unknown>>) => unknown
}
