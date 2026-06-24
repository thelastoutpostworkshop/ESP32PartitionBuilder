import { describe, expect, it } from 'vitest'
import { PartitionTable } from '@/partitions'
import {
  COREDUMP_MIN_PARTITION_SIZE,
  NVS_PARTITION_SIZE_RECOMMENDED,
  OFFSET_APP_TYPE,
  OFFSET_DATA_TYPE,
  OTA_DATA_PARTITION_SIZE,
  PARTITION_COREDUMP,
  PARTITION_FACTORY,
  PARTITION_NVS,
  PARTITION_OTA,
  PARTITION_TYPE_APP,
  PARTITION_TYPE_DATA
} from '@/const'

describe('PartitionTable', () => {
  it('aligns data partitions after the partition table and app partitions at app boundaries', () => {
    const table = new PartitionTable(4)

    table.addPartition('nvs', PARTITION_TYPE_DATA, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, '')
    table.addPartition('factory', PARTITION_TYPE_APP, PARTITION_FACTORY, OFFSET_APP_TYPE, '')

    expect(table.getPartitions()).toMatchObject([
      { name: 'nvs', offset: 0x9000, size: NVS_PARTITION_SIZE_RECOMMENDED },
      { name: 'factory', offset: 0x10000, size: OFFSET_APP_TYPE }
    ])
    expect(table.getAvailableMemory()).toBeGreaterThan(0)
  })

  it('places OTA data at the expected reserved offset and detects complete OTA support', () => {
    const table = new PartitionTable(4)

    table.addPartition('nvs', PARTITION_TYPE_DATA, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, '')
    table.addPartition('otadata', PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, '')
    table.addPartition('app0', PARTITION_TYPE_APP, 'ota_0', OFFSET_APP_TYPE, '')
    table.addPartition('app1', PARTITION_TYPE_APP, 'ota_1', OFFSET_APP_TYPE, '')

    expect(table.getPartitions()).toMatchObject([
      { name: 'nvs', offset: 0x9000 },
      { name: 'otadata', offset: 0xe000 },
      { name: 'app0', offset: 0x10000 },
      { name: 'app1', offset: 0x20000 }
    ])
    expect(table.hasOTAPartitions()).toBe(true)
  })

  it('resizes paired OTA app partitions together', () => {
    const table = new PartitionTable(4)
    table.addPartition('otadata', PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, '')
    table.addPartition('app0', PARTITION_TYPE_APP, 'ota_0', OFFSET_APP_TYPE, '')
    table.addPartition('app1', PARTITION_TYPE_APP, 'ota_1', OFFSET_APP_TYPE, '')

    const app0 = table.getPartitions().find(partition => partition.name === 'app0')
    const app1 = table.getPartitions().find(partition => partition.name === 'app1')

    expect(app0).toBeDefined()
    expect(app1).toBeDefined()
    table.updatePartitionSize(app0!, OFFSET_APP_TYPE * 2)

    expect(app0!.size).toBe(OFFSET_APP_TYPE * 2)
    expect(app1!.size).toBe(OFFSET_APP_TYPE * 2)
  })

  it('rejects unaligned partition table offsets', () => {
    const table = new PartitionTable(4)

    expect(() => table.setPartitionTableOffset(0x8100)).toThrow(/aligned to 0x1000/)
  })

  it('returns recommended sizes for known subtypes', () => {
    const table = new PartitionTable(4)

    expect(table.getRecommendedSize(PARTITION_NVS)).toBe(NVS_PARTITION_SIZE_RECOMMENDED)
    expect(table.getRecommendedSize(PARTITION_OTA)).toBe(OTA_DATA_PARTITION_SIZE)
    expect(table.getRecommendedSize(PARTITION_COREDUMP)).toBe(COREDUMP_MIN_PARTITION_SIZE)
    expect(table.getRecommendedSize('custom')).toBe(OFFSET_DATA_TYPE)
  })
})
