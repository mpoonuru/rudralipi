import type { ZodType } from 'zod'

import {
  failure,
  success,
  type Diagnostic,
  type Result,
} from './diagnostics.js'
import { extensionTypeSchema, type ExtensionType } from './schema/common.js'
import type { ExtensionBlock } from './schema/blocks.js'

export const EXTENSION_API_VERSION = 1 as const

export interface BlockExtensionDefinition<
  TProps extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, unknown>
  >,
> {
  readonly type: ExtensionType
  readonly apiVersion: typeof EXTENSION_API_VERSION
  readonly propsSchema: ZodType<TProps>
  readonly createDefaultProps: () => TProps
}

export interface BlockRegistry {
  readonly definitions: ReadonlyArray<BlockExtensionDefinition>
  has(type: string): boolean
  get(type: string): BlockExtensionDefinition | undefined
  validateNode(node: ExtensionBlock): Result<ExtensionBlock>
}

function registryDiagnostic(
  code: string,
  details: Readonly<Record<string, string | number | boolean>>,
  nodeId?: string,
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

export function createBlockRegistry(
  definitions: ReadonlyArray<BlockExtensionDefinition>,
): Result<BlockRegistry> {
  const byType = new Map<string, BlockExtensionDefinition>()

  for (const definition of definitions) {
    if (!extensionTypeSchema.safeParse(definition.type).success) {
      return failure([
        registryDiagnostic('registry.invalid_type', {
          type: definition.type,
        }),
      ])
    }
    if (definition.apiVersion !== EXTENSION_API_VERSION) {
      return failure([
        registryDiagnostic('registry.incompatible_api_version', {
          type: definition.type,
          apiVersion: definition.apiVersion,
          supportedVersion: EXTENSION_API_VERSION,
        }),
      ])
    }
    if (byType.has(definition.type)) {
      return failure([
        registryDiagnostic('registry.duplicate_type', {
          type: definition.type,
        }),
      ])
    }
    const defaultResult = definition.propsSchema.safeParse(
      definition.createDefaultProps(),
    )
    if (!defaultResult.success) {
      return failure([
        registryDiagnostic('registry.invalid_default_props', {
          type: definition.type,
        }),
      ])
    }
    byType.set(definition.type, definition)
  }

  const immutableDefinitions = Object.freeze([...definitions])
  const registry: BlockRegistry = Object.freeze({
    definitions: immutableDefinitions,
    has: (type: string) => byType.has(type),
    get: (type: string) => byType.get(type),
    validateNode: (node: ExtensionBlock): Result<ExtensionBlock> => {
      const definition = byType.get(node.type)
      if (definition === undefined) {
        return failure([
          registryDiagnostic(
            'registry.unknown_type',
            {
              type: node.type,
            },
            node.id,
          ),
        ])
      }
      const parsed = definition.propsSchema.safeParse(node.props)
      if (!parsed.success) {
        return failure([
          registryDiagnostic(
            'registry.invalid_props',
            {
              type: node.type,
            },
            node.id,
          ),
        ])
      }
      return success({
        ...node,
        props: parsed.data,
      })
    },
  })

  return success(registry)
}
