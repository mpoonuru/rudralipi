import { describe, expect, it } from 'vitest'

import { builtInCatalogs, createTranslator } from './catalog.js'

describe('built-in message catalogs', () => {
  it.each(['en', 'de', 'it', 'tr'] as const)(
    '%s defines every built-in message',
    (locale) => {
      expect(Object.keys(builtInCatalogs[locale]).sort()).toEqual(
        Object.keys(builtInCatalogs.en).sort(),
      )
      expect(
        Object.values(builtInCatalogs[locale]).every(
          (message) => message.trim().length > 0,
        ),
      ).toBe(true)
    },
  )

  it('translates built-in editor labels without hardcoded German', () => {
    expect(createTranslator('de')('block.heading')).toBe('Überschrift')
    expect(createTranslator('it')('block.heading')).toBe('Titolo')
    expect(createTranslator('tr')('block.heading')).toBe('Başlık')
  })

  it('interpolates owned placeholders without evaluating templates', () => {
    expect(
      createTranslator('en')('status.blockMoved', {
        values: {
          block: '<Heading>',
          position: 3,
        },
      }),
    ).toBe('<Heading> moved to position 3.')
  })

  it('uses an explicit fallback for host extension messages', () => {
    const translate = createTranslator('it', {
      messages: {},
    })

    expect(
      translate('extension.example', {
        fallback: 'Example',
      }),
    ).toBe('Example')
  })
})
