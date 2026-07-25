export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  | JsonPrimitive
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

function cloneJsonInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('JSON numbers must be finite.')
    }
    return value
  }
  if (typeof value !== 'object') {
    throw new TypeError('Value is not JSON-compatible.')
  }
  if (seen.has(value)) {
    throw new TypeError('JSON values cannot contain circular references.')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonInternal(entry, seen))
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('JSON objects must use a plain prototype.')
  }

  const clone = Object.create(null) as Record<string, unknown>
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (!('value' in descriptor)) {
      throw new TypeError('JSON objects cannot contain accessors.')
    }
    Object.defineProperty(clone, key, {
      configurable: true,
      enumerable: true,
      value: cloneJsonInternal(descriptor.value, seen),
      writable: true,
    })
  }
  return clone
}

export function cloneJsonValue<T>(value: T): T {
  return cloneJsonInternal(value, new WeakSet<object>()) as T
}
