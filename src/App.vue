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
            <partition-visualizer :partitions="partitions" :flashSize="flashSize"></partition-visualizer>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-select v-model="flashSize" :items="flashSizes" item-value="value" item-title="text" label="Flash Size"
              dense hide-details></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-select v-model="selectedPartitionSet" :items="partitionOptions" item-value="value" item-title="text" label="Partition Set"
              dense hide-details @change="loadPartitions"></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <partition-editor :partitions="partitions" :flashSize="flashSize"
              @updatePartitions="updatePartitions"></partition-editor>
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

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import PartitionEditor from './components/PartitionEditor.vue';
import PartitionVisualizer from './components/PartitionVisualizer.vue';
import { PARTITION_TABLE_SIZE, FLASH_SIZES } from '@/config';
import { partitionStore } from '@/store';
import type { Partition, PartitionSet } from '@/types';
import { partitionSets } from '@/partitions';

export default defineComponent({
  name: 'App',
  components: {
    PartitionEditor,
    PartitionVisualizer
  },
  setup() {
    const store = partitionStore();

    const flashSize = ref(4);
    const partitions = ref<Partition[]>(partitionSets[0].partitions);
    const selectedPartitionSet = ref(partitionSets[0].name);

    const partitionOptions = partitionSets.map(set => ({
      text: set.name,
      value: set.name
    }));

    const flashSizeBytes = computed(() => flashSize.value * 1024 * 1024);

    const updatePartitions = (newPartitions: Partition[]) => {
      partitions.value = newPartitions;
      const total = partitions.value.reduce((sum, partition) => sum + partition.size, 0);
      const wastedMemory = calculateAlignmentWaste();
      store.availableMemory = flashSizeBytes.value - PARTITION_TABLE_SIZE - total - wastedMemory;
    };

    const calculateAlignmentWaste = () => {
      let wastedSpace = 0;
      partitions.value.forEach((partition, index) => {
        if (index === 0) {
          if (partition.type === 'app') {
            const startOffset = 0x10000;
            wastedSpace += partition.offset - startOffset;
          } else {
            const startOffset = 0x9000;
            wastedSpace += partition.offset - startOffset;
          }
        } else {
          let previousPartition = partitions.value[index - 1];
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

    const loadPartitions = () => {
      const selectedSet = partitionSets.find(set => set.name === selectedPartitionSet.value);
      if (selectedSet) {
        partitions.value = [...selectedSet.partitions];
      }
    };

    return {
      flashSizes: FLASH_SIZES,
      flashSize,
      partitions,
      updatePartitions,
      flashSizeBytes,
      partitionOptions,
      selectedPartitionSet,
      loadPartitions
    };
  }
});
</script>

<style scoped></style>
