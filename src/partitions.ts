import type { Partition } from '@/types';
import {
  OFFSET_APP_TYPE, OFFSET_DATA_TYPE, PARTITION_TABLE_SIZE,
  PARTITION_APP_SUBTYPES, PARTITION_DATA_SUBTYPES, PARTITION_TYPE_APP, PARTITION_NVS,
  NVS_PARTITION_SIZE_RECOMMENDED, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, PARTITION_COREDUMP,
  COREDUMP_MIN_PARTITION_SIZE, OTADATA_REQUIRED_OFFSET
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
    this.recalculateOffsets();
  }

  getTotalPartitionSize(excludePartition?: Partition): number {
    return this.partitions.reduce((total, partition) => {
      return partition === excludePartition ? total : total + partition.size;
    }, 0);
  }

  getTotalMemory(): number {
    const firstPartition = this.partitions[0];
    if (firstPartition && firstPartition.type === PARTITION_TYPE_APP) {
      return this.flashSize - OFFSET_APP_TYPE;
    }
    return this.flashSize - PARTITION_TABLE_SIZE;
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
      if (lastPartition) {
        currentOffset = lastPartition.offset + lastPartition.size;
      }
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
    const lastPartition = this.partitions[this.partitions.length - 1];
    const currentOffset = lastPartition
      ? lastPartition.offset + lastPartition.size
      : PARTITION_TABLE_SIZE;

    const alignedCurrentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    const available = this.flashSize - alignedCurrentOffset;

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
    const otadataIndex = this.partitions.findIndex(partition => partition.subtype === PARTITION_OTA);

    if (otadataIndex !== -1) {
      const otadataPartition = this.partitions[otadataIndex]!;
      const before = this.partitions.slice(0, otadataIndex);
      const after = this.partitions.slice(otadataIndex + 1);
      const beforeKeep: Partition[] = [];
      const movedPartitions: Partition[] = [];
      let previewOffset = PARTITION_TABLE_SIZE;

      for (const partition of before) {
        const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
        previewOffset = this.alignOffset(previewOffset, alignment);
        const endOffset = previewOffset + partition.size;

        if (endOffset <= OTADATA_REQUIRED_OFFSET) {
          beforeKeep.push(partition);
          previewOffset = endOffset;
        } else {
          movedPartitions.push(partition);
        }
      }

      const isOtaAppPartition = (partition: Partition) =>
        partition.type === PARTITION_TYPE_APP && typeof partition.subtype === 'string' && partition.subtype.startsWith('ota_');

      const otaAppPartitions = after.filter(isOtaAppPartition);
      const otherAfterPartitions = after.filter(partition => !isOtaAppPartition(partition));

      const newOrder = [
        ...beforeKeep,
        otadataPartition,
        ...otaAppPartitions,
        ...otherAfterPartitions,
        ...movedPartitions
      ];

      const orderChanged = newOrder.length !== this.partitions.length
        || newOrder.some((partition, index) => partition !== this.partitions[index]);

      if (orderChanged) {
        this.partitions.splice(0, this.partitions.length, ...newOrder);
      }
    }

    let currentOffset = PARTITION_TABLE_SIZE;

    this.partitions.forEach(partition => {
      if (partition.subtype === PARTITION_OTA) {
        partition.offset = OTADATA_REQUIRED_OFFSET;
        currentOffset = partition.offset + partition.size;
        return;
      }

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
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    newSize = Math.round(newSize / alignment) * alignment; // Ensure alignment

    if ((partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && this.hasOTAPartitions()) {
      const ota0Index = this.partitions.findIndex(p => p.subtype === 'ota_0');
      const ota1Index = this.partitions.findIndex(p => p.subtype === 'ota_1');
      if (ota0Index !== -1 && ota1Index !== -1) {
        const ota0Partition = this.partitions[ota0Index];
        const ota1Partition = this.partitions[ota1Index];
        if (ota0Partition && ota1Partition) {
          ota0Partition.size = newSize;
          ota1Partition.size = newSize;
          this.recalculateOffsets();
          return;
        }
      }
    }
    partition.size = newSize;
    this.recalculateOffsets();
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
    
  hasSubtype(subtype:string):boolean {
    return this.partitions.some(p => p.subtype === subtype)
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
