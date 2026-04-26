import { DesignContext, fixedFrame, row, stack, text } from "./components";
import { exportFrameNames } from "./export";
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

function isGeneratedPage(page: PageNode): boolean {
  return (
    page.name === "Zook Generator Staging" ||
    pageNames.includes(page.name as (typeof pageNames)[number]) ||
    page.name.startsWith("Zook UI System v1")
  );
}

async function resetGeneratedPages(): Promise<Record<(typeof pageNames)[number], PageNode>> {
  const pages = {} as Record<(typeof pageNames)[number], PageNode>;
  const generatedPages = figma.root.children.filter(isGeneratedPage);
  let runPage = figma.root.children.find((page) => !generatedPages.includes(page)) ?? generatedPages[0];
  if (!runPage) runPage = figma.createPage();
  await figma.setCurrentPageAsync(runPage);
  for (const page of generatedPages) {
    if (page !== runPage) page.remove();
  }
  runPage.name = "Zook UI System v1 — Current";
  for (const child of [...runPage.children]) child.remove();
  for (const name of pageNames) {
    pages[name] = runPage;
  }
  await figma.setCurrentPageAsync(runPage);
  return pages;
}

function nextRunY(page: PageNode): number {
  if (page.children.length === 0) return 0;
  return page.children.reduce((max, child) => Math.max(max, child.y + child.height), 0) + 280;
}

