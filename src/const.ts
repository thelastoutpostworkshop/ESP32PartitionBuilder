export const APP_VERSION = "1.1.4"
export const OFFSET_APP_TYPE = 0x10000
export const OFFSET_DATA_TYPE = 0x1000
export const PARTITION_TABLE_SIZE = 0x9000; // 36KB reserved for the partition table
export const NVS_PARTITION_SIZE_RECOMMENDED = 0x3000
export const OTA_DATA_PARTITION_SIZE = 0x2000
export const OTADATA_REQUIRED_OFFSET = 0xE000
export const FAT_MIN_PARTITION_SIZE = 528 * 1024
export const SPIFFS_MIN_PARTITION_SIZE = 192 * 1024
export const LITTLEFS_MIN_PARTITION_SIZE = 128 * 1024
export const COREDUMP_MIN_PARTITION_SIZE = 64 * 1024
export const PHY_MIN_PARTITION_SIZE = 4 * 1024

export const FLASH_SIZES = [
    { value: 4, text: '4 MB' },
    { value: 8, text: '8 MB' },
    { value: 16, text: '16 MB' },
    { value: 32, text: '32 MB' }
];

export const DISPLAY_SIZES = [
    {value:1024, text:"Kilobytes (Kb)"},
    {value:1024*1024, text:"Megabytes (Mb)"}
]
export const PARTITION_TYPE_APP = "app"
export const PARTITION_TYPE_DATA = "data"
export const PARTITION_NVS = "nvs"
export const PARTITION_OTA = "ota"
export const PARTITION_FAT = "fat"
export const PARTITION_SPIFFS = "spiffs"
export const PARTITION_LITTLEFS = "littlefs"
export const PARTITION_COREDUMP = "coredump"
export const PARTITION_FACTORY = "factory"
export const PARTITION_TEST = "test"
export const PARTITION_PHY = "phy"
export const PARTITION_TYPES = [PARTITION_TYPE_APP, PARTITION_TYPE_DATA]
export const PARTITION_APP_SUBTYPES = [PARTITION_FACTORY, PARTITION_TEST, 'ota_0', 'ota_1', 'ota_2', 'ota_3', 'ota_4', 'ota_5', 'ota_6', 'ota_7', 'ota_8', 'ota_9', 'ota_10', 'ota_11', 'ota_12', 'ota_13', 'ota_14', 'ota_15']
export const PARTITION_DATA_SUBTYPES = [PARTITION_OTA, PARTITION_PHY, PARTITION_NVS, 'nvs_keys', PARTITION_COREDUMP, 'efuse', PARTITION_FAT, PARTITION_SPIFFS, PARTITION_LITTLEFS]
