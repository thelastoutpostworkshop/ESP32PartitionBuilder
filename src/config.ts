export const PARTITION_TABLE_SIZE = 0x9000; // 36KB reserved for the partition table
export const FLASH_SIZES = [
    { value: 4, text: '4 MB' },
    { value: 8, text: '8 MB' },
    { value: 16, text: '16 MB' }
];
export const PARTITION_TYPE_APP = "app"
export const PARTITION_TYPE_DATA = "data"
export const PARTITION_TYPES = [PARTITION_TYPE_APP, PARTITION_TYPE_DATA]