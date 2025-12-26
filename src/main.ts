
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
import { getPartitionCsvFromUrl } from '@/utils/partitionUrl'
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
const csvPayload = getPartitionCsvFromUrl()
if (csvPayload) {
  const error = loadPartitionsFromCsv(csvPayload, store)
  if (error) {
    urlPartitionMessage.value = `${error.title}: ${error.text}`
    console.warn('Failed to load partitions from URL:', error.title, error.text)
  } else {
    urlPartitionMessage.value = 'Loaded partitions from URL'
  }
}
app.use(vuetify)
app.mount('#app')
