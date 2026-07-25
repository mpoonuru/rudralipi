import type { MergeFieldDefinition } from '@rudralipi/compiler'

export const playgroundFieldDefinitions: ReadonlyArray<MergeFieldDefinition> = [
  {
    key: 'customer.name',
    label: 'Customer name',
    valueType: 'string',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
  {
    key: 'customer.company',
    label: 'Company name',
    valueType: 'string',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
  {
    key: 'customer.isBusiness',
    label: 'Business customer',
    valueType: 'boolean',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
  {
    key: 'customer.hasContract',
    label: 'Active contract',
    valueType: 'boolean',
    sensitivity: 'internal',
    allowedFormats: ['plain'],
  },
  {
    key: 'document.reference',
    label: 'Document reference',
    valueType: 'string',
    sensitivity: 'public',
    allowedFormats: ['plain'],
  },
]

export const playgroundMergeData = {
  customer: {
    name: 'Asha Rao',
    company: 'Northstar Works',
    isBusiness: true,
    hasContract: true,
  },
  document: {
    reference: 'RL-ALPHA-001',
  },
}

export const playgroundAssets = [
  { id: 'image/logo', label: 'Rudralipi mark' },
  { id: 'image/seal', label: 'Company seal' },
  { id: 'placeholder/image', label: 'Placeholder image' },
  { id: 'signature/company', label: 'Company signature' },
] as const

export const playgroundMergeFields = playgroundFieldDefinitions.map(
  ({ key, label }) => ({
    key,
    label,
  }),
)
