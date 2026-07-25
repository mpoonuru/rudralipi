export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export type DiagnosticPath = ReadonlyArray<string | number>

export interface Diagnostic {
  readonly code: string
  readonly messageKey: string
  readonly severity: DiagnosticSeverity
  readonly path: DiagnosticPath
  readonly nodeId?: string
  readonly details?: Readonly<Record<string, string | number | boolean>>
}

export type Result<T> =
  | {
      readonly ok: true
      readonly value: T
      readonly diagnostics: ReadonlyArray<Diagnostic>
    }
  | {
      readonly ok: false
      readonly diagnostics: ReadonlyArray<Diagnostic>
    }

export function success<T>(
  value: T,
  diagnostics: ReadonlyArray<Diagnostic> = [],
): Result<T> {
  return {
    ok: true,
    value,
    diagnostics,
  }
}

export function failure<T = never>(
  diagnostics: ReadonlyArray<Diagnostic>,
): Result<T> {
  return {
    ok: false,
    diagnostics,
  }
}
