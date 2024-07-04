<template>
  <v-container>
    <v-form ref="formRef" @submit.prevent="downloadCSV">
      <v-app-bar location="top" permanent >
        <v-btn color="primary" @click="addPartition">Add Partition
          <v-menu activator="parent">
            <v-list v-if="store.partitionTables.getAvailableMemory() > 0" style="cursor: pointer;">
              <v-list-item @click="addNVSPartition">
                NVS (Non-Volatile Storage)
              </v-list-item>
              <v-list-item @click="addOTAPartition">
                OTA (Over The Air Updates)
              </v-list-item>
              <v-list-item @click="addFactoryPartition">
                Factory App
              </v-list-item>
              <v-list-item @click="addFATPartition">
                FAT File System
              </v-list-item>
              <v-list-item @click="addSPIFFPartition">
                SPIFFS File System
              </v-list-item>
              <v-list-item @click="addLittleFSPartition">
                LittleFS File System
              </v-list-item>
              <v-list-item @click="addOTADataPartition">
                OTA Data
              </v-list-item>
              <v-list-item @click="addCoreDumpPartition">
                Core Dump
              </v-list-item>
              <v-list-item @click="addTestPartition">
                Test App
              </v-list-item>
              <v-list-item @click="addPhyPartition">
                PHY Initialisation Data
              </v-list-item>
            </v-list>
          </v-menu>
        </v-btn>
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="store.partitionTables.clearPartitions()" variant="text">
              <v-icon color="red-darken-4">
                mdi-trash-can
              </v-icon>
            </v-btn>
          </template>
          <span>Delete all Partitions</span>
        </v-tooltip>
        <v-btn color="primary" @click="loadCSV" dense class="mr-2">Load CSV
          <v-tooltip activator="parent" location="top">Load a CSV partition file</v-tooltip>
        </v-btn>
        <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;" accept=".csv" />
        <v-btn color="primary" type="submit" dense
          :disabled="store.partitionTables.getPartitions().length == 0">Download
          CSV
          <v-tooltip activator="parent" location="top">Download partitions as a CSV file</v-tooltip>
        </v-btn>
      </v-app-bar>
      <div v-for="(partition, index) in store.partitionTables.getPartitions()" :key="index" class="partition mt-4">
        <v-row dense>
          <v-col>
            <v-text-field v-model="partition.name" label="Name" dense
              :rules="[partitionNameRule(partition.name, index)]"></v-text-field>
          </v-col>
          <v-col>
            <v-select readonly v-model="partition.type" :items="PARTITION_TYPES" label="Type" dense hide-details
              @update:model-value="validateType(partition)"></v-select>
          </v-col>
          <v-col>
            <v-select readonly v-model="partition.subtype" :items="getSubtypes(partition.type)" label="Subtype"
              dense></v-select>
          </v-col>
          <v-col>
            <v-text-field readonly v-model.number="partition.size" label="Size (bytes)" dense
              :rules="[partitionSizeRule(partition)]" :hint="store.hintDisplaySize(partition.size)"
              persistent-hint></v-text-field>
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
            <v-slider color="teal" v-model="partition.size" thumb-label label="Size"
              :disabled="partition.subtype === 'ota_0' && store.partitionTables.hasOTAPartitions()"
              :max="store.partitionTables.getTotalMemory()" @end="updateSize(partition)" dense hide-details
              :step="stepSize(partition)" :min="stepSize(partition)">
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
    </v-form>
    <v-dialog v-model="showAlert" width="auto">
      <v-card max-width="400" prepend-icon="mdi-alert-circle-outline" color="white" :text="alertText"
        :title="alertTitle">
        <template v-slot:actions>
          <v-btn class="ms-auto" text="Ok" @click="showAlert = false"></v-btn>
        </template>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showOverrideDialog" width="auto">
      <v-card max-width="400" color="white" title="Partition Rules Warnings">
        <v-card-text>There are validation errors in the partitions. Do you want to proceed and download the CSV
          anyway?</v-card-text>
        <v-card-actions>
          <v-btn @click="showOverrideDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmOverride">Proceed</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  PARTITION_TYPES, PARTITION_TYPE_DATA, PARTITION_TYPE_APP, PARTITION_APP_SUBTYPES,
  PARTITION_DATA_SUBTYPES, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, OTA_DATA_PARTITION_SIZE,
  OFFSET_DATA_TYPE, PARTITION_OTA, OFFSET_APP_TYPE, PARTITION_FAT, FAT_MIN_PARTITION_SIZE,
  PARTITION_SPIFFS, PARTITION_LITTLEFS, SPIFFS_MIN_PARTITION_SIZE, LITTLEFS_MIN_PARTITION_SIZE,
  COREDUMP_MIN_PARTITION_SIZE, PARTITION_COREDUMP, PARTITION_FACTORY, PARTITION_TEST, PHY_MIN_PARTITION_SIZE,
  PARTITION_PHY,
  FLASH_SIZES
} from '@/const';
import { partitionStore } from '@/store'
import type { Partition } from '@/types'

