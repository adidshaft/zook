import {
  DesignContext,
  NavItem,
  avatar,
  bottomNav,
  button,
  chip,
  fixedFrame,
  footerSpacer,
  glassCard,
  header,
  iconButton,
  memberNavItems,
  mobileShell,
  ownerNavItems,
  paragraph,
  receptionistNavItems,
  row,
  stack,
  text,
  trainerNavItems
} from "./components";
import { createIcon, IconName } from "./icons";
import {
  attendanceApproved,
  attendancePending,
  memberHome,
  memberPlanDetail,
  memberScanner,
  memberShop
} from "./screens/member";
import { receptionistPayment } from "./screens/receptionist";
import { trainerAiDraftReview, trainerClientDetail } from "./screens/trainer";
import { createTokenStyles, loadTokenFonts } from "./styles";
import { TOKENS, glassFill, glassStroke, solid } from "./tokens";

const correctedPageName = "Zook Mobile — Corrected MVP Pass";
const exportPageName = "Zook Mobile — Export Frames";

const correctedExportNames = [
  "export_mobile_member_home",
  "export_mobile_member_checkin_scanner",
  "export_mobile_member_attendance_approved",
  "export_mobile_member_attendance_pending",
  "export_mobile_member_plan_detail",
  "export_mobile_member_shop",
  "export_mobile_receptionist_record_payment",
  "export_mobile_trainer_client_detail",
  "export_mobile_trainer_ai_draft_review"
] as const;

async function recreatePage(name: string): Promise<PageNode> {
  const existing = figma.root.children.filter((page) => page.name === name);
  const safePage = figma.root.children.find((page) => !existing.includes(page)) ?? figma.createPage();
  await figma.setCurrentPageAsync(safePage);
  for (const page of existing) page.remove();
  const page = figma.createPage();
  page.name = name;
  return page;
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

function placeFrames(page: PageNode, frames: FrameNode[], startX: number, startY: number, gap = 44): void {
  frames.forEach((frame, index) => {
    page.appendChild(frame);
    frame.x = startX + (index % 5) * (TOKENS.frame.mobile.width + gap);
    frame.y = startY + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 104);
  });
}

function setPngExport(frame: FrameNode): void {
  frame.exportSettings = [{ format: "PNG", constraint: { type: "SCALE", value: 2 } }];
}

function edgeFrame(ctx: DesignContext, name: string, title: string, body: string, cta: string, secondary?: string, extras?: SceneNode[]): FrameNode {
  const screen = mobileShell(ctx, name);
  screen.itemSpacing = 14;
  screen.appendChild(header(ctx, title, undefined, "back"));
  footerSpacer(screen);
  const card = glassCard(`${name} Card`, 350, 18, TOKENS.radius.xxl);
  card.counterAxisAlignItems = "CENTER";
  card.itemSpacing = 12;
  card.appendChild(createIcon(name.includes("Rejected") || name.includes("Invalid") ? "warning" : "shield", 40, name.includes("Rejected") || name.includes("Invalid") ? TOKENS.color.warning : TOKENS.color.accent));
  card.appendChild(text(title, ctx.styles.text.h2, TOKENS.color.primaryText, "Title"));
  const copy = paragraph(body, ctx.styles.text.body, 288, TOKENS.color.mutedText, "Body");
  copy.textAlignHorizontal = "CENTER";
  card.appendChild(copy);
  if (extras) extras.forEach((extra) => card.appendChild(extra));
  screen.appendChild(card);
  footerSpacer(screen);
  screen.appendChild(button(ctx, cta, "primary", name.includes("Payment") ? "rupee" : "check", 350));
  if (secondary) screen.appendChild(button(ctx, secondary, "secondary", "chevron", 350));
  return screen;
}

