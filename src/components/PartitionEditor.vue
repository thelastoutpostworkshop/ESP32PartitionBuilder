<template>
  <v-container>
    <v-form ref="formRef" @submit.prevent="downloadCSV">
      <v-app-bar location="top" permanent>
        <v-btn color="primary" @click="addPartition">Add Partition
          <v-menu activator="parent">
            <v-list v-if="store.partitionTables.getAvailableMemory() > 0" style="cursor: pointer;">
              <v-tooltip location="end">
                <template #activator="{ props }">
                  <v-list-item v-bind="props" @click="addNVSPartition">
                    NVS (Non-Volatile Storage)
                  </v-list-item>
                </template>
                <span>Required when using Wi-Fi, BLE, or Preferences APIs.</span>
              </v-tooltip>
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
        <v-btn color="primary" @click="loadCSV" dense class="mr-2">Load CSV
          <v-tooltip activator="parent" location="top">Load a CSV partition file</v-tooltip>
        </v-btn>
        <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;" accept=".csv" />
        <v-btn color="primary" type="submit" dense
          :disabled="store.partitionTables.getPartitions().length == 0">Download
          CSV
          <v-tooltip activator="parent" location="top">Download partitions as a CSV file</v-tooltip>
        </v-btn>
        <v-spacer></v-spacer>
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" @click="store.partitionTables.clearPartitions()" variant="text"
              :disabled="store.partitionTables.getPartitions().length == 0">
              <v-icon color="red-darken-4">
                mdi-trash-can
              </v-icon>
            </v-btn>
          </template>
          <span>Delete all Partitions</span>
        </v-tooltip>
      </v-app-bar>
      <div v-for="(partition, index) in store.partitionTables.getPartitions()" :key="index"
        class="partition mt-4" :style="partitionStyle(partition, index)">
        <div class="partition__tag">
          <div class="partition__label">
            <span class="partition__dot"></span>
            <span class="partition__tag-text">{{ partition.type }} / {{ partition.subtype }}</span>
          </div>
          <span class="partition__size">{{ store.hintDisplaySize(partition.size) }}</span>
        </div>
        <v-row dense>
          <v-col>
            <v-text-field v-model="partition.name" label="Name" density="compact"
              :rules="[partitionNameRule(partition.name, index)]"></v-text-field>
          </v-col>
          <v-col>
            <v-select readonly v-model="partition.type" :items="PARTITION_TYPES" label="Type" density="compact"
              hide-details @update:model-value="validateType(partition)"></v-select>
          </v-col>
          <v-col>
            <v-select readonly v-model="partition.subtype" :items="getSubtypes(partition.type)" label="Subtype"
              density="compact" dense></v-select>
          </v-col>
          <v-col>
            <v-text-field readonly v-model.number="partition.size" label="Size (bytes)" density="compact"
              :rules="[partitionSizeRule(partition)]" :hint="store.hintDisplaySize(partition.size)"
              persistent-hint></v-text-field>
          </v-col>
          <v-col>
            <v-text-field readonly active label="offset" density="compact">
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
        <v-slider :color="partitionAccentColor(partition, index)"
          :track-color="partitionAccentTrackColor(partition, index)" v-model="partition.size" thumb-label label="Size"
          :disabled="partition.subtype === 'ota_0' && store.partitionTables.hasOTAPartitions()"
          :max="store.partitionTables.getTotalMemory()" @end="updateSize(partition)" dense hide-details
          :step="stepSize(partition)" :min="stepSize(partition)">
          <template v-slot:prepend>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="resizeToFit(partition)" variant="text"
                  :disabled="store.partitionTables.getAvailableMemory() >= 0">
                  <v-icon color="blue">
                    mdi-arrow-left-bold
                  </v-icon>
                </v-btn>
              </template>
              <span>Resize to fit</span>
            </v-tooltip>
            <v-btn color="primary" icon="mdi-minus-box" size="small" variant="text"
              @click="decrement(partition)"></v-btn>
          </template>
          <template v-slot:append>
            <v-btn color="primary" icon="mdi-plus-box" size="small" variant="text"
              @click="increment(partition)"></v-btn>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="reclaimMemory(partition)" variant="text"
                  :disabled="store.partitionTables.getAvailableMemory() <= 0">
                  <v-icon color="blue">
                    mdi-arrow-right-bold
                  </v-icon>
                </v-btn>
              </template>
              <span>Reclaim Memory</span>
            </v-tooltip>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <v-btn icon v-bind="props" @click="reszeToRecommendedValue(partition)" variant="text"
                  :disabled="!partitionNotRecommendedSize(partition)">
                  <v-icon color="blue">
                    mdi-check-underline
                  </v-icon>
                </v-btn>
              </template>
              <span>Resize to recommended value</span>
            </v-tooltip>
          </template>
        </v-slider>
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
      <v-card max-width="400" color="white" :title="dialogTitle">
        <v-card-text>{{ dialogText }}</v-card-text>
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
import { loadPartitionsFromCsv } from '@/partitionLoader';
import {
  PARTITION_TYPES, PARTITION_TYPE_DATA, PARTITION_TYPE_APP, PARTITION_APP_SUBTYPES,
  PARTITION_DATA_SUBTYPES, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, OTA_DATA_PARTITION_SIZE,
  OFFSET_DATA_TYPE, PARTITION_OTA, OFFSET_APP_TYPE, PARTITION_FAT, FAT_MIN_PARTITION_SIZE,
  PARTITION_SPIFFS, PARTITION_LITTLEFS, SPIFFS_MIN_PARTITION_SIZE, LITTLEFS_MIN_PARTITION_SIZE,
  COREDUMP_MIN_PARTITION_SIZE, PARTITION_COREDUMP, PARTITION_FACTORY, PARTITION_TEST, PHY_MIN_PARTITION_SIZE,
  PARTITION_PHY,
  PARTITION_TABLE_SIZE,
  FLASH_SIZES
} from '@/const';
import { partitionStore } from '@/store'
import type { Partition } from '@/types'
import { getAccessibleTextColor, getPartitionBaseColor, lightenColor } from '@/partitionColors';

