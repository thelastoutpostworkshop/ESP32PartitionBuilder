<template>
  <v-container>
    <v-container class="mb-2">
      <v-form ref="formRef" @submit.prevent="downloadCSV">
        <v-row align="center">
          <v-btn @click="addPartition" dense color="primary">Add Partition</v-btn>
          <span class="pl-2">Available Memory for new partition: {{ store.partitionTables.getAvailableMemory() }}
            bytes</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="loadCSV" dense>Upload CSV</v-btn>
          <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;" />
          <v-btn color="primary" type="submit" dense>Download CSV</v-btn>

          <div v-for="(partition, index) in store.partitionTables.getPartitions()" :key="index" class="partition mt-4">
            <v-row dense>
              <v-col>
                <v-text-field v-model="partition.name" label="Name" dense
                  :rules="[partitionNameRule(partition.name, index)]"></v-text-field>
              </v-col>
              <v-col>
                <v-select v-model="partition.type" :items="PARTITION_TYPES" label="Type" dense hide-details
                  @update:model-value="validateType(partition)"></v-select>
              </v-col>
              <v-col>
                <v-select v-model="partition.subtype" :items="getSubtypes(partition.type)" label="Subtype" dense
                  hide-details @change="validateSubtype(partition)"></v-select>
              </v-col>
              <v-col>
                <v-text-field readonly v-model.number="partition.size" label="Size (bytes)" dense
                  hide-details></v-text-field>
              </v-col>
              <v-col>
                <v-text-field readonly active label="offset">
                  {{ getHexOffset(partition.offset) }}
                </v-text-field>
              </v-col>
              <v-col cols="auto">
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="removePartition(partition)" variant="text">
                      <v-icon color="red-darken-4">
                        mdi-trash-can
                      </v-icon>
                    </v-btn>
                  </template>
                  <span>Delete Partition</span>
                </v-tooltip>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col>
                <v-slider color="teal" v-model="partition.size" thumb-label show-ticks
                  :max="store.partitionTables.getMaxPartitionSize(partition)" @end="updateSize(partition)" dense
                  hide-details :step="stepSize(partition)" :min="stepSize(partition)">
                  <template v-slot:prepend>
                    <v-btn color="primary" icon="mdi-minus-box" size="small" variant="text"
                      @click="decrement(partition)"></v-btn>
                  </template>
                  <template v-slot:append>
                    <v-btn color="primary" icon="mdi-plus-box" size="small" variant="text"
                      @click="increment(partition)"></v-btn>
                  </template>
                </v-slider>
              </v-col>
            </v-row>
          </div>
        </v-row>
      </v-form>
      <v-dialog v-model="showDialog" width="auto">
        <v-card max-width="400" prepend-icon="mdi-alert-circle-outline" color="yellow" :text="dialogText"
          :title="dialogTitle">
          <template v-slot:actions>
            <v-btn class="ms-auto" text="Ok" @click="showDialog = false"></v-btn>
          </template>
        </v-card>
      </v-dialog>
    </v-container>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PARTITION_TYPES, PARTITION_TYPE_DATA, PARTITION_TYPE_APP, PARTITION_APP_SUBTYPES, PARTITION_DATA_SUBTYPES } from '@/const';
import { partitionStore } from '@/store'
import type { Partition } from '@/types'

const store = partitionStore();
const formRef = ref();
const showDialog = ref(false);
const dialogText = ref("")
const dialogTitle = ref("")
const fileInput = ref<HTMLInputElement | null>(null);

const partitionNameRule = (name: string, index: number) => {
  const nameConflict = store.partitionTables.getPartitions().some((p, i) => i !== index && p.name === name)
  if (nameConflict) {
    console.log(name)
    return 'Name already exists'
  } else {
    return true
  }
};


function stepSize(partition: Partition): number {
  return partition.type === PARTITION_TYPE_APP ? 65536 : 4096
}

function decrement(partition: Partition) {
  const step_size = stepSize(partition)
  if (partition.size - step_size >= 0) {
    partition.size -= step_size
    updateSize(partition)
  }
}

function increment(partition: Partition) {
  const step_size = stepSize(partition)
  if (partition.size + step_size <= store.partitionTables.getMaxPartitionSize(partition)) {

    partition.size += stepSize(partition)
    updateSize(partition)
  }
}

const getHexOffset = (offset: number): string => {
  return '0x' + offset.toString(16).toUpperCase();
};

const downloadCSV = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (valid) {
      const csvHeader = "# Name,   Type, SubType, Offset,  Size, Flags\n";
      const csvContent = store.partitionTables.getPartitions().map(p => {
        const sizeKB = Math.round(p.size / 1024) + 'K';
        const offsetHex = '0x' + p.offset.toString(16).toUpperCase();
        return `${p.name},${p.type},${p.subtype},${offsetHex},${sizeKB},`;
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
    }
  }
};

const validateType = (partition: Partition) => {
  partition.subtype = getSubtypes(partition.type)[0];
  store.partitionTables.recalculateOffsets()
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
  if (store.partitionTables.getAvailableMemory() <= 0) {
    dialogTitle.value = "Cannot add a new partition"
    dialogText.value = "There is not enough memory to add a new partition.  Remove a partition or resize an existing one."
    showDialog.value = true
  } else {
    const newName = generatePartitionName();
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, getSubtypes(PARTITION_TYPE_DATA)[0], 4, "")
  }
};

const removePartition = (partition: Partition) => {
  store.partitionTables.removePartition(partition.name)
};

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        const csv = e.target.result;
        loadPartitionsFromCSV(csv);
      }
    };
    reader.readAsText(file);
  }
};

const loadPartitionsFromCSV = (csv: string) => {
  const rows = csv.split('\n').filter(row => row.trim() !== '');
  const header = rows.shift(); // Remove the header row
  if (header !== '# Name,   Type, SubType, Offset,  Size, Flags') {
    dialogTitle.value = "Invalid CSV Format";
    dialogText.value = "The CSV file format is incorrect. Please use the correct format.";
    showDialog.value = true;
    return;
  }

  const partitions: Partition[] = [];
  for (const row of rows) {
    const [name, type, subtype, offsetHex, sizeKB, flags] = row.split(',');
    if (!name || !type || !subtype || !offsetHex || !sizeKB) {
      dialogTitle.value = "Invalid CSV Data";
      dialogText.value = "The CSV file contains invalid data. Please check the file and try again.";
      showDialog.value = true;
      return;
    }

    const size = parseInt(sizeKB, 10) * 1024; // Convert KB to bytes
    const offset = parseInt(offsetHex, 16); // Convert hex to decimal
    partitions.push({ name, type, subtype, size, offset, flags: flags || '' });
  }

  store.partitionTables.clearPartitions();
  partitions.forEach(partition => store.partitionTables.addPartition(partition.name, partition.type, partition.subtype, partition.size / 1024, partition.flags));
};

const loadCSV = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

</script>

<style scoped>
.partition {
  border: 1px solid #ccc;
  padding: 8px;
  width: 100%;
}
</style>
