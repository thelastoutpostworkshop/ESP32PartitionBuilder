<template>
  <v-container>
    <v-container class="mb-2">
      <v-row align="center">
        <v-btn @click="addPartition" dense color="primary">Add Partition</v-btn>
        <span class="pl-2">Available Memory: {{ store.availableMemory }} bytes</span>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="downloadCSV" dense>Download CSV</v-btn>
      </v-row>
    </v-container>
    <div v-for="(partition, index) in store.partitions" :key="index" class="partition">
      <v-row dense>
        <v-col>
          <v-text-field v-model="partition.name" label="Name" dense hide-details
            @change="validateName(partition)"></v-text-field>
        </v-col>
        <v-col>
          <v-select v-model="partition.type" :items="PARTITION_TYPES" label="Type" dense hide-details
            @change="validateType(partition)"></v-select>
        </v-col>
        <v-col>
          <v-select v-model="partition.subtype" :items="getSubtypes(partition.type)" label="Subtype" dense hide-details
            @change="validateSubtype(partition)"></v-select>
        </v-col>
        <v-col>
          <v-text-field readonly v-model.number="partition.size" label="Size (bytes)" dense hide-details
            @change="validateSize(partition, index)"></v-text-field>
        </v-col>
        <v-col>
          <v-text-field readonly label="offset" v-model.number="partition.offset">
          </v-text-field>
        </v-col>
        <v-col cols="auto">
          <v-btn color="red-darken-4" icon="mdi-trash-can" variant="text" size="x-large"
            @click="removePartition(index)"></v-btn>
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-slider color="teal" v-model="partition.size" :max="store.flashSizeBytes - totalSize + partition.size"
            @input="updateSize(index, $event)" dense hide-details
            :step="partition.type === 'app' ? 65536 : 4096"></v-slider>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, computed, type PropType } from 'vue';
import { PARTITION_TABLE_SIZE,PARTITION_TYPES } from '@/config';
import { partitionStore } from '@/store'
import type { Partition } from '@/types'

const store = partitionStore();


const totalSize = computed(() => {
  return store.partitions.reduce((sum, partition) => sum + partition.size, 0);
});

const downloadCSV = () => {
  const csvHeader = "# Name,   Type, SubType, Offset,  Size, Flags\n";
  const csvContent = store.partitions.map(p => {
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

function updatePartitions () {
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

const validateName = (partition: Partition) => {
  if (partition.name.length > 16) {
    partition.name = partition.name.substring(0, 16);
  }
};

const validateType = (partition: Partition) => {
  const validTypes = ['app', 'data'];
  if (!validTypes.includes(partition.type)) {
    partition.type = 'data';
  }
  partition.subtype = getSubtypes(partition.type)[0];
};

const getSubtypes = (type:string) => {
  if (type === 'app') {
    return ['factory', 'test', 'ota_0', 'ota_1', 'ota_2', 'ota_3', 'ota_4', 'ota_5', 'ota_6', 'ota_7', 'ota_8', 'ota_9', 'ota_10', 'ota_11', 'ota_12', 'ota_13', 'ota_14', 'ota_15'];
  } else if (type === 'data') {
    return ['ota', 'phy', 'nvs', 'nvs_keys', 'coredump', 'efuse', 'fat', 'spiffs', 'littlefs'];
  }
  return [];
};

const validateSubtype = (partition: Partition) => {
  const validSubtypes = getSubtypes(partition.type);
  if (!validSubtypes.includes(partition.subtype)) {
    partition.subtype = validSubtypes[0];
  }
};

const validateSize = (partition: Partition, index:number) => {
  // Enforce the offset rules
  if (partition.type === 'app') {
    partition.offset = Math.ceil((index === 0 ? 0x10000 : store.partitions[index - 1].offset + store.partitions[index - 1].size) / 0x10000) * 0x10000;
  } else {
    if (index === 0) {
      partition.offset = 0x9000; // First non-app partition offset
    } else {
      let previousPartition = store.partitions[index - 1];
      let previousOffsetEnd = previousPartition.offset + previousPartition.size;
      partition.offset = Math.ceil(previousOffsetEnd / 0x1000) * 0x1000; // Align the offset to 0x1000 (4KB)
    }
  }

  if (partition.type === 'app') {
    // Align size to 64KB for app partitions
    partition.size = Math.ceil(partition.size / 65536) * 65536;
  } else {
    // Align size to 4KB for data partitions
    partition.size = Math.ceil(partition.size / 4096) * 4096;
  }

  // Check and adjust for total size overflow
  if (totalSize.value > store.flashSizeBytes) {
    partition.size = store.flashSizeBytes - (totalSize.value - partition.size);
  }
};

const updateSize = (index: number, newSize: number) => {
  const maxAvailableSize = store.flashSizeBytes - totalSize.value + store.partitions[index].size - PARTITION_TABLE_SIZE;
  store.partitions[index].size = Math.min(Math.round(newSize), maxAvailableSize);
  validateSize(store.partitions[index], index);
};

const generatePartitionName = () => {
  const baseName = "partition";
  let index = 1;
  while (store.partitions.some(p => p.name === `${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
};

const addPartition = () => {
  const newName = generatePartitionName();
  store.partitions.push({ name: newName, type: 'data', subtype: getSubtypes('data')[0], size: 4096, offset: 0 });
};

const removePartition = (index: number) => {
  store.partitions.splice(index, 1);
};

watch(store.partitions, () => {
  console.log("watch partitions")
  updatePartitions();
},{ immediate: true,deep:true });
</script>

<style scoped>
.partition {
  border: 1px solid #ccc;
  padding: 8px;
  margin-bottom: 8px;
  width: 100%;
}
</style>
