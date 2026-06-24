import type { Partition } from '@/types'

const CSV_HEADER = '# Name,   Type, SubType, Offset,  Size, Flags'

export function buildPartitionCsv(partitions: Partition[]): string {
  const rows = partitions.map(partition => {
    const offsetHex = formatHex(partition.offset)
    const sizeHex = formatHex(partition.size)
    return `${partition.name},${partition.type},${partition.subtype},${offsetHex},${sizeHex},${partition.flags}`
  })

  return [CSV_HEADER, ...rows].join('\n')
}

function formatHex(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`
}