const store = partitionStore();
const formRef = ref();
const showAlert = ref(false);
const alertText = ref("")
const alertTitle = ref("")
const dialogText = ref("")
const dialogTitle = ref("")
const fileInput = ref<HTMLInputElement | null>(null);
const showOverrideDialog = ref(false);

const partitionStyle = (partition: Partition, index: number) => {
  const baseColor = getPartitionBaseColor(partition, index);
  return {
    '--partition-accent-color': baseColor,
    '--partition-accent-light': lightenColor(baseColor, 0.45),
    '--partition-accent-dark': lightenColor(baseColor, -0.2),
    '--partition-tag-background': lightenColor(baseColor, 0.25),
    '--partition-text-contrast': getAccessibleTextColor(baseColor)
  };
};

const partitionAccentColor = (partition: Partition, index: number) => {
  return getPartitionBaseColor(partition, index);
};

const partitionAccentTrackColor = (partition: Partition, index: number) => {
  return lightenColor(getPartitionBaseColor(partition, index), 0.65);
};



const partitionNameRule = (name: string, index: number) => {
  const nameConflict = store.partitionTables.getPartitions().some((p, i) => i !== index && p.name === name)
  if (nameConflict) {
    console.log(name)
    return 'Name already exists'
  } else {
    return true
  }
};

function partitionNotRecommendedSize(partition: Partition): boolean {
  let recommendeSize: boolean
  switch (partition.subtype) {
    case PARTITION_NVS:
      recommendeSize = partition.size < NVS_PARTITION_SIZE_RECOMMENDED
      break;
    case PARTITION_OTA:
      recommendeSize = partition.size != OTA_DATA_PARTITION_SIZE
      break;
    case PARTITION_FAT:
      recommendeSize = partition.size < FAT_MIN_PARTITION_SIZE
      break;
    case PARTITION_SPIFFS:
      recommendeSize = partition.size < SPIFFS_MIN_PARTITION_SIZE
      break;
    case PARTITION_LITTLEFS:
      recommendeSize = partition.size < LITTLEFS_MIN_PARTITION_SIZE
      break;
    case PARTITION_COREDUMP:
      recommendeSize = partition.size < COREDUMP_MIN_PARTITION_SIZE
      break;
    default:
      recommendeSize = false;
      break;
  }
  return recommendeSize
}
function reszeToRecommendedValue(partition: Partition) {
  switch (partition.subtype) {
    case PARTITION_NVS:
      partition.size = NVS_PARTITION_SIZE_RECOMMENDED
      break;
    case PARTITION_OTA:
      partition.size = OTA_DATA_PARTITION_SIZE
      break;
    case PARTITION_FAT:
      partition.size = FAT_MIN_PARTITION_SIZE
      break;
    case PARTITION_SPIFFS:
      partition.size = SPIFFS_MIN_PARTITION_SIZE
      break;
    case PARTITION_LITTLEFS:
      partition.size = LITTLEFS_MIN_PARTITION_SIZE
      break;
    case PARTITION_COREDUMP:
      partition.size = COREDUMP_MIN_PARTITION_SIZE
      break;
  }
}

