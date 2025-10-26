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

const COLOR_BY_SUBTYPE: Record<string, string> = {
  factory: '#f8b26a',
  ota_0: '#7cc576',
  ota_1: '#58a55b',
  ota_2: '#499550',
  ota: '#8d6be6',
  nvs: '#4dd0e1',
  fat: '#7986cb',
  spiffs: '#64b5f6',
  littlefs: '#81d4fa',
  coredump: '#ef9a9a',
  phy: '#aed581',
  test: '#f48fb1'
};

const COLOR_BY_TYPE: Record<string, string> = {
  app: '#4caf50',
  data: '#2196f3'
};

const FALLBACK_COLOR = '#6c757d';
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
    const baseColor = getPartitionColor(partition, index);
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

function getPartitionColor(partition: Partition, index: number): string {
  return COLOR_BY_SUBTYPE[partition.subtype] ?? COLOR_BY_TYPE[partition.type] ?? generatePaletteColor(index) ?? FALLBACK_COLOR;
}

function generatePaletteColor(index: number): string {
  const palette = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
  return palette[index % palette.length] ?? FALLBACK_COLOR;
}

function buildSegmentStyle(baseColor: string, width: string): Record<string, string> {
  const gradientStart = lightenColor(baseColor, 0.35);
  const gradientEnd = lightenColor(baseColor, -0.05);
  const borderColor = lightenColor(baseColor, 0.55);
  return {
    width,
    flexBasis: width,
    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
    color: getTextColor(baseColor),
    boxShadow: `inset 0 0 0 1px ${borderColor}`
  };
}

function formatWidth(percentage: number): string {
  return `${Math.max(percentage, 0)}%`;
}

function formatHex(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(6, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }
  if (normalized.length !== 6) {
    return { r: 108, g: 117, b: 125 };
  }
  const numeric = parseInt(normalized, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  if (amount >= 0) {
    const mix = (channel: number) => Math.round(channel + (255 - channel) * Math.min(amount, 1));
    return rgbToHex(mix(r), mix(g), mix(b));
  } else {
    const factor = 1 + Math.max(amount, -1);
    const mix = (channel: number) => Math.round(channel * factor);
    return rgbToHex(mix(r), mix(g), mix(b));
  }
}

function getTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#1f2933' : '#f8f9fa';
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
