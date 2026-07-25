import type { SupportedLocale } from '@rudralipi/core'

import { de } from './de.js'
import { en } from './en.js'
import { it } from './it.js'
import { tr } from './tr.js'
import type {
  MessageCatalog,
  TranslationOptions,
  Translator,
  TranslatorOverrides,
} from './types.js'

export const builtInCatalogs: Readonly<
  Record<SupportedLocale, MessageCatalog>
> = Object.freeze({
  en,
  de,
  it,
  tr,
})

function ownMessage(
  messages: Readonly<Record<string, string>>,
  key: string,
): string | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(messages, key)
  return descriptor !== undefined && 'value' in descriptor
    ? descriptor.value
    : undefined
}

function interpolate(message: string, options?: TranslationOptions): string {
  return message.replace(
    /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
    (placeholder, key: string) => {
      const values = options?.values
      if (values === undefined) {
        return placeholder
      }
      const descriptor = Object.getOwnPropertyDescriptor(values, key)
      return descriptor !== undefined && 'value' in descriptor
        ? String(descriptor.value)
        : placeholder
    },
  )
}

export function createTranslator(
  locale: SupportedLocale,
  overrides: TranslatorOverrides = {},
): Translator {
  return (key, options = {}) => {
    const override =
      overrides.messages === undefined
        ? undefined
        : ownMessage(overrides.messages, key)
    const localized = ownMessage(builtInCatalogs[locale], key)
    const english = ownMessage(builtInCatalogs.en, key)
    const message = override ?? localized ?? english ?? options.fallback

    if (message === undefined) {
      throw new RangeError(
        `No translation or explicit fallback was provided for "${key}".`,
      )
    }
    return interpolate(message, options)
  }
}
