# ESP32 Partition Builder Web Application

ESP32 Partition Builder is a browser-based tool for designing ESP32 partition table CSV files.

The web application is available here: [ESP32 Partition Builder](https://thelastoutpostworkshop.github.io/ESP32PartitionBuilder/).

## YouTube Tutorial

[<img src="https://github.com/thelastoutpostworkshop/images/blob/main/Custom%20Partitions.png" width="300">](https://youtu.be/EuHxodrye6E)

<a href="https://www.buymeacoffee.com/thelastoutpostworkshop" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee">
</a>

## Features

- Build partition tables from guided presets or individual partition rows.
- Import, paste, copy, and download ESP-IDF partition CSV files.
- Visualize used and unused flash memory.
- Configure flash size and partition table offset.
- Preserve fixed offsets when importing CSV layouts.
- Add custom partition rows with editable type, subtype, offset, size, and flags.
- Use the built-in ESP-IDF Zigbee preset with `zb_storage` and `zb_fct` partitions.
- Check OTA support and NVS requirements.
- View target chip flashing hints for common ESP32-family chips.
- Open related Maker Tools from the Resources section.

## Quick Workflow

1. Select the correct flash size for your board.
2. Choose a built-in partition preset or add partitions manually.
3. Leave offsets blank when you want the table to auto-align partitions.
4. Use the visualizer and available flash memory indicator to check the layout.
5. Copy or download the generated `partitions.csv`.
6. Use the CSV in your ESP-IDF, Arduino, PlatformIO, or related ESP32 build flow.

## CSV And Custom Partitions

The app supports the ESP-IDF partition CSV format:

```csv
# Name,   Type, SubType, Offset,  Size, Flags
nvs,data,nvs,0x9000,0x5000,
factory,app,factory,0x10000,0x100000,
```

Offsets can be fixed or left blank. Blank offsets are recalculated using the selected partition table offset and ESP-IDF alignment rules.

Custom rows are useful for framework-specific layouts such as Zigbee, Matter, manufacturing data, certificates, or other vendor-defined partitions. Custom rows support editable names, numeric or named types, subtypes, sizes, offsets, and flags such as `encrypted` or `readonly`.

## Zigbee Partitions

Use the `Zigbee ESP-IDF` built-in preset for ESP-IDF Zigbee projects. It includes the required Zigbee storage partitions:

```csv
zb_storage,data,nvs,,16K,
zb_fct,data,fat,,1K,
```

For Arduino or PlatformIO Zigbee projects, confirm the partition requirements for the framework version you are using. Some older Arduino-based examples use `zb_storage` as `fat`, while newer ESP-IDF Zigbee guidance uses `nvs`.

## Flashing

The app creates the CSV partition table. It does not flash the board.

For ESP-IDF projects, configure your project to use the generated custom partition CSV and let the build system generate the binary partition table.

For manual flashing, convert the CSV to a binary partition table first:

```sh
python gen_esp32part.py partitions.csv partition-table.bin
```

The target chip selector shows the expected `esptool` command shape for the selected ESP32-family chip. Make sure the bootloader, partition table, and app image offsets match your project configuration.

## Troubleshooting

> Do not forget to set the flash size correctly in the board options in the Arduino IDE or Arduino Workshop Extension for Visual Studio Code.

> If you use Wi-Fi, BLE, or Preferences API an NVS partition is mandatory.

If the flash size is not available in the board options, you may need to adjust the maximum upload size in your board definition. The IDE has no way to read the custom partition, see this [issue](https://github.com/espressif/arduino-esp32/issues/9831).

By default many custom partitions in board definitions have a 16 MB max upload size. If your board has less than 16 MB flash memory, for example 4 MB, the compiler can report the wrong space occupied by your sketch.

To fix this, edit the Espressif `boards.txt` file, which is normally located in:

```text
[your drive]\[your name]\AppData\Local\Arduino15\packages\esp32\hardware\esp32\[esp32 core version]
```

Search for your specific board and change the line, for example for the ESP32S3 Dev Module:

```text
esp32s3.menu.PartitionScheme.custom.upload.maximum_size=16777216
```

to:

```text
esp32s3.menu.PartitionScheme.custom.upload.maximum_size=4194304
```

for a microcontroller with 4 MB flash memory.

> When boards are updated by the IDE, or you uninstall and reinstall it, you will have to redo your changes.

### Partition Table Offset / Large Bootloaders

Use the `Partition Table Offset` control in the sidebar (0x8000 by default; 0x18000 for larger bootloaders). The app will realign partitions automatically when offsets are blank. Remember to build both bootloader and app with the same `PARTITION_TABLE_OFFSET` in `sdkconfig`, and keep the value a multiple of 0x1000.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, tests, and release notes expectations.

## License

This project is licensed under the terms in [LICENSE](LICENSE).
