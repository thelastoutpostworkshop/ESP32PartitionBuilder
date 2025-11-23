import { defineStore } from 'pinia'
import { ref, computed } from 'vue';
import { PartitionTable } from '@/partitions';
import { PARTITION_TABLE_OFFSET_DEFAULT } from '@/const';

export const partitionStore = defineStore('partition_store', () => {
    const flashSize = ref(4);
    const flashSizeBytes = computed(() => {
        return flashSize.value * 1024 * 1024;
    });
    const displaySizes = ref(1024);
    const partitionTableOffset = ref(PARTITION_TABLE_OFFSET_DEFAULT);
    const partitionTables = ref(new PartitionTable(4, partitionTableOffset.value));

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

    function setPartitionTableOffset(offset: number) {
        partitionTableOffset.value = offset;
        partitionTables.value.setPartitionTableOffset(offset);
    }

    return {
        flashSize,
        flashSizeBytes,
        partitionTables,
        displaySizes,
        hintDisplaySize,
        partitionTableOffset,
        setPartitionTableOffset
    }
})
