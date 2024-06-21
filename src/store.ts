import { defineStore } from 'pinia'
import { ref, computed } from 'vue';
import type { Partition } from '@/types';
import { PartitionTable } from '@/partitions';

const ptables = new PartitionTable(4);

export const partitionStore = defineStore('partition_store', () => {
    const flashSize = ref(4);
    const flashSizeBytes = computed(() => {
        return flashSize.value * 1024 * 1024;
    });

    const partitionTables = ref(ptables);

    return {
        flashSize,
        flashSizeBytes,
        partitionTables
    }
})