function sectionMarker(ctx: DesignContext, page: PageNode, label: string, x: number, y: number): void {
  const marker = row(`Section / ${label}`, 8);
  marker.resize(420, 52);
  marker.primaryAxisSizingMode = "FIXED";
  marker.counterAxisSizingMode = "FIXED";
  marker.paddingLeft = 16;
  marker.paddingRight = 16;
  marker.cornerRadius = 20;
  marker.fills = [solid(TOKENS.color.accent, 0.1)];
  marker.strokes = [solid(TOKENS.color.accent, 0.32)];
  marker.strokeWeight = 1;
  marker.appendChild(createIcon("shield", 16, TOKENS.color.accent));
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

function afterFrameGrid(startY: number, count: number, columns = 5, bottomGap = 180): number {
  const rows = Math.max(1, Math.ceil(count / columns));
  return startY + rows * TOKENS.frame.mobile.height + (rows - 1) * 96 + bottomGap;
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
  const board = stack("UI Kit / Zook Product UI System", "VERTICAL", 22);
  board.resize(1180, 760);
  board.primaryAxisSizingMode = "FIXED";
  board.counterAxisSizingMode = "FIXED";
  board.paddingTop = 28;
  board.paddingBottom = 28;
  board.paddingLeft = 28;
  board.paddingRight = 28;
  board.cornerRadius = 28;
  board.fills = [solid(TOKENS.color.surface, 0.98)];
  board.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  board.strokeWeight = 1;
  board.x = 80;
  board.y = yOffset + 84;
  board.appendChild(text("Zook UI Kit", ctx.styles.text.h1, TOKENS.color.primaryText));

  const colors = stack("Colors", "VERTICAL", 12);
  colors.appendChild(text("Colors", ctx.styles.text.h2));
  const colorGrid = stack("Color swatches", "HORIZONTAL", 8);
  for (const [name, hex] of Object.entries(TOKENS.color).slice(0, 12)) {
    const swatch = stack(`Swatch / ${name}`, "VERTICAL", 8);
    const block = fixedFrame(name, 76, 48);
    block.cornerRadius = 12;
    block.fills = [solid(hex as `#${string}`)];
    block.strokes = [glassStroke()];
    block.strokeWeight = 1;
    swatch.appendChild(block);
    swatch.appendChild(text(name, ctx.styles.text.caption, TOKENS.color.mutedText));
    swatch.appendChild(text(hex, ctx.styles.text.caption, TOKENS.color.subtleText));
    colorGrid.appendChild(swatch);
  }
  colors.appendChild(colorGrid);
  board.appendChild(colors);

  const type = stack("Typography", "VERTICAL", 12);
  type.appendChild(text("Typography", ctx.styles.text.h2));
  type.appendChild(text("Display / Inter Bold", ctx.styles.text.display));
  type.appendChild(text("H1 / Command-level page title", ctx.styles.text.h1));
  type.appendChild(text("Body / Operational details with no filler copy", ctx.styles.text.body, TOKENS.color.mutedText));
  board.appendChild(type);

  const effects = stack("Effects", "VERTICAL", 10);
  effects.resize(520, 92);
  effects.primaryAxisSizingMode = "FIXED";
  effects.counterAxisSizingMode = "FIXED";
  effects.paddingTop = 14;
  effects.paddingBottom = 14;
  effects.paddingLeft = 14;
  effects.paddingRight = 14;
  effects.cornerRadius = 20;
  effects.fills = [glassFill(TOKENS.opacity.glassLow)];
  effects.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  effects.strokeWeight = 1;
  effects.appendChild(text("Effects", ctx.styles.text.h2));
  effects.appendChild(text("Glass fills, soft shadows, background blur, and subtle lime glow.", ctx.styles.text.body, TOKENS.color.mutedText));
  board.appendChild(effects);

  const sections = ["Buttons", "Chips", "Cards", "Forms", "Navigation", "Icons", "Screen Templates", "Status Components"];
  const sectionGrid = stack("UI Kit section index", "HORIZONTAL", 8);
  sections.forEach((section) => {
    const label = stack(`UI Kit Section / ${section}`, "VERTICAL", 4);
    label.resize(132, 46);
    label.primaryAxisSizingMode = "FIXED";
    label.counterAxisSizingMode = "FIXED";
    label.paddingTop = 10;
    label.paddingBottom = 10;
    label.paddingLeft = 12;
    label.paddingRight = 12;
    label.cornerRadius = 18;
    label.fills = [glassFill(TOKENS.opacity.glassLow)];
    label.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
    label.strokeWeight = 1;
    label.appendChild(text(section, ctx.styles.text.caption, TOKENS.color.primaryText));
    sectionGrid.appendChild(label);
  });
  board.appendChild(sectionGrid);

  const componentNames = [
    "AppShell / Mobile · Card / Glass · Header / Mobile",
    "Button / Primary Lime · Button / Secondary Glass · Button / Danger Swipe",
    "Chip / Status · Chip / Role · KPI Card · List Row",
    "Text Field · Search Bar · Product Card · Exercise Row",
    "Bottom Nav / Member · Trainer · Owner · Receptionist",
    "Safety Panel · Status Bar"
  ];
  const componentList = stack("Component master index", "VERTICAL", 8);
  for (const component of componentNames) {
    const item = row(`Component Masters / ${component}`, 8);
    item.resize(880, 34);
    item.primaryAxisSizingMode = "FIXED";
    item.counterAxisSizingMode = "FIXED";
    item.paddingLeft = 12;
    item.paddingRight = 12;
    item.cornerRadius = 16;
    item.fills = [glassFill(TOKENS.opacity.glassLow)];
    item.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
    item.strokeWeight = 1;
    item.appendChild(createIcon("shield", 14, TOKENS.color.accent));
    item.appendChild(text(component, ctx.styles.text.caption, TOKENS.color.primaryText, "Name"));
    componentList.appendChild(item);
  }
  board.appendChild(componentList);

  const iconShelf = row("Icons", 12);
  const icons: IconName[] = ["home", "qr", "clipboard", "bag", "user", "back", "bell", "dumbbell", "shield", "rupee", "clock", "warning", "edit", "trash", "plus", "chevron"];
  for (const icon of icons) {
    const slot = fixedFrame(`Icon slot / ${icon}`, 36, 36);
    slot.cornerRadius = 12;
    slot.fills = [glassFill(TOKENS.opacity.glassLow)];
    const glyph = createIcon(icon, 18, TOKENS.color.accent);
    slot.appendChild(glyph);
    glyph.x = 9;
    glyph.y = 9;
    iconShelf.appendChild(slot);
  }
  board.appendChild(iconShelf);
  page.appendChild(board);
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
    const step = stack(`Flow node / ${screen.name}`, "VERTICAL", 8);
    step.resize(180, 80);
    step.primaryAxisSizingMode = "FIXED";
    step.counterAxisSizingMode = "FIXED";
    step.paddingTop = 12;
    step.paddingBottom = 12;
    step.paddingLeft = 12;
    step.paddingRight = 12;
    step.cornerRadius = 20;
    step.fills = [glassFill(TOKENS.opacity.glassLow)];
    step.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
    step.strokeWeight = 1;
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
    "AUTO_EXPORT frames are named for export; use exportAutoFrames or Figma's export panel for PNG @2x and JPG @1x.",
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
    void label;
    void index;
    screens.push(createScreen(ctx));
  }
  return screens;
}

