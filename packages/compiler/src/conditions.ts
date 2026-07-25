import {
  failure,
  success,
  type ConditionalExpression,
  type Diagnostic,
  type Result,
} from '@rudralipi/core'

import {
  isMergeValueCompatible,
  readMergeDataField,
  type MergeFieldCatalog,
} from './merge-fields.js'
import { defaultCompilerLimits, type CompilerLimits } from './limits.js'

export { defaultCompilerLimits } from './limits.js'

export interface ConditionEvaluationOptions {
  readonly catalog: MergeFieldCatalog
  readonly limits?: CompilerLimits | undefined
}

function conditionDiagnostic(
  code: string,
  field?: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details: {
      ...(field === undefined ? {} : { field }),
      ...details,
    },
  }
}

function countExpression(
  expression: ConditionalExpression,
  depth = 1,
): {
  readonly nodes: number
  readonly depth: number
} {
  switch (expression.op) {
    case 'all':
    case 'any': {
      let nodes = 1
      let maximumDepth = depth
      for (const condition of expression.conditions) {
        const child = countExpression(condition, depth + 1)
        nodes += child.nodes
        maximumDepth = Math.max(maximumDepth, child.depth)
      }
      return { nodes, depth: maximumDepth }
    }
    case 'not': {
      const child = countExpression(expression.condition, depth + 1)
      return {
        nodes: child.nodes + 1,
        depth: child.depth,
      }
    }
    default:
      return { nodes: 1, depth }
  }
}

function evaluateLeaf(
  expression: ConditionalExpression,
  data: Readonly<Record<string, unknown>>,
  catalog: MergeFieldCatalog,
): Result<boolean> {
  if (!('field' in expression)) {
    return failure([conditionDiagnostic('condition.invalid_expression')])
  }
  const definition = catalog.get(expression.field)
  if (definition === undefined) {
    return failure([
      conditionDiagnostic('condition.unknown_field', expression.field),
    ])
  }
  const field = readMergeDataField(data, expression.field)
  if (expression.op === 'exists') {
    return success(
      field.found && field.value !== null && field.value !== undefined,
    )
  }
  if (expression.op === 'isEmpty') {
    if (!field.found || field.value === null || field.value === undefined) {
      return success(true)
    }
    if (typeof field.value === 'string' || Array.isArray(field.value)) {
      return success(field.value.length === 0)
    }
    return failure([
      conditionDiagnostic('condition.invalid_operator', expression.field),
    ])
  }
  if (!field.found || !isMergeValueCompatible(definition, field.value)) {
    return failure([
      conditionDiagnostic('condition.invalid_field_value', expression.field),
    ])
  }
  switch (expression.op) {
    case 'equals':
      return success(Object.is(field.value, expression.value))
    case 'notEquals':
      return success(!Object.is(field.value, expression.value))
    case 'greaterThan':
    case 'greaterThanOrEqual':
    case 'lessThan':
      if (
        definition.valueType !== 'number' ||
        typeof field.value !== 'number'
      ) {
        return failure([
          conditionDiagnostic('condition.invalid_operator', expression.field),
        ])
      }
      if (expression.op === 'greaterThan') {
        return success(field.value > expression.value)
      }
      if (expression.op === 'greaterThanOrEqual') {
        return success(field.value >= expression.value)
      }
      return success(field.value < expression.value)
  }
}

function evaluateInternal(
  expression: ConditionalExpression,
  data: Readonly<Record<string, unknown>>,
  catalog: MergeFieldCatalog,
): Result<boolean> {
  if (expression.op === 'not') {
    const result = evaluateInternal(expression.condition, data, catalog)
    return result.ok ? success(!result.value) : result
  }
  if (expression.op === 'all' || expression.op === 'any') {
    const values: boolean[] = []
    for (const condition of expression.conditions) {
      const result = evaluateInternal(condition, data, catalog)
      if (!result.ok) {
        return result
      }
      values.push(result.value)
    }
    return success(
      expression.op === 'all' ? values.every(Boolean) : values.some(Boolean),
    )
  }
  return evaluateLeaf(expression, data, catalog)
}

export function evaluateCondition(
  expression: ConditionalExpression,
  data: Readonly<Record<string, unknown>>,
  options: ConditionEvaluationOptions,
): Result<boolean> {
  const limits = options.limits ?? defaultCompilerLimits
  const complexity = countExpression(expression)
  if (complexity.nodes > limits.maxConditionNodes) {
    return failure([
      conditionDiagnostic('condition.limit.nodes', undefined, {
        maximum: limits.maxConditionNodes,
      }),
    ])
  }
  if (complexity.depth > limits.maxConditionDepth) {
    return failure([
      conditionDiagnostic('condition.limit.depth', undefined, {
        maximum: limits.maxConditionDepth,
      }),
    ])
  }
  return evaluateInternal(expression, data, options.catalog)
}
