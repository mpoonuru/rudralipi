import type {
  AccessibilityMetadata,
  BlockStyle,
  RichTextDocument,
  RudralipiDocument,
  SupportedLocale,
  TextDirection,
} from '@rudralipi/core'

import type { CompiledResource, ResourceManifestEntry } from './assets.js'

interface IrBase<TType extends string> {
  readonly id: string
  readonly type: TType
  readonly style?: BlockStyle | undefined
  readonly accessibility?: AccessibilityMetadata | undefined
}

export type IrNode =
  | (IrBase<'heading'> & {
      readonly level: 1 | 2 | 3 | 4 | 5 | 6
      readonly text: string
    })
  | (IrBase<'richText'> & {
      readonly content: RichTextDocument
    })
  | (IrBase<'image'> & {
      readonly resourceId: string
      readonly alt: string
      readonly fit: 'contain' | 'cover'
      readonly width: 'auto' | '25%' | '50%' | '75%' | '100%'
      readonly alignment: 'start' | 'center' | 'end'
    })
  | (IrBase<'text'> & {
      readonly sourceType: 'mergeField'
      readonly text: string
    })
  | (IrBase<'table'> & {
      readonly columns: ReadonlyArray<{
        readonly id: string
        readonly header: string
        readonly width?: number | undefined
      }>
      readonly rows: ReadonlyArray<{
        readonly id: string
        readonly cells: ReadonlyArray<{
          readonly columnId: string
          readonly content: RichTextDocument
          readonly colSpan?: number | undefined
          readonly rowSpan?: number | undefined
        }>
      }>
      readonly repeatHeader: boolean
      readonly allowRowSplit: boolean
    })
  | (IrBase<'columns'> & {
      readonly gap: 'none' | 'sm' | 'md' | 'lg'
      readonly columns: ReadonlyArray<{
        readonly id: string
        readonly width: number
        readonly children: ReadonlyArray<IrNode>
      }>
    })
  | (IrBase<'divider'> & {
      readonly variant: 'solid' | 'dashed' | 'dotted'
      readonly weight: 'thin' | 'medium' | 'thick'
    })
  | (IrBase<'spacer'> & {
      readonly size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    })
  | (IrBase<'header'> & {
      readonly repeat: 'all' | 'exceptFirst' | 'firstOnly'
      readonly children: ReadonlyArray<IrNode>
    })
  | (IrBase<'footer'> & {
      readonly repeat: 'all' | 'exceptFirst' | 'firstOnly'
      readonly showPageNumber: boolean
      readonly children: ReadonlyArray<IrNode>
    })
  | (IrBase<'signature'> & {
      readonly layout: 'stacked' | 'sideBySide'
      readonly lines: ReadonlyArray<{
        readonly id: string
        readonly label: string
        readonly signerText?: string | undefined
        readonly imageResourceId?: string | undefined
      }>
    })
  | (IrBase<'group'> & {
      readonly sourceType: 'conditional'
      readonly children: ReadonlyArray<IrNode>
    })
  | IrBase<'pageBreak'>

export interface CompiledFont {
  readonly family: string
  readonly weight: number
  readonly style: 'normal' | 'italic'
  readonly resourceId: string
}

export interface DocumentIr {
  readonly schemaVersion: number
  readonly documentId: string
  readonly locale: SupportedLocale
  readonly direction: TextDirection
  readonly metadata: RudralipiDocument['metadata']
  readonly page: RudralipiDocument['page']
  readonly theme: RudralipiDocument['theme']
  readonly fonts: ReadonlyArray<CompiledFont>
  readonly content: ReadonlyArray<IrNode>
}

export interface CompiledDocument {
  readonly ir: DocumentIr
  readonly resources: ReadonlyArray<CompiledResource>
  readonly resourceManifest: ReadonlyArray<ResourceManifestEntry>
  readonly hash: string
}