function pickupReadyFrame(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "Edge / Shop / Order Ready For Pickup");
  screen.itemSpacing = 14;
  screen.appendChild(header(ctx, "Ready for pickup", "Iron Temple Gym", "back"));
  footerSpacer(screen);
  const card = glassCard("Pickup Code Card", 350, 18, TOKENS.radius.xxl);
  card.counterAxisAlignItems = "CENTER";
  card.itemSpacing = 12;
  card.appendChild(createIcon("bag", 40, TOKENS.color.accent));
  card.appendChild(text("Ready for pickup", ctx.styles.text.h2));
  card.appendChild(text("PU-1842", ctx.styles.text.display, TOKENS.color.accent, "Pickup code"));
  const body = paragraph("Show this code at the gym desk.", ctx.styles.text.body, 270, TOKENS.color.mutedText);
  body.textAlignHorizontal = "CENTER";
  card.appendChild(body);
  screen.appendChild(card);
  footerSpacer(screen);
  screen.appendChild(button(ctx, "Keep Code Open", "primary", "check", 350));
  return screen;
}

function createEdgeStates(ctx: DesignContext): FrameNode[] {
  return [
    edgeFrame(ctx, "Edge / Member / No Active Membership", "No active membership", "Choose a plan for Iron Temple Gym to start check-ins.", "View Plans", "Contact Gym"),
    edgeFrame(ctx, "Edge / Member / Membership Expired", "Membership expired", "Renew your plan to continue check-ins.", "Renew Plan", "View Payment History"),
    edgeFrame(ctx, "Edge / Member / Check-in Rejected", "Check-in not approved", "Your membership or branch could not be verified. Please contact the front desk.", "Ask Receptionist", "Back to Home", [
      row("Rejected chips", 8)
    ]),
    edgeFrame(ctx, "Edge / Member / Minor Consent Required", "Guardian consent required", "Some features are locked until guardian consent is verified.", "Request Consent", "Learn More"),
    edgeFrame(ctx, "Edge / Trainer / Tracking Not Opted In", "Tracking is private", "This member has not shared workout tracking with trainers.", "View Assigned Plans"),
    edgeFrame(ctx, "Edge / Receptionist / Invalid Entry Code", "Code not found", "Check the code and try again, or search for the member manually.", "Try Again", "Search Member"),
    pickupReadyFrame(ctx)
  ];
}

function hydrateEdgeStateChips(ctx: DesignContext, frames: FrameNode[]): void {
  const rejected = frames.find((frame) => frame.name === "Edge / Member / Check-in Rejected");
  const chips = rejected?.findOne((node) => node.name === "Rejected chips" && node.type === "FRAME") as FrameNode | null;
  if (!chips) return;
  chips.appendChild(chip(ctx, "Rejected", "warning", "warning"));
  chips.appendChild(chip(ctx, "Desk help needed", "warning", "headset"));
}

