import { expect, test, type Page } from '@playwright/test'

async function openSelect(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).click()
  await page.getByRole('option', { name: optionText }).click()
}

test('renders the default app shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-shell')).toBeVisible()
  await expect(page.getByTestId('partition-visualizer')).toBeVisible()
  await expect(page.getByTestId('available-memory')).toContainText('Available Flash Memory')
  await expect(page.getByTestId('resources-section')).toBeInViewport()
  await expect(page.getByTestId('resources-section')).toContainText('Maker Tools')
  await expect(page.getByText('Unallocated Flash')).toBeVisible()
  await expect(page.getByTestId('download-csv-button')).toBeDisabled()
})

test('opens the Maker Tools page from the sidebar', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('maker-tools-nav').click()

  await expect(page.getByTestId('maker-tools-page')).toBeVisible()
  await expect(page.getByTestId('maker-tool-card')).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'thelastoutpostworkshop/ESPVault' })).toHaveAttribute(
    'href',
    'https://github.com/thelastoutpostworkshop/ESPVault'
  )

  await page.getByTestId('partition-builder-nav').click()
  await expect(page.getByTestId('download-csv-button')).toBeVisible()
  await expect(page.getByTestId('download-csv-button')).toBeDisabled()
})

test('loads a built-in partition set and updates flash size', async ({ page }) => {
  await page.goto('/')

  await openSelect(page, 'built-in-partitions-select', 'OTA With Spiffs')
  await expect(page.getByTestId('partition-card')).toHaveCount(6)
  await expect(page.getByText('Over the air update capability')).toBeVisible()

  await openSelect(page, 'flash-size-select', '8 MB')
  await expect(page.getByTestId('available-memory')).toContainText('bytes')
})

test('adds and removes a partition from the add menu', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('add-partition-button').click()
  await expect(page.getByTestId('add-partition-menu')).toBeVisible()
  await page.getByTestId('add-nvs-partition').click()

  await expect(page.getByTestId('partition-card')).toHaveCount(1)
  await expect(page.getByText('data / nvs')).toBeVisible()
  await expect(page.getByTestId('download-csv-button')).toBeEnabled()

  await page.getByTestId('remove-partition-button').click()
  await expect(page.getByTestId('partition-card')).toHaveCount(0)
})

test('loads CSV and downloads generated CSV after confirmation', async ({ page }) => {
  await page.goto('/')
  const csv = [
    '# Name,Type,SubType,Offset,Size,Flags',
    'nvs,data,nvs,,0x5000,',
    'factory,app,factory,,0x10000,'
  ].join('\n')

  await page.getByTestId('csv-file-input').setInputFiles({
    name: 'partitions.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv)
  })

  await expect(page.getByTestId('partition-card')).toHaveCount(2)
  await expect(page.getByText('app / factory')).toBeVisible()

  await page.getByTestId('download-csv-button').click()
  await expect(page.getByTestId('override-dialog')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('confirm-download-button').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('partitions.csv')
})

test('shows OTA warning when OTA support has no NVS partition', async ({ page }) => {
  await page.goto('/')
  const csv = [
    '# Name,Type,SubType,Offset,Size,Flags',
    'otadata,data,ota,,0x2000,',
    'app0,app,ota_0,,0x10000,',
    'app1,app,ota_1,,0x10000,'
  ].join('\n')

  await page.getByTestId('csv-file-input').setInputFiles({
    name: 'ota-no-nvs.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv)
  })

  await expect(page.getByTestId('ota-nvs-warning')).toBeVisible()
  await expect(page.getByText('NVS partition required')).toBeVisible()
})
