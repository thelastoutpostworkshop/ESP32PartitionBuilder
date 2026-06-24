import { describe, expect, it } from 'vitest'
import { esp32Partitions } from '@/defaultPartitions'
import { PartitionTable } from '@/partitions'
import { buildPartitionCsv } from '@/utils/partitionCsv'

describe('built-in partition sets', () => {
  it('exports the Zigbee ESP-IDF preset with required Zigbee storage partitions', () => {
    const zigbeePreset = esp32Partitions.find(set => set.name === 'Zigbee ESP-IDF')
    expect(zigbeePreset).toBeDefined()

    const table = new PartitionTable(4)
    for (const partition of zigbeePreset!.partitions) {
      const fixedOffset = partition.fixedOffset ?? false
      table.addPartition(
        partition.name,
        partition.type,
        partition.subtype,
        partition.size,
        partition.flags,
        fixedOffset ? partition.offset : undefined,
        fixedOffset,
        partition.custom ?? false
      )
    }

    expect(buildPartitionCsv(table.getPartitions())).toBe(
      [
        '# Name,   Type, SubType, Offset,  Size, Flags',
        'nvs,data,nvs,0x9000,0x6000,',
        'phy_init,data,phy,0xF000,0x1000,',
        'factory,app,factory,0x10000,0x12C000,',
        'zb_storage,data,nvs,0x13C000,0x4000,',
        'zb_fct,data,fat,0x140000,0x400,'
      ].join('\n')
    )
  })
})