const store = partitionStore();
const formRef = ref();
const showAlert = ref(false);
const alertText = ref("")
const alertTitle = ref("")
const fileInput = ref<HTMLInputElement | null>(null);
const showOverrideDialog = ref(false);



const partitionNameRule = (name: string, index: number) => {
  const nameConflict = store.partitionTables.getPartitions().some((p, i) => i !== index && p.name === name)
  if (nameConflict) {
    console.log(name)
    return 'Name already exists'
  } else {
    return true
  }
};

const partitionSizeRule = (partition: Partition) => {
  switch (partition.subtype) {
    case PARTITION_NVS:
      if (partition.size < NVS_PARTITION_SIZE_RECOMMENDED) {
        return `NVS partition size must be at least ${NVS_PARTITION_SIZE_RECOMMENDED} bytes.`;
      }
      break;
    case PARTITION_OTA:
      if (partition.size < OTA_DATA_PARTITION_SIZE) {
        return `OTA data partition recommended size is ${OTA_DATA_PARTITION_SIZE} bytes.`;
      }
      break;
    case PARTITION_FAT:
      if (partition.size < FAT_MIN_PARTITION_SIZE) {
        return `FAT partition minimal recommended size is ${FAT_MIN_PARTITION_SIZE} bytes.`;
      }
      break;
    case PARTITION_SPIFFS:
      if (partition.size < SPIFFS_MIN_PARTITION_SIZE) {
        return `SPIFFS partition minimal recommended size is ${SPIFFS_MIN_PARTITION_SIZE} bytes.`;
      }
      break;
    case PARTITION_LITTLEFS:
      if (partition.size < LITTLEFS_MIN_PARTITION_SIZE) {
        return `LittleFS partition minimal recommended size is ${LITTLEFS_MIN_PARTITION_SIZE} bytes.`;
      }
      break;
    case PARTITION_COREDUMP:
      if (partition.size < COREDUMP_MIN_PARTITION_SIZE) {
        return `Core Dump partition minimal recommended size is ${COREDUMP_MIN_PARTITION_SIZE} bytes.`;
      }
      break;
  }
  return true;
};

function stepSize(partition: Partition): number {
  if (partition.subtype === PARTITION_TYPE_DATA) {
    return OFFSET_DATA_TYPE
  } else {
    return OFFSET_APP_TYPE
  }
}

function decrement(partition: Partition) {
  const step_size = stepSize(partition)
  if (partition.size - step_size > 0) {
    partition.size -= step_size
    updateSize(partition)
  }
}

function increment(partition: Partition) {
  partition.size += stepSize(partition)
  updateSize(partition)
}

const getHexOffset = (offset: number): string => {
  return '0x' + offset.toString(16).toUpperCase();
};

const downloadCSV = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (valid) {
      generateCSV();
    } else {
      showOverrideDialog.value = true;
    }
  }
};

const confirmOverride = () => {
  showOverrideDialog.value = false;
  generateCSV();
};

