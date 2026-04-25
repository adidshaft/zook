# Zook — Product UI System v1

Figma plugin generator for the Zook premium dark glassmorphism mobile UI system.

## Setup

```bash
pnpm install
pnpm --filter @zook/figma-ui-system typecheck
pnpm --filter @zook/figma-ui-system build
```

## Run in Figma

1. Open Figma Desktop.
2. Go to `Plugins > Development > Import plugin from manifest...`.
3. Select `packages/figma-zook-ui-system/manifest.json`.
4. Run `Zook — Product UI System v1`.

The plugin regenerates the file pages, reusable component kit, final mobile frames, clean export frames, and notes.

## Export

Every frame named with `AUTO_EXPORT` receives:

- PNG @2x
- JPG @1x

Use Figma's export panel on page `07 — Export Frames`. The plugin also exposes an `exportAutoFrames` helper internally; because Figma plugins cannot write arbitrary files without a UI/download flow, it logs export instructions and validates the auto-export frame set.
