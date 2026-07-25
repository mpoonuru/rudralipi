import { z } from 'zod'

const linkAttributesSchema = z.strictObject({
  href: z
    .string()
    .trim()
    .min(1)
    .max(2_048)
    .refine(
      (value) => /^(?:https?:|mailto:|tel:|\/|#)/i.test(value),
      'Unsupported link protocol.',
    ),
  title: z.string().trim().max(256).optional(),
})

export const richTextMarkSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({ type: z.literal('underline') }),
  z.strictObject({ type: z.literal('strike') }),
  z.strictObject({ type: z.literal('code') }),
  z.strictObject({ type: z.literal('superscript') }),
  z.strictObject({ type: z.literal('subscript') }),
  z.strictObject({
    type: z.literal('link'),
    attrs: linkAttributesSchema,
  }),
])
export type RichTextMark = z.infer<typeof richTextMarkSchema>

export const richTextInlineSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('text'),
    text: z.string().max(100_000),
    marks: richTextMarkSchema.array().max(16).optional(),
  }),
  z.strictObject({
    type: z.literal('hardBreak'),
  }),
])
export type RichTextInline = z.infer<typeof richTextInlineSchema>

export const richTextParagraphSchema = z.strictObject({
  type: z.literal('paragraph'),
  content: richTextInlineSchema.array().max(10_000).default([]),
})
export type RichTextParagraph = z.infer<typeof richTextParagraphSchema>

const richTextListItemSchema = z.strictObject({
  type: z.literal('listItem'),
  content: richTextParagraphSchema.array().min(1).max(1_000),
})

const richTextListSchema = z.strictObject({
  type: z.enum(['bulletList', 'orderedList']),
  start: z.number().int().min(1).max(1_000_000).optional(),
  content: richTextListItemSchema.array().min(1).max(10_000),
})

export const richTextDocumentSchema = z.strictObject({
  type: z.literal('doc'),
  content: z
    .union([richTextParagraphSchema, richTextListSchema])
    .array()
    .max(10_000)
    .default([]),
})
export type RichTextDocument = z.infer<typeof richTextDocumentSchema>
