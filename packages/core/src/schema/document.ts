import { z } from 'zod'

import { blockNodeSchema } from './blocks.js'
import {
  assetIdSchema,
  CURRENT_SCHEMA_VERSION,
  directionSchema,
  fontFamilySchema,
  hexColorSchema,
  nodeIdSchema,
  supportedLocaleSchema,
} from './common.js'

const pageMarginsSchema = z.strictObject({
  top: z.number().min(0).max(100),
  right: z.number().min(0).max(100),
  bottom: z.number().min(0).max(100),
  left: z.number().min(0).max(100),
})

const pageSchema = z.strictObject({
  size: z.enum(['A4', 'A5', 'Letter', 'Legal']),
  orientation: z.enum(['portrait', 'landscape']),
  marginsMm: pageMarginsSchema,
  background: hexColorSchema,
  headerId: nodeIdSchema.optional(),
  footerId: nodeIdSchema.optional(),
})

const themeSchema = z.strictObject({
  colors: z.strictObject({
    text: hexColorSchema,
    muted: hexColorSchema,
    accent: hexColorSchema,
    critical: hexColorSchema,
    background: hexColorSchema,
    border: hexColorSchema,
  }),
  typography: z.strictObject({
    bodyFont: fontFamilySchema,
    headingFont: fontFamilySchema,
    baseSizePt: z.number().min(6).max(32),
    lineHeight: z.number().min(1).max(3),
  }),
  spacingMm: z.strictObject({
    xs: z.number().min(0).max(100),
    sm: z.number().min(0).max(100),
    md: z.number().min(0).max(100),
    lg: z.number().min(0).max(100),
    xl: z.number().min(0).max(100),
  }),
})

const fontSchema = z.strictObject({
  assetId: assetIdSchema,
  family: fontFamilySchema,
  weight: z.union([
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
  ]),
  style: z.enum(['normal', 'italic']),
})

export const rudralipiDocumentSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: nodeIdSchema,
  locale: supportedLocaleSchema,
  direction: directionSchema,
  metadata: z.strictObject({
    title: z.string().trim().min(1).max(512),
    subject: z.string().trim().max(1_024).optional(),
    description: z.string().trim().max(4_096).optional(),
    tags: z.string().trim().min(1).max(128).array().max(100).default([]),
    createdAt: z.iso.datetime({ offset: true }).optional(),
    modifiedAt: z.iso.datetime({ offset: true }).optional(),
  }),
  page: pageSchema,
  theme: themeSchema,
  fonts: fontSchema.array().max(32).default([]),
  content: blockNodeSchema.array().max(100_000),
  extensions: z
    .record(
      z
        .string()
        .min(3)
        .max(256)
        .regex(/^[a-zA-Z][a-zA-Z0-9_.-]*\/[a-zA-Z][a-zA-Z0-9_.-]*$/),
      z.unknown(),
    )
    .default({}),
})

export type RudralipiDocument = z.infer<typeof rudralipiDocumentSchema>
