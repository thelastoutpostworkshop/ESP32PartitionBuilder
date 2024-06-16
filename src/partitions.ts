// src/partitions.ts
import type { Partition } from '@/types';

interface PartitionSet {
  name: string;
  partitions: Partition[];
}

export const partitionSets: PartitionSet[] = [
  {
    name: 'Partition Set 1',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x4000, offset: 0 },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0 },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0 },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0 },
      { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x170000, offset: 0 },
    ]
  },
  {
    name: 'Partition Set 2',
    partitions: [
      { name: 'storage', type: 'data', subtype: 'spiffs', size: 0x100000, offset: 0 },
      { name: 'app2', type: 'app', subtype: 'factory', size: 0x200000, offset: 0 },
    ]
  }
];
