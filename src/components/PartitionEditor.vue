<template>
  <v-container>
    <v-row>
      <v-col class="mb-2">
        <v-btn @click="addPartition" dense color="primary">Add Partition</v-btn>
        <span class="pl-2">Available Memory: {{ availableMemory }} bytes</span>
      </v-col>
    </v-row>
    <div v-for="(partition, index) in partitions" :key="index" class="partition">
      <v-row dense>
        <v-col>
          <v-text-field v-model="partition.name" label="Name" dense hide-details
            @change="validateName(partition)"></v-text-field>
        </v-col>
        <v-col>
          <v-select v-model="partition.type" :items="['app', 'data']" label="Type" dense hide-details
            @change="validateType(partition)"></v-select>
        </v-col>
        <v-col>
          <v-select v-model="partition.subtype" :items="getSubtypes(partition.type)" label="Subtype" dense hide-details
            @change="validateSubtype(partition)"></v-select>
        </v-col>
        <v-col>
          <v-text-field v-model.number="partition.size" label="Size (bytes)" dense hide-details
            @change="validateSize(partition, index)"></v-text-field>
        </v-col>
        <v-col cols="auto">
          <v-btn @click="removePartition(index)" dense>Remove</v-btn>
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-slider v-model="partition.size" :max="flashSizeBytes - totalSize + partition.size"
            @input="updateSize(index, $event)" dense hide-details
            :step="partition.type === 'app' ? 65536 : 4096"></v-slider>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, type PropType } from 'vue';
import { PARTITION_TABLE_SIZE } from '@/config';

export default defineComponent({
  name: 'PartitionEditor',
  props: {
    partitions: {
      type: Array as PropType<any[]>,
      required: true
    },
    flashSize: {
      type: Number,
      required: true
    },
    availableMemory: {
      type: Number,
      required: true
    }
  },
  setup(props, { emit }) {
    const partitions = ref([...props.partitions]);

    watch(partitions, (newPartitions) => {
      emit('updatePartitions', newPartitions);
    }, { deep: true, immediate: true });

    const flashSizeBytes = computed(() => props.flashSize * 1024 * 1024 - PARTITION_TABLE_SIZE);

    const totalSize = computed(() => {
      return partitions.value.reduce((sum, partition) => sum + partition.size, 0);
    });

    const validateName = (partition) => {
      if (partition.name.length > 16) {
        partition.name = partition.name.substring(0, 16);
      }
    };

    const validateType = (partition) => {
      const validTypes = ['app', 'data'];
      if (!validTypes.includes(partition.type)) {
        partition.type = 'data';
      }
      partition.subtype = getSubtypes(partition.type)[0];
    };

    const getSubtypes = (type) => {
      if (type === 'app') {
        return ['factory', 'test', 'ota_0', 'ota_1', 'ota_2', 'ota_3', 'ota_4', 'ota_5', 'ota_6', 'ota_7', 'ota_8', 'ota_9', 'ota_10', 'ota_11', 'ota_12', 'ota_13', 'ota_14', 'ota_15'];
      } else if (type === 'data') {
        return ['ota', 'phy', 'nvs', 'nvs_keys', 'coredump', 'efuse', 'fat', 'spiffs', 'littlefs'];
      }
      return [];
    };

    const validateSubtype = (partition) => {
      const validSubtypes = getSubtypes(partition.type);
      if (!validSubtypes.includes(partition.subtype)) {
        partition.subtype = validSubtypes[0];
      }
    };

    const validateSize = (partition, index) => {
      // Enforce the offset rules
      if (partition.type === 'app') {
        partition.offset = Math.ceil((index === 0 ? 0x10000 : partitions.value[index - 1].offset + partitions.value[index - 1].size) / 0x10000) * 0x10000;
      } else {
        if (index === 0) {
          partition.offset = 0x9000; // First non-app partition offset
        } else {
          let previousPartition = partitions.value[index - 1];
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
      if (totalSize.value > flashSizeBytes.value) {
        partition.size = flashSizeBytes.value - (totalSize.value - partition.size);
      }
    };

    const updateSize = (index: number, newSize: number) => {
      const maxAvailableSize = flashSizeBytes.value - totalSize.value + partitions.value[index].size - PARTITION_TABLE_SIZE;
      partitions.value[index].size = Math.min(Math.round(newSize), maxAvailableSize);
      validateSize(partitions.value[index], index);
    };

    const generatePartitionName = () => {
      const baseName = "partition";
      let index = 1;
      while (partitions.value.some(p => p.name === `${baseName}_${index}`)) {
        index++;
      }
      return `${baseName}_${index}`;
    };

    const addPartition = () => {
      const newName = generatePartitionName();
      partitions.value.push({ name: newName, type: 'data', subtype: getSubtypes('data')[0], size: 4096 });
      emit('updatePartitions', partitions.value);
    };

    const removePartition = (index: number) => {
      partitions.value.splice(index, 1);
      emit('updatePartitions', partitions.value);
    };

    return {
      partitions,
      flashSizeBytes,
      totalSize,
      validateName,
      validateType,
      validateSubtype,
      validateSize,
      updateSize,
      addPartition,
      removePartition,
      getSubtypes
    };
  }
});
</script>

<style scoped>
.partition {
  border: 1px solid #ccc;
  padding: 8px;
  margin-bottom: 8px;
  width: 100%;
}
</style>
