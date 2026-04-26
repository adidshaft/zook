import { createComponentLibrary, DesignContext, fixedFrame, glassCard, row, stack, text } from "./components";
import { applyAutoExportSettings, exportAutoFrames, exportFrameNames } from "./export";
import { createIcon, IconName } from "./icons";
import { ownerScreens } from "./screens/owner";
import { memberScreens } from "./screens/member";
import { receptionistScreens } from "./screens/receptionist";
import { trainerScreens } from "./screens/trainer";
import { createStyles } from "./styles";
import { TOKENS, glassFill, glassStroke, solid } from "./tokens";

const pageNames = [
  "00 — Cover",
  "01 — UI Kit",
  "02 — Mobile / Member",
  "03 — Mobile / Trainer",
  "04 — Mobile / Receptionist",
  "05 — Mobile / Owner",
  "06 — Prototypes",
  "07 — Export Frames",
  "08 — Notes / Handoff"
] as const;

function resetGeneratedPages(): Record<(typeof pageNames)[number], PageNode> {
  const pages = {} as Record<(typeof pageNames)[number], PageNode>;
  figma.currentPage.name = "Zook UI System v1 — Starter Compatible";
  for (const child of [...figma.currentPage.children]) {
    child.remove();
  }
  for (const name of pageNames) {
    pages[name] = figma.currentPage;
  }
  return pages;
}

function sectionMarker(ctx: DesignContext, page: PageNode, label: string, x: number, y: number): void {
  const marker = glassCard(`Section / ${label}`, 420, 14, 20);
  marker.appendChild(text(label, ctx.styles.text.h2, TOKENS.color.accent));
  page.appendChild(marker);
  marker.x = x;
  marker.y = y;
}

function placeFrames(page: PageNode, frames: FrameNode[], startX = 80, startY = 120, gap = 48): void {
  const usedBottom = page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0);
  const baseY = Math.max(startY, usedBottom + 120);
  frames.forEach((frame, index) => {
    page.appendChild(frame);
    frame.x = startX + (index % 5) * (TOKENS.frame.mobile.width + gap);
    frame.y = baseY + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 96);
  });
}

function createCover(ctx: DesignContext, page: PageNode, thumbnails: FrameNode[]): void {
  const cover = stack("Cover / Zook Product UI System", "HORIZONTAL", 72);
  cover.resize(TOKENS.frame.cover.width, TOKENS.frame.cover.height);
  cover.paddingTop = 92;
  cover.paddingBottom = 72;
  cover.paddingLeft = 88;
  cover.paddingRight = 88;
  cover.fills = [solid(TOKENS.color.background)];
  cover.counterAxisAlignItems = "CENTER";
  page.appendChild(cover);
  cover.x = 0;
  cover.y = 0;

  const copy = stack("Cover copy", "VERTICAL", 24);
  copy.resize(520, 520);
  copy.appendChild(text("Zook Product UI System", ctx.styles.text.display, TOKENS.color.primaryText));
  copy.appendChild(text("India-first operating system for gyms", ctx.styles.text.h2, TOKENS.color.mutedText));
  copy.appendChild(text("Premium dark glass mobile UI kit, reusable components, and export-ready operational screens.", ctx.styles.text.body, TOKENS.color.subtleText));
  const badge = row("Version badge", 8);
  badge.paddingTop = 10;
  badge.paddingBottom = 10;
  badge.paddingLeft = 14;
  badge.paddingRight = 14;
  badge.cornerRadius = TOKENS.radius.round;
  badge.fills = [solid(TOKENS.color.accent, 0.14)];
  badge.strokes = [solid(TOKENS.color.accent, 0.34)];
  badge.strokeWeight = 1;
  badge.appendChild(createIcon("shield", 16, TOKENS.color.accent));
  badge.appendChild(text("Product UI System v1", ctx.styles.text.bodyStrong, TOKENS.color.accent));
  copy.appendChild(badge);
  cover.appendChild(copy);

  const thumbGrid = stack("Mini screen thumbnails", "HORIZONTAL", 20);
  for (const screen of thumbnails.slice(0, 3)) {
    const clone = screen.clone();
    clone.name = `Thumbnail / ${screen.name.replace("AUTO_EXPORT / ", "")}`;
    clone.rescale(0.38);
    thumbGrid.appendChild(clone);
  }
  cover.appendChild(thumbGrid);
}

