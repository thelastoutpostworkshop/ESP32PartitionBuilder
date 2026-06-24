import { expect, test } from '@playwright/test'

test('default desktop layout matches baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-shell')).toBeVisible()

  await expect(page).toHaveScreenshot('default-desktop.png', { fullPage: true })
})

test('add partition menu matches baseline', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('add-partition-button').click()
  await expect(page.getByTestId('add-partition-menu')).toBeVisible()

  await expect(page).toHaveScreenshot('add-partition-menu.png', { fullPage: true })
})

test('CSV error dialog matches baseline', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('csv-file-input').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('not,a,partition,file')
  })
  await expect(page.getByTestId('alert-dialog')).toBeVisible()

  await expect(page).toHaveScreenshot('csv-error-dialog.png', { fullPage: true })
})

test('mobile layout matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('app-shell')).toBeVisible()

  await expect(page).toHaveScreenshot('mobile-default.png', { fullPage: true })
})
