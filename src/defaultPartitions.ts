import type { PartitionSet } from '@/types';

export const esp32Partitions: PartitionSet[] = [
    {
      name: '4MB with spiffs (1.2MP APP/1.5MB SPIFFS)',
      partitions: [
        { name: 'nvs', type: 'data', subtype: 'nvs', size: 20, offset: 0, flags: "" },
        { name: 'otadata', type: 'data', subtype: 'ota', size: 8, offset: 0, flags: "" },
        { name: 'app0', type: 'app', subtype: 'ota_0', size: 1280, offset: 0, flags: "" },
        { name: 'app1', type: 'app', subtype: 'ota_1', size: 1280, offset: 0, flags: "" },
        { name: 'spiffs', type: 'app', subtype: 'spiffs', size: 1408, offset: 0, flags: "" },
        { name: 'coredump', type: 'data', subtype: 'coredump', size: 64, offset: 0, flags: "" },
      ]
    },
    {
        name: '4MB with fat (1.2MP APP/1.5MB FAT)',
        partitions: [
          { name: 'nvs', type: 'data', subtype: 'nvs', size: 20, offset: 0, flags: "" },
          { name: 'otadata', type: 'data', subtype: 'ota', size: 8, offset: 0, flags: "" },
          { name: 'app0', type: 'app', subtype: 'ota_0', size: 1280, offset: 0, flags: "" },
          { name: 'app1', type: 'app', subtype: 'ota_1', size: 1280, offset: 0, flags: "" },
          { name: 'spiffs', type: 'app', subtype: 'spiffs', size: 1408, offset: 0, flags: "" },
          { name: 'coredump', type: 'data', subtype: 'coredump', size: 64, offset: 0, flags: "" },
        ]
      },
  ];
  