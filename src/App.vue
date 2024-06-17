<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col>
            <h1>ESP32 Partition Builder</h1>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <partition-visualizer></partition-visualizer>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-select v-model="flashSize" :items="FLASH_SIZES" item-value="value" item-title="text" label="Flash Size"
              dense hide-details></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-select v-model="selectedPartitionSet" :items="partitionOptions" item-value="value" item-title="text"
              label="Partition Set" dense hide-details></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <partition-editor></partition-editor>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="text-center">
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PartitionEditor from './components/PartitionEditor.vue';
import PartitionVisualizer from './components/PartitionVisualizer.vue';
import { PARTITION_TABLE_SIZE, FLASH_SIZES } from '@/config';
import { partitionStore } from '@/store';
import type { Partition } from '@/types';
import { esp32Partitions } from '@/partitions';

const store = partitionStore();

const flashSize = ref(4);
const selectedPartitionSet = ref(esp32Partitions[0].name);

const partitionOptions = esp32Partitions.map(set => ({
  text: set.name,
  value: set.name
}));

watch(selectedPartitionSet, () => {
  loadPartitions();
});

const updatePartitions = (newPartitions: Partition[]) => {
  store.partitions = newPartitions;
  const total = store.partitions.reduce((sum, partition) => sum + partition.size, 0);
  const wastedMemory = calculateAlignmentWaste();
  store.availableMemory = store.flashSizeBytes - PARTITION_TABLE_SIZE - total - wastedMemory;
};

const calculateAlignmentWaste = () => {
  let wastedSpace = 0;
  store.partitions.forEach((partition, index) => {
    if (index === 0) {
      if (partition.type === 'app') {
        const startOffset = 0x10000;
        wastedSpace += partition.offset - startOffset;
      } else {
        const startOffset = 0x9000;
        wastedSpace += partition.offset - startOffset;
      }
    } else {
      let previousPartition = store.partitions[index - 1];
      let previousOffsetEnd = previousPartition.offset + previousPartition.size;
      if (partition.type === 'app') {
        const alignedOffset = Math.ceil(previousOffsetEnd / 0x10000) * 0x10000;
        wastedSpace += alignedOffset - previousOffsetEnd;
      } else {
        const alignedOffset = Math.ceil(previousOffsetEnd / 0x1000) * 0x1000;
        wastedSpace += alignedOffset - previousOffsetEnd;
      }
    }
  });
  return wastedSpace;
};

function loadPartitions () {
  const selectedSet = esp32Partitions.find(set => set.name === selectedPartitionSet.value);
  if (selectedSet) {
    store.partitions = [...selectedSet.partitions];
  }
};

</script>

<style scoped></style>
