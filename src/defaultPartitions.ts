import type { PartitionSet } from '@/types';

export const esp32Partitions: PartitionSet[] = [
  {
    name: 'Empty (no partitions)',
    partitions: []
  },
  {
    name: 'OTA With Spiffs',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: "" },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0, flags: "" },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0, flags: "" },
      { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x160000, offset: 0, flags: "" },
      { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: "" },
    ]
  },
  {
    name: 'OTA with FAT',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: "" },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0, flags: "" },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0, flags: "" },
      { name: 'fat', type: 'data', subtype: 'fat', size: 0x160000, offset: 0, flags: "" },
      { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: "" },
    ]
  },
  {
    name: 'Single factory app, no OTA)',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'factory', type: 'app', subtype: 'factory', size: 0x3F0000, offset: 0, flags: "" },
    ]
  },
];
