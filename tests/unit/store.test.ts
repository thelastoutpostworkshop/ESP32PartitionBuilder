import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DISPLAY_SIZES } from '@/const'
import { partitionStore } from '@/store'

describe('partitionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('formats byte-based display units as KB and MB', () => {
    const store = partitionStore()

    expect(DISPLAY_SIZES).toEqual([
      { value: 1024, text: 'Kilobytes (KB)' },
      { value: 1024 * 1024, text: 'Megabytes (MB)' }
    ])
    expect(store.hintDisplaySize(4096)).toBe('4 KB')

    store.displaySizes = 1024 * 1024
    expect(store.hintDisplaySize(1024 * 1024)).toBe('1 MB')
  })
})
