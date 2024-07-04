<template>
  <v-app>
    <v-app-bar  :title="'ESP32 Partition Builder v' + APP_VERSION">
      <div class="text-caption">
        By the Last Outpost Workshop
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
      <div class="pa-4">
        <div> Available Memory:
        </div>
        <div>{{ store.partitionTables.getAvailableMemory() }} bytes ({{
          store.hintDisplaySize(store.partitionTables.getAvailableMemory()) }})
        </div>
      </div>
      <v-select v-model="selectedPartitionSet" :items="partitionOptions" item-value="value" item-title="text"
        label="Built-in partitions" dense hide-details></v-select>
      <v-select v-model="store.flashSize" :items="FLASH_SIZES" item-value="value" item-title="text" label="Flash Size"
        dense hide-details @update:model-value="changeFlashSize"></v-select>
      <v-select v-model="store.displaySizes" :items="DISPLAY_SIZES" item-value="value" item-title="text"
        label="Show Hint Size in" dense hide-details></v-select>
    </v-navigation-drawer>
    <v-main>
      <partition-editor></partition-editor>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PartitionEditor from './components/PartitionEditor.vue';
import PartitionVisualizer from './components/PartitionVisualizer.vue';
import { partitionStore } from '@/store';
import { FLASH_SIZES, APP_VERSION, DISPLAY_SIZES } from '@/const';
import { esp32Partitions } from '@/defaultPartitions';

const store = partitionStore();

const selectedPartitionSet = ref(esp32Partitions[0].name);

const partitionOptions = esp32Partitions.map(set => ({
  text: set.name,
  value: set.name
}));

watch(selectedPartitionSet, () => {
  loadPartitions();
});

function goToBuyMeACoffee() {
  window.open('https://www.buymeacoffee.com/thelastoutpostworkshop', '_blank');
}
function goToRepository() {
  window.open('https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder', '_blank');
}
function goToYoutube() {
  window.open('https://www.youtube.com/channel/UCnnU_HGvTr8ewpqvHe2llDw', '_blank');
}

function changeFlashSize() {
  store.partitionTables.setFlashSize(store.flashSize)
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
loadPartitions();

</script>

<style scoped></style>
