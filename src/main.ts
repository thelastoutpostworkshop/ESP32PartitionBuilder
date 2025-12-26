
import { createApp, ref } from 'vue'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import { partitionStore } from '@/store'
import { loadPartitionsFromCsv } from '@/partitionLoader'
import { getPartitionCsvFromUrl, getFlashSizeFromUrl } from '@/utils/partitionUrl'
import { FLASH_SIZES } from '@/const'
// import router from './router'

const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'dark'
    }
  })

const app = createApp(App)

app.use(createPinia())
// app.use(router)
const store = partitionStore()
const urlPartitionMessage = ref<string | null>(null)
app.provide('urlPartitionMessage', urlPartitionMessage)
const flashOverride = getFlashSizeFromUrl()
const supportedFlashSizes = FLASH_SIZES.map(size => size.value)
let resolvedFlashSize: number | null = null
if (flashOverride) {
  if (supportedFlashSizes.includes(flashOverride)) {
    resolvedFlashSize = flashOverride
  } else {
    console.warn(`Requested flash size ${flashOverride} MB is not supported; falling back to 4 MB`)
  }
}
if (resolvedFlashSize) {
  store.flashSize = resolvedFlashSize
  store.partitionTables.setFlashSize(resolvedFlashSize)
}
const csvPayload = getPartitionCsvFromUrl()
if (csvPayload) {
  console.debug('partition payload decoded from URL', csvPayload)
  const error = loadPartitionsFromCsv(csvPayload, store)
  if (error) {
    urlPartitionMessage.value = `${error.title}: ${error.text}`
    console.warn('Failed to load partitions from URL:', error.title, error.text)
  } else {
    const flashMessage = resolvedFlashSize ? ` using ${resolvedFlashSize} MB flash size` : ''
    urlPartitionMessage.value = `Loaded partitions from URL${flashMessage}`
  }
}
app.use(vuetify)
app.mount('#app')
