import { defineStore } from 'pinia'
import { ref, computed } from 'vue';
import type { Partition } from '@/types';
import { esp32Partitions } from '@/partitions';

export const partitionStore = defineStore('partition_store', () => {
    const availableMemory = ref(0)
    const partitions = ref<Partition[]>(esp32Partitions[0].partitions);
    const flashSize = ref(4);
    const flashSizeBytes = computed(() => {
        return flashSize.value * 1024 * 1024;
    });

    return {
        availableMemory,
        partitions,
        flashSize,
        flashSizeBytes
    }
})