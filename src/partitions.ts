// src/partitions.ts
import type { PartitionSet, Partition } from '@/types';

export const PARTITION_TABLE_SIZE = 0x9000; // 36KB reserved for the partition table
export const FLASH_SIZES = [
    { value: 4, text: '4 MB' },
    { value: 8, text: '8 MB' },
    { value: 16, text: '16 MB' }
];
export const PARTITION_TYPE_APP = "app"
export const PARTITION_TYPE_DATA = "data"
export const PARTITION_TYPES = [PARTITION_TYPE_APP, PARTITION_TYPE_DATA]
export const PARTITION_APP_SUBTYPES = ['factory', 'test', 'ota_0', 'ota_1', 'ota_2', 'ota_3', 'ota_4', 'ota_5', 'ota_6', 'ota_7', 'ota_8', 'ota_9', 'ota_10', 'ota_11', 'ota_12', 'ota_13', 'ota_14', 'ota_15']
export const PARTITION_DATA_SUBTYPES = ['ota', 'phy', 'nvs', 'nvs_keys', 'coredump', 'efuse', 'fat', 'spiffs', 'littlefs']

type AppSubType = typeof PARTITION_APP_SUBTYPES[number];
type DataSubType = typeof PARTITION_DATA_SUBTYPES[number];

export const esp32Partitions: PartitionSet[] = [
  {
    name: 'Partition Set 1',
    partitions: [
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x4000, offset: 0,flags:"" },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0,flags:"" },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0,flags:"" },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0,flags:"" },
      { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x170000, offset: 0,flags:"" },
    ]
  },
  {
    name: 'Partition Set 2',
    partitions: [
      { name: 'storage', type: 'data', subtype: 'spiffs', size: 0x100000, offset: 0,flags:"" },
      { name: 'app2', type: 'app', subtype: 'factory', size: 0x200000, offset: 0,flags:"" },
    ]
  }
];

export class PartitionTable {
  partitions: Partition[] = [];
  flashSize: number;

  constructor(flashSize: 4 | 8 | 16) {
    this.flashSize = flashSize * 1024 * 1024; // Convert MB to bytes
  }

  getPartitions():Partition[] {
    return this.partitions
  }

  addPartition(name: string, type: 'app' | 'data', subtype: AppSubType | DataSubType, sizeInKB: number, flags: string) {
    const size = sizeInKB * 1024; // Convert KB to bytes
    // Align the offset based on type
    let currentOffset = this.getCurrentOffset(type);

    // Check if the partition fits within the flash memory
    if (currentOffset + size > this.flashSize) {
      throw new Error(`Partition ${name} exceeds the flash memory size of ${this.flashSize} bytes.`);
    }

    const partition: Partition = {
      name,
      type,
      subtype,
      offset: currentOffset,
      size,
      flags
    };

    this.partitions.push(partition);
  }

  getCurrentOffset(type: 'app' | 'data'): number {
    let currentOffset = 0x9000; // Start after bootloader and partition table

    if (this.partitions.length > 0) {
      const lastPartition = this.partitions[this.partitions.length - 1];
      currentOffset = lastPartition.offset + lastPartition.size;
    }

    if (type === 'app') {
      return this.alignOffset(currentOffset, 0x10000);
    } else {
      return this.alignOffset(currentOffset, 0x1000);
    }
  }

  alignOffset(offset: number, alignment: number): number {
    return Math.ceil(offset / alignment) * alignment;
  }

  getAvailableMemory(): number {
    const currentOffset = this.partitions.length > 0
      ? this.partitions[this.partitions.length - 1].offset + this.partitions[this.partitions.length - 1].size
      : 0x9000;
    return this.flashSize - this.alignOffset(currentOffset, 0x1000);
  }

  removePartition(name: string) {
    const index = this.partitions.findIndex(partition => partition.name === name);

    if (index === -1) {
      throw new Error(`Partition ${name} not found.`);
    }

    this.partitions.splice(index, 1);
    this.recalculateOffsets();
  }

  recalculateOffsets() {
    let currentOffset = 0x9000;

    this.partitions.forEach(partition => {
      if (partition.type === 'app') {
        currentOffset = this.alignOffset(currentOffset, 0x10000);
      } else {
        currentOffset = this.alignOffset(currentOffset, 0x1000);
      }

      partition.offset = currentOffset;
      currentOffset += partition.size;
    });
  }

  generateTable(): Partition[] {
    return this.partitions;
  }

  printTable(sizeFormat: 'hex' | 'kb' = 'hex'): void {
    console.log('# Name,   Type, SubType, Offset,  Size, Flags');
    this.partitions.forEach(partition => {
      const size = sizeFormat === 'hex' ? `0x${partition.size.toString(16)}` : `${partition.size / 1024}K`;
      console.log(`${partition.name}, ${partition.type}, ${partition.subtype}, 0x${partition.offset.toString(16)}, ${size}, ${partition.flags || ''}`);
    });
  }

  printAvailableMemory(): void {
      const availableMemoryKB = this.getAvailableMemory() / 1024;
      console.log(`Available Memory: ${availableMemoryKB} KB`);
    }
}