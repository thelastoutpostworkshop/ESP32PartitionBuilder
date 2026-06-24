# Changelog

## 1.2.2
### Improvement
- Added a dedicated Maker Tools page under Resources with companion tools, including ESPConnect, tutorials, and source links.

### Internal runtime
- Added Vitest unit tests for partition table calculations, CSV loading, URL parsing, and partition color helpers.
- Added Playwright end-to-end tests for app rendering, partition workflows, CSV import/export, and OTA warnings.
- Added Playwright visual snapshot tests for desktop, mobile, menu, and dialog layouts.
- Upgraded Vite, @vue/tsconfig, and vue-router.
- Upgraded Vuetify to v4 and replaced deprecated dense props with density settings.
- Upgraded TypeScript to v6 and removed the deprecated TypeScript baseUrl setting.

## 1.2.1
- The app now accepts a URL for flash size and partitions info for integration with ESPConnect and the Arduino Maker Workshop extension for VSCode. 
