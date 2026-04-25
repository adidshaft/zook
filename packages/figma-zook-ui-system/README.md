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

The plugin regenerates:

- `00 — Cover`
- `01 — UI Kit`
- `02 — Mobile / Member`
- `03 — Mobile / Trainer`
- `04 — Mobile / Receptionist`
- `05 — Mobile / Owner`
- `06 — Prototypes`
- `07 — Export Frames`
- `08 — Notes / Handoff`

It also creates the reusable component library, final mobile screens, clean duplicate export frames, color styles, text styles, and effect styles.

## Regenerate the File

Run the development plugin again in the same Figma file. The generator clears and rebuilds its named pages, so the output remains deterministic.

## Export

Every frame named with `AUTO_EXPORT` receives:

- PNG @2x
- JPG @1x

Use Figma's export panel on page `07 — Export Frames` and export to an `/exports` folder. The plugin also exposes an `exportAutoFrames` helper internally; because Figma plugins cannot write arbitrary local files without a UI/download flow, it logs instructions and validates the generated auto-export frame set.

Clean export frame names:

- `AUTO_EXPORT / 01-member-home`
- `AUTO_EXPORT / 02-member-checkin-scanner`
- `AUTO_EXPORT / 03-attendance-approved`
- `AUTO_EXPORT / 04-attendance-pending`
- `AUTO_EXPORT / 05-member-shop`
- `AUTO_EXPORT / 06-member-plan-detail`
- `AUTO_EXPORT / 07-receptionist-payment`
- `AUTO_EXPORT / 08-trainer-client-detail`
- `AUTO_EXPORT / 09-trainer-ai-draft-review`
- `AUTO_EXPORT / 10-owner-command`
