// src/partitions.ts
import type { Partition } from '@/types';

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


export class PartitionTable {
  partitions: Partition[] = [];
  flashSize: number;

  constructor(flashSize: 4 | 8 | 16) {
    this.flashSize = flashSize * 1024 * 1024; // Convert MB to bytes
  }

  setFlashSize(newFlashSizeMB: number) {
    this.flashSize = newFlashSizeMB * 1024 * 1024; // Convert MB to bytes
    // Remove partitions from the last until they fit within the new flash size
    while (this.getTotalPartitionSize() > this.getTotalMemory()) {
      const removedPartition = this.partitions.pop();
      if (!removedPartition) {
        throw new Error('Cannot remove any more partitions. The partitions cannot fit within the new flash memory size.');
      }
    }

    // Recalculate offsets after removing partitions
    this.recalculateOffsets();
  }

  getPartitions(): Partition[] {
    return this.partitions
  }

  clearPartitions() {
    this.partitions = []
  }

  addPartition(name: string, type: string, subtype: AppSubType | DataSubType, sizeInKB: number, flags: string) {
    const size = sizeInKB * 1024; // Convert KB to bytes
    // Align the offset based on type
    let currentOffset = this.getCurrentOffset(type);

    // // Check if the partition fits within the flash memory
    // if (currentOffset + size > this.flashSize) {
    //   throw new Error(`Partition ${name} exceeds the flash memory size of ${this.flashSize} bytes.`);
    // }

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

  getTotalPartitionSize(): number {
    return this.partitions.reduce((total, partition) => total + partition.size, 0);
  }

  getTotalMemory(): number {
    return this.flashSize - PARTITION_TABLE_SIZE
  }

  getMaxPartitionSize(partition: Partition): number {
    const alignment = partition.type === PARTITION_TYPE_APP ? 0x10000 : 0x1000;
    const alignedOffset = this.alignOffset(partition.offset, alignment);
    
    let maxSize = this.flashSize - alignedOffset;
    
    for (const existingPartition of this.partitions) {
      if (existingPartition.offset > partition.offset) {
        maxSize = existingPartition.offset - alignedOffset;
        break;
      }
    }
  
    return maxSize;
  }
  

  getCurrentOffset(type: string): number {
    let currentOffset = PARTITION_TABLE_SIZE; // Start after bootloader and partition table

    if (this.partitions.length > 0) {
      const lastPartition = this.partitions[this.partitions.length - 1];
      currentOffset = lastPartition.offset + lastPartition.size;
    }

    if (type === PARTITION_TYPE_APP) {
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
    const avalaible = this.flashSize - this.alignOffset(currentOffset, 0x1000);
    return avalaible;
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
    let currentOffset = PARTITION_TABLE_SIZE;

    this.partitions.forEach(partition => {
      if (partition.type === PARTITION_TYPE_APP) {
        currentOffset = this.alignOffset(currentOffset, 0x10000);
      } else {
        currentOffset = this.alignOffset(currentOffset, 0x1000);
      }

      partition.offset = currentOffset;
      currentOffset += partition.size;
    });
  }

  updatePartitionSize(name: string, newSize: number) {
    const size = newSize; // Convert KB to bytes
    const index = this.partitions.findIndex(partition => partition.name === name);

    if (index === -1) {
      throw new Error(`Partition ${name} not found.`);
    }

    // Update the size of the partition
    this.partitions[index].size = size;

    // Recalculate offsets
    this.recalculateOffsets();
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