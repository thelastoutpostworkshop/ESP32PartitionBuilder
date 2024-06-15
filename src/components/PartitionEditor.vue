<template>
  <v-container>
    <v-row>
      <v-col>
        <v-btn @click="addPartition" dense>Add Partition</v-btn>
        <span>Available Memory: {{ availableMemory }} bytes</span>
      </v-col>
    </v-row>
    <div v-for="(partition, index) in partitions" :key="index" class="partition">
      <v-row dense>
        <v-col>
          <v-text-field
            v-model="partition.name"
            label="Name"
            dense
            hide-details
            @change="validateName(partition)"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-select
            v-model="partition.type"
            :items="['app', 'data']"
            label="Type"
            dense
            hide-details
            @change="validateType(partition)"
          ></v-select>
        </v-col>
        <v-col>
          <v-select
            v-model="partition.subtype"
            :items="getSubtypes(partition.type)"
            label="Subtype"
            dense
            hide-details
            @change="validateSubtype(partition)"
          ></v-select>
        </v-col>
        <v-col>
          <v-text-field
            v-model.number="partition.size"
            label="Size (bytes)"
            dense
            hide-details
            @change="validateSize(partition)"
          ></v-text-field>
        </v-col>
        <v-col cols="auto">
          <v-btn @click="removePartition(index)" dense>Remove</v-btn>
        </v-col>
      </v-row>
      <v-row dense>
        <v-col>
          <v-slider
            v-model="partition.size"
            :max="flashSizeBytes - totalSize + partition.size"
            @input="updateSize(index, $event)"
            dense
            hide-details
            :step="partition.type === 'app' ? 65536 : 4096"
          ></v-slider>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, type PropType } from 'vue';

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

    const flashSizeBytes = computed(() => props.flashSize * 1024 * 1024- 0x1000);

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
    };

    const getSubtypes = (type) => {
      if (type === 'app') {
        return ['factory', 'ota_0', 'ota_1', 'test'];
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

    const validateSize = (partition) => {
      if (partition.type === 'app') {
        partition.size = Math.ceil(partition.size / 65536) * 65536; // Align to 64KB
      } else {
        partition.size = Math.ceil(partition.size / 4096) * 4096; // Align to 4KB
      }

      if (totalSize.value > flashSizeBytes.value) {
        partition.size = flashSizeBytes.value - (totalSize.value - partition.size);
      }
    };

    const updateSize = (index: number, newSize: number) => {
      partitions.value[index].size = Math.round(newSize);
      validateSize(partitions.value[index]);
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
