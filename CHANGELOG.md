# Changelog

## 1.2.3
### Fixed Issues
- Keep fixed-offset app partitions visible when imported CSV layouts end at the flash-size boundary ([#21](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/21)).
- Infer imported flash size from the highest used flash address instead of summed partition sizes for sparse fixed-offset layouts.
- Show custom app image offsets in flashing hints and warn when Arduino uploads need matching app offset configuration.

## 1.2.2
### Improvement
- Added a dedicated Maker Tools page under Resources with companion tools, including ESPConnect, tutorials, and source links.
- Added a target chip selector with flashing hints for common ESP32-family chips ([#17](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/17)).
- Moved target chip flashing hints into an on-demand dialog to reduce sidebar clutter.
- Improved the flashing hints dialog layout for easier scanning.
- Added custom partition support, including editable type, subtype, offset, size, and flags plus a built-in ESP-IDF Zigbee preset with `zb_storage` and `zb_fct` partitions ([#12](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/12)).
- Added Copy CSV and Paste CSV clipboard actions for partition tables ([#13](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/13)).

### Fixed Issues
- Allow the currently selected built-in partition preset to be applied again after clearing all partitions.
- Use `KB` and `MB` for byte-based size labels instead of `Kb` and `Mb` ([#19](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/19)).
- Preserve imported fixed partition offsets when resizing partitions so custom CSV layouts do not silently shift ([#18](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/18)).
- Keep tiny fixed-offset partitions and trailing unused flash visible in the partition visualizer ([#21](https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder/issues/21)).

### Internal runtime
- Added Vitest unit tests for partition table calculations, CSV loading, URL parsing, and partition color helpers.
- Added Playwright end-to-end tests for app rendering, partition workflows, CSV import/export, and OTA warnings.
- Added Playwright visual snapshot tests for desktop, mobile, menu, and dialog layouts.
- Upgraded Vite, @vue/tsconfig, and vue-router.
- Upgraded Vuetify to v4 and replaced deprecated dense props with density settings.
- Upgraded TypeScript to v6 and removed the deprecated TypeScript baseUrl setting.

## 1.2.1
- The app now accepts a URL for flash size and partitions info for integration with ESPConnect and the Arduino Maker Workshop extension for VSCode. 
