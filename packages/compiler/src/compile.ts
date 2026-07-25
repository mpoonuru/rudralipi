import {
  failure,
  parseDocument,
  success,
  type BlockNode,
  type Diagnostic,
  type Result,
  type RudralipiDocument,
} from '@rudralipi/core'

import {
  resolveAsset,
  toManifestEntry,
  type AssetReference,
  type AssetResolver,
  type CompiledResource,
} from './assets.js'
import { evaluateCondition } from './conditions.js'
import { canonicalStringify, sha256Hex } from './hash.js'
import type {
  CompiledDocument,
  CompiledFont,
  DocumentIr,
  IrNode,
} from './ir.js'
import {
  createMergeFieldCatalog,
  readMergeDataField,
  resolveMergeField,
  type MergeFieldCatalog,
  type MergeFieldDefinition,
} from './merge-fields.js'
import { defaultCompilerLimits, type CompilerLimits } from './limits.js'

export type { AssetReference, AssetResolver, ResolvedAsset } from './assets.js'
export { sha256Hex } from './hash.js'

export interface CompileDocumentOptions {
  readonly catalog?: MergeFieldCatalog | undefined
  readonly fieldDefinitions?: ReadonlyArray<MergeFieldDefinition> | undefined
  readonly mergeData: Readonly<Record<string, unknown>>
  readonly assetResolver: AssetResolver
  readonly limits?: Partial<CompilerLimits> | undefined
}

interface CompileState {
  readonly options: CompileDocumentOptions
  readonly catalog: MergeFieldCatalog
  readonly limits: CompilerLimits
  readonly resources: Map<string, CompiledResource>
}

