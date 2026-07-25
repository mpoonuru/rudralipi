import { describe, expect, it } from 'vitest'

import { renderHtml } from './render-document.js'
import { createCompiledFixture } from './test-support/compiled-fixture.test-support.js'

describe('renderer security', () => {
  it('escapes merged text and emits no executable markup', async () => {
    const result = renderHtml(
      await createCompiledFixture(
        '<script>globalThis.compromised = true</script>',
      ),
      {
        mode: 'print',
        completeDocument: true,
      },
    )

    expect(result.documentHtml).not.toContain('<script>globalThis.compromised')
    expect(result.documentHtml).toContain(
      '&lt;script&gt;globalThis.compromised = true&lt;/script&gt;',
    )
    expect(result.documentHtml).not.toMatch(/\son[a-z]+=/i)
    expect(result.documentHtml).not.toContain('javascript:')
  })
})
