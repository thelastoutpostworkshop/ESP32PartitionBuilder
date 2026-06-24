import { describe, expect, it } from 'vitest'
import { buildPartitionCsv } from '@/utils/partitionCsv'
import type { Partition } from '@/types'

describe('buildPartitionCsv', () => {
  it('serializes partitions using the download CSV format', () => {
    const partitions: Partition[] = [
      { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x5000, flags: '' },
      { name: 'factory', type: 'app', subtype: 'factory', offset: 0x10000, size: 0x100000, flags: '' }
    ]

    expect(buildPartitionCsv(partitions)).toBe(
      [
        '# Name,   Type, SubType, Offset,  Size, Flags',
        'nvs,data,nvs,0x9000,0x5000,',
        'factory,app,factory,0x10000,0x100000,'
      ].join('\n')
    )
  })
})
