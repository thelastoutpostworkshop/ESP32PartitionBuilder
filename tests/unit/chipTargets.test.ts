import { describe, expect, it } from 'vitest'
import { buildFlashCommand, CHIP_TARGETS } from '@/chipTargets'

describe('chip targets', () => {
  it('includes flashing offsets for supported ESP chip targets', () => {
    expect(CHIP_TARGETS).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'esp32', esptoolChip: 'esp32', bootloaderOffset: 0x1000 }),
      expect.objectContaining({ value: 'esp32s3', esptoolChip: 'esp32s3', bootloaderOffset: 0x0 }),
      expect.objectContaining({ value: 'esp32c5', esptoolChip: 'esp32c5', bootloaderOffset: 0x2000 }),
      expect.objectContaining({ value: 'esp32c6', esptoolChip: 'esp32c6', bootloaderOffset: 0x0 })
    ]))
  })

  it('builds the esptool flashing command shape for a target', () => {
    const target = CHIP_TARGETS.find(chip => chip.value === 'esp32c5')

    expect(target).toBeDefined()
    expect(buildFlashCommand(target!, 0x8000)).toBe(
      'esptool --chip esp32c5 write_flash 0x2000 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin'
    )
  })

  it('uses a custom app offset in the esptool flashing command', () => {
    const target = CHIP_TARGETS.find(chip => chip.value === 'esp32c5')

    expect(target).toBeDefined()
    expect(buildFlashCommand(target!, 0x8000, 0x1A0000)).toBe(
      'esptool --chip esp32c5 write_flash 0x2000 bootloader.bin 0x8000 partition-table.bin 0x1A0000 app.bin'
    )
  })
})
