import { describe, expect, it } from 'vitest'
import { getAccessibleTextColor, getPartitionBaseColor, lightenColor } from '@/partitionColors'
import type { Partition } from '@/types'

function partition(partial: Partial<Partition>): Partition {
  return {
    name: 'partition',
    type: 'data',
    subtype: 'custom',
    offset: 0,
    size: 0x1000,
    flags: '',
    ...partial
  }
}

describe('partition color helpers', () => {
  it('prefers subtype colors over type colors', () => {
    expect(getPartitionBaseColor(partition({ type: 'data', subtype: 'nvs' }))).toBe('#4dd0e1')
  })

  it('falls back to type colors and then palette colors', () => {
    expect(getPartitionBaseColor(partition({ type: 'app', subtype: 'unknown' }))).toBe('#4caf50')
    expect(getPartitionBaseColor(partition({ type: 'custom', subtype: 'unknown' }), 2)).toBe('#fdffb6')
  })

  it('lightens and darkens hex colors', () => {
    expect(lightenColor('#000000', 0.5)).toBe('#808080')
    expect(lightenColor('#ffffff', -0.5)).toBe('#808080')
  })

  it('chooses accessible text colors based on luminance', () => {
    expect(getAccessibleTextColor('#ffffff')).toBe('#1f2933')
    expect(getAccessibleTextColor('#000000')).toBe('#f8f9fa')
  })
})