const partitionSizeRule = (partition: Partition) => {
  switch (partition.subtype) {
    case PARTITION_NVS:
      if (partition.size < NVS_PARTITION_SIZE_RECOMMENDED) {
        return `NVS partition size must be at least ${NVS_PARTITION_SIZE_RECOMMENDED} bytes. (${store.hintDisplaySize(NVS_PARTITION_SIZE_RECOMMENDED)})`;
      }
      break;
    case PARTITION_OTA:
      if (partition.size != OTA_DATA_PARTITION_SIZE) {
        return `OTA data partition size must be ${OTA_DATA_PARTITION_SIZE} bytes. (${store.hintDisplaySize(OTA_DATA_PARTITION_SIZE)})`;
      }
      break;
    case PARTITION_FAT:
      if (partition.size < FAT_MIN_PARTITION_SIZE) {
        return `FAT partition minimal recommended size is ${FAT_MIN_PARTITION_SIZE} bytes. (${store.hintDisplaySize(FAT_MIN_PARTITION_SIZE)})`;
      }
      break;
    case PARTITION_SPIFFS:
      if (partition.size < SPIFFS_MIN_PARTITION_SIZE) {
        return `SPIFFS partition minimal recommended size is ${SPIFFS_MIN_PARTITION_SIZE} bytes. (${store.hintDisplaySize(SPIFFS_MIN_PARTITION_SIZE)})`;
      }
      break;
    case PARTITION_LITTLEFS:
      if (partition.size < LITTLEFS_MIN_PARTITION_SIZE) {
        return `LittleFS partition minimal recommended size is ${LITTLEFS_MIN_PARTITION_SIZE} bytes. (${store.hintDisplaySize(LITTLEFS_MIN_PARTITION_SIZE)})`;
      }
      break;
    case PARTITION_COREDUMP:
      if (partition.size < COREDUMP_MIN_PARTITION_SIZE) {
        return `Core Dump partition minimal recommended size is ${COREDUMP_MIN_PARTITION_SIZE} bytes. (${store.hintDisplaySize(COREDUMP_MIN_PARTITION_SIZE)})`;
      }
      break;
  }
  return true;
};

function stepSize(partition: Partition): number {
  if (partition.type === PARTITION_TYPE_DATA) {
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
      if (store.partitionTables.getAvailableMemory() < 0) {
        dialogText.value = "Partitions memory exceed flash memory capacity. Do you want to proceed and download the CSV anyway?"
        dialogTitle.value = "Memory Warnings"
        showOverrideDialog.value = true;
      } else {
        if (store.partitionTables.getAvailableMemory() > 0) {
          dialogText.value = "You have memory left avalaible in your flash memory. Do you want to proceed and download the CSV anyway?"
          dialogTitle.value = "Memory Warnings"
          showOverrideDialog.value = true;
        } else {
          generateCSV();
        }
      }
    } else {
      dialogText.value = "There are validation errors in the partitions. Do you want to proceed and download the CSV anyway?"
      dialogTitle.value = "Partition Rules Warnings"
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
  const subtypes = getSubtypes(partition.type);
  const nextSubtype = subtypes[0];
  if (nextSubtype) {
    partition.subtype = nextSubtype;
  }
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
    const newName = generatePartitionName("spiffs");
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
    return
  }
  if (store.partitionTables.hasSubtype(PARTITION_OTA)) {
    showAlertMessage("Cannot add OTA Data partitions", `Only one OTA Data partition is permitted`)
    return
  }
  const newName = generatePartitionName("otadata");
  store.partitionTables.addPartition(newName, PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, "")

};