async function main(): Promise<void> {
  figma.notify("Zook generator starting…");
  await loadTokenFonts();
  const pages = await resetGeneratedPages();
  const styles = await createTokenStyles();
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

  const memberMarkerY = runY + 2280;
  const memberFramesY = memberMarkerY + 80;
  sectionMarker(ctx, pages["02 — Mobile / Member"], "02 — Mobile / Member", 80, memberMarkerY);
  placeFrames(pages["02 — Mobile / Member"], member, 80, memberFramesY);

  const trainerMarkerY = afterFrameGrid(memberFramesY, member.length);
  const trainerFramesY = trainerMarkerY + 80;
  sectionMarker(ctx, pages["03 — Mobile / Trainer"], "03 — Mobile / Trainer", 80, trainerMarkerY);
  placeFrames(pages["03 — Mobile / Trainer"], trainer, 80, trainerFramesY);

  const receptionistMarkerY = afterFrameGrid(trainerFramesY, trainer.length);
  const receptionistFramesY = receptionistMarkerY + 80;
  sectionMarker(ctx, pages["04 — Mobile / Receptionist"], "04 — Mobile / Receptionist", 80, receptionistMarkerY);
  placeFrames(pages["04 — Mobile / Receptionist"], receptionist, 80, receptionistFramesY);

  const ownerMarkerY = afterFrameGrid(receptionistFramesY, receptionist.length);
  const ownerFramesY = ownerMarkerY + 80;
  sectionMarker(ctx, pages["05 — Mobile / Owner"], "05 — Mobile / Owner", 80, ownerMarkerY);
  placeFrames(pages["05 — Mobile / Owner"], owner, 80, ownerFramesY);
  figma.notify("Mobile frames ready. Finalizing handoff…", { timeout: 1000 });

  const prototypeMarkerY = afterFrameGrid(ownerFramesY, owner.length);
  const prototypeY = prototypeMarkerY + 80;
  sectionMarker(ctx, pages["06 — Prototypes"], "06 — Prototypes", 80, prototypeMarkerY);
  createPrototypePage(ctx, pages["06 — Prototypes"], member, prototypeY);

  const exportMarkerY = prototypeY + 380;
  const exportFramesY = exportMarkerY + 80;
  sectionMarker(ctx, pages["07 — Export Frames"], "07 — Export Frames", 80, exportMarkerY);
  duplicateExportFrames(pages["07 — Export Frames"], allScreens, exportFramesY);

  const notesMarkerY = afterFrameGrid(exportFramesY, allScreens.length, 5, 220);
  sectionMarker(ctx, pages["08 — Notes / Handoff"], "08 — Notes / Handoff", 80, notesMarkerY);
  createNotes(ctx, pages["08 — Notes / Handoff"], notesMarkerY + 80);

  figma.notify("Zook Product UI System v1 generated with AUTO_EXPORT frames.");
  figma.closePlugin("Zook Product UI System v1 generated.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  figma.notify(`Zook generator failed: ${message}`, { error: true, timeout: 8000 });
  figma.closePlugin(`Zook generator failed: ${message}`);
});
