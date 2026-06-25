import { OFFSET_APP_TYPE } from '@/const';

export interface ChipTarget {
  value: string;
  text: string;
  esptoolChip: string;
  bootloaderOffset: number;
}

export const CHIP_TARGETS: ChipTarget[] = [
  { value: 'esp32', text: 'ESP32', esptoolChip: 'esp32', bootloaderOffset: 0x1000 },
  { value: 'esp32s2', text: 'ESP32-S2', esptoolChip: 'esp32s2', bootloaderOffset: 0x1000 },
  { value: 'esp32s3', text: 'ESP32-S3', esptoolChip: 'esp32s3', bootloaderOffset: 0x0 },
  { value: 'esp32c3', text: 'ESP32-C3', esptoolChip: 'esp32c3', bootloaderOffset: 0x0 },
  { value: 'esp32c5', text: 'ESP32-C5', esptoolChip: 'esp32c5', bootloaderOffset: 0x2000 },
  { value: 'esp32c6', text: 'ESP32-C6', esptoolChip: 'esp32c6', bootloaderOffset: 0x0 },
  { value: 'esp32h2', text: 'ESP32-H2', esptoolChip: 'esp32h2', bootloaderOffset: 0x0 }
];

export function formatHexOffset(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`;
}

export function buildFlashCommand(
  target: ChipTarget,
  partitionTableOffset: number,
  appOffset: number = OFFSET_APP_TYPE
): string {
  return [
    'esptool',
    '--chip',
    target.esptoolChip,
    'write_flash',
    formatHexOffset(target.bootloaderOffset),
    'bootloader.bin',
    formatHexOffset(partitionTableOffset),
    'partition-table.bin',
    formatHexOffset(appOffset),
    'app.bin'
  ].join(' ');
}
