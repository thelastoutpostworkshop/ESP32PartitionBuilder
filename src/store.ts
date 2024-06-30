import { defineStore } from 'pinia'
import { ref, computed } from 'vue';
import { PartitionTable } from '@/partitions';

export const partitionStore = defineStore('partition_store', () => {
    const flashSize = ref(4);
    const flashSizeBytes = computed(() => {
        return flashSize.value * 1024 * 1024;
    });

    const partitionTables = ref(new PartitionTable(4));
    const partitionEdit = ref(new PartitionTable(4))


    return {
        flashSize,
        flashSizeBytes,
        partitionTables,
        partitionEdit
    }
})