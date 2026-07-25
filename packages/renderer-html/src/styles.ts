import type { CompiledDocument, CompiledResource } from '@rudralipi/compiler'

import { resourceDataUrl } from './resources.js'

export type RenderMode = 'preview' | 'print'

function resourceMap(
  resources: ReadonlyArray<CompiledResource>,
): ReadonlyMap<string, CompiledResource> {
  return new Map(resources.map((resource) => [resource.assetId, resource]))
}

function fontFaces(compiled: CompiledDocument): string {
  const resources = resourceMap(compiled.resources)
  return compiled.ir.fonts
    .map((font) => {
      const resource = resources.get(font.resourceId)
      return resource === undefined
        ? ''
        : `@font-face { font-family: '${font.family}'; src: url('${resourceDataUrl(resource)}') format('woff2'); font-weight: ${font.weight}; font-style: ${font.style}; font-display: swap; }`
    })
    .join('\n')
}

function pageDimensions(
  size: CompiledDocument['ir']['page']['size'],
  orientation: CompiledDocument['ir']['page']['orientation'],
): {
  readonly width: string
  readonly height: string
} {
  let portrait: readonly [string, string]
  switch (size) {
    case 'A4':
      portrait = ['210mm', '297mm']
      break
    case 'A5':
      portrait = ['148mm', '210mm']
      break
    case 'Letter':
      portrait = ['8.5in', '11in']
      break
    case 'Legal':
      portrait = ['8.5in', '14in']
      break
  }
  return orientation === 'portrait'
    ? {
        width: portrait[0],
        height: portrait[1],
      }
    : {
        width: portrait[1],
        height: portrait[0],
      }
}

