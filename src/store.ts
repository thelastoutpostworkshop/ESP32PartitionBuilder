import { defineStore } from 'pinia'
import { ref } from 'vue';

export const partitionStore = defineStore('partition_store', () => {
    const availableMemory = ref(0)

    return {
        availableMemory
    }
})