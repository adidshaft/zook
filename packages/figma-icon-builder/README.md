# Zook Icon Builder

Figma plugin for generating the Zook app icon system: cover page, master icon, iOS PNG export frames, Android adaptive icon layers, safe-area guides, and export naming.

## Install

```sh
pnpm install
```

## Build

```sh
pnpm --filter @zook/figma-icon-builder build
```

The compiled plugin entrypoint is written to `dist/code.js`.

## Load In Figma

1. Open Figma.
2. Go to **Plugins > Development > Import plugin from manifest...**.
3. Select `packages/figma-icon-builder/manifest.json`.
4. Run **Zook Icon Builder** from **Plugins > Development**.

The plugin creates these pages when page creation is available:

- `00_Cover`
- `01_Icon Master`
- `02_iOS Exports`
- `03_Android Adaptive`

If the file is on a Figma Starter plan and the page limit is reached, the plugin creates all frames on the current page in labeled sections instead.

## iOS Exports

Export every frame on `02_iOS Exports` as PNG at 1x:

- `AppIcon-1024.png`
- `AppIcon-180.png`
- `AppIcon-167.png`
- `AppIcon-152.png`
- `AppIcon-120.png`
- `AppIcon-87.png`
- `AppIcon-80.png`
- `AppIcon-60.png`
- `AppIcon-58.png`
- `AppIcon-40.png`
- `AppIcon-29.png`

## Android Exports

Export these frames on `03_Android Adaptive` as PNG at 1x:

- `Android / BG / 432` -> `ic_launcher_background.png`
- `Android / FG / 432` -> `ic_launcher_foreground.png`
- `Android / Mono / 432` -> `ic_launcher_monochrome.png`

Use `Android / Preview / 432` only for visual QA.

## Folder Naming

```text
/zook-icons
  /ios
    AppIcon-1024.png
    AppIcon-180.png
    AppIcon-167.png
    AppIcon-152.png
    AppIcon-120.png
    AppIcon-87.png
    AppIcon-80.png
    AppIcon-60.png
    AppIcon-58.png
    AppIcon-40.png
    AppIcon-29.png
  /android
    ic_launcher_background.png
    ic_launcher_foreground.png
    ic_launcher_monochrome.png
```
