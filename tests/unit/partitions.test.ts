import { describe, expect, it } from 'vitest'
import { PartitionTable } from '@/partitions'
import {
  COREDUMP_MIN_PARTITION_SIZE,
  NVS_PARTITION_SIZE_RECOMMENDED,
  OFFSET_APP_TYPE,
  OFFSET_DATA_TYPE,
  OTA_DATA_PARTITION_SIZE,
  PARTITION_COREDUMP,
  PARTITION_FAT,
  PARTITION_FACTORY,
  PARTITION_NVS,
  PARTITION_OTA,
  PARTITION_PHY,
  PARTITION_SPIFFS,
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

  it('preserves fixed offsets when resizing imported partition layouts', () => {
    const table = new PartitionTable(16)
    table.addPartition('otadata', PARTITION_TYPE_DATA, PARTITION_OTA, 0x2000, '', 0x9000, true)
    table.addPartition('phy_init', PARTITION_TYPE_DATA, PARTITION_PHY, 0x1000, '', 0xb000, true)
    table.addPartition('app0', PARTITION_TYPE_APP, 'ota_0', 0x640000, '', 0x10000, true)
    table.addPartition('app1', PARTITION_TYPE_APP, 'ota_1', 0x640000, '', 0x650000, true)
    table.addPartition('nvs', PARTITION_TYPE_DATA, PARTITION_NVS, 0x40000, '', 0xc90000, true)
    table.addPartition('storage', PARTITION_TYPE_DATA, PARTITION_SPIFFS, 0x330000, '', 0xcd0000, true)

    const originalOffsets = table.getPartitions().map(partition => [partition.name, partition.offset])
    const app0 = table.getPartitions().find(partition => partition.name === 'app0')
    const app1 = table.getPartitions().find(partition => partition.name === 'app1')
    const storage = table.getPartitions().find(partition => partition.name === 'storage')

    expect(table.hasFixedOffsets()).toBe(true)
    table.updatePartitionSize(app0!, app0!.size + OFFSET_APP_TYPE)
    table.updatePartitionSize(storage!, storage!.size + OFFSET_DATA_TYPE)

    expect(table.getPartitions().map(partition => [partition.name, partition.offset])).toEqual(originalOffsets)
    expect(app0!.size).toBe(0x640000)
    expect(app1!.size).toBe(0x640000)
    expect(storage!.size).toBe(0x330000)
  })

  it('allows small custom data partitions for framework-specific storage', () => {
    const table = new PartitionTable(4)
    table.addPartition('factory', PARTITION_TYPE_APP, PARTITION_FACTORY, OFFSET_APP_TYPE, '')
    table.addPartition('zb_fct', PARTITION_TYPE_DATA, PARTITION_FAT, 0x400, '', undefined, false, true)

    const zbFactoryConfig = table.getPartitions().find(partition => partition.name === 'zb_fct')

    expect(zbFactoryConfig).toMatchObject({
      name: 'zb_fct',
      type: PARTITION_TYPE_DATA,
      subtype: PARTITION_FAT,
      size: 0x400,
      custom: true
    })

    table.updatePartitionSize(zbFactoryConfig!, 0x800)

    expect(zbFactoryConfig!.size).toBe(0x800)
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
