import { defineStore } from 'pinia'
import { ref, computed } from 'vue';
import { PartitionTable } from '@/partitions';

export const partitionStore = defineStore('partition_store', () => {
    const flashSize = ref(4);
    const flashSizeBytes = computed(() => {
        return flashSize.value * 1024 * 1024;
    });
    const displaySizes = ref(1024);
    const partitionTables = ref(new PartitionTable(4));

    function hintDisplaySize(size: number): string {
        let label: string = ""
        switch (displaySizes.value) {
          case 1024:
            label = `${size / displaySizes.value} Kb`
            break;
          case 1024 * 1024:
            label = `${parseFloat((size / displaySizes.value).toFixed(5))} Mb`
            break;
          default:
            label = "Size unknown"
            break;
        }
        return label
      }

    return {
        flashSize,
        flashSizeBytes,
        partitionTables,
        displaySizes,hintDisplaySize
    }
})