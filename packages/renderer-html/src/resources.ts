import type { CompiledResource } from '@rudralipi/compiler'

const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += alphabet[(combined >> 18) & 63]
    output += alphabet[(combined >> 12) & 63]
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : '='
    output += index + 2 < bytes.length ? alphabet[combined & 63] : '='
  }
  return output
}

export function resourceDataUrl(resource: CompiledResource): string {
  return `data:${resource.mediaType};base64,${base64(resource.bytes)}`
}