function navPreview(ctx: DesignContext, title: string, items: NavItem[], selected: string): FrameNode {
  const item = stack(`Nav Preview / ${title}`, "VERTICAL", 10);
  item.appendChild(text(title, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  item.appendChild(bottomNav(ctx, title, items, selected));
  return item;
}

function headerPreview(ctx: DesignContext, title: string, node: FrameNode): FrameNode {
  const item = stack(`Header Preview / ${title}`, "VERTICAL", 10);
  item.appendChild(text(title, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  item.appendChild(node);
  return item;
}

function memberHomeHeaderPreview(ctx: DesignContext): FrameNode {
  const node = row("Header / Member Home", TOKENS.space.md);
  node.resize(350, 66);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  node.appendChild(avatar(ctx, "AM", 56, "Aarav avatar"));
  const copy = stack("Copy", "VERTICAL", 4);
  copy.appendChild(text("Good morning, Aarav", ctx.styles.text.h3));
  copy.appendChild(text("Iron Temple Gym · Pune", ctx.styles.text.body, TOKENS.color.mutedText));
  node.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  const bell = iconButton("Notifications", "bell");
  const dot = fixedFrame("Unread dot", 10, 10);
  dot.cornerRadius = TOKENS.radius.round;
  dot.fills = [solid(TOKENS.color.accent)];
  bell.appendChild(dot);
  dot.x = 29;
  dot.y = 4;
  node.appendChild(bell);
  return node;
}

function receptionistHeaderPreview(ctx: DesignContext): FrameNode {
  const node = row("Header / Receptionist", TOKENS.space.md);
  node.resize(350, 50);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  const copy = stack("Copy", "VERTICAL", 2);
  copy.appendChild(text("Desk", ctx.styles.text.h3));
  copy.appendChild(text("Iron Temple Gym", ctx.styles.text.small, TOKENS.color.mutedText));
  node.appendChild(copy);
  node.appendChild(chip(ctx, "Receptionist", "lime", "shield"));
  return node;
}

function createComponentsBoard(ctx: DesignContext, page: PageNode, x: number, y: number): void {
  const board = stack("Role Nav + Header Components", "VERTICAL", 18);
  board.resize(1240, 760);
  board.primaryAxisSizingMode = "FIXED";
  board.counterAxisSizingMode = "FIXED";
  board.paddingTop = 24;
  board.paddingBottom = 24;
  board.paddingLeft = 24;
  board.paddingRight = 24;
  board.cornerRadius = 28;
  board.fills = [solid(TOKENS.color.surface, 0.98)];
  board.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  board.strokeWeight = 1;
  board.appendChild(text("Role-correct Navigation + Header Components", ctx.styles.text.h2));

  const navs = row("Bottom nav variants", 18);
  navs.appendChild(navPreview(ctx, "Member", memberNavItems, "Home"));
  navs.appendChild(navPreview(ctx, "Trainer", trainerNavItems, "Clients"));
  navs.appendChild(navPreview(ctx, "Receptionist", receptionistNavItems, "Desk"));
  navs.appendChild(navPreview(ctx, "Owner", ownerNavItems, "Command"));
  board.appendChild(navs);

  const headers = stack("Header variants", "VERTICAL", 14);
  const headerRowOne = row("Header variants row 1", 18);
  headerRowOne.appendChild(headerPreview(ctx, "Member Home Header", memberHomeHeaderPreview(ctx)));
  headerRowOne.appendChild(headerPreview(ctx, "Secondary Member Header", header(ctx, "Push Day", undefined, "back", "more")));
  headerRowOne.appendChild(headerPreview(ctx, "Shop Header", header(ctx, "Shop", "Iron Temple Gym", undefined, "cart")));
  headers.appendChild(headerRowOne);
  const headerRowTwo = row("Header variants row 2", 18);
  headerRowTwo.appendChild(headerPreview(ctx, "Trainer Header", header(ctx, "Client Detail", undefined, "back", undefined, "Trainer")));
  headerRowTwo.appendChild(headerPreview(ctx, "Receptionist Header", receptionistHeaderPreview(ctx)));
  headerRowTwo.appendChild(headerPreview(ctx, "Owner Header", header(ctx, "Command", "Iron Temple Gym · Pune", undefined, undefined, "Owner")));
  headers.appendChild(headerRowTwo);
  board.appendChild(headers);

  page.appendChild(board);
  board.x = x;
  board.y = y;
}

function ruleCard(ctx: DesignContext, index: number, body: string): FrameNode {
  const card = glassCard(`Rule ${index}`, 330, 14, TOKENS.radius.lg);
  card.layoutMode = "HORIZONTAL";
  card.resize(330, 76);
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.counterAxisAlignItems = "CENTER";
  card.itemSpacing = 12;
  card.appendChild(chip(ctx, String(index), "lime"));
  card.appendChild(paragraph(body, ctx.styles.text.bodyStrong, 250, TOKENS.color.primaryText, "Rule"));
  return card;
}

function createRulesBoard(ctx: DesignContext, page: PageNode, x: number, y: number): void {
  const board = stack("Mobile Product Rules", "VERTICAL", 18);
  board.resize(1120, 520);
  board.primaryAxisSizingMode = "FIXED";
  board.counterAxisSizingMode = "FIXED";
  board.paddingTop = 24;
  board.paddingBottom = 24;
  board.paddingLeft = 24;
  board.paddingRight = 24;
  board.cornerRadius = 28;
  board.fills = [solid(TOKENS.color.surface, 0.98)];
  board.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  board.strokeWeight = 1;
  board.appendChild(text("Mobile Product Rules", ctx.styles.text.h2));
  const rules: string[] = [
    "Member screens are for action, not administration.",
    "Trainer screens show assigned clients only.",
    "AI creates drafts; humans assign plans.",
    "Receptionist actions must be auditable.",
    "Entry codes appear after approved or pending scans.",
    "Hosted checkout activates only after backend confirmation.",
    "Tracking is private unless the member opts in.",
    "Owner mobile is command view; web is full control room.",
    "In-app inbox is canonical; push is best-effort.",
    "Minors require guardian consent before restricted features."
  ];
  const grid = stack("Rules grid", "VERTICAL", 12);
  for (let i = 0; i < rules.length; i += 2) {
    const line = row(`Rule row ${i / 2 + 1}`, 12);
    const firstRule = rules[i];
    const secondRule = rules[i + 1];
    if (firstRule) line.appendChild(ruleCard(ctx, i + 1, firstRule));
    if (secondRule) line.appendChild(ruleCard(ctx, i + 2, secondRule));
    grid.appendChild(line);
  }
  board.appendChild(grid);
  page.appendChild(board);
  board.x = x;
  board.y = y;
}

function createCorrectedFrames(ctx: DesignContext): FrameNode[] {
  return [
    memberHome(ctx),
    memberScanner(ctx),
    attendanceApproved(ctx),
    attendancePending(ctx),
    memberPlanDetail(ctx),
    memberShop(ctx),
    receptionistPayment(ctx),
    trainerClientDetail(ctx),
    trainerAiDraftReview(ctx)
  ];
}

export async function runCorrectedMvpPass(): Promise<void> {
  figma.notify("Creating corrected Zook mobile MVP pass…");
  await loadTokenFonts();
  const styles = await createTokenStyles();
  const ctx: DesignContext = { styles };
  const correctedPage = await recreatePage(correctedPageName);
  const exportPage = await recreatePage(exportPageName);

  await figma.setCurrentPageAsync(correctedPage);
  sectionMarker(ctx, correctedPage, correctedPageName, 80, 40);
  const correctedFrames = createCorrectedFrames(ctx);
  placeFrames(correctedPage, correctedFrames, 80, 140);

  const edgeStates = createEdgeStates(ctx);
  hydrateEdgeStateChips(ctx, edgeStates);
  sectionMarker(ctx, correctedPage, "Edge States", 80, 2140);
  placeFrames(correctedPage, edgeStates, 80, 2240);
  createComponentsBoard(ctx, correctedPage, 80, 4160);
  createRulesBoard(ctx, correctedPage, 80, 4840);

  await figma.setCurrentPageAsync(exportPage);
  sectionMarker(ctx, exportPage, exportPageName, 80, 40);
  correctedFrames.forEach((frame, index) => {
    const clone = frame.clone();
    clone.name = correctedExportNames[index] ?? `export_mobile_${index + 1}`;
    setPngExport(clone);
    exportPage.appendChild(clone);
    clone.x = 80 + (index % 5) * (TOKENS.frame.mobile.width + 44);
    clone.y = 150 + Math.floor(index / 5) * (TOKENS.frame.mobile.height + 104);
  });

  await figma.setCurrentPageAsync(exportPage);
  figma.notify("Corrected Zook mobile MVP pass created.");
  figma.closePlugin("Corrected Zook mobile MVP pass created.");
}
