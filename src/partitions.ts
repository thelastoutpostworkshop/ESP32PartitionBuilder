import type { Partition } from '@/types';
import {
  OFFSET_APP_TYPE, OFFSET_DATA_TYPE, PARTITION_TABLE_SIZE,
  PARTITION_APP_SUBTYPES, PARTITION_DATA_SUBTYPES, PARTITION_TYPE_APP, PARTITION_NVS,
  NVS_PARTITION_SIZE_RECOMMENDED, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, PARTITION_COREDUMP,
  COREDUMP_MIN_PARTITION_SIZE
} from '@/const'


type AppSubType = typeof PARTITION_APP_SUBTYPES[number];
type DataSubType = typeof PARTITION_DATA_SUBTYPES[number];


export class PartitionTable {
  partitions: Partition[] = [];
  flashSize: number;

  constructor(flashSize: number) {
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

  addPartition(name: string, type: string, subtype: AppSubType | DataSubType, sizeInBytes: number, flags: string) {
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
      size: sizeInBytes,
      flags
    };

    this.partitions.push(partition);
  }

  getTotalPartitionSize(excludePartition?: Partition): number {
    return this.partitions.reduce((total, partition) => {
      return partition === excludePartition ? total : total + partition.size;
    }, 0);
  }

  getTotalMemory(): number {
    if (this.partitions.length > 0 && this.partitions[0].type === PARTITION_TYPE_APP) {
      return this.flashSize - OFFSET_APP_TYPE;
    } else {
      return this.flashSize - PARTITION_TABLE_SIZE;
    }
  }

  getMaxPartitionSize(partition: Partition): number {
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
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
      return this.alignOffset(currentOffset, OFFSET_APP_TYPE);
    } else {
      return this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    }
  }

  alignOffset(offset: number, alignment: number): number {
    return Math.ceil(offset / alignment) * alignment;
  }

  getAvailableMemory(): number {
    const currentOffset = this.partitions.length > 0
      ? this.partitions[this.partitions.length - 1].offset + this.partitions[this.partitions.length - 1].size
      : PARTITION_TABLE_SIZE;

    const alignedCurrentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    const available = Math.max(0, this.flashSize - alignedCurrentOffset);

    return available;
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
        currentOffset = this.alignOffset(currentOffset, OFFSET_APP_TYPE);
      } else {
        currentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
      }

      partition.offset = currentOffset;
      currentOffset += partition.size;
    });
  }


  updatePartitionSize(partition: Partition, newSize: number) {
    const index = this.partitions.findIndex(p => p.name === partition.name);

    if (index === -1) {
        throw new Error(`Partition ${partition.name} not found.`);
    }

    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    newSize = Math.round(newSize / alignment) * alignment; // Ensure alignment

    if ((partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && this.hasOTAPartitions()) {
        const ota0Index = this.partitions.findIndex(p => p.subtype === 'ota_0');
        const ota1Index = this.partitions.findIndex(p => p.subtype === 'ota_1');

        const totalAvailableMemory = this.getTotalMemory() - this.getTotalPartitionSize() + this.partitions[ota0Index].size + this.partitions[ota1Index].size;

        newSize = Math.min(newSize, Math.floor(totalAvailableMemory / (2 * alignment)) * alignment);

        this.partitions[ota0Index].size = newSize;
        this.partitions[ota1Index].size = newSize;
        this.recalculateOffsets();
        return;
    }

    const totalMemory = this.getTotalMemory();
    const otherPartitionsSize = this.getTotalPartitionSize(this.partitions[index]);
    const availableMemory = totalMemory - otherPartitionsSize;

    if (newSize > availableMemory) {
        const excessSize = newSize - availableMemory;
        const remainingPartitions = this.partitions.filter((_, i) => i !== index);
        const totalRemainingSize = remainingPartitions.reduce((sum, p) => sum + p.size, 0);

        remainingPartitions.forEach(p => {
            if (p.subtype !== PARTITION_NVS && p.subtype !== PARTITION_OTA && p.subtype !== PARTITION_COREDUMP) {
                const reduction = (p.size / totalRemainingSize) * excessSize;
                p.size = Math.max(
                    Math.round((p.size - reduction) / OFFSET_DATA_TYPE) * OFFSET_DATA_TYPE,
                    OFFSET_DATA_TYPE
                );
            } else {
                if (p.size > this.getRecommendedSize(p.subtype)) {
                    const reduction = Math.min((p.size / totalRemainingSize) * excessSize, p.size - this.getRecommendedSize(p.subtype));
                    p.size = Math.max(
                        Math.round((p.size - reduction) / OFFSET_DATA_TYPE) * OFFSET_DATA_TYPE,
                        this.getRecommendedSize(p.subtype)
                    );
                }
            }
        });
    }

    this.partitions[index].size = newSize;
    this.recalculateOffsets();

    const finalTotalSize = this.getTotalPartitionSize();
    if (finalTotalSize > this.flashSize) {
        throw new Error(`Partitions exceed the available flash memory.`);
    }
}

  
  getRecommendedSize(subtype: string): number {
    switch (subtype) {
      case PARTITION_NVS:
        return NVS_PARTITION_SIZE_RECOMMENDED;
      case PARTITION_OTA:
        return OTA_DATA_PARTITION_SIZE;
      case PARTITION_COREDUMP:
        return COREDUMP_MIN_PARTITION_SIZE;
      default:
        return OFFSET_DATA_TYPE;
    }
  }
    

  hasOTAPartitions(): boolean {
    const hasOTAData = this.partitions.some(p => p.type === 'data' && p.subtype === 'ota');
    const hasOTA0 = this.partitions.some(p => p.type === 'app' && p.subtype === 'ota_0');
    const hasOTA1 = this.partitions.some(p => p.type === 'app' && p.subtype === 'ota_1');
    return hasOTAData && hasOTA0 && hasOTA1;
  }

  generateTable(): Partition[] {
    return this.partitions;
  }
}