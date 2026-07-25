import type { SupportedLocale } from '@rudralipi/core'

import type { en } from './en.js'

export type MessageKey = keyof typeof en
export type MessageCatalog = Readonly<Record<MessageKey, string>>

export interface TranslationValues {
  readonly [key: string]: string | number | boolean
}

export interface TranslationOptions {
  readonly fallback?: string | undefined
  readonly values?: TranslationValues | undefined
}

export interface TranslatorOverrides {
  readonly messages?: Readonly<Record<string, string>> | undefined
}

export type Translator = (
  key: MessageKey | string,
  options?: TranslationOptions,
) => string

export type { SupportedLocale }
