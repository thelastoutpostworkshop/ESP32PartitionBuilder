import type { PartitionSet } from '@/types';

export const esp32Partitions: PartitionSet[] = [
  {
    name: 'Empty (no partitions)',
    partitions: []
  },
  {
    name: '4MB with spiffs & OTA (1.2MP APP/1.5MB SPIFFS)',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: "" },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x330000, offset: 0, flags: "" },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x330000, offset: 0, flags: "" },
      { name: 'spiffs', type: 'app', subtype: 'spiffs', size: 0x180000, offset: 0, flags: "" },
      { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: "" },
    ]
  },
  {
    name: '4MB with fat & OTA (1.2MP APP/1.5MB FAT)',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: "" },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x330000, offset: 0, flags: "" },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x330000, offset: 0, flags: "" },
      { name: 'fat', type: 'app', subtype: 'fat', size: 0x180000, offset: 0, flags: "" },
      { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: "" },
    ]
  },
  {
    name: 'Single factory app, no OTA)',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: "" },
      { name: 'factory', type: 'app', subtype: 'factory', size: 0x3FB000, offset: 0, flags: "" },
    ]
  },
];