const generateCSV = () => {
  const csvHeader = "# Name,   Type, SubType, Offset,  Size, Flags\n";
  const csvContent = store.partitionTables.getPartitions().map(p => {
    const sizeHex = '0x' + p.size.toString(16).toUpperCase();
    const offsetHex = '0x' + p.offset.toString(16).toUpperCase();
    return `${p.name},${p.type},${p.subtype},${offsetHex},${sizeHex},`;
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


const updateSize = (partition: Partition) => {
  store.partitionTables.updatePartitionSize(partition, partition.size);
};


const generatePartitionName = (baseName: string) => {
  if (!baseName || !store.partitionTables.getPartitions().some(p => p.name.startsWith(baseName))) {
    return baseName;
  }

  let index = 1;
  while (store.partitionTables.getPartitions().some(p => p.name === `${baseName}_${index}`)) {
    index++;
  }
  return `${baseName}_${index}`;
};

function showAlertMessage(title: string, message: string) {
  alertTitle.value = title
  alertText.value = message
  showAlert.value = true
}

const addPartition = () => {
  if (store.partitionTables.getAvailableMemory() <= 0) {
    showAlertMessage("Cannot add a new partition", "There is not enough memory to add a new partition.  Remove a partition or resize an existing one.")
  }
};

const addNVSPartition = () => {
  if (store.partitionTables.getAvailableMemory() < NVS_PARTITION_SIZE_RECOMMENDED) {
    showAlertMessage("Cannot add a NVS partition", `There is not enough memory to add a NVS partition. NVS partition size must be at least ${NVS_PARTITION_SIZE_RECOMMENDED} bytes (${store.hintDisplaySize(NVS_PARTITION_SIZE_RECOMMENDED)}).`)
  } else {
    const newName = generatePartitionName("nvs");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, "")
  }
};

const addFATPartition = () => {
  if (store.partitionTables.getAvailableMemory() < FAT_MIN_PARTITION_SIZE) {
    showAlertMessage("Cannot add a FAT partition", `There is not enough memory to add a FAT partition. FAT partition size must be at least ${FAT_MIN_PARTITION_SIZE} bytes (${store.hintDisplaySize(FAT_MIN_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("fat");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_FAT, FAT_MIN_PARTITION_SIZE, "")
  }
};
const addSPIFFPartition = () => {
  if (store.partitionTables.getAvailableMemory() < SPIFFS_MIN_PARTITION_SIZE) {
    showAlertMessage("Cannot add a SPIFF partition", `There is not enough memory to add a SPIFFS partition. SPIFFS partition size must be at least ${SPIFFS_MIN_PARTITION_SIZE} bytes (${store.hintDisplaySize(SPIFFS_MIN_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("spiff");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_SPIFFS, SPIFFS_MIN_PARTITION_SIZE, "")
  }
};
const addLittleFSPartition = () => {
  if (store.partitionTables.getAvailableMemory() < LITTLEFS_MIN_PARTITION_SIZE) {
    showAlertMessage("Cannot add a LittleFS partition", `There is not enough memory to add a LittleFS partition. LittleFS partition size must be at least ${LITTLEFS_MIN_PARTITION_SIZE} bytes (${store.hintDisplaySize(LITTLEFS_MIN_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("littlefs");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_LITTLEFS, LITTLEFS_MIN_PARTITION_SIZE, "")
  }
};
const addCoreDumpPartition = () => {
  if (store.partitionTables.getAvailableMemory() < COREDUMP_MIN_PARTITION_SIZE) {
    showAlertMessage("Cannot add a Core Dump partition", `There is not enough memory to add a Core Dump partition. Core Dump partition size must be at least ${COREDUMP_MIN_PARTITION_SIZE} bytes (${store.hintDisplaySize(COREDUMP_MIN_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("coredump");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_COREDUMP, COREDUMP_MIN_PARTITION_SIZE, "")
  }
};
const addPhyPartition = () => {
  if (store.partitionTables.getAvailableMemory() < PHY_MIN_PARTITION_SIZE) {
    showAlertMessage("Cannot add a PHY partition", `There is not enough memory to add a PHY partition. Phy partition size must be at least ${PHY_MIN_PARTITION_SIZE} bytes (${store.hintDisplaySize(PHY_MIN_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("phy");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_PHY, PHY_MIN_PARTITION_SIZE, "")
  }
};
const addFactoryPartition = () => {
  if (store.partitionTables.getAvailableMemory() < OFFSET_APP_TYPE) {
    showAlertMessage("Cannot add a Factory App partition", `There is not enough memory to add a Factory App partition. Factory App partition size must be at least ${OFFSET_APP_TYPE} bytes (${store.hintDisplaySize(OFFSET_APP_TYPE)}).`)
  } else {
    const newName = generatePartitionName("factory");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_APP, PARTITION_FACTORY, OFFSET_APP_TYPE, "")
  }
};
const addTestPartition = () => {
  if (store.partitionTables.getAvailableMemory() < OFFSET_APP_TYPE) {
    showAlertMessage("Cannot add a Test App partition", `There is not enough memory to add a Test App partition. Factory App partition size must be at least ${OFFSET_APP_TYPE} bytes (${store.hintDisplaySize(OFFSET_APP_TYPE)}).`)
  } else {
    const newName = generatePartitionName("test");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_APP, PARTITION_TEST, OFFSET_APP_TYPE, "")
  }
};
const addOTADataPartition = () => {
  if (store.partitionTables.getAvailableMemory() < OTA_DATA_PARTITION_SIZE) {
    showAlertMessage("Cannot add an OTA Data partition", `There is not enough memory to add an OTA Data partition. Factory App partition size must be at least ${OTA_DATA_PARTITION_SIZE} bytes (${store.hintDisplaySize(OTA_DATA_PARTITION_SIZE)}).`)
  } else {
    const newName = generatePartitionName("otadata");
    store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, "")
  }
};

const addOTAPartition = () => {
  const sizeNeeded = OTA_DATA_PARTITION_SIZE + OFFSET_APP_TYPE * 2
  if (store.partitionTables.getAvailableMemory() < sizeNeeded) {
    showAlertMessage("Cannot add OTA partitions", `There is not enough memory to add a OTA partitions. You need at least ${sizeNeeded} bytes of memory available (${store.hintDisplaySize(sizeNeeded)}).`)
  } else {
    let partitionName: string = ""
    partitionName = generatePartitionName("otadata")
    store.partitionTables.addPartition(partitionName, PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, "")
    partitionName = generatePartitionName("app0")
    store.partitionTables.addPartition(partitionName, PARTITION_TYPE_APP, "ota_0", OFFSET_APP_TYPE, "")
    partitionName = generatePartitionName("app1")
    store.partitionTables.addPartition(partitionName, PARTITION_TYPE_APP, "ota_1", OFFSET_APP_TYPE, "")
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
    input.value = '';

  }
};

const loadPartitionsFromCSV = (csv: string) => {
  const rows = csv.split('\n').filter(row => row.trim() !== '');
  const header = rows.shift(); // Remove the header row
  if (header !== '# Name,   Type, SubType, Offset,  Size, Flags') {
    alertTitle.value = "Invalid CSV Format";
    alertText.value = "The CSV file format is incorrect. Please use the correct format.";
    showAlert.value = true;
    return;
  }

  const partitions: Partition[] = [];
  let totalSize = 0;
  for (const row of rows) {
    const [name, type, subtype, offsetHex, sizeStr, flags] = row.split(',');
    if (!name || !type || !subtype || !offsetHex || !sizeStr) {
      alertTitle.value = "Invalid CSV Data";
      alertText.value = "The CSV file contains invalid data. Please check the file and try again.";
      showAlert.value = true;
      return;
    }

    const size = parseSize(sizeStr.trim()); // Convert size to bytes
    const offset = parseInt(offsetHex.trim(), 16); // Convert hex to decimal
    partitions.push({ name: name.trim(), type: type.trim(), subtype: subtype.trim(), size, offset, flags: flags?.trim() || '' });
    totalSize += size;
  }

  store.partitionTables.clearPartitions();
  partitions.forEach(partition => store.partitionTables.addPartition(partition.name, partition.type, partition.subtype, partition.size, partition.flags));

  // Adjust flash size based on total partition size
  for (const size of FLASH_SIZES) {
    if (totalSize <= size.value * 1024 * 1024) {
      store.flashSize = size.value;
      store.partitionTables.setFlashSize(size.value);
      break;
    }
  }
};

const parseSize = (sizeStr: string): number => {
  const sizeRegex = /^(\d+)([KMB]?)$/;
  const hexRegex = /^0x[0-9a-fA-F]+$/;

  if (hexRegex.test(sizeStr)) {
    return parseInt(sizeStr, 16); // Parse as hex
  }

  const match = sizeStr.match(sizeRegex);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const size = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'K':
      return size * 1024;
    case 'M':
      return size * 1024 * 1024;
    default:
      return size;
  }
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
  width: 100%;
}
</style>
