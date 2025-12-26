<template>
  <v-app>
    <v-app-bar :title="'ESP32 Partition Builder v' + APP_VERSION">
      <div class="text-caption">
        Tutorial
      </div>
      <v-btn @click="goToYoutube" color="yellow" icon="mdi-open-in-new" variant="text"></v-btn>
      <v-btn color="yellow" @click="goToBuyMeACoffee">
        ☕ Buymeacoffee
        <v-tooltip activator="parent" location="top">Please support this project!</v-tooltip>
      </v-btn>
      <v-btn @click="goToRepository" prepend-icon="mdi-help-box">
        Get Help
        <v-tooltip activator="parent" location="top">Help & Issues</v-tooltip>
      </v-btn>
      <template v-slot:extension>
        <v-container fluid class="mb-1 ml-1">
          <partition-visualizer></partition-visualizer>
        </v-container>
      </template>
    </v-app-bar>
    <v-navigation-drawer permanent>
      <div :class="availableMemoryColor()">
        <div>Available Flash Memory:</div>
        <div>{{ store.partitionTables.getAvailableMemory() }} bytes ({{
          store.hintDisplaySize(store.partitionTables.getAvailableMemory()) }})
        </div>
      </div>
      <v-select v-model="selectedPartitionSet" :items="partitionOptions" item-value="value" item-title="text"
        label="Built-in partitions" dense hide-details></v-select>
      <v-select v-model="store.flashSize" :items="FLASH_SIZES" item-value="value" item-title="text" label="Flash Size"
        dense hide-details @update:model-value="changeFlashSize"></v-select>
      <v-select
        v-model="store.partitionTableOffset"
        :items="PARTITION_TABLE_OFFSET_OPTIONS"
        item-value="value"
        item-title="text"
        label="Partition Table Offset"
        dense
        hide-details
        @update:model-value="changePartitionTableOffset"
      ></v-select>
      <v-text-field
        v-model="partitionTableOffsetText"
        label="Custom Offset (hex)"
        density="compact"
        hide-details="auto"
        persistent-hint
        hint="Must align to 0x1000; leave CSV offsets blank to auto-align"
        :rules="[customOffsetRule]"
        append-inner-icon="mdi-check"
        @click:append-inner="applyCustomPartitionTableOffset(partitionTableOffsetText)"
        @change="applyCustomPartitionTableOffset($event)"
      ></v-text-field>
      <v-select v-model="store.displaySizes" :items="DISPLAY_SIZES" item-value="value" item-title="text"
        label="Show Hint Size in" dense hide-details></v-select>
      <div v-if="store.partitionTables.hasOTAPartitions() && store.partitionTables.hasSubtype(PARTITION_NVS)" class="pl-2 pt-4">
        <v-icon color="green-darken-2" icon="mdi-wifi" size="large"></v-icon>
        Over the air update capability
      </div>
      <v-alert
        v-else-if="store.partitionTables.hasOTAPartitions()"
        type="warning"
        density="comfortable"
        border="start"
        class="ma-3 mt-4"
        variant="outlined"
        icon="mdi-alert"
      >
        <div class="font-weight-medium">NVS partition required</div>
        <div class="text-body-2">Add an NVS partition to restore Over the Air update capability.</div>
      </v-alert>
    </v-navigation-drawer>
    <v-main class="d-flex align-top">
      <partition-editor></partition-editor>
    </v-main>
    <v-snackbar v-model="showUrlNotification" location="top">
      {{ urlNotificationText }}
      <template #actions>
        <v-btn text @click="showUrlNotification = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch, inject, type Ref } from 'vue';
import PartitionEditor from './components/PartitionEditor.vue';
import PartitionVisualizer from './components/PartitionVisualizer.vue';
import { partitionStore } from '@/store';
import {
  FLASH_SIZES,
  APP_VERSION,
  DISPLAY_SIZES,
  PARTITION_NVS,
  PARTITION_TABLE_OFFSET_OPTIONS,
  OFFSET_DATA_TYPE,
  PARTITION_TABLE_SIZE
} from '@/const';
import { esp32Partitions } from '@/defaultPartitions';

const store = partitionStore();
const urlPartitionMessage = inject<Ref<string | null> | null>('urlPartitionMessage', null);
const urlNotificationText = ref('');
const showUrlNotification = ref(false);

if (urlPartitionMessage) {
  watch(
    urlPartitionMessage,
    (message) => {
      if (message) {
        urlNotificationText.value = message;
        showUrlNotification.value = true;
      }
    },
    { immediate: true }
  );
}

const firstPartitionSet = esp32Partitions[0];
const defaultPartitionName = firstPartitionSet ? firstPartitionSet.name : '';
const selectedPartitionSet = ref(defaultPartitionName);
const partitionTableOffsetText = ref(formatHex(store.partitionTableOffset));

const partitionOptions = esp32Partitions.map(set => ({
  text: set.name,
  value: set.name
}));

watch(selectedPartitionSet, () => {
  loadPartitions();
});

watch(() => store.partitionTableOffset, (val) => {
  partitionTableOffsetText.value = formatHex(val);
});

function availableMemoryColor(): string {
  if (store.partitionTables.getAvailableMemory() == 0) {
    return 'pa-4 text-green'
  }
  if (store.partitionTables.getAvailableMemory() > 0) {
    return 'pa-4 text-yellow'
  }
  return 'pa-4 text-red'
}

function goToBuyMeACoffee() {
  window.open('https://www.buymeacoffee.com/thelastoutpostworkshop', '_blank');
}
function goToRepository() {
  window.open('https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder', '_blank');
}
function goToYoutube() {
  window.open('https://youtu.be/EuHxodrye6E', '_blank');
}

function changeFlashSize() {
  store.partitionTables.setFlashSize(store.flashSize)
}

function changePartitionTableOffset(offset: number) {
  store.setPartitionTableOffset(offset);
}

function applyCustomPartitionTableOffset(value: string) {
  const parsed = parseOffset(value);
  if (parsed === null) {
    return;
  }
  const ruleResult = customOffsetRule(value);
  if (ruleResult !== true) {
    return;
  }
  store.setPartitionTableOffset(parsed);
  partitionTableOffsetText.value = formatHex(parsed);
}

function parseOffset(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const cleaned = trimmed.toLowerCase().startsWith('0x') ? trimmed : `0x${trimmed}`;
  const parsed = parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatHex(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`;
}

function customOffsetRule(value: string): true | string {
  const parsed = parseOffset(value);
  if (parsed === null) {
    return 'Enter a hex offset, e.g. 0x8000';
  }
  if (parsed % OFFSET_DATA_TYPE !== 0) {
    return 'Must align to 0x1000';
  }
  if ((parsed + PARTITION_TABLE_SIZE) >= store.flashSizeBytes) {
    return 'Offset too large for flash size';
  }
  return true;
}

function loadPartitions() {
  const selectedSet = esp32Partitions.find(set => set.name === selectedPartitionSet.value);
  if (selectedSet) {
    store.partitionTables.clearPartitions();
    selectedSet.partitions.forEach(partition => {
      store.partitionTables.addPartition(partition.name, partition.type, partition.subtype, partition.size, "");
    })
  }
};
if (store.partitionTables.getPartitions().length === 0) {
  loadPartitions();
}

</script>

<style scoped></style>
