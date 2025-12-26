import type { Partition } from '@/types';
import { partitionStore } from '@/store';
import {
  FLASH_SIZES,
  OFFSET_APP_TYPE,
  OFFSET_DATA_TYPE,
  PARTITION_OTA,
  PARTITION_TABLE_SIZE,
  PARTITION_TYPE_APP
} from '@/const';

type PartitionStore = ReturnType<typeof partitionStore>;

export interface PartitionLoadError {
  title: string;
  text: string;
}

export function loadPartitionsFromCsv(csv: string, store: PartitionStore): PartitionLoadError | null {
  const validHeader = /#+Name,Type,SubType,Offset,Size(,Flags)?/;
  const rows = csv
    .replaceAll(/[ \t\r]+/g, '')
    .split('\n')
    .filter((row) => validHeader.test(row) || (row !== '' && !row.startsWith('#')));

  const header = rows.shift() || '';
  if (!validHeader.test(header) || rows.length === 0) {
    return { title: 'Invalid CSV Format', text: 'The CSV file format is incorrect. Please use the correct format.' };
  }

  const alignOffset = (offset: number, alignment: number): number => Math.ceil(offset / alignment) * alignment;
  const alignDown = (offset: number, alignment: number): number => Math.floor(offset / alignment) * alignment;
  const suggestPartitionTableOffset = (parts: Partition[]): number => {
    const appOffsets = parts.filter((p) => p.type === PARTITION_TYPE_APP).map((p) => p.offset);
    if (appOffsets.length > 0) {
      const minApp = Math.min(...appOffsets);
      if (minApp >= OFFSET_APP_TYPE) {
        const candidate = minApp - OFFSET_APP_TYPE / 2;
        return Math.max(OFFSET_DATA_TYPE, alignDown(candidate, OFFSET_DATA_TYPE));
      }
    }
    const minOffset = Math.min(...parts.map((p) => p.offset));
    const candidate = minOffset - PARTITION_TABLE_SIZE;
    return Math.max(OFFSET_DATA_TYPE, alignDown(candidate, OFFSET_DATA_TYPE));
  };

  const partitions: Partition[] = [];
  let totalSize = 0;
  const baseOffset = store.partitionTables.getPartitionTableBaseOffset();
  let nextOffset = baseOffset;

  for (const row of rows) {
    const [name, type, subtype, offsetHex, sizeStr, flags] = row.split(',');
    if (!name || !type || !subtype || !sizeStr) {
      return { title: 'Invalid CSV Data', text: 'The CSV file contains invalid data. Please check the file and try again.' };
    }

    let size: number;
    try {
      size = parseSize(sizeStr);
    } catch (error) {
      return { title: 'Invalid CSV Data', text: 'The CSV file contains invalid data. Please check the file and try again.' };
    }

    const isAppPartition = type === PARTITION_TYPE_APP;
    const alignment = isAppPartition ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    let offset: number;

    if (offsetHex) {
      const parsedOffset = parseInt(offsetHex, 16);
      if (Number.isNaN(parsedOffset)) {
        return { title: 'Invalid CSV Data', text: 'The CSV file contains invalid data. Please check the file and try again.' };
      }
      offset = parsedOffset;
      if (offset < baseOffset) {
        return {
          title: 'Invalid Offset',
          text: `Partition offsets must start at or after ${formatHex(baseOffset)}.`
        };
      }
      if (offset % alignment !== 0) {
        return {
          title: 'Invalid Offset Alignment',
          text: `Partition offsets must align to ${formatHex(alignment)}.`
        };
      }
      if (isAppPartition && (offset < OFFSET_APP_TYPE || offset % OFFSET_APP_TYPE !== 0)) {
        return {
          title: 'Invalid App Offset',
          text: `App partitions must start at ${formatHex(OFFSET_APP_TYPE)} or higher and use ${formatHex(OFFSET_APP_TYPE)} alignment.`
        };
      }
      nextOffset = offset + size;
    } else {
      if (isAppPartition) {
        nextOffset = Math.max(nextOffset, OFFSET_APP_TYPE);
      }
      nextOffset = Math.max(nextOffset, baseOffset);
      nextOffset = alignOffset(nextOffset, alignment);
      offset = nextOffset;
      nextOffset += size;
    }

    partitions.push({
      name,
      type,
      subtype,
      size,
      offset,
      flags: flags || '',
      fixedOffset: Boolean(offsetHex)
    });
    totalSize += size;
  }

  store.partitionTables.clearPartitions();
  const suggestedOffset = suggestPartitionTableOffset(partitions);
  store.setPartitionTableOffset(suggestedOffset);
  partitions.forEach((partition) => {
    store.partitionTables.addPartition(
      partition.name,
      partition.type,
      partition.subtype,
      partition.size,
      partition.flags,
      partition.offset,
      partition.fixedOffset ?? false
    );
  });

  for (const size of FLASH_SIZES) {
    if (totalSize <= size.value * 1024 * 1024) {
      store.flashSize = size.value;
      store.partitionTables.setFlashSize(size.value);
      break;
    }
  }

  return null;
}

const formatHex = (value: number): string => `0x${value.toString(16).toUpperCase()}`;

const parseSize = (sizeStr: string): number => {
  const sizeRegex = /^(\d+)([KMB]?)$/;
  const hexRegex = /^0x[0-9a-fA-F]+$/;

  if (hexRegex.test(sizeStr)) {
    return parseInt(sizeStr, 16);
  }

  const match = sizeStr.match(sizeRegex);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const [, value = '', unit = ''] = match;
  const size = parseInt(value, 10);

  switch (unit) {
    case 'K':
      return size * 1024;
    case 'M':
      return size * 1024 * 1024;
    default:
      return size;
  }
};
