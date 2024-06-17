import { defineStore } from 'pinia'
import { ref } from 'vue';
import type { Partition } from '@/types';
import { esp32Partitions } from '@/partitions';

export const partitionStore = defineStore('partition_store', () => {
    const availableMemory = ref(0)
    const partitions = ref<Partition[]>(esp32Partitions[0].partitions);

    return {
        availableMemory,
        partitions
    }
})