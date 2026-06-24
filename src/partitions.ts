import type { Partition } from '@/types';
import {
  OFFSET_APP_TYPE, OFFSET_DATA_TYPE, PARTITION_TABLE_SIZE, PARTITION_TABLE_OFFSET_DEFAULT,
  OTADATA_OFFSET_FROM_PARTITION_TABLE,
  PARTITION_TYPE_APP, PARTITION_NVS, PARTITION_TYPE_DATA,
  NVS_PARTITION_SIZE_RECOMMENDED, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, PARTITION_COREDUMP,
  COREDUMP_MIN_PARTITION_SIZE
} from '@/const'


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
    const baseOffset = this.getPartitionTableBaseOffset();
    const violating = this.partitions.find(p => p.fixedOffset && p.offset < baseOffset);
    if (violating) {
      throw new Error(`Partition ${violating.name} is before the partition table base ${baseOffset.toString(16)}`);
    }
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

  addPartition(
    name: string,
    type: string,
    subtype: string,
    sizeInBytes: number,
    flags: string,
    offset?: number,
    fixedOffset: boolean = false,
    custom: boolean = false
  ) {
    const partition: Partition = {
      name,
      type,
      subtype,
      offset: offset ?? this.getCurrentOffset(type),
      size: sizeInBytes,
      flags,
      fixedOffset,
      custom
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
    const alignment = this.getPartitionAlignment(partition);
    const nextFixedPartition = this.hasFixedOffsets()
      ? this.getNextPartitionByOffset(partition)
      : undefined;
    const maxEndOffset = nextFixedPartition?.offset ?? this.flashSize;
    const maxSize = Math.floor((maxEndOffset - partition.offset) / alignment) * alignment;

    return Math.max(alignment, maxSize);
  }

  private getPartitionAlignment(partition: Partition): number {
    return partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
  }

  private getNextPartitionByOffset(partition: Partition): Partition | undefined {
    const sortedPartitions = [...this.partitions].sort((a, b) => a.offset - b.offset);
    const currentIndex = sortedPartitions.indexOf(partition);

    if (currentIndex === -1) {
      return undefined;
    }

    return sortedPartitions[currentIndex + 1];
  }


  getCurrentOffset(type: string): number {
    const base = this.getPartitionTableBaseOffset();
    const maxEnd = this.partitions.reduce((max, p) => Math.max(max, p.offset + p.size), base);
    let currentOffset = maxEnd;

    if (type === PARTITION_TYPE_APP) {
      currentOffset = Math.max(currentOffset, OFFSET_APP_TYPE, base);
      return this.alignOffset(currentOffset, OFFSET_APP_TYPE);
    } else {
      currentOffset = Math.max(currentOffset, base);
      return this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    }
  }

  alignOffset(offset: number, alignment: number): number {
    return Math.ceil(offset / alignment) * alignment;
  }

  getAvailableMemory(): number {
    const base = this.getPartitionTableBaseOffset();
    const maxEnd = this.partitions.reduce((max, p) => Math.max(max, p.offset + p.size), base);
    const currentOffset = Math.max(maxEnd, base);
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

    if (this.hasFixedOffsets()) {
      this.partitions.sort((a, b) => a.offset - b.offset);
      return;
    }

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
    const alignment = this.getPartitionAlignment(partition);
    const minSize = alignment;
    const ota0Index = this.partitions.findIndex(p => p.subtype === 'ota_0');
    const ota1Index = this.partitions.findIndex(p => p.subtype === 'ota_1');
    const isOtaPair = (partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && ota0Index !== -1 && ota1Index !== -1;
    const resizeTargets = isOtaPair
      ? [this.partitions[ota0Index], this.partitions[ota1Index]]
      : [partition];
    const maxPossible = Math.max(
      minSize,
      Math.min(...resizeTargets.map(targetPartition => {
        return targetPartition ? this.getMaxPartitionSize(targetPartition) : minSize;
      }))
    );
    let target = Math.min(Math.max(newSize, minSize), maxPossible);
    target = Math.floor(target / alignment) * alignment;

    if (target < minSize) {
      target = minSize;
    }

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

  hasFixedOffsets(): boolean {
    return this.partitions.some(p => p.fixedOffset);
  }

  releaseFixedOffsets() {
    let hadFixedOffsets = false;
    for (const partition of this.partitions) {
      if (partition.fixedOffset) {
        partition.fixedOffset = false;
        hadFixedOffsets = true;
      }
    }
    if (hadFixedOffsets) {
      this.recalculateOffsets();
    }
  }
}
