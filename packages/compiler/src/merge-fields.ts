import {
  failure,
  mergeFieldKeySchema,
  success,
  type Diagnostic,
  type Result,
} from '@rudralipi/core'
import { default as dayjs } from 'dayjs'
import 'dayjs/locale/de.js'
import 'dayjs/locale/en.js'
import 'dayjs/locale/it.js'
import 'dayjs/locale/tr.js'

import type { SupportedLocale } from '@rudralipi/core'

export type MergeFieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'money'
  | 'date'
  | 'dateTime'
  | 'address'
  | 'image'
  | 'list'

export type MergeFieldFormat = 'plain' | 'short' | 'long' | 'currency'
export type MergeFieldSensitivity =
  'public' | 'internal' | 'confidential' | 'restricted'

export interface MergeFieldDefinition {
  readonly key: string
  readonly label: string
  readonly valueType: MergeFieldValueType
  readonly sensitivity: MergeFieldSensitivity
  readonly allowedFormats: ReadonlyArray<MergeFieldFormat>
  readonly description?: string | undefined
  readonly example?: unknown
}

export interface MergeFieldCatalog {
  readonly definitions: ReadonlyArray<MergeFieldDefinition>
  has(key: string): boolean
  get(key: string): MergeFieldDefinition | undefined
}

export interface MergeDataRead {
  readonly found: boolean
  readonly value: unknown
}

export type ResolvedMergeValue =
  | {
      readonly kind: 'text'
      readonly text: string
    }
  | {
      readonly kind: 'image'
      readonly assetId: string
      readonly alt: string
    }
  | {
      readonly kind: 'list'
      readonly items: ReadonlyArray<unknown>
    }

interface MoneyValue {
  readonly amount: number
  readonly currency: string
}

interface AddressValue {
  readonly lines: ReadonlyArray<string>
}

interface ImageValue {
  readonly assetId: string
  readonly alt?: string | undefined
}

function mergeDiagnostic(
  code: string,
  field: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details: {
      field,
      ...details,
    },
  }
}

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function readOwnValue(
  value: Readonly<Record<string, unknown>>,
  key: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor !== undefined && 'value' in descriptor
    ? descriptor.value
    : undefined
}

export function readMergeDataField(
  data: Readonly<Record<string, unknown>>,
  field: string,
): MergeDataRead {
  let current: unknown = data
  for (const segment of field.split('.')) {
    if (!isPlainRecord(current)) {
      return { found: false, value: undefined }
    }
    const descriptor = Object.getOwnPropertyDescriptor(current, segment)
    if (descriptor === undefined || !('value' in descriptor)) {
      return { found: false, value: undefined }
    }
    current = descriptor.value
  }
  return { found: true, value: current }
}

function isMoneyValue(value: unknown): value is MoneyValue {
  if (!isPlainRecord(value)) {
    return false
  }
  const amount = readOwnValue(value, 'amount')
  const currency = readOwnValue(value, 'currency')
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    typeof currency === 'string' &&
    /^[A-Z]{3}$/.test(currency)
  )
}

function isAddressValue(value: unknown): value is AddressValue {
  if (!isPlainRecord(value)) {
    return false
  }
  const lines = readOwnValue(value, 'lines')
  return (
    Array.isArray(lines) &&
    lines.length <= 20 &&
    lines.every((line) => typeof line === 'string' && line.length <= 1_000)
  )
}

function isImageValue(value: unknown): value is ImageValue {
  if (!isPlainRecord(value)) {
    return false
  }
  const assetId = readOwnValue(value, 'assetId')
  const alt = readOwnValue(value, 'alt')
  return (
    typeof assetId === 'string' &&
    assetId.length > 0 &&
    (alt === undefined || typeof alt === 'string')
  )
}

