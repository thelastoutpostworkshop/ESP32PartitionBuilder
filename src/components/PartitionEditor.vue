<template>
  <v-container>
    <v-container class="mb-2">
      <v-row align="center">
        <v-btn @click="addPartition" dense color="primary">Add Partition</v-btn>
        <span class="pl-2">Available Memory: {{ store.partitionTables.getAvailableMemory() }} bytes</span>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="downloadCSV" dense>Download CSV</v-btn>
      </v-row>
    </v-container>
    <div v-for="(partition, index) in store.partitionTables.getPartitions()" :key="index" class="partition">
      <v-row >
        <v-col>
          <v-text-field v-model="partition.name" label="Name" dense 
            :rules="[partitionNameRule(partition.name, index)]"></v-text-field>
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
          <v-text-field readonly v-model.number="partition.size" label="Size (bytes)" dense hide-details></v-text-field>
        </v-col>
        <v-col>
          <v-text-field readonly active label="offset">
            {{ getHexOffset(partition.offset) }}
          </v-text-field>
        </v-col>
        <v-col cols="auto">
          <v-btn color="red-darken-4" icon="mdi-trash-can" variant="text" size="x-large"
            @click="removePartition(partition)"></v-btn>
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-slider color="teal" v-model="partition.size"
            :max="store.partitionTables.getTotalMemory() - store.partitionTables.getTotalPartitionSize() + partition.size"
            @end="updateSize(partition)" dense hide-details
            :step="partition.type === PARTITION_TYPE_APP ? 65536 : 4096"></v-slider>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { PARTITION_TYPES, PARTITION_TYPE_DATA, PARTITION_TYPE_APP, PARTITION_APP_SUBTYPES, PARTITION_DATA_SUBTYPES } from '@/partitions';
import { partitionStore } from '@/store'
import type { Partition } from '@/types'

const store = partitionStore();

const partitionNameRule = (name: string,index:number) => {
  const nameConflict = store.partitionTables.getPartitions().some((p, i) => i !== index && p.name === name)
  if(nameConflict) {
    console.log(name)
    return  'Name already exists'
  } else {
    return true
  }
};

const getHexOffset = (offset: number): string => {
  return '0x' + offset.toString(16).toUpperCase();
};

const downloadCSV = () => {
  const csvHeader = "# Name,   Type, SubType, Offset,  Size, Flags\n";
  const csvContent = store.partitionTables.getPartitions().map(p => {
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

function updatePartitions() {

};

const validateName = (partition: Partition) => {
  if (partition.name.length > 16) {
    partition.name = partition.name.substring(0, 16);
  }
};

const validateType = (partition: Partition) => {
  if (!PARTITION_TYPES.includes(partition.type)) {
    partition.type = PARTITION_TYPE_DATA;
  }
  partition.subtype = getSubtypes(partition.type)[0];
};

const getSubtypes = (type: string) => {
  if (type === PARTITION_TYPE_APP) {
    return PARTITION_APP_SUBTYPES;
  } else if (type === PARTITION_TYPE_DATA) {
    return PARTITION_DATA_SUBTYPES;
  }
  return [];
};

const validateSubtype = (partition: Partition) => {
  const validSubtypes = getSubtypes(partition.type);
  if (!validSubtypes.includes(partition.subtype)) {
    partition.subtype = validSubtypes[0];
  }
};

const updateSize = (partition: Partition) => {
  store.partitionTables.updatePartitionSize(partition.name, partition.size);
};

const generatePartitionName = () => {
  const baseName = "partition";
  let index = 1;
  while (store.partitionTables.getPartitions().some(p => p.name === `${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
};

const addPartition = () => {
  const newName = generatePartitionName();
  store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, getSubtypes(PARTITION_TYPE_DATA)[0], 4, "")
};

const removePartition = (partition: Partition) => {
  store.partitionTables.removePartition(partition.name)
};

store.$subscribe(updatePartitions)

</script>

<style scoped>
.partition {
  border: 1px solid #ccc;
  padding: 8px;
  margin-bottom: 8px;
  width: 100%;
}
</style>