export function createRendererCss(
  compiled: CompiledDocument,
  mode: RenderMode,
): string {
  const { page, theme } = compiled.ir
  const dimensions = pageDimensions(page.size, page.orientation)
  const printRules =
    mode === 'print'
      ? `
@page {
  size: ${dimensions.width} ${dimensions.height};
  margin: ${page.marginsMm.top}mm ${page.marginsMm.right}mm ${page.marginsMm.bottom}mm ${page.marginsMm.left}mm;
}
html, body { background: ${theme.colors.background}; }
.rl-header { position: running(rudralipi-header); }
.rl-footer { position: running(rudralipi-footer); }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
.rl-pageBreak { break-before: page; page-break-before: always; }
.rl-table[data-allow-row-split='false'] tr { break-inside: avoid; page-break-inside: avoid; }
.rl-page-number::after { content: counter(page); }
`
      : `
body { background: #EEF2F7; padding: 32px; }
.rl-document { box-shadow: 0 20px 60px rgba(16, 24, 40, 0.14); margin: 0 auto; }
.rl-pageBreak { border-top: 2px dashed #98A2B3; margin: 18mm -12mm; position: relative; }
`

  return `${fontFaces(compiled)}
:root {
  --rl-color-text: ${theme.colors.text};
  --rl-color-muted: ${theme.colors.muted};
  --rl-color-accent: ${theme.colors.accent};
  --rl-color-critical: ${theme.colors.critical};
  --rl-color-background: ${theme.colors.background};
  --rl-color-border: ${theme.colors.border};
  --rl-space-xs: ${theme.spacingMm.xs}mm;
  --rl-space-sm: ${theme.spacingMm.sm}mm;
  --rl-space-md: ${theme.spacingMm.md}mm;
  --rl-space-lg: ${theme.spacingMm.lg}mm;
  --rl-space-xl: ${theme.spacingMm.xl}mm;
}
* { box-sizing: border-box; }
html { color: var(--rl-color-text); font-family: '${theme.typography.bodyFont}', sans-serif; font-size: ${theme.typography.baseSizePt}pt; line-height: ${theme.typography.lineHeight}; }
body { margin: 0; }
.rl-document { background: var(--rl-color-background); color: var(--rl-color-text); margin: 0 auto; min-height: ${dimensions.height}; padding: ${page.marginsMm.top}mm ${page.marginsMm.right}mm ${page.marginsMm.bottom}mm ${page.marginsMm.left}mm; width: ${dimensions.width}; }
.rl-block { max-width: 100%; }
.rl-block p:first-child { margin-top: 0; }
.rl-block p:last-child { margin-bottom: 0; }
.rl-heading { font-family: '${theme.typography.headingFont}', sans-serif; }
.rl-image img { display: block; height: auto; max-width: 100%; }
.rl-image[data-width='25%'] { width: 25%; }
.rl-image[data-width='50%'] { width: 50%; }
.rl-image[data-width='75%'] { width: 75%; }
.rl-image[data-width='100%'] { width: 100%; }
.rl-image[data-alignment='center'] { margin-inline: auto; }
.rl-image[data-alignment='end'] { margin-inline-start: auto; }
.rl-columns { display: grid; gap: var(--rl-space-md); }
.rl-columns[data-gap='none'] { gap: 0; }
.rl-columns[data-gap='sm'] { gap: var(--rl-space-sm); }
.rl-columns[data-gap='lg'] { gap: var(--rl-space-lg); }
.rl-table { border-collapse: collapse; table-layout: fixed; width: 100%; }
.rl-table th, .rl-table td { border: 1px solid var(--rl-color-border); padding: var(--rl-space-sm); text-align: start; vertical-align: top; }
.rl-table th { font-weight: 650; }
.rl-divider { border: 0; border-top: 1px solid var(--rl-color-border); }
.rl-divider[data-variant='dashed'] { border-top-style: dashed; }
.rl-divider[data-variant='dotted'] { border-top-style: dotted; }
.rl-divider[data-weight='medium'] { border-top-width: 2px; }
.rl-divider[data-weight='thick'] { border-top-width: 4px; }
.rl-spacer[data-size='xs'] { height: var(--rl-space-xs); }
.rl-spacer[data-size='sm'] { height: var(--rl-space-sm); }
.rl-spacer[data-size='md'] { height: var(--rl-space-md); }
.rl-spacer[data-size='lg'] { height: var(--rl-space-lg); }
.rl-spacer[data-size='xl'] { height: var(--rl-space-xl); }
.rl-signature { display: grid; gap: var(--rl-space-lg); grid-template-columns: 1fr; }
.rl-signature[data-layout='sideBySide'] { grid-template-columns: repeat(2, 1fr); }
.rl-signature-line { border-bottom: 1px solid var(--rl-color-text); display: flex; flex-direction: column; justify-content: end; min-height: 24mm; }
.rl-signature-line img { max-height: 18mm; max-width: 60mm; object-fit: contain; object-position: left bottom; }
.rl-signature-label { color: var(--rl-color-muted); font-size: 0.85em; padding-top: var(--rl-space-xs); }
.rl-align-center { text-align: center; }
.rl-align-end { text-align: end; }
.rl-align-justify { text-align: justify; }
.rl-tone-muted { color: var(--rl-color-muted); }
.rl-tone-accent { color: var(--rl-color-accent); }
.rl-tone-critical { color: var(--rl-color-critical); }
.rl-space-before-xs { margin-top: var(--rl-space-xs); }
.rl-space-before-sm { margin-top: var(--rl-space-sm); }
.rl-space-before-md { margin-top: var(--rl-space-md); }
.rl-space-before-lg { margin-top: var(--rl-space-lg); }
.rl-space-before-xl { margin-top: var(--rl-space-xl); }
.rl-space-after-xs { margin-bottom: var(--rl-space-xs); }
.rl-space-after-sm { margin-bottom: var(--rl-space-sm); }
.rl-space-after-md { margin-bottom: var(--rl-space-md); }
.rl-space-after-lg { margin-bottom: var(--rl-space-lg); }
.rl-space-after-xl { margin-bottom: var(--rl-space-xl); }
.rl-keep-together { break-inside: avoid; page-break-inside: avoid; }
${printRules}`.trim()
}
