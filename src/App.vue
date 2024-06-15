<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col>
            <h1>ESP32 Partition Manager</h1>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <partition-visualizer :partitions="partitions" :flashSize="flashSize"></partition-visualizer>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-select v-model="flashSize" :items="flashSizes" label="Flash Size" dense hide-details></v-select>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <partition-editor :partitions="partitions" :flashSize="flashSize" :availableMemory="availableMemory"
              @updatePartitions="updatePartitions"></partition-editor>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="text-center">
            <v-btn @click="downloadCSV" dense>Download CSV</v-btn>
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
import { PARTITION_TABLE_SIZE } from '@/config';

export default defineComponent({
  name: 'App',
  components: {
    PartitionEditor,
    PartitionVisualizer
  },
  setup() {
    const flashSizes = [4, 8, 16];
    const flashSize = ref(4);
    const partitions = ref([
      { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x4000 },
      { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000 },
      { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000 },
      { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000 },
      { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x170000 },
    ]);

    const totalUsedMemory = computed(() => {
      return partitions.value.reduce((sum, partition) => sum + partition.size, 0);
    });

    const flashSizeBytes = computed(() => flashSize.value * 1024 * 1024);

    const availableMemory = computed(() => {
      return flashSizeBytes.value - PARTITION_TABLE_SIZE - totalUsedMemory.value;
    });

    const updatePartitions = (newPartitions: any) => {
      partitions.value = newPartitions;
    };

    const downloadCSV = () => {
      const csvHeader = "# Name,   Type, SubType, Offset,  Size, Flags\n";
      const csvContent = partitions.value.map(p => {
        const sizeKB = Math.round(p.size / 1024) + 'K';
        return `${p.name},${p.type},${p.subtype},,${sizeKB},`;
      }).join("\n");
      const csvData = csvHeader + csvContent;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "partitions.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };


    return {
      flashSizes,
      flashSize,
      partitions,
      updatePartitions,
      downloadCSV,
      totalUsedMemory,
      flashSizeBytes,
      availableMemory
    };
  }
});
</script>

<style scoped></style>
