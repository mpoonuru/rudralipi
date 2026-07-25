import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const visualTest =
  process.env['RUDRALIPI_SKIP_VISUAL'] === 'true' ? test.skip : test

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(
    page.getByRole('application', {
      name: 'Rudralipi document editor',
    }),
  ).toBeVisible()
})

test('saves an edit and reloads it through the validated adapter', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Heading: Document heading' }).click()
  await page.getByRole('textbox', { name: 'Text' }).fill('Persisted proof')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/Saved locally at/)).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole('button', { name: 'Heading: Persisted proof' }),
  ).toBeVisible()
  await expect(
    page.getByText('Saved draft reloaded and validated.'),
  ).toBeVisible()
})

test('switches through all four built-in locales', async ({ page }) => {
  const localeCases = [
    {
      editor: 'Rudralipi document editor',
      heading: 'Heading',
      locale: 'en',
    },
    {
      editor: 'Rudralipi-Dokumenteditor',
      heading: 'Überschrift',
      locale: 'de',
    },
    {
      editor: 'Editor documenti Rudralipi',
      heading: 'Titolo',
      locale: 'it',
    },
    {
      editor: 'Rudralipi belge düzenleyicisi',
      heading: 'Başlık',
      locale: 'tr',
    },
  ] as const

  for (const localeCase of localeCases) {
    await page
      .getByRole('combobox', { name: 'Editor language' })
      .selectOption(localeCase.locale)
    const editor = page.getByRole('application', {
      name: localeCase.editor,
    })
    await expect(editor).toBeVisible()
    await expect(editor).toHaveAttribute('lang', localeCase.locale)
    await expect(
      page.getByTestId('rudralipi-palette').getByRole('button').first(),
    ).toContainText(localeCase.heading)
  }
})

test('opens a compiler-backed, script-free document preview', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Preview' }).click()
  const dialog = page.getByRole('dialog', { name: 'Document preview' })
  await expect(dialog).toBeVisible()
  const preview = page
    .frameLocator('iframe[title="Compiled Rudralipi document"]')
    .locator('.rl-document')
  await expect(preview).toBeVisible()
  await expect(preview.getByText('Document heading')).toBeVisible()
  await expect(
    page
      .frameLocator('iframe[title="Compiled Rudralipi document"]')
      .locator('script'),
  ).toHaveCount(0)
})

test('has no serious or critical automated accessibility violations', async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )

  expect(violations).toEqual([])
})

visualTest('matches the English desktop visual contract', async ({ page }) => {
  await expect(page).toHaveScreenshot('editor-en.png', {
    fullPage: true,
  })
})

visualTest(
  'matches the compact responsive visual contract',
  async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await expect(page).toHaveScreenshot('editor-mobile.png', {
      fullPage: true,
    })
  },
)
