import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadModuleWithSearch(search: string) {
  vi.resetModules()
  vi.stubGlobal('window', {
    location: { search },
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary')
  })
  return import('@/utils/partitionUrl')
}

describe('partition URL helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns null when running without a browser window', async () => {
    vi.resetModules()
    const { getFlashSizeFromUrl, getPartitionCsvFromUrl } = await import('@/utils/partitionUrl')

    expect(getPartitionCsvFromUrl()).toBeNull()
    expect(getFlashSizeFromUrl()).toBeNull()
  })

  it('reads URL encoded CSV payloads', async () => {
    const csv = '# Name,Type,SubType,Offset,Size,Flags\nnvs,data,nvs,,0x5000,'
    const { getPartitionCsvFromUrl } = await loadModuleWithSearch(`?partitions=${encodeURIComponent(csv)}`)

    expect(getPartitionCsvFromUrl()).toBe(csv)
  })

  it('reads base64 CSV payloads', async () => {
    const csv = 'nvs,data,nvs,,0x5000,'
    const payload = Buffer.from(csv, 'binary').toString('base64')
    const { getPartitionCsvFromUrl } = await loadModuleWithSearch(`?partitions=base64:${payload}`)

    expect(getPartitionCsvFromUrl()).toBe(csv)
  })

  it('parses numeric flash size values', async () => {
    const { getFlashSizeFromUrl } = await loadModuleWithSearch('?flash=16')

    expect(getFlashSizeFromUrl()).toBe(16)
  })

  it('returns null for invalid flash size values', async () => {
    const { getFlashSizeFromUrl } = await loadModuleWithSearch('?flash=large')

    expect(getFlashSizeFromUrl()).toBeNull()
  })
})
