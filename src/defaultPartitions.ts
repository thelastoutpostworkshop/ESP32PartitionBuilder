import type { PartitionSet } from '@/types';

export const esp32Partitions: PartitionSet[] = [
    {
      name: 'Partition Set 1',
      partitions: [
        { name: 'nvs', type: 'data', subtype: 'nvs', size: 16, offset: 0, flags: "" },
        { name: 'otadata', type: 'data', subtype: 'ota', size: 8, offset: 0, flags: "" },
        { name: 'app0', type: 'app', subtype: 'ota_0', size: 1280, offset: 0, flags: "" },
        { name: 'app1', type: 'app', subtype: 'ota_1', size: 1280, offset: 0, flags: "" },
      ]
    },
    {
      name: 'Partition Set 2',
      partitions: [
        { name: 'storage', type: 'data', subtype: 'spiffs', size: 1024, offset: 0, flags: "" },
        { name: 'app2', type: 'app', subtype: 'factory', size: 2048, offset: 0, flags: "" },
      ]
    }
  ];
  