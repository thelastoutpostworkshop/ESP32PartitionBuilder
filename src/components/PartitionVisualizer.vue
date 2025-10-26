<template>
  <div class="partition-visualizer">
    <div v-for="segment in partitionSegments" :key="segment.id" class="partition-segment"
      :class="`partition-segment--${segment.kind}`" :style="segment.style" :title="segment.title">
      <div class="partition-segment__content">
        <span class="partition-segment__name">{{ segment.name }}</span>
        <span v-if="segment.meta && segment.showMeta" class="partition-segment__meta">{{ segment.meta }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Partition } from '@/types';
import { partitionStore } from '@/store';
import { getAccessibleTextColor, getPartitionBaseColor, lightenColor } from '@/partitionColors';

type SegmentKind = 'partition' | 'reserved' | 'free';

interface PartitionSegment {
  id: string;
  name: string;
  meta?: string;
  title: string;
  kind: SegmentKind;
  style: Record<string, string>;
  showMeta: boolean;
}

const store = partitionStore();

const RESERVED_COLOR = '#37474f';
const FREE_COLOR = '#455a64';

const partitionSegments = computed<PartitionSegment[]>(() => {
  const partitions = [...store.partitionTables.getPartitions()].sort((a, b) => a.offset - b.offset);
  const flashSize = store.flashSizeBytes;
  const segments: PartitionSegment[] = [];

  if (!flashSize || flashSize <= 0) {
    return segments;
  }

  let cursor = 0;

  const addGapSegment = (length: number, startOffset: number, label: string, kind: SegmentKind) => {
    if (length <= 0) {
      return;
    }
    const percentage = (length / flashSize) * 100;
    const baseColor = kind === 'reserved' ? RESERVED_COLOR : FREE_COLOR;
    const width = formatWidth(percentage);
    segments.push({
      id: `${kind}-${startOffset}`,
      name: label,
      meta: store.hintDisplaySize(length),
      title: `${label}\nOffset: ${formatHex(startOffset)} - ${formatHex(startOffset + length)} (${store.hintDisplaySize(length)})`,
      kind,
      showMeta: percentage > 9,
      style: buildSegmentStyle(baseColor, width)
    });
  };

  if (partitions.length === 0) {
    addGapSegment(flashSize, 0, 'Unallocated Flash', 'free');
    return segments;
  }

  partitions.forEach((partition, index) => {
    if (partition.offset > cursor) {
      const gapKind = cursor === 0 ? 'reserved' : 'free';
      const label = cursor === 0 ? 'Reserved' : 'Free Space';
      addGapSegment(partition.offset - cursor, cursor, label, gapKind);
      cursor = partition.offset;
    }

    const length = partition.size;
    const percentage = (length / flashSize) * 100;
    const width = formatWidth(percentage);
    const baseColor = getPartitionBaseColor(partition, index);
    const start = partition.offset;
    const end = start + length;

    segments.push({
      id: `partition-${partition.name || 'unnamed'}-${index}`,
      name: partition.name || 'Unnamed',
      meta: store.hintDisplaySize(length),
      title: `${partition.name || 'Partition'} (${partition.type}/${partition.subtype})` +
        `\nSize: ${store.hintDisplaySize(length)} (${length} bytes)` +
        `\nOffset: ${formatHex(start)} - ${formatHex(end)}`,
      kind: 'partition',
      showMeta: percentage > 8,
      style: buildSegmentStyle(baseColor, width)
    });

    cursor = end;
  });

  if (cursor < flashSize) {
    addGapSegment(flashSize - cursor, cursor, 'Unused Flash', 'free');
  }

  return segments;
});

function buildSegmentStyle(baseColor: string, width: string): Record<string, string> {
  const gradientStart = lightenColor(baseColor, 0.35);
  const gradientEnd = lightenColor(baseColor, -0.05);
  const borderColor = lightenColor(baseColor, 0.55);
  return {
    width,
    flexBasis: width,
    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
    color: getAccessibleTextColor(baseColor),
    boxShadow: `inset 0 0 0 1px ${borderColor}`
  };
}

function formatWidth(percentage: number): string {
  return `${Math.max(percentage, 0)}%`;
}

function formatHex(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(6, '0')}`;
}
</script>

<style scoped>
.partition-visualizer {
  display: flex;
  width: 100%;
  min-height: 60px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.8));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 12px 32px rgba(15, 23, 42, 0.35);
}

.partition-segment {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 24px;
  overflow: hidden;
}

.partition-segment:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.07);
}

.partition-segment:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.3);
  z-index: 1;
}

.partition-segment__content {
  width: 100%;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
  pointer-events: none;
}

.partition-segment__name {
  font-weight: 600;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.partition-segment__meta {
  font-size: 0.7rem;
  opacity: 0.85;
  white-space: nowrap;
}

.partition-segment--reserved .partition-segment__name {
  letter-spacing: 0.02em;
}

.partition-segment--free .partition-segment__meta {
  opacity: 0.7;
}
</style>
