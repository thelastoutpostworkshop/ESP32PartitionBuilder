import type { Partition } from '@/types';

export const PARTITION_SUBTYPE_COLORS: Record<string, string> = {
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

export const PARTITION_TYPE_COLORS: Record<string, string> = {
  app: '#4caf50',
  data: '#2196f3'
};

export const PARTITION_COLOR_PALETTE = [
  '#ffadad',
  '#ffd6a5',
  '#fdffb6',
  '#caffbf',
  '#9bf6ff',
  '#a0c4ff',
  '#bdb2ff',
  '#ffc6ff'
] as const;

export const PARTITION_FALLBACK_COLOR = '#6c757d';

export function getPartitionBaseColor(partition: Partition, index = 0): string {
  const subtypeColor = PARTITION_SUBTYPE_COLORS[partition.subtype];
  if (subtypeColor) {
    return subtypeColor;
  }

  const typeColor = PARTITION_TYPE_COLORS[partition.type];
  if (typeColor) {
    return typeColor;
  }

  return PARTITION_COLOR_PALETTE[index % PARTITION_COLOR_PALETTE.length] ?? PARTITION_FALLBACK_COLOR;
}

export function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);

  if (amount >= 0) {
    const mix = (channel: number) => Math.round(channel + (255 - channel) * Math.min(amount, 1));
    return rgbToHex(mix(r), mix(g), mix(b));
  }

  const factor = 1 + Math.max(amount, -1);
  const mix = (channel: number) => Math.round(channel * factor);
  return rgbToHex(mix(r), mix(g), mix(b));
}

export function getAccessibleTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#1f2933' : '#f8f9fa';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let normalized = hex.replace('#', '');

  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }

  if (normalized.length !== 6) {
    return { r: 108, g: 117, b: 125 };
  }

  const numeric = Number.parseInt(normalized, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}
