import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { loadPartitionsFromCsv } from '@/partitionLoader'
import { partitionStore } from '@/store'

describe('loadPartitionsFromCsv', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads valid CSV rows and calculates offsets', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'nvs,data,nvs,,0x5000,',
        'factory,app,factory,,1M,'
      ].join('\n'),
      store
    )

    expect(error).toBeNull()
    expect(store.flashSize).toBe(4)
    expect(store.partitionTables.getPartitions()).toMatchObject([
      { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, fixedOffset: false },
      { name: 'factory', type: 'app', subtype: 'factory', offset: 0x10000, fixedOffset: false }
    ])
  })

  it('keeps explicit fixed offsets from CSV rows', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'nvs,data,nvs,0x9000,0x5000,',
        'factory,app,factory,0x10000,0x10000,'
      ].join('\n'),
      store
    )

    expect(error).toBeNull()
    expect(store.partitionTables.getPartitions()).toMatchObject([
      { name: 'nvs', offset: 0x9000, fixedOffset: true },
      { name: 'factory', offset: 0x10000, fixedOffset: true }
    ])
  })

  it('keeps a fixed-offset app slot that ends at the selected flash boundary', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'nvs,data,nvs,0x9000,100K,',
        'otadata,data,ota,0x22000,8K,',
        'spiffs,data,spiffs,0x24000,1456K,',
        'coredump,data,coredump,0x190000,64K,',
        'app0,app,ota_0,0x1A0000,7360K,',
        'app1,app,ota_1,0x8D0000,7360K,'
      ].join('\n'),
      store
    )

    const partitions = store.partitionTables.getPartitions()
    const app1 = partitions.find(partition => partition.name === 'app1')

    expect(error).toBeNull()
    expect(store.partitionTableOffset).toBe(0x8000)
    expect(store.flashSize).toBe(16)
    expect(partitions).toHaveLength(6)
    expect(app1).toMatchObject({ offset: 0x8D0000, size: 7360 * 1024, fixedOffset: true })
  })

  it('uses the highest fixed offset end address when choosing flash size', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'nvs,data,nvs,0x9000,0x1000,',
        'storage,data,spiffs,0x500000,0x1000,'
      ].join('\n'),
      store
    )

    expect(error).toBeNull()
    expect(store.flashSize).toBe(8)
    expect(store.partitionTables.getPartitions()).toMatchObject([
      { name: 'nvs', offset: 0x9000, fixedOffset: true },
      { name: 'storage', offset: 0x500000, fixedOffset: true }
    ])
  })

  it('loads custom numeric partition types and flags', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'esp_secure_cert,63,6,0xd000,8K,encrypted'
      ].join('\n'),
      store
    )

    expect(error).toBeNull()
    expect(store.partitionTables.getPartitions()).toMatchObject([
      {
        name: 'esp_secure_cert',
        type: '63',
        subtype: '6',
        offset: 0xd000,
        size: 0x2000,
        flags: 'encrypted',
        fixedOffset: true,
        custom: true
      }
    ])
  })

  it('honors a forced flash size option', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'nvs,data,nvs,,0x5000,'
      ].join('\n'),
      store,
      { forceFlashSize: 8 }
    )

    expect(error).toBeNull()
    expect(store.flashSize).toBe(8)
    expect(store.partitionTables.flashSize).toBe(8 * 1024 * 1024)
  })

  it('returns a format error for invalid CSV content', () => {
    const store = partitionStore()

    expect(loadPartitionsFromCsv('not,a,partition,file', store)).toEqual({
      title: 'Invalid CSV Format',
      text: 'The CSV file format is incorrect. Please use the correct format.'
    })
  })

  it('rejects app partitions with invalid alignment', () => {
    const store = partitionStore()
    const error = loadPartitionsFromCsv(
      [
        '# Name,Type,SubType,Offset,Size,Flags',
        'factory,app,factory,0x9000,0x10000,'
      ].join('\n'),
      store
    )

    expect(error?.title).toBe('Invalid Offset Alignment')
  })
})
