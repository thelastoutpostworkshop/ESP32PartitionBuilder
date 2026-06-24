<template>
  <div class="partition-visualizer" data-testid="partition-visualizer">
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

interface PendingPartitionSegment extends Omit<PartitionSegment, 'style'> {
  baseColor: string;
  percentage: number;
}

const store = partitionStore();

const RESERVED_COLOR = '#37474f';
const FREE_COLOR = '#455a64';
const MIN_VISIBLE_SEGMENT_PERCENTAGE = 1.4;

const partitionSegments = computed<PartitionSegment[]>(() => {
  const partitions = [...store.partitionTables.getPartitions()].sort((a, b) => a.offset - b.offset);
  const flashSize = store.flashSizeBytes;
  const segments: PendingPartitionSegment[] = [];

  if (!flashSize || flashSize <= 0) {
    return [];
  }

  let cursor = 0;

  const addGapSegment = (length: number, startOffset: number, label: string, kind: SegmentKind) => {
    if (length <= 0) {
      return;
    }
    const percentage = (length / flashSize) * 100;
    const baseColor = kind === 'reserved' ? RESERVED_COLOR : FREE_COLOR;
    segments.push({
      id: `${kind}-${startOffset}`,
      name: label,
      meta: store.hintDisplaySize(length),
      title: `${label}\nOffset: ${formatHex(startOffset)} - ${formatHex(startOffset + length)} (${store.hintDisplaySize(length)})`,
      kind,
      showMeta: percentage > 9,
      baseColor,
      percentage
    });
  };

  if (partitions.length === 0) {
    addGapSegment(flashSize, 0, 'Unallocated Flash', 'free');
    return finalizeSegments(segments);
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
      baseColor,
      percentage
    });

    cursor = end;
  });

  if (cursor < flashSize) {
    addGapSegment(flashSize - cursor, cursor, 'Unused Flash', 'free');
  }

  return finalizeSegments(segments);
});

function finalizeSegments(segments: PendingPartitionSegment[]): PartitionSegment[] {
  const widths = calculateBalancedWidths(segments.map(segment => segment.percentage));

  return segments.map((segment, index) => ({
    id: segment.id,
    name: segment.name,
    meta: segment.meta,
    title: segment.title,
    kind: segment.kind,
    showMeta: segment.showMeta,
    style: buildSegmentStyle(segment.baseColor, formatWidth(widths[index] ?? 0))
  }));
}

function calculateBalancedWidths(percentages: number[]): number[] {
  const positiveIndexes = percentages
    .map((percentage, index) => ({ percentage, index }))
    .filter(segment => segment.percentage > 0);

  if (positiveIndexes.length === 0) {
    return percentages.map(() => 0);
  }

  const minimum = Math.min(MIN_VISIBLE_SEGMENT_PERCENTAGE, 100 / positiveIndexes.length);
  const smallIndexes = new Set(
    positiveIndexes
      .filter(segment => segment.percentage < minimum)
      .map(segment => segment.index)
  );
  const reservedForSmallSegments = smallIndexes.size * minimum;
  const largeTotal = positiveIndexes.reduce((total, segment) => {
    return smallIndexes.has(segment.index) ? total : total + segment.percentage;
  }, 0);

  if (largeTotal <= 0 || reservedForSmallSegments >= 100) {
    const equalWidth = 100 / positiveIndexes.length;
    return percentages.map(percentage => (percentage > 0 ? equalWidth : 0));
  }

  const largeScale = (100 - reservedForSmallSegments) / largeTotal;

  return percentages.map((percentage, index) => {
    if (percentage <= 0) {
      return 0;
    }
    if (smallIndexes.has(index)) {
      return minimum;
    }
    return percentage * largeScale;
  });
}

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
  min-width: 0;
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
