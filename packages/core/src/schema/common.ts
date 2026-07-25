import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 1 as const

export const supportedLocaleSchema = z.enum(['en', 'de', 'it', 'tr'])
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>

export const directionSchema = z.enum(['ltr', 'rtl'])
export type TextDirection = z.infer<typeof directionSchema>

export const nodeIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/)

export const assetIdSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/)

export const mergeFieldKeySchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*$/)

export type ExtensionType = `${string}/${string}`

export const extensionTypeSchema = z.custom<ExtensionType>(
  (value) =>
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 256 &&
    /^[a-zA-Z][a-zA-Z0-9_.-]*\/[a-zA-Z][a-zA-Z0-9_.-]*$/.test(value),
)

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/)

export const fontFamilySchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[\p{L}\p{N} _-]+$/u)

export const blockStyleSchema = z.strictObject({
  textAlign: z.enum(['start', 'center', 'end', 'justify']).optional(),
  tone: z.enum(['default', 'muted', 'accent', 'critical']).optional(),
  spaceBefore: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
  spaceAfter: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
  keepTogether: z.boolean().optional(),
})
export type BlockStyle = z.infer<typeof blockStyleSchema>

export const accessibilitySchema = z.strictObject({
  label: z.string().trim().min(1).max(256).optional(),
  decorative: z.boolean().optional(),
})
export type AccessibilityMetadata = z.infer<typeof accessibilitySchema>
