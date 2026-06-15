import {
  DesignContext,
  bottomNav,
  button,
  chip,
  exerciseRow,
  fixedFrame,
  header,
  kpiCard,
  memberNavItems,
  productCard,
  row,
  searchBar,
  stack,
  text,
  textField
} from "./components";
import { runCorrectedMvpPass } from "./corrected";
import { applyAutoExportSettings, exportFrameNames } from "./export";
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
  "08 — Notes / Export"
] as const;

const SINGLE_PAGE_BOARD_NAME = "Zook UI System v1 — Native Editable";

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
  let runPage = generatedPages[0] ?? figma.root.children[0];
  if (!runPage) {
    runPage = figma.createPage();
  }
  await figma.setCurrentPageAsync(runPage);
  for (const page of generatedPages) {
    if (page !== runPage) page.remove();
  }
  runPage.name = pageNames[0];
  for (const child of [...runPage.children]) child.remove();
  pages[pageNames[0]] = runPage;

  for (const name of pageNames.slice(1)) {
    const page = figma.createPage();
    page.name = name;
    pages[name] = page;
  }

  await figma.setCurrentPageAsync(runPage);
  return pages;
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

function buildUiKitBoard(ctx: DesignContext): FrameNode {
  const board = stack("UI Kit / Zook Product UI System", "VERTICAL", 22);
  board.resize(1500, 1760);
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

  const specimenTitle = text("Editable Component Specimens", ctx.styles.text.h2, TOKENS.color.primaryText);
  board.appendChild(specimenTitle);

  const specimenGrid = row("Component specimen grid", 18);
  specimenGrid.counterAxisAlignItems = "MIN";

  const leftCol = stack("Specimen left column", "VERTICAL", 16);
  leftCol.resize(700, 760);
  leftCol.primaryAxisSizingMode = "FIXED";
  leftCol.counterAxisSizingMode = "AUTO";

  const buttonShelf = stack("Button specimen shelf", "VERTICAL", 10);
  buttonShelf.appendChild(text("Buttons", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  const buttonRow = row("Buttons row", 10);
  buttonRow.appendChild(button(ctx, "Primary action", "primary", "plus", 180));
  buttonRow.appendChild(button(ctx, "Secondary action", "secondary", "chevron", 190));
  buttonRow.appendChild(button(ctx, "Danger action", "danger", "trash", 170));
  buttonShelf.appendChild(buttonRow);
  leftCol.appendChild(buttonShelf);

  const chipShelf = stack("Chip specimen shelf", "VERTICAL", 10);
  chipShelf.appendChild(text("Chips", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  const chipRow = row("Chips row", 8);
  chipRow.appendChild(chip(ctx, "Active", "lime", "check"));
  chipRow.appendChild(chip(ctx, "Needs review", "warning", "warning"));
  chipRow.appendChild(chip(ctx, "Offline", "danger", "shield"));
  chipRow.appendChild(chip(ctx, "Neutral tag", "glass"));
  chipShelf.appendChild(chipRow);
  leftCol.appendChild(chipShelf);

  const formShelf = stack("Form specimen shelf", "VERTICAL", 10);
  formShelf.appendChild(text("Inputs", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  formShelf.appendChild(searchBar(ctx, "Search members, invoices, products"));
  formShelf.appendChild(textField(ctx, "Phone number", "+91 90000 12345"));
  formShelf.appendChild(textField(ctx, "Reference ID", "UPI-2026-06-15-4481"));
  leftCol.appendChild(formShelf);

  const navShelf = stack("Nav specimen shelf", "VERTICAL", 10);
  navShelf.appendChild(text("Header + Navigation", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  navShelf.appendChild(header(ctx, "Client Detail", "Assigned client", "back", "bell", "Trainer"));
  navShelf.appendChild(bottomNav(ctx, "Member", memberNavItems, "Check-in"));
  leftCol.appendChild(navShelf);

  const rightCol = stack("Specimen right column", "VERTICAL", 16);
  rightCol.resize(700, 760);
  rightCol.primaryAxisSizingMode = "FIXED";
  rightCol.counterAxisSizingMode = "AUTO";

  const metricShelf = stack("Metric specimen shelf", "VERTICAL", 10);
  metricShelf.appendChild(text("KPI + Product Cards", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  const metricRow = row("KPI row", 10);
  metricRow.appendChild(kpiCard(ctx, "Active members", "412"));
  metricRow.appendChild(kpiCard(ctx, "Pending approvals", "7", "warning"));
  metricRow.appendChild(productCard(ctx, "Whey Shake", "₹249", "In stock", "lime"));
  metricShelf.appendChild(metricRow);
  rightCol.appendChild(metricShelf);

  const exerciseShelf = stack("Exercise specimen shelf", "VERTICAL", 10);
  exerciseShelf.appendChild(text("Rows / Workout Patterns", ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
  exerciseShelf.appendChild(exerciseRow(ctx, "Incline press", "4×8", "Controlled tempo · 24kg", false, false));
  exerciseShelf.appendChild(exerciseRow(ctx, "Cable fly", "3×12", "Pause on contraction", true, false));
  exerciseShelf.appendChild(exerciseRow(ctx, "Tricep pushdown", "3×15", "Swipe-to-delete specimen", false, true));
  rightCol.appendChild(exerciseShelf);

  specimenGrid.appendChild(leftCol);
  specimenGrid.appendChild(rightCol);
  board.appendChild(specimenGrid);
  return board;
}

function createUiKit(ctx: DesignContext, page: PageNode, yOffset = 0): void {
  sectionMarker(ctx, page, "01 — UI Kit", 80, yOffset);
  const board = buildUiKitBoard(ctx);
  page.appendChild(board);
  board.x = 80;
  board.y = yOffset + 84;
}

function createPrototypePage(ctx: DesignContext, page: PageNode, screens: FrameNode[], yOffset = 0): void {
  const board = stack("Prototype Map / Zook flows", "VERTICAL", 22);
  board.resize(1180, 640);
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
  board.y = yOffset;

  const titleBlock = stack("Prototype heading", "VERTICAL", 6);
  titleBlock.appendChild(text("Prototype Map", ctx.styles.text.h1, TOKENS.color.primaryText));
  titleBlock.appendChild(text("Primary mobile flows for member, staff, trainer, and owner roles.", ctx.styles.text.body, TOKENS.color.mutedText));
  board.appendChild(titleBlock);

  const knownScreens = new Set(screens.map((screen) => screen.name));
  const flowData: Array<{
    role: string;
    tone: "lime" | "warning" | "glass";
    icon: IconName;
    nodes: Array<{ label: string; frame: string; note: string; icon: IconName }>;
  }> = [
    {
      role: "Member",
      tone: "lime",
      icon: "user",
      nodes: [
        { label: "Home", frame: "AUTO_EXPORT / Member / 01 Home", note: "Daily command surface", icon: "home" },
        { label: "QR Check-in", frame: "AUTO_EXPORT / Member / 02 QR Check-in Scanner", note: "Rolling reception QR", icon: "qr" },
        { label: "Approved", frame: "AUTO_EXPORT / Member / 03 Attendance Result Approved", note: "Entry code issued", icon: "check" },
        { label: "Pending", frame: "AUTO_EXPORT / Member / 04 Attendance Pending Approval", note: "Desk approval mode", icon: "clock" },
        { label: "Shop", frame: "AUTO_EXPORT / Member / 05 Shop Catalog", note: "Desk-ready purchases", icon: "bag" },
        { label: "Plan Detail", frame: "AUTO_EXPORT / Member / 06 Plan Detail", note: "Assigned workout", icon: "clipboard" }
      ]
    },
    {
      role: "Receptionist",
      tone: "warning",
      icon: "cash",
      nodes: [{ label: "Desk Payment", frame: "AUTO_EXPORT / Receptionist / 01 Desk Payment Entry", note: "Reviewed desk collection", icon: "upi" }]
    },
    {
      role: "Trainer",
      tone: "lime",
      icon: "dumbbell",
      nodes: [
        { label: "Client Detail", frame: "AUTO_EXPORT / Trainer / 01 Client Detail", note: "Assigned client only", icon: "user" },
        { label: "Draft Review", frame: "AUTO_EXPORT / Trainer / 02 Draft Review", note: "Edit before assign", icon: "sparkle" }
      ]
    },
    {
      role: "Owner",
      tone: "glass",
      icon: "shield",
      nodes: [{ label: "Command View", frame: "AUTO_EXPORT / Owner / 01 Command View", note: "Gym-level operations", icon: "shield" }]
    }
  ];

  for (const flow of flowData) {
    const lane = row(`Prototype lane / ${flow.role}`, 12);
    lane.resize(1124, 102);
    lane.primaryAxisSizingMode = "FIXED";
    lane.counterAxisSizingMode = "FIXED";
    lane.counterAxisAlignItems = "CENTER";
    lane.paddingTop = 14;
    lane.paddingBottom = 14;
    lane.paddingLeft = 14;
    lane.paddingRight = 14;
    lane.cornerRadius = 22;
    lane.fills = [glassFill(TOKENS.opacity.glassLow)];
    lane.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
    lane.strokeWeight = 1;

    const role = row(`Role / ${flow.role}`, 8);
    role.resize(124, 74);
    role.primaryAxisSizingMode = "FIXED";
    role.counterAxisSizingMode = "FIXED";
    role.counterAxisAlignItems = "CENTER";
    role.appendChild(createIcon(flow.icon, 18, flow.tone === "warning" ? TOKENS.color.warning : TOKENS.color.accent));
    role.appendChild(text(flow.role, ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
    lane.appendChild(role);

    flow.nodes.forEach((nodeData, index) => {
      const step = stack(`Flow node / ${nodeData.label}`, "VERTICAL", 5);
      step.resize(flow.role === "Member" ? 116 : 190, 74);
      step.primaryAxisSizingMode = "FIXED";
      step.counterAxisSizingMode = "FIXED";
      step.paddingTop = 10;
      step.paddingBottom = 10;
      step.paddingLeft = 10;
      step.paddingRight = 10;
      step.cornerRadius = 18;
      step.fills = [solid(knownScreens.has(nodeData.frame) ? TOKENS.color.accent : TOKENS.color.warning, 0.08)];
      step.strokes = [solid(knownScreens.has(nodeData.frame) ? TOKENS.color.accent : TOKENS.color.warning, 0.28)];
      step.strokeWeight = 1;
      const labelRow = row("Node label", 6);
      labelRow.appendChild(createIcon(nodeData.icon, 13, knownScreens.has(nodeData.frame) ? TOKENS.color.accent : TOKENS.color.warning));
      labelRow.appendChild(text(nodeData.label, ctx.styles.text.caption, TOKENS.color.primaryText, "Label"));
      step.appendChild(labelRow);
      step.appendChild(text(nodeData.note, ctx.styles.text.caption, TOKENS.color.mutedText, "Note"));
      lane.appendChild(step);

      if (index < flow.nodes.length - 1) {
        lane.appendChild(createIcon("chevron", 16, TOKENS.color.subtleText));
      }
    });
    board.appendChild(lane);
  }

  page.appendChild(board);
}

function createNotes(ctx: DesignContext, page: PageNode, yOffset = 0): void {
  const notes = stack("Notes / Export", "VERTICAL", 18);
  notes.x = 80;
  notes.y = yOffset;
  notes.resize(780, 640);
  notes.appendChild(text("Notes / Export", ctx.styles.text.h1));
  for (const line of [
    "All final mobile frames are 390×844 and named with AUTO_EXPORT prefixes.",
    "Page 07 contains clean duplicates for export.",
    "AUTO_EXPORT frames are named for export; use exportAutoFrames or Figma's export panel for PNG @2x and JPG @1x.",
    "Typography uses Inter as the plugin-safe fallback for Satoshi/SF Pro.",
    "The visual system stays premium, operational, glassy, and India-first without sci-fi or mascot elements.",
    "Use exportAutoFrames or Figma's export panel when preparing final image files."
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

async function generateFullSystem(): Promise<void> {
  figma.notify("Zook generator starting…");
  await loadTokenFonts();
  const pages = await resetGeneratedPages();
  const styles = await createTokenStyles();
  const ctx: DesignContext = { styles };

  figma.notify("Pages ready. Creating mobile screens…");
  await figma.setCurrentPageAsync(pages["02 — Mobile / Member"]);
  const member = buildScreens("Member", memberScreens, ctx);
  sectionMarker(ctx, pages["02 — Mobile / Member"], "02 — Mobile / Member", 80, 40);
  placeFrames(pages["02 — Mobile / Member"], member, 80, 120);

  await figma.setCurrentPageAsync(pages["03 — Mobile / Trainer"]);
  const trainer = buildScreens("Trainer", trainerScreens, ctx);
  sectionMarker(ctx, pages["03 — Mobile / Trainer"], "03 — Mobile / Trainer", 80, 40);
  placeFrames(pages["03 — Mobile / Trainer"], trainer, 80, 120);

  await figma.setCurrentPageAsync(pages["04 — Mobile / Receptionist"]);
  const receptionist = buildScreens("Receptionist", receptionistScreens, ctx);
  sectionMarker(ctx, pages["04 — Mobile / Receptionist"], "04 — Mobile / Receptionist", 80, 40);
  placeFrames(pages["04 — Mobile / Receptionist"], receptionist, 80, 120);

  await figma.setCurrentPageAsync(pages["05 — Mobile / Owner"]);
  const owner = buildScreens("Owner", ownerScreens, ctx);
  sectionMarker(ctx, pages["05 — Mobile / Owner"], "05 — Mobile / Owner", 80, 40);
  placeFrames(pages["05 — Mobile / Owner"], owner, 80, 120);

  const allScreens = [...member, ...receptionist, ...trainer, ...owner];

  figma.notify("Screens ready. Creating cover and UI kit…");
  await figma.setCurrentPageAsync(pages["00 — Cover"]);
  createCover(ctx, pages["00 — Cover"], member, 0);

  figma.notify("Cover ready. Creating UI kit…");
  await figma.setCurrentPageAsync(pages["01 — UI Kit"]);
  createUiKit(ctx, pages["01 — UI Kit"], 40);

  figma.notify("UI kit ready. Finalizing handoff…", { timeout: 1000 });
  await figma.setCurrentPageAsync(pages["06 — Prototypes"]);
  sectionMarker(ctx, pages["06 — Prototypes"], "06 — Prototypes", 80, 40);
  createPrototypePage(ctx, pages["06 — Prototypes"], allScreens, 120);

  await figma.setCurrentPageAsync(pages["07 — Export Frames"]);
  sectionMarker(ctx, pages["07 — Export Frames"], "07 — Export Frames", 80, 40);
  duplicateExportFrames(pages["07 — Export Frames"], allScreens, 150);
  applyAutoExportSettings(pages["07 — Export Frames"]);

  await figma.setCurrentPageAsync(pages["08 — Notes / Export"]);
  sectionMarker(ctx, pages["08 — Notes / Export"], "08 — Notes / Export", 80, 40);
  createNotes(ctx, pages["08 — Notes / Export"], 120);

  await figma.setCurrentPageAsync(pages["00 — Cover"]);
  figma.notify("Zook Product UI System v1 generated with AUTO_EXPORT frames.");
  figma.closePlugin("Zook Product UI System v1 generated.");
}

function clearGeneratedBoard(page: PageNode): void {
  const existing = page.findChild((child) => child.type === "FRAME" && child.name === SINGLE_PAGE_BOARD_NAME);
  if (existing) existing.remove();
}

function sectionTitleChip(ctx: DesignContext, label: string, subtitle: string, width = 1660): FrameNode {
  const wrap = stack(`Single Page Section / ${label}`, "VERTICAL", 10);
  wrap.resize(width, 84);
  wrap.primaryAxisSizingMode = "FIXED";
  wrap.counterAxisSizingMode = "FIXED";

  const marker = row(`Marker / ${label}`, 8);
  marker.paddingTop = 10;
  marker.paddingBottom = 10;
  marker.paddingLeft = 14;
  marker.paddingRight = 14;
  marker.cornerRadius = 999;
  marker.fills = [solid(TOKENS.color.accent, 0.1)];
  marker.strokes = [solid(TOKENS.color.accent, 0.28)];
  marker.strokeWeight = 1;
  marker.appendChild(createIcon("shield", 14, TOKENS.color.accent));
  marker.appendChild(text(label, ctx.styles.text.bodyStrong, TOKENS.color.accent));
  wrap.appendChild(marker);
  wrap.appendChild(text(subtitle, ctx.styles.text.body, TOKENS.color.mutedText));
  return wrap;
}

function appendScreenGrid(section: FrameNode, screens: FrameNode[], columns: number): void {
  const grid = stack(`${section.name} / Grid`, "VERTICAL", 36);
  for (let index = 0; index < screens.length; index += columns) {
    const rowWrap = row(`Row ${Math.floor(index / columns) + 1}`, 28);
    for (const screen of screens.slice(index, index + columns)) {
      rowWrap.appendChild(screen);
    }
    grid.appendChild(rowWrap);
  }
  section.appendChild(grid);
}

async function generateCurrentPageEditableSystem(): Promise<void> {
  figma.notify("Generating editable UI kit on current page…");
  await loadTokenFonts();
  const styles = await createTokenStyles();
  const ctx: DesignContext = { styles };
  const page = figma.currentPage;

  clearGeneratedBoard(page);

  const board = stack(SINGLE_PAGE_BOARD_NAME, "VERTICAL", 52);
  board.x = 80;
  board.y = 80;
  board.primaryAxisSizingMode = "AUTO";
  board.counterAxisSizingMode = "AUTO";
  board.fills = [];
  page.appendChild(board);

  const cover = stack("Current Page Cover", "VERTICAL", 20);
  cover.resize(1660, 250);
  cover.primaryAxisSizingMode = "FIXED";
  cover.counterAxisSizingMode = "FIXED";
  cover.paddingTop = 34;
  cover.paddingBottom = 34;
  cover.paddingLeft = 34;
  cover.paddingRight = 34;
  cover.cornerRadius = 30;
  cover.fills = [solid(TOKENS.color.background)];
  cover.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  cover.strokeWeight = 1;
  cover.appendChild(text("Zook UI System v1", ctx.styles.text.display, TOKENS.color.primaryText));
  cover.appendChild(text("Native editable Figma build from repo components. Buttons, labels, chips, cards, and navigation are selectable layers.", ctx.styles.text.body, TOKENS.color.mutedText));
  const proof = row("Editability proof", 10);
  proof.appendChild(chip(ctx, "Editable text", "lime", "check"));
  proof.appendChild(chip(ctx, "Editable buttons", "lime", "check"));
  proof.appendChild(chip(ctx, "Editable cards", "lime", "check"));
  proof.appendChild(chip(ctx, "Icons as vectors", "lime", "check"));
  cover.appendChild(proof);
  board.appendChild(cover);

  const uiKitSection = stack("Section / UI Kit", "VERTICAL", 22);
  uiKitSection.appendChild(sectionTitleChip(ctx, "01 — UI Kit", "Reusable native components and style references"));
  const uiKitBoard = buildUiKitBoard(ctx);
  uiKitSection.appendChild(uiKitBoard);
  board.appendChild(uiKitSection);

  const member = buildScreens("Member", memberScreens, ctx);
  const memberSection = stack("Section / Member", "VERTICAL", 22);
  memberSection.appendChild(sectionTitleChip(ctx, "02 — Member", "Home, scanner, attendance, shop, and plan flows as editable layers"));
  appendScreenGrid(memberSection, member, 3);
  board.appendChild(memberSection);

  const trainer = buildScreens("Trainer", trainerScreens, ctx);
  const trainerSection = stack("Section / Trainer", "VERTICAL", 22);
  trainerSection.appendChild(sectionTitleChip(ctx, "03 — Trainer", "Client detail and AI draft review in native frames"));
  appendScreenGrid(trainerSection, trainer, 2);
  board.appendChild(trainerSection);

  const receptionist = buildScreens("Receptionist", receptionistScreens, ctx);
  const receptionSection = stack("Section / Receptionist", "VERTICAL", 22);
  receptionSection.appendChild(sectionTitleChip(ctx, "04 — Receptionist", "Desk payment flow with editable fields and action controls"));
  appendScreenGrid(receptionSection, receptionist, 2);
  board.appendChild(receptionSection);

  const owner = buildScreens("Owner", ownerScreens, ctx);
  const ownerSection = stack("Section / Owner", "VERTICAL", 22);
  ownerSection.appendChild(sectionTitleChip(ctx, "05 — Owner", "Command-view dashboard with editable KPI and list structures"));
  appendScreenGrid(ownerSection, owner, 2);
  board.appendChild(ownerSection);

  figma.viewport.scrollAndZoomIntoView([board]);
  figma.notify("Editable UI kit generated on current page.");
  figma.closePlugin("Editable UI kit generated on current page.");
}

async function main(): Promise<void> {
  if (figma.command === "corrected-mvp-pass") {
    await runCorrectedMvpPass();
    return;
  }
  if (figma.command === "generate-current-page") {
    await generateCurrentPageEditableSystem();
    return;
  }
  await generateFullSystem();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  figma.notify(`Zook generator failed: ${message}`, { error: true, timeout: 8000 });
  figma.closePlugin(`Zook generator failed: ${message}`);
});