const addOTAPartition = () => {
  const needsNvs = !store.partitionTables.hasSubtype(PARTITION_NVS)
  const sizeNeeded = OTA_DATA_PARTITION_SIZE + OFFSET_APP_TYPE * 2 + (needsNvs ? NVS_PARTITION_SIZE_RECOMMENDED : 0)
  if (store.partitionTables.getAvailableMemory() < sizeNeeded) {
    const requirementMessage = needsNvs
      ? `You need at least ${sizeNeeded} bytes available (${store.hintDisplaySize(sizeNeeded)}) for OTA Data, two OTA App slots, and an NVS partition.`
      : `You need at least ${sizeNeeded} bytes available (${store.hintDisplaySize(sizeNeeded)}) for OTA Data and two OTA App slots.`
    showAlertMessage("Cannot add OTA partitions", `There is not enough memory to add OTA support. ${requirementMessage}`)
    return
  }
  let partitionName: string = ""
  if (needsNvs) {
    partitionName = generatePartitionName("nvs")
    store.partitionTables.addPartition(partitionName, PARTITION_TYPE_DATA, PARTITION_NVS, NVS_PARTITION_SIZE_RECOMMENDED, "")
  }
  partitionName = generatePartitionName("otadata")
  store.partitionTables.addPartition(partitionName, PARTITION_TYPE_DATA, PARTITION_OTA, OTA_DATA_PARTITION_SIZE, "")
  partitionName = generatePartitionName("app0")
  store.partitionTables.addPartition(partitionName, PARTITION_TYPE_APP, "ota_0", OFFSET_APP_TYPE, "")
  partitionName = generatePartitionName("app1")
  store.partitionTables.addPartition(partitionName, PARTITION_TYPE_APP, "ota_1", OFFSET_APP_TYPE, "")

};

const removePartition = (partition: Partition) => {
  store.partitionTables.removePartition(partition.name)
};

const reclaimMemory = (partition: Partition) => {
  const available = store.partitionTables.getAvailableMemory();
  if (available <= 0) {
    return;
  }
  const resizeOnOta: boolean = (partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && store.partitionTables.hasOTAPartitions();
  const targetSize = resizeOnOta
    ? partition.size + Math.floor(available / 2)
    : partition.size + available;
  store.partitionTables.updatePartitionSize(partition, targetSize);
};

const resizeToFit = (partition: Partition) => {
  let resize: number
  const resizeOnOta: boolean = (partition.subtype === 'ota_0' || partition.subtype === 'ota_1') && store.partitionTables.hasOTAPartitions()
  if (resizeOnOta) {
    resize = partition.size * 2 + store.partitionTables.getAvailableMemory()
  } else {
    resize = partition.size + store.partitionTables.getAvailableMemory()
  }
  if (resize <= 0 || (partition.type === PARTITION_TYPE_APP && partition.size <= OFFSET_APP_TYPE)) {
    showAlertMessage("Cannot resize the partition", `The partition is not large enough to remove ${store.partitionTables.getAvailableMemory()} bytes (${store.hintDisplaySize(store.partitionTables.getAvailableMemory())}).`)
  } else {
    if (resizeOnOta) {
      store.partitionTables.updatePartitionSize(partition, Math.round(resize / 2));
      if (store.partitionTables.getAvailableMemory() < 0) {
        store.partitionTables.updatePartitionSize(partition, partition.size + store.partitionTables.getAvailableMemory());
      }
    } else {
      store.partitionTables.updatePartitionSize(partition, resize);
    }
  }
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
  const error = loadPartitionsFromCsv(csv, store);
  if (error) {
    showAlertMessage(error.title, error.text);
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
  position: relative;
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  padding: 18px 20px 22px 22px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.82));
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.partition::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  background: linear-gradient(to bottom,
      var(--partition-accent-light, rgba(59, 130, 246, 0.75)),
      var(--partition-accent-color, rgba(59, 130, 246, 0.95)));
  border-radius: 14px 0 0 14px;
}

.partition:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35);
}

.partition__tag {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 6px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg,
      var(--partition-tag-background, rgba(255, 255, 255, 0.08)),
      rgba(255, 255, 255, 0.03));
  color: var(--partition-text-contrast, #e2e8f0);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.partition__label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.partition__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--partition-accent-color, rgba(59, 130, 246, 0.85));
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.partition__tag-text {
  white-space: nowrap;
}

.partition__size {
  font-weight: 600;
  opacity: 0.9;
}

.partition :deep(.v-field--variant-filled .v-field__overlay) {
  background-color: rgba(15, 23, 42, 0.35);
}

.partition :deep(.v-field--variant-filled .v-field__outline) {
  border-color: rgba(255, 255, 255, 0.08);
}

.partition :deep(.v-slider-track__fill),
.partition :deep(.v-slider-track__background) {
  border-radius: 999px;
}
</style>