function createUiKit(ctx: DesignContext, page: PageNode): void {
  const yOffset = page.children.length > 0 ? 1160 : 0;
  sectionMarker(ctx, page, "01 — UI Kit", 80, yOffset);
  const title = text("Zook UI Kit", ctx.styles.text.h1, TOKENS.color.primaryText);
  title.x = 80;
  title.y = yOffset + 84;
  page.appendChild(title);

  const colors = stack("Colors", "VERTICAL", 16);
  colors.x = 80;
  colors.y = yOffset + 152;
  colors.appendChild(text("Colors", ctx.styles.text.h2));
  const colorGrid = stack("Color swatches", "HORIZONTAL", 12);
  for (const [name, hex] of Object.entries(TOKENS.color)) {
    const swatch = stack(`Swatch / ${name}`, "VERTICAL", 8);
    const block = fixedFrame(name, 96, 72);
    block.cornerRadius = 16;
    block.fills = [solid(hex as `#${string}`)];
    block.strokes = [glassStroke()];
    block.strokeWeight = 1;
    swatch.appendChild(block);
    swatch.appendChild(text(name, ctx.styles.text.caption, TOKENS.color.mutedText));
    swatch.appendChild(text(hex, ctx.styles.text.caption, TOKENS.color.subtleText));
    colorGrid.appendChild(swatch);
  }
  colors.appendChild(colorGrid);
  page.appendChild(colors);

  const type = stack("Typography", "VERTICAL", 12);
  type.x = 80;
  type.y = yOffset + 372;
  type.appendChild(text("Typography", ctx.styles.text.h2));
  type.appendChild(text("Display / Inter Bold", ctx.styles.text.display));
  type.appendChild(text("H1 / Command-level page title", ctx.styles.text.h1));
  type.appendChild(text("Body / Operational details with no filler copy", ctx.styles.text.body, TOKENS.color.mutedText));
  page.appendChild(type);

  const effects = glassCard("Effects", 360);
  effects.x = 80;
  effects.y = yOffset + 622;
  effects.appendChild(text("Effects", ctx.styles.text.h2));
  effects.appendChild(text("Glass fills, soft shadows, background blur, and subtle lime glow.", ctx.styles.text.body, TOKENS.color.mutedText));
  page.appendChild(effects);

  for (const section of ["Buttons", "Chips", "Cards", "Forms", "Navigation", "Icons", "Screen Templates", "Status Components"]) {
    const label = text(section, ctx.styles.text.h2, TOKENS.color.primaryText);
    label.x = 520;
    label.y = yOffset + 84 + ["Buttons", "Chips", "Cards", "Forms", "Navigation", "Icons", "Screen Templates", "Status Components"].indexOf(section) * 56;
    page.appendChild(label);
  }
  const iconShelf = row("Icons", 12);
  iconShelf.x = 900;
  iconShelf.y = yOffset + 512;
  const icons: IconName[] = ["home", "qr", "clipboard", "bag", "user", "back", "bell", "dumbbell", "shield", "rupee", "clock", "warning", "edit", "trash", "plus", "chevron"];
  for (const icon of icons) iconShelf.appendChild(createIcon(icon, 24, TOKENS.color.accent));
  page.appendChild(iconShelf);
  createComponentLibrary(ctx, page, 520, yOffset + 132);
}