export function isMergeValueCompatible(
  definition: MergeFieldDefinition,
  value: unknown,
): boolean {
  switch (definition.valueType) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'money':
      return isMoneyValue(value)
    case 'date':
    case 'dateTime':
      return typeof value === 'string' && dayjs(value).isValid()
    case 'address':
      return isAddressValue(value)
    case 'image':
      return isImageValue(value)
    case 'list':
      return Array.isArray(value)
  }
}

const shortDateFormats: Readonly<Record<SupportedLocale, string>> = {
  en: 'MM/DD/YYYY',
  de: 'DD.MM.YYYY',
  it: 'DD/MM/YYYY',
  tr: 'DD.MM.YYYY',
}

const booleanLabels: Readonly<
  Record<SupportedLocale, Readonly<Record<'true' | 'false', string>>>
> = {
  en: { true: 'Yes', false: 'No' },
  de: { true: 'Ja', false: 'Nein' },
  it: { true: 'Sì', false: 'No' },
  tr: { true: 'Evet', false: 'Hayır' },
}

export function resolveMergeField(
  definition: MergeFieldDefinition,
  value: unknown,
  locale: SupportedLocale,
  format: MergeFieldFormat,
): Result<ResolvedMergeValue> {
  if (!definition.allowedFormats.includes(format)) {
    return failure([
      mergeDiagnostic('merge.format_not_allowed', definition.key, {
        format,
      }),
    ])
  }
  if (!isMergeValueCompatible(definition, value)) {
    return failure([
      mergeDiagnostic('merge.invalid_value', definition.key, {
        valueType: definition.valueType,
      }),
    ])
  }

  switch (definition.valueType) {
    case 'string':
      return success({ kind: 'text', text: value as string })
    case 'number':
      return success({
        kind: 'text',
        text: new Intl.NumberFormat(locale).format(value as number),
      })
    case 'boolean':
      return success({
        kind: 'text',
        text: booleanLabels[locale][String(value) as 'true' | 'false'],
      })
    case 'money': {
      const money = value as MoneyValue
      return success({
        kind: 'text',
        text: new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: money.currency,
        }).format(money.amount),
      })
    }
    case 'date': {
      const parsed = dayjs(value as string).locale(locale)
      return success({
        kind: 'text',
        text:
          format === 'long'
            ? parsed.format('D MMMM YYYY')
            : parsed.format(shortDateFormats[locale]),
      })
    }
    case 'dateTime': {
      const parsed = dayjs(value as string).locale(locale)
      return success({
        kind: 'text',
        text:
          format === 'long'
            ? parsed.format('D MMMM YYYY HH:mm')
            : parsed.format(`${shortDateFormats[locale]} HH:mm`),
      })
    }
    case 'address':
      return success({
        kind: 'text',
        text: (value as AddressValue).lines.join('\n'),
      })
    case 'image': {
      const image = value as ImageValue
      return success({
        kind: 'image',
        assetId: image.assetId,
        alt: image.alt ?? '',
      })
    }
    case 'list':
      return success({
        kind: 'list',
        items: value as ReadonlyArray<unknown>,
      })
  }
}

export function createMergeFieldCatalog(
  definitions: ReadonlyArray<MergeFieldDefinition>,
): Result<MergeFieldCatalog> {
  const byKey = new Map<string, MergeFieldDefinition>()
  for (const definition of definitions) {
    if (
      !mergeFieldKeySchema.safeParse(definition.key).success ||
      definition.label.trim().length === 0 ||
      definition.allowedFormats.length === 0
    ) {
      return failure([
        mergeDiagnostic('merge.invalid_definition', definition.key),
      ])
    }
    if (byKey.has(definition.key)) {
      return failure([mergeDiagnostic('merge.duplicate_field', definition.key)])
    }
    byKey.set(definition.key, Object.freeze({ ...definition }))
  }

  return success(
    Object.freeze({
      definitions: Object.freeze([...byKey.values()]),
      has: (key: string) => byKey.has(key),
      get: (key: string) => byKey.get(key),
    }),
  )
}