function compilerDiagnostic(
  code: string,
  nodeId?: string,
  details: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic {
  return {
    code,
    messageKey: `diagnostics.${code}`,
    severity: 'error',
    path: [],
    details,
    ...(nodeId === undefined ? {} : { nodeId }),
  }
}

function baseNode(node: BlockNode) {
  return {
    id: node.id,
    ...(node.style === undefined ? {} : { style: node.style }),
    ...(node.accessibility === undefined
      ? {}
      : { accessibility: node.accessibility }),
  }
}

async function resolveResource(
  state: CompileState,
  reference: AssetReference,
): Promise<Result<CompiledResource>> {
  const cached = state.resources.get(reference.assetId)
  if (cached !== undefined) {
    if (cached.usage !== reference.usage) {
      return failure([
        compilerDiagnostic('asset.usage_conflict', undefined, {
          assetId: reference.assetId,
        }),
      ])
    }
    return success(cached)
  }
  if (state.resources.size >= state.limits.maxResolvedAssets) {
    return failure([
      compilerDiagnostic('asset.limit.count', undefined, {
        maximum: state.limits.maxResolvedAssets,
      }),
    ])
  }
  const result = await resolveAsset(
    reference,
    state.options.assetResolver,
    state.limits,
  )
  if (result.ok) {
    state.resources.set(reference.assetId, result.value)
  }
  return result
}

function mergeMissing(nodeId: string, field: string): Result<IrNode> {
  return failure([
    compilerDiagnostic('merge.missing_field', nodeId, {
      field,
    }),
  ])
}

async function compileNodes(
  nodes: ReadonlyArray<BlockNode>,
  document: RudralipiDocument,
  state: CompileState,
): Promise<Result<ReadonlyArray<IrNode>>> {
  const compiled: IrNode[] = []
  for (const node of nodes) {
    const result = await compileNode(node, document, state)
    if (!result.ok) {
      return result
    }
    compiled.push(result.value)
  }
  return success(compiled)
}

async function compileNode(
  node: BlockNode,
  document: RudralipiDocument,
  state: CompileState,
): Promise<Result<IrNode>> {
  const base = baseNode(node)
  switch (node.type) {
    case 'heading':
      return success({
        ...base,
        type: 'heading',
        level: node.props.level,
        text: node.props.text,
      })
    case 'richText':
      return success({
        ...base,
        type: 'richText',
        content: node.props.content,
      })
    case 'image': {
      const resource = await resolveResource(state, {
        assetId: node.props.assetId,
        usage: 'image',
      })
      if (!resource.ok) {
        return resource
      }
      return success({
        ...base,
        type: 'image',
        resourceId: resource.value.assetId,
        alt: node.props.alt,
        fit: node.props.fit,
        width: node.props.width,
        alignment: node.props.alignment,
      })
    }
    case 'mergeField': {
      const definition = state.catalog.get(node.props.field)
      if (definition === undefined) {
        return mergeMissing(node.id, node.props.field)
      }
      const data = readMergeDataField(state.options.mergeData, node.props.field)
      if (!data.found || data.value === undefined || data.value === null) {
        return node.props.fallback === undefined
          ? mergeMissing(node.id, node.props.field)
          : success({
              ...base,
              type: 'text',
              sourceType: 'mergeField',
              text: node.props.fallback,
            })
      }
      const resolved = resolveMergeField(
        definition,
        data.value,
        document.locale,
        node.props.format,
      )
      if (!resolved.ok) {
        return resolved
      }
      if (resolved.value.kind === 'image') {
        const resource = await resolveResource(state, {
          assetId: resolved.value.assetId,
          usage: 'image',
        })
        if (!resource.ok) {
          return resource
        }
        return success({
          ...base,
          type: 'image',
          resourceId: resource.value.assetId,
          alt: resolved.value.alt,
          fit: 'contain',
          width: 'auto',
          alignment: 'start',
        })
      }
      if (resolved.value.kind === 'list') {
        return failure([
          compilerDiagnostic('merge.list_requires_structured_block', node.id),
        ])
      }
      return success({
        ...base,
        type: 'text',
        sourceType: 'mergeField',
        text: resolved.value.text,
      })
    }
    case 'table':
      return success({
        ...base,
        type: 'table',
        columns: node.props.columns,
        rows: node.props.rows,
        repeatHeader: node.props.repeatHeader,
        allowRowSplit: node.props.allowRowSplit,
      })
    case 'columns': {
      const columns: Array<{
        id: string
        width: number
        children: ReadonlyArray<IrNode>
      }> = []
      for (const column of node.props.columns) {
        const children = await compileNodes(column.content, document, state)
        if (!children.ok) {
          return children
        }
        columns.push({
          id: column.id,
          width: column.width,
          children: children.value,
        })
      }
      return success({
        ...base,
        type: 'columns',
        gap: node.props.gap,
        columns,
      })
    }
    case 'divider':
      return success({
        ...base,
        type: 'divider',
        variant: node.props.variant,
        weight: node.props.weight,
      })
    case 'spacer':
      return success({
        ...base,
        type: 'spacer',
        size: node.props.size,
      })
    case 'header':
    case 'footer': {
      const children = await compileNodes(node.props.content, document, state)
      if (!children.ok) {
        return children
      }
      return node.type === 'header'
        ? success({
            ...base,
            type: 'header',
            repeat: node.props.repeat,
            children: children.value,
          })
        : success({
            ...base,
            type: 'footer',
            repeat: node.props.repeat,
            showPageNumber: node.props.showPageNumber,
            children: children.value,
          })
    }
    case 'signature': {
      const lines: Array<{
        id: string
        label: string
        signerText?: string
        imageResourceId?: string
      }> = []
      for (const line of node.props.lines) {
        let signerText: string | undefined
        if (line.signerField !== undefined) {
          const definition = state.catalog.get(line.signerField)
          const data = readMergeDataField(
            state.options.mergeData,
            line.signerField,
          )
          if (
            definition !== undefined &&
            data.found &&
            data.value !== undefined &&
            data.value !== null
          ) {
            const resolved = resolveMergeField(
              definition,
              data.value,
              document.locale,
              definition.allowedFormats[0] ?? 'plain',
            )
            if (!resolved.ok) {
              return resolved
            }
            if (resolved.value.kind === 'text') {
              signerText = resolved.value.text
            }
          }
        }
        let imageResourceId: string | undefined
        if (line.imageAssetId !== undefined) {
          const resource = await resolveResource(state, {
            assetId: line.imageAssetId,
            usage: 'signature',
          })
          if (!resource.ok) {
            return resource
          }
          imageResourceId = resource.value.assetId
        }
        lines.push({
          id: line.id,
          label: line.label,
          ...(signerText === undefined ? {} : { signerText }),
          ...(imageResourceId === undefined ? {} : { imageResourceId }),
        })
      }
      return success({
        ...base,
        type: 'signature',
        layout: node.props.layout,
        lines,
      })
    }
    case 'conditional': {
      const condition = evaluateCondition(
        node.props.condition,
        state.options.mergeData,
        {
          catalog: state.catalog,
          limits: state.limits,
        },
      )
      if (!condition.ok) {
        return condition
      }
      const children = await compileNodes(
        condition.value ? node.props.content : node.props.otherwise,
        document,
        state,
      )
      if (!children.ok) {
        return children
      }
      return success({
        ...base,
        type: 'group',
        sourceType: 'conditional',
        children: children.value,
      })
    }
    case 'pageBreak':
      return success({
        ...base,
        type: 'pageBreak',
      })
    default:
      return failure([
        compilerDiagnostic('compiler.extension_unsupported', node.id, {
          type: node.type,
        }),
      ])
  }
}

function resolveCatalog(
  options: CompileDocumentOptions,
): Result<MergeFieldCatalog> {
  if (options.catalog !== undefined) {
    return success(options.catalog)
  }
  return createMergeFieldCatalog(options.fieldDefinitions ?? [])
}

export async function compileDocument(
  input: unknown,
  options: CompileDocumentOptions,
): Promise<Result<CompiledDocument>> {
  const parsed = parseDocument(input)
  if (!parsed.ok) {
    return parsed
  }
  const catalog = resolveCatalog(options)
  if (!catalog.ok) {
    return catalog
  }
  const limits: CompilerLimits = {
    ...defaultCompilerLimits,
    ...options.limits,
  }
  const state: CompileState = {
    options,
    catalog: catalog.value,
    limits,
    resources: new Map<string, CompiledResource>(),
  }

  const fonts: CompiledFont[] = []
  for (const font of parsed.value.fonts) {
    const resource = await resolveResource(state, {
      assetId: font.assetId,
      usage: 'font',
    })
    if (!resource.ok) {
      return resource
    }
    fonts.push({
      family: font.family,
      weight: font.weight,
      style: font.style,
      resourceId: resource.value.assetId,
    })
  }

  const content = await compileNodes(parsed.value.content, parsed.value, state)
  if (!content.ok) {
    return content
  }

  const ir: DocumentIr = {
    schemaVersion: parsed.value.schemaVersion,
    documentId: parsed.value.id,
    locale: parsed.value.locale,
    direction: parsed.value.direction,
    metadata: parsed.value.metadata,
    page: parsed.value.page,
    theme: parsed.value.theme,
    fonts,
    content: content.value,
  }
  const resources = [...state.resources.values()].sort((left, right) =>
    left.assetId.localeCompare(right.assetId),
  )
  const resourceManifest = resources.map(toManifestEntry)

  let hash: string
  try {
    hash = await sha256Hex(
      canonicalStringify({
        compilerVersion: 1,
        ir,
        resourceManifest,
      }),
    )
  } catch {
    return failure([compilerDiagnostic('compiler.hash_unavailable')])
  }

  return success({
    ir,
    resources,
    resourceManifest,
    hash,
  })
}
