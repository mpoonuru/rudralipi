import { z } from 'zod'

import { mergeFieldKeySchema } from './common.js'

export type ConditionalLiteral = string | number | boolean | null

export type ConditionalExpression =
  | {
      readonly op: 'exists'
      readonly field: string
    }
  | {
      readonly op: 'equals' | 'notEquals'
      readonly field: string
      readonly value: ConditionalLiteral
    }
  | {
      readonly op: 'greaterThan' | 'greaterThanOrEqual' | 'lessThan'
      readonly field: string
      readonly value: number
    }
  | {
      readonly op: 'isEmpty'
      readonly field: string
    }
  | {
      readonly op: 'all' | 'any'
      readonly conditions: ReadonlyArray<ConditionalExpression>
    }
  | {
      readonly op: 'not'
      readonly condition: ConditionalExpression
    }

const conditionalLiteralSchema = z.union([
  z.string().max(10_000),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const conditionalExpressionSchema: z.ZodType<ConditionalExpression> =
  z.lazy(() =>
    z.discriminatedUnion('op', [
      z.strictObject({
        op: z.literal('exists'),
        field: mergeFieldKeySchema,
      }),
      z.strictObject({
        op: z.enum(['equals', 'notEquals']),
        field: mergeFieldKeySchema,
        value: conditionalLiteralSchema,
      }),
      z.strictObject({
        op: z.enum(['greaterThan', 'greaterThanOrEqual', 'lessThan']),
        field: mergeFieldKeySchema,
        value: z.number().finite(),
      }),
      z.strictObject({
        op: z.literal('isEmpty'),
        field: mergeFieldKeySchema,
      }),
      z.strictObject({
        op: z.enum(['all', 'any']),
        conditions: conditionalExpressionSchema.array().min(1).max(100),
      }),
      z.strictObject({
        op: z.literal('not'),
        condition: conditionalExpressionSchema,
      }),
    ]),
  )
