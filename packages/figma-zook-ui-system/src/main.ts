import { createComponentLibrary, DesignContext, fixedFrame, glassCard, row, stack, text } from "./components";
import { applyAutoExportSettings, exportAutoFrames, exportFrameNames } from "./export";
import { createIcon, IconName } from "./icons";
import { ownerScreens } from "./screens/owner";
import { memberScreens } from "./screens/member";
import { receptionistScreens } from "./screens/receptionist";
import { trainerScreens } from "./screens/trainer";
import { createTokenStyles, loadTokenFonts } from "./styles";
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
  const runPage = figma.createPage();
  runPage.name = `Zook UI System v1 — Current ${new Date().toLocaleTimeString()}`;
  figma.currentPage = runPage;
  for (const name of pageNames) {
    pages[name] = runPage;
  }
  return pages;
}

function nextRunY(page: PageNode): number {
  if (page.children.length === 0) return 0;
  return page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0) + 280;
}

function sectionMarker(ctx: DesignContext, page: PageNode, label: string, x: number, y: number): void {
  const marker = glassCard(`Section / ${label}`, 420, 14, 20);
  marker.appendChild(text(label, ctx.styles.text.h2, TOKENS.color.accent));
  page.appendChild(marker);
  marker.x = x;
  marker.y = y;
}

function placeFrames(page: PageNode, frames: FrameNode[], startX = 80, startY = 120, gap = 48): void {
  frames.forEach((frame, index) => {
    page.appendChild(frame);
    frame.x = startX + (index % 5) * (TOKENS.frame.mobile.width + gap);
    frame.y = startY + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 96);
  });
}

function createCover(ctx: DesignContext, page: PageNode, thumbnails: FrameNode[], yOffset = 0): void {
  const cover = stack("Cover / Zook Product UI System", "HORIZONTAL", 72);
  cover.resize(TOKENS.frame.cover.width, TOKENS.frame.cover.height);
  cover.primaryAxisSizingMode = "FIXED";
  cover.counterAxisSizingMode = "FIXED";
  cover.paddingTop = 92;
  cover.paddingBottom = 72;
  cover.paddingLeft = 88;
  cover.paddingRight = 88;
  cover.fills = [solid(TOKENS.color.background)];
  cover.counterAxisAlignItems = "CENTER";
  page.appendChild(cover);
  cover.x = 0;
  cover.y = yOffset;

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

function createUiKit(ctx: DesignContext, page: PageNode, yOffset = 0): void {
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

function createPrototypePage(ctx: DesignContext, page: PageNode, screens: FrameNode[], yOffset = 0): void {
  const heading = text("Prototype Map", ctx.styles.text.h1);
  heading.x = 80;
  heading.y = yOffset;
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

function createNotes(ctx: DesignContext, page: PageNode, yOffset = 0): void {
  const notes = stack("Notes / Handoff", "VERTICAL", 18);
  notes.x = 80;
  notes.y = yOffset;
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

function duplicateExportFrames(page: PageNode, screens: FrameNode[], startY: number): void {
  screens.forEach((screen, index) => {
    const clone = screen.clone();
    clone.name = exportFrameNames[index] ?? `AUTO_EXPORT / ${index + 1}`;
    page.appendChild(clone);
    clone.x = 80 + (index % 5) * (TOKENS.frame.mobile.width + 40);
    clone.y = startY + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 96);
  });
}

function buildScreens(label: string, creators: Array<(ctx: DesignContext) => FrameNode>, ctx: DesignContext): FrameNode[] {
  const screens: FrameNode[] = [];
  for (const [index, createScreen] of creators.entries()) {
    figma.notify(`Creating ${label} screen ${index + 1}/${creators.length}…`, { timeout: 2500 });
    screens.push(createScreen(ctx));
  }
  return screens;
}

async function main(): Promise<void> {
  figma.notify("Zook generator starting…");
  figma.notify("Loading Inter fonts…");
  await loadTokenFonts();
  figma.notify("Building file with native text…");
  const pages = resetGeneratedPages();
  figma.notify("Pages ready. Preparing tokens…");
  const styles = createTokenStyles();
  figma.notify("Tokens ready. Creating screens…");
  const ctx: DesignContext = { styles };

  const member = buildScreens("Member", memberScreens, ctx);
  const trainer = buildScreens("Trainer", trainerScreens, ctx);
  const receptionist = buildScreens("Receptionist", receptionistScreens, ctx);
  const owner = buildScreens("Owner", ownerScreens, ctx);
  const allScreens = [...member, ...receptionist, ...trainer, ...owner];

  figma.notify("Screens ready. Creating cover and UI kit…");
  const runY = nextRunY(pages["00 — Cover"]);
  createCover(ctx, pages["00 — Cover"], member, runY);
  figma.notify("Cover ready. Creating UI kit…");
  createUiKit(ctx, pages["01 — UI Kit"], runY + 1160);
  figma.notify("UI kit ready. Placing mobile frames…");
  sectionMarker(ctx, pages["02 — Mobile / Member"], "02 — Mobile / Member", 80, runY + 2280);
  placeFrames(pages["02 — Mobile / Member"], member, 80, runY + 2360);
  sectionMarker(ctx, pages["03 — Mobile / Trainer"], "03 — Mobile / Trainer", 80, runY + 3300);
  placeFrames(pages["03 — Mobile / Trainer"], trainer, 80, runY + 3380);
  sectionMarker(ctx, pages["04 — Mobile / Receptionist"], "04 — Mobile / Receptionist", 80, runY + 4320);
  placeFrames(pages["04 — Mobile / Receptionist"], receptionist, 80, runY + 4400);
  sectionMarker(ctx, pages["05 — Mobile / Owner"], "05 — Mobile / Owner", 80, runY + 5340);
  placeFrames(pages["05 — Mobile / Owner"], owner, 80, runY + 5420);
  figma.notify("Mobile frames ready. Creating exports…");
  sectionMarker(ctx, pages["06 — Prototypes"], "06 — Prototypes", 80, runY + 6360);
  createPrototypePage(ctx, pages["06 — Prototypes"], member, runY + 6440);
  sectionMarker(ctx, pages["07 — Export Frames"], "07 — Export Frames", 80, runY + 6740);
  duplicateExportFrames(pages["07 — Export Frames"], allScreens, runY + 6820);
  sectionMarker(ctx, pages["08 — Notes / Handoff"], "08 — Notes / Handoff", 80, runY + 8840);
  createNotes(ctx, pages["08 — Notes / Handoff"], runY + 8920);
  figma.notify("Applying export settings…");
  applyAutoExportSettings();

  figma.currentPage = pages["00 — Cover"];
  const coverNode = pages["00 — Cover"].children
    .slice()
    .reverse()
    .find((node) => node.name === "Cover / Zook Product UI System");
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
