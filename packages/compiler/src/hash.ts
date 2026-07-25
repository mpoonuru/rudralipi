interface SubtleCryptoLike {
  digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer>
}

interface CryptoHost {
  readonly crypto?: {
    readonly subtle?: SubtleCryptoLike
  }
}

function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = []
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) {
      continue
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint)
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      )
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      )
    }
  }
  return new Uint8Array(bytes)
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const subtle = (globalThis as CryptoHost).crypto?.subtle
  if (subtle === undefined) {
    throw new Error('SHA-256 is unavailable in this runtime.')
  }
  const digest = await subtle.digest(
    'SHA-256',
    typeof value === 'string' ? encodeUtf8(value) : value,
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function canonicalPrimitive(value: string | number | boolean | null): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new TypeError('Value is not canonically serializable.')
  }
  return serialized
}

export function canonicalStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return canonicalPrimitive(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical numbers must be finite.')
    }
    return canonicalPrimitive(value)
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) =>
        entry === undefined ? 'null' : canonicalStringify(entry),
      )
      .join(',')}]`
  }
  if (typeof value !== 'object') {
    throw new TypeError('Value is not canonically serializable.')
  }

  const entries = Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
  return `{${entries
    .map(
      ([key, entry]) =>
        `${canonicalPrimitive(key)}:${canonicalStringify(entry)}`,
    )
    .join(',')}}`
}
