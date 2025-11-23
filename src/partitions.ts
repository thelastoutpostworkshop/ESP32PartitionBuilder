import type { Partition } from '@/types';
import {
  OFFSET_APP_TYPE, OFFSET_DATA_TYPE, PARTITION_TABLE_SIZE, PARTITION_TABLE_OFFSET_DEFAULT,
  OTADATA_OFFSET_FROM_PARTITION_TABLE,
  PARTITION_APP_SUBTYPES, PARTITION_DATA_SUBTYPES, PARTITION_TYPE_APP, PARTITION_NVS, PARTITION_TYPE_DATA,
  NVS_PARTITION_SIZE_RECOMMENDED, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, PARTITION_COREDUMP,
  COREDUMP_MIN_PARTITION_SIZE
} from '@/const'


type AppSubType = typeof PARTITION_APP_SUBTYPES[number];
type DataSubType = typeof PARTITION_DATA_SUBTYPES[number];


export class PartitionTable {
  partitions: Partition[] = [];
  flashSize: number;
  partitionTableOffset: number;

  constructor(flashSize: number, partitionTableOffset: number = PARTITION_TABLE_OFFSET_DEFAULT) {
    this.flashSize = flashSize * 1024 * 1024; // Convert MB to bytes
    this.partitionTableOffset = partitionTableOffset;
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

  setPartitionTableOffset(newOffset: number) {
    if (newOffset % OFFSET_DATA_TYPE !== 0) {
      throw new Error('Partition table offset must be aligned to 0x1000.');
    }
    this.partitionTableOffset = newOffset;
    this.recalculateOffsets();

    while (this.getAvailableMemory() < 0) {
      const removedPartition = this.partitions.pop();
      if (!removedPartition) {
        throw new Error('Cannot remove any more partitions. The partitions cannot fit within the new partition table offset.');
      }
      this.recalculateOffsets();
    }
  }

  getPartitions(): Partition[] {
    return this.partitions
  }

  clearPartitions() {
    this.partitions = []
  }

  getPartitionTableBaseOffset(): number {
    return this.partitionTableOffset + PARTITION_TABLE_SIZE;
  }

  private getOtadataRequiredOffset(): number {
    return this.partitionTableOffset + OTADATA_OFFSET_FROM_PARTITION_TABLE;
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
    const baseOffset = this.getPartitionTableBaseOffset();
    const firstPartition = this.partitions[0];
    if (firstPartition && firstPartition.type === PARTITION_TYPE_APP) {
      const appStart = this.alignOffset(Math.max(baseOffset, OFFSET_APP_TYPE), OFFSET_APP_TYPE);
      return this.flashSize - appStart;
    }
    return this.flashSize - Math.max(baseOffset, OFFSET_DATA_TYPE);
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
    let currentOffset = this.getPartitionTableBaseOffset(); // Start after bootloader and partition table

    if (this.partitions.length > 0) {
      const lastPartition = this.partitions[this.partitions.length - 1];
      if (lastPartition) {
        currentOffset = lastPartition.offset + lastPartition.size;
      }
    }

    if (type === PARTITION_TYPE_APP) {
      currentOffset = Math.max(currentOffset, OFFSET_APP_TYPE, this.getPartitionTableBaseOffset());
      return this.alignOffset(currentOffset, OFFSET_APP_TYPE);
    } else {
      currentOffset = Math.max(currentOffset, this.getPartitionTableBaseOffset());
      return this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    }
  }

  alignOffset(offset: number, alignment: number): number {
    return Math.ceil(offset / alignment) * alignment;
  }

  getAvailableMemory(): number {
    const lastPartition = this.partitions[this.partitions.length - 1];
    let currentOffset = lastPartition
      ? lastPartition.offset + lastPartition.size
      : this.getPartitionTableBaseOffset();

    currentOffset = Math.max(currentOffset, this.getPartitionTableBaseOffset());

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
    const baseOffset = this.getPartitionTableBaseOffset();
    const otadataRequiredOffset = this.getOtadataRequiredOffset();

    const otadataIndex = this.partitions.findIndex(partition => partition.subtype === PARTITION_OTA);

    if (otadataIndex !== -1) {
      const otadataPartition = this.partitions[otadataIndex]!;
      const before = this.partitions.slice(0, otadataIndex);
      const after = this.partitions.slice(otadataIndex + 1);
      const beforeKeep: Partition[] = [];
      const movedPartitions: Partition[] = [];
      let previewOffset = baseOffset;

      for (const partition of before) {
        const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
        previewOffset = this.alignOffset(Math.max(previewOffset, baseOffset), alignment);
        const endOffset = previewOffset + partition.size;

        if (endOffset <= otadataRequiredOffset) {
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

    const firstAppIndex = this.partitions.findIndex(partition => partition.type === PARTITION_TYPE_APP);

    if (firstAppIndex > 0) {
      const beforeApp = this.partitions.slice(0, firstAppIndex);
      const afterApp = this.partitions.slice(firstAppIndex);
      const beforeKeep: Partition[] = [];
      const movedBeforeApp: Partition[] = [];
      let previewOffset = baseOffset;

      for (const partition of beforeApp) {
        if (partition.subtype === PARTITION_OTA) {
          beforeKeep.push(partition);
          previewOffset = otadataRequiredOffset + partition.size;
          continue;
        }

        const isAppPartition = partition.type === PARTITION_TYPE_APP;
        const alignment = isAppPartition ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
        const baseline = isAppPartition
          ? Math.max(previewOffset, OFFSET_APP_TYPE, baseOffset)
          : Math.max(previewOffset, baseOffset);
        const alignedOffset = this.alignOffset(baseline, alignment);
        const endOffset = alignedOffset + partition.size;

        const appBoundary = Math.max(OFFSET_APP_TYPE, baseOffset);
        if (isAppPartition || partition.type !== PARTITION_TYPE_DATA || endOffset <= appBoundary) {
          beforeKeep.push(partition);
          previewOffset = endOffset;
        } else {
          movedBeforeApp.push(partition);
        }
      }

      const firstNonAppIndex = afterApp.findIndex(partition => partition.type !== PARTITION_TYPE_APP);
      const afterWithMoved = firstNonAppIndex === -1
        ? [...afterApp, ...movedBeforeApp]
        : [
            ...afterApp.slice(0, firstNonAppIndex),
            ...movedBeforeApp,
            ...afterApp.slice(firstNonAppIndex)
          ];

      const newOrder = [...beforeKeep, ...afterWithMoved];
      const orderChanged = newOrder.length !== this.partitions.length
        || newOrder.some((partition, index) => partition !== this.partitions[index]);

      if (orderChanged) {
        this.partitions.splice(0, this.partitions.length, ...newOrder);
      }
    }

    let currentOffset = baseOffset;

    this.partitions.forEach(partition => {
      if (partition.subtype === PARTITION_OTA) {
        partition.offset = otadataRequiredOffset;
        currentOffset = partition.offset + partition.size;
        return;
      }

      if (partition.type === PARTITION_TYPE_APP) {
        currentOffset = Math.max(currentOffset, OFFSET_APP_TYPE, baseOffset);
        currentOffset = this.alignOffset(currentOffset, OFFSET_APP_TYPE);
      } else {
        currentOffset = Math.max(currentOffset, baseOffset);
        currentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
      }

      partition.offset = currentOffset;
      currentOffset += partition.size;
    });
  }


  updatePartitionSize(partition: Partition, newSize: number) {
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    const minSize = alignment;
    const maxPossible = Math.max(minSize, Math.floor((this.flashSize - partition.offset) / alignment) * alignment);
    let target = Math.min(Math.max(newSize, minSize), maxPossible);
    target = Math.floor(target / alignment) * alignment;

    if (target < minSize) {
      target = minSize;
    }

    const ota0Index = this.partitions.findIndex(p => p.subtype === 'ota_0');
    const ota1Index = this.partitions.findIndex(p => p.subtype === 'ota_1');
    const isOtaPair = (partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && ota0Index !== -1 && ota1Index !== -1;

    const originalSizes = this.partitions.map(p => p.size);
    const attemptResize = (candidateSize: number): boolean => {
      if (isOtaPair) {
        const ota0Partition = this.partitions[ota0Index];
        const ota1Partition = this.partitions[ota1Index];
        if (!ota0Partition || !ota1Partition) {
          return false;
        }
        ota0Partition.size = candidateSize;
        ota1Partition.size = candidateSize;
      } else {
        partition.size = candidateSize;
      }
      this.recalculateOffsets();
      return this.getAvailableMemory() >= 0;
    };

    let candidate = target;
    while (candidate >= minSize) {
      if (attemptResize(candidate)) {
        return;
      }
      candidate -= alignment;
    }

    // Revert if no candidate fits
    this.partitions.forEach((p, index) => {
      const originalSize = originalSizes[index];
      if (typeof originalSize === 'number') {
        p.size = originalSize;
      }
    });
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