function createPrototypePage(ctx: DesignContext, page: PageNode, screens: FrameNode[]): void {
  const usedBottom = page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0);
  const heading = text("Prototype Map", ctx.styles.text.h1);
  heading.x = 80;
  heading.y = page.children.length > 0 ? usedBottom + 120 : 72;
  page.appendChild(heading);
  const flow = row("Member operational flow", 32);
  flow.x = 80;
  flow.y = heading.y + 80;
  for (const screen of screens.slice(0, 6)) {
    const step = glassCard(`Flow node / ${screen.name}`, 180, 12, 20);
    step.appendChild(text(screen.name.replace("AUTO_EXPORT / Member / ", ""), ctx.styles.text.small));
    step.appendChild(createIcon("chevron", 16, TOKENS.color.accent));
    flow.appendChild(step);
  }
  page.appendChild(flow);
}

function createNotes(ctx: DesignContext, page: PageNode): void {
  const usedBottom = page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0);
  const notes = stack("Notes / Handoff", "VERTICAL", 18);
  notes.x = 80;
  notes.y = page.children.length > 0 ? usedBottom + 120 : 80;
  notes.resize(780, 640);
  notes.appendChild(text("Notes / Handoff", ctx.styles.text.h1));
  for (const line of [
    "All final mobile frames are 390×844 and named with AUTO_EXPORT prefixes.",
    "Page 07 contains clean duplicates for export and handoff.",
    "Export settings are attached to every AUTO_EXPORT frame: PNG @2x and JPG @1x.",
    "Typography uses Inter as the plugin-safe fallback for Satoshi/SF Pro.",
    "The visual system stays premium, operational, glassy, and India-first without sci-fi or mascot elements.",
    "Run exportAutoFrames from plugin dev code to validate/export bytes; use Figma export panel for filesystem output."
  ]) {
    notes.appendChild(text(line, ctx.styles.text.body, TOKENS.color.mutedText));
  }
  page.appendChild(notes);
}

function duplicateExportFrames(page: PageNode, screens: FrameNode[]): void {
  const usedBottom = page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0);
  const baseY = usedBottom + 120;
  screens.forEach((screen, index) => {
    const clone = screen.clone();
    clone.name = exportFrameNames[index] ?? `AUTO_EXPORT / ${index + 1}`;
    page.appendChild(clone);
    clone.x = 80 + (index % 5) * (TOKENS.frame.mobile.width + 40);
    clone.y = baseY + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 96);
  });
}

async function main(): Promise<void> {
  figma.notify("Zook generator starting…");
  figma.notify("Building file with SVG text fallback…");
  const pages = resetGeneratedPages();
  figma.notify("Pages ready. Creating styles…");
  const styles = createStyles();
  figma.notify("Styles ready. Creating screens…");
  const ctx: DesignContext = { styles };

  const member = memberScreens.map((createScreen) => createScreen(ctx));
  const trainer = trainerScreens.map((createScreen) => createScreen(ctx));
  const receptionist = receptionistScreens.map((createScreen) => createScreen(ctx));
  const owner = ownerScreens.map((createScreen) => createScreen(ctx));
  const allScreens = [...member, ...receptionist, ...trainer, ...owner];

  createCover(ctx, pages["00 — Cover"], member);
  createUiKit(ctx, pages["01 — UI Kit"]);
  placeFrames(pages["02 — Mobile / Member"], member);
  placeFrames(pages["03 — Mobile / Trainer"], trainer);
  placeFrames(pages["04 — Mobile / Receptionist"], receptionist);
  placeFrames(pages["05 — Mobile / Owner"], owner);
  createPrototypePage(ctx, pages["06 — Prototypes"], member);
  duplicateExportFrames(pages["07 — Export Frames"], allScreens);
  createNotes(ctx, pages["08 — Notes / Handoff"]);
  applyAutoExportSettings();

  figma.currentPage = pages["00 — Cover"];
  const coverNode = pages["00 — Cover"].children[0];
  if (coverNode) {
    figma.viewport.scrollAndZoomIntoView([coverNode]);
  }
  figma.notify("Zook Product UI System v1 generated with AUTO_EXPORT frames.");
  void exportAutoFrames;
  figma.closePlugin("Zook Product UI System v1 generated.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  figma.notify(`Zook generator failed: ${message}`, { error: true, timeout: 8000 });
  figma.closePlugin(`Zook generator failed: ${message}`);
});
