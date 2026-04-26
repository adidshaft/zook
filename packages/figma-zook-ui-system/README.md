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

The plugin regenerates one Figma page named `Zook UI System v1 — Current`, with clearly labeled sections for:

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

Run the development plugin in a fresh Figma file whenever possible. The generator removes earlier Zook-generated pages, clears the active generated page, then rebuilds the full system as sectioned content on `Zook UI System v1 — Current`. This avoids Figma Free page-limit issues and prevents regenerated frames from stacking on top of older output.

If Figma appears stuck while importing a development manifest, quit Figma Desktop, reopen a blank design file, rebuild with `pnpm --filter @zook/figma-ui-system build`, then import `manifest.json` again. The development manifest intentionally omits a fixed plugin `id`; Figma assigns one locally.

For import debugging, build and import the smoke-test plugin:

```bash
pnpm --filter @zook/figma-ui-system build:smoke
```

Then import `packages/figma-zook-ui-system/manifest.smoke.json`. If the smoke manifest also hangs, the issue is Figma Desktop/local development plugin loading rather than the Zook generator code.

## Export

Every frame named with `AUTO_EXPORT` is prepared for:

- PNG @2x
- JPG @1x

Use Figma's export panel on the `07 — Export Frames` section and export to an `/exports` folder. The plugin also exposes an `exportAutoFrames` helper internally; because Figma plugins cannot write arbitrary local files without a UI/download flow, it logs instructions and validates the generated auto-export frame set. The main generator does not attach live export settings during generation because that pass can make Figma Desktop appear stuck in development mode on large files.

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
