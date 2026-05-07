import {
  DesignContext,
  avatar,
  bottomNav,
  button,
  chip,
  divider,
  exerciseRow,
  footerSpacer,
  fixedFrame,
  glassCard,
  header,
  iconButton,
  iconDisk,
  lockWidthHugHeight,
  memberNavItems,
  metricTile,
  mobileShell,
  paragraph,
  productCard,
  row,
  searchBar,
  sectionTitle,
  selectPill,
  stack,
  text
} from "../components";
import { createIcon } from "../icons";
import { TOKENS, glassFill, glassStroke, solid } from "../tokens";

function progressRing(ctx: DesignContext, label: string, color: string = TOKENS.color.accent, size = 86): FrameNode {
  const wrap = fixedFrame(`Progress Ring / ${label}`, size, size);
  const base = figma.createEllipse();
  base.name = "Ring base";
  base.resize(size, size);
  base.fills = [];
  base.strokes = [solid(TOKENS.color.white, 0.1)];
  base.strokeWeight = 8;
  const active = figma.createEllipse();
  active.name = "Ring progress";
  active.resize(size, size);
  active.fills = [];
  active.strokes = [solid(color)];
  active.strokeWeight = 8;
  active.strokeCap = "ROUND";
  active.dashPattern = [Math.round(size * 1.9), Math.round(size * 1.05)];
  active.effects = [
    { type: "DROP_SHADOW", color: { ...solid(color).color, a: 0.34 }, offset: { x: 0, y: 0 }, radius: 22, spread: -2, visible: true, blendMode: "NORMAL" }
  ];
  const value = text(label, label.length > 2 ? ctx.styles.text.h3 : ctx.styles.text.h2, color, "Ring label");
  wrap.appendChild(base);
  wrap.appendChild(active);
  wrap.appendChild(value);
  value.x = (size - value.width) / 2;
  value.y = (size - value.height) / 2;
  return wrap;
}

function cycleProgressRing(ctx: DesignContext): FrameNode {
  const wrap = progressRing(ctx, "73%", TOKENS.color.accent, 86);
  const oldLabel = wrap.children.find((child) => child.name === "Ring label") as TextNode | undefined;
  if (oldLabel) {
    oldLabel.fontSize = 22;
    oldLabel.lineHeight = { unit: "PIXELS", value: 26 };
    oldLabel.x = (wrap.width - oldLabel.width) / 2;
    oldLabel.y = 23;
  }
  const sublabel = text("plan cycle", ctx.styles.text.caption, TOKENS.color.mutedText, "Ring sublabel");
  wrap.appendChild(sublabel);
  sublabel.x = (wrap.width - sublabel.width) / 2;
  sublabel.y = 49;
  return wrap;
}

function progressBar(width: number, pct: number, tone = TOKENS.color.accent): FrameNode {
  const bar = fixedFrame("Progress bar", width, 8);
  bar.cornerRadius = TOKENS.radius.round;
  bar.fills = [solid(TOKENS.color.white, 0.09)];
  const fill = fixedFrame("Progress fill", Math.round(width * pct), 8);
  fill.cornerRadius = TOKENS.radius.round;
  fill.fills = [solid(tone)];
  fill.effects = [{ type: "DROP_SHADOW", color: { ...solid(tone).color, a: 0.28 }, offset: { x: 0, y: 0 }, radius: 12, spread: -2, visible: true, blendMode: "NORMAL" }];
  bar.appendChild(fill);
  return bar;
}

function homeQuickAction(ctx: DesignContext, icon: "calendar" | "target" | "rupee" | "headset", label: string): FrameNode {
  const action = stack(`Quick Action / ${label}`, "VERTICAL", 5);
  action.resize(76, 54);
  action.primaryAxisSizingMode = "FIXED";
  action.counterAxisSizingMode = "FIXED";
  action.primaryAxisAlignItems = "CENTER";
  action.counterAxisAlignItems = "CENTER";
  action.appendChild(createIcon(icon, 18, TOKENS.color.mutedText));
  const caption = paragraph(label, ctx.styles.text.caption, 70, TOKENS.color.mutedText, "Label");
  caption.textAlignHorizontal = "CENTER";
  action.appendChild(caption);
  return action;
}

function detailLine(ctx: DesignContext, label: string, value: string, icon: "clock" | "shield" | "clipboard" | "dumbbell" | "check" = "clock"): FrameNode {
  const line = row(`Detail / ${label}`, TOKENS.space.md);
  line.resize(286, 38);
  line.primaryAxisSizingMode = "FIXED";
  line.counterAxisSizingMode = "FIXED";
  line.primaryAxisAlignItems = "SPACE_BETWEEN";
  const left = row("Left", TOKENS.space.sm);
  left.appendChild(iconDisk(icon, 28, "glass"));
  left.appendChild(text(label, ctx.styles.text.small, TOKENS.color.mutedText, "Label"));
  line.appendChild(left);
  line.appendChild(text(value, ctx.styles.text.bodyStrong, value === "Approved" ? TOKENS.color.accent : TOKENS.color.primaryText, "Value"));
  return line;
}

export function memberHome(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 01 Home");
  screen.itemSpacing = 12;
  const head = row("Home header", TOKENS.space.md);
  head.resize(350, 66);
  head.primaryAxisSizingMode = "FIXED";
  head.counterAxisSizingMode = "FIXED";
  head.primaryAxisAlignItems = "SPACE_BETWEEN";
  head.appendChild(avatar(ctx, "AM", 56, "Aarav avatar"));
  const copy = stack("Greeting copy", "VERTICAL", 4);
  copy.appendChild(text("Good morning, Aarav", ctx.styles.text.h3));
  copy.appendChild(text("Iron Temple Gym · Pune", ctx.styles.text.body, TOKENS.color.mutedText));
  head.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  const bell = iconButton("Bell with unread dot", "bell");
  const dot = fixedFrame("Unread dot", 10, 10);
  dot.cornerRadius = TOKENS.radius.round;
  dot.fills = [solid(TOKENS.color.accent)];
  bell.appendChild(dot);
  dot.x = 29;
  dot.y = 4;
  head.appendChild(bell);
  screen.appendChild(head);

  const membership = glassCard("Active Membership Card", 350, 18, TOKENS.radius.xxl);
  membership.itemSpacing = 14;
  const top = row("Membership top", TOKENS.space.md);
  top.resize(314, 98);
  top.primaryAxisSizingMode = "FIXED";
  top.counterAxisSizingMode = "FIXED";
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  const membershipCopy = stack("Membership copy", "VERTICAL", 8);
  const label = row("Membership label", TOKENS.space.sm);
  label.appendChild(iconDisk("shield", 28, "lime"));
  label.appendChild(text("Active Membership", ctx.styles.text.small, TOKENS.color.mutedText));
  membershipCopy.appendChild(label);
  const headline = row("Membership headline", 6);
  headline.appendChild(text("Hybrid Pro", ctx.styles.text.h2));
  headline.appendChild(text("22 days left", ctx.styles.text.bodyStrong, TOKENS.color.accent));
  membershipCopy.appendChild(headline);
  membershipCopy.appendChild(text("8 visits remaining", ctx.styles.text.body, TOKENS.color.mutedText));
  top.appendChild(membershipCopy);
  membershipCopy.layoutSizingHorizontal = "FILL";
  top.appendChild(cycleProgressRing(ctx));
  membership.appendChild(top);
  membership.appendChild(divider(314));
  const actions = row("Membership actions", TOKENS.space.sm);
  actions.appendChild(button(ctx, "Scan QR", "primary", "qr", 153));
  actions.appendChild(button(ctx, "Start Workout", "secondary", "dumbbell", 153));
  membership.appendChild(actions);
  screen.appendChild(membership);

  screen.appendChild(sectionTitle(ctx, "Today’s Plan", "View all"));
  const plan = glassCard("Today’s Plan Card", 350, 14, TOKENS.radius.xl);
  const planRow = row("Plan row", TOKENS.space.md);
  planRow.resize(322, 54);
  planRow.primaryAxisSizingMode = "FIXED";
  planRow.counterAxisSizingMode = "FIXED";
  planRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  planRow.appendChild(iconDisk("dumbbell", 44, "lime"));
  const planCopy = stack("Plan copy", "VERTICAL", 2);
  planCopy.appendChild(paragraph("Push Day · 6 exercises · Coach Rhea", ctx.styles.text.bodyStrong, 178, TOKENS.color.primaryText, "Title"));
  planCopy.appendChild(text("Chest · Shoulders · Triceps", ctx.styles.text.small, TOKENS.color.mutedText));
  planRow.appendChild(planCopy);
  planCopy.layoutSizingHorizontal = "FILL";
  planRow.appendChild(chip(ctx, "Assigned", "lime"));
  plan.appendChild(planRow);
  screen.appendChild(plan);

  const activity = glassCard("Activity Metrics Card", 350, 14, TOKENS.radius.xl);
  activity.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(activity, 350);
  activity.primaryAxisAlignItems = "SPACE_BETWEEN";
  activity.counterAxisAlignItems = "CENTER";
  activity.appendChild(metricTile(ctx, "fire", "Streak", "5 days"));
  activity.appendChild(metricTile(ctx, "clock", "Last check-in", "7:12 AM"));
  activity.appendChild(metricTile(ctx, "target", "Weekly goal", "3/5"));
  screen.appendChild(activity);

  const quickActions = glassCard("Home Quick Actions", 350, 10, TOKENS.radius.xl);
  quickActions.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(quickActions, 350);
  quickActions.primaryAxisAlignItems = "SPACE_BETWEEN";
  quickActions.counterAxisAlignItems = "CENTER";
  quickActions.appendChild(homeQuickAction(ctx, "calendar", "Book class"));
  quickActions.appendChild(homeQuickAction(ctx, "target", "Progress"));
  quickActions.appendChild(homeQuickAction(ctx, "rupee", "Payments"));
  quickActions.appendChild(homeQuickAction(ctx, "headset", "Support"));
  screen.appendChild(quickActions);
  footerSpacer(screen);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Home"));
  return screen;
}

export function memberScanner(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 02 QR Check-in Scanner");
  screen.itemSpacing = 8;
  screen.appendChild(header(ctx, "Scan Gym QR", "Iron Temple Gym", "back"));
  const scanner = fixedFrame("Scanner Stage", 350, 292);
  const viewport = fixedFrame("Rolling QR scanner viewport", 278, 278);
  viewport.cornerRadius = TOKENS.radius.xxl;
  viewport.fills = [solid(TOKENS.color.white, 0.03)];
  viewport.strokes = [glassStroke(0.16)];
  viewport.strokeWeight = 1;
  viewport.effects = [{ type: "BACKGROUND_BLUR", radius: 16, visible: true, blurType: "NORMAL" }];
  scanner.appendChild(viewport);
  viewport.x = 36;
  viewport.y = 6;
  for (let i = 1; i < 6; i += 1) {
    const gridPosition = Math.round(i * (278 / 6));
    const v = fixedFrame(`Vertical grid ${i}`, 1, 278);
    v.fills = [solid(TOKENS.color.white, 0.06)];
    viewport.appendChild(v);
    v.x = gridPosition;
    const h = fixedFrame(`Horizontal grid ${i}`, 278, 1);
    h.fills = [solid(TOKENS.color.white, 0.06)];
    viewport.appendChild(h);
    h.y = gridPosition;
  }
  const scan = fixedFrame("Horizontal scan line", 254, 2);
  scan.fills = [solid(TOKENS.color.accent, 0.88)];
  scan.effects = [{ type: "DROP_SHADOW", color: { ...solid(TOKENS.color.accent).color, a: 0.45 }, offset: { x: 0, y: 0 }, radius: 18, spread: 2, visible: true, blendMode: "NORMAL" }];
  viewport.appendChild(scan);
  scan.x = 12;
  scan.y = 138;
  for (const [name, x, y, horizontalY, verticalX] of [
    ["Top left", 0, 0, 0, 0],
    ["Top right", 232, 0, 0, 42],
    ["Bottom right", 232, 232, 42, 42],
    ["Bottom left", 0, 232, 42, 0]
  ] as const) {
    const corner = fixedFrame(`Lime corner / ${name}`, 46, 46);
    corner.fills = [];
    const a = fixedFrame("Corner horizontal", 46, 4);
    a.cornerRadius = 2;
    a.fills = [solid(TOKENS.color.accent)];
    const b = fixedFrame("Corner vertical", 4, 46);
    b.cornerRadius = 2;
    b.fills = [solid(TOKENS.color.accent)];
    corner.appendChild(a);
    corner.appendChild(b);
    a.y = horizontalY;
    b.x = verticalX;
    corner.effects = [{ type: "DROP_SHADOW", color: { ...solid(TOKENS.color.accent).color, a: 0.5 }, offset: { x: 0, y: 0 }, radius: 14, spread: 1, visible: true, blendMode: "NORMAL" }];
    viewport.appendChild(corner);
    corner.x = x;
    corner.y = y;
  }
  screen.appendChild(scanner);
  const helper = row("Scanner helper", TOKENS.space.sm);
  helper.appendChild(createIcon("qr", 16, TOKENS.color.accent));
  helper.appendChild(text("Scan the rolling QR at the reception desk.", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(helper);
  const validation = glassCard("Validation Card", 350, 10, TOKENS.radius.xl);
  validation.itemSpacing = 6;
  for (const item of ["Membership active", "Branch verified", "Server-authorized check-in"]) {
    const itemRow = row(`Validation / ${item}`, TOKENS.space.md);
    itemRow.resize(330, 40);
    itemRow.primaryAxisSizingMode = "FIXED";
    itemRow.counterAxisSizingMode = "FIXED";
    itemRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    itemRow.counterAxisAlignItems = "CENTER";
    const itemLeft = row("Validation copy", TOKENS.space.sm);
    itemLeft.appendChild(iconDisk(item === "Membership active" ? "shield" : "check", 32, "glass"));
    itemLeft.appendChild(text(item, ctx.styles.text.bodyStrong, TOKENS.color.primaryText));
    itemRow.appendChild(itemLeft);
    itemRow.appendChild(createIcon("check", 16, TOKENS.color.accent));
    validation.appendChild(itemRow);
    if (item !== "Server-authorized check-in") validation.appendChild(divider(310, 0.08));
  }
  screen.appendChild(validation);
  const support = glassCard("Support Panel", 350, 10, TOKENS.radius.xl);
  support.layoutMode = "VERTICAL";
  lockWidthHugHeight(support, 350);
  support.itemSpacing = 8;
  const supportLeft = row("Support copy", TOKENS.space.sm);
  supportLeft.appendChild(iconDisk("headset", 34, "glass"));
  supportLeft.appendChild(text("Need help? Ask receptionist", ctx.styles.text.bodyStrong, TOKENS.color.mutedText));
  const supportRow = row("Support row", TOKENS.space.sm);
  supportRow.resize(330, 34);
  supportRow.primaryAxisSizingMode = "FIXED";
  supportRow.counterAxisSizingMode = "FIXED";
  supportRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  supportRow.appendChild(supportLeft);
  supportRow.appendChild(createIcon("chevron", 16, TOKENS.color.mutedText));
  support.appendChild(supportRow);
  support.appendChild(divider(330, 0.08));
  const modeRow = row("Attendance mode row", TOKENS.space.sm);
  modeRow.resize(330, 28);
  modeRow.primaryAxisSizingMode = "FIXED";
  modeRow.counterAxisSizingMode = "FIXED";
  modeRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  const modeLeft = row("Mode copy", TOKENS.space.sm);
  modeLeft.appendChild(createIcon("qr", 15, TOKENS.color.accent));
  modeLeft.appendChild(text("Attendance mode", ctx.styles.text.small, TOKENS.color.mutedText));
  modeRow.appendChild(modeLeft);
  modeRow.appendChild(chip(ctx, "Auto", "lime", "check"));
  support.appendChild(modeRow);
  screen.appendChild(support);
  footerSpacer(screen);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Check-in"));
  return screen;
}

export function attendanceApproved(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 03 Attendance Result Approved");
  screen.itemSpacing = 12;
  screen.appendChild(header(ctx, "Attendance", undefined, "back"));
  const hero = stack("Approved hero", "VERTICAL", 8);
  hero.counterAxisAlignItems = "CENTER";
  hero.appendChild(progressRing(ctx, "✓", TOKENS.color.accent, 92));
  hero.appendChild(text("Checked in", ctx.styles.text.h1));
  hero.appendChild(text("Entry approved for Iron Temple Gym", ctx.styles.text.body, TOKENS.color.mutedText));
  screen.appendChild(hero);
  const code = glassCard("Entry Code Card", 350, 14, TOKENS.radius.xxl);
  code.primaryAxisAlignItems = "CENTER";
  code.appendChild(text("Entry Code", ctx.styles.text.small, TOKENS.color.mutedText));
  code.appendChild(text("ZK-4821", ctx.styles.text.display, TOKENS.color.accent));
  code.appendChild(divider(286));
  code.appendChild(text("Show this to the front desk if asked.", ctx.styles.text.small, TOKENS.color.mutedText));
  for (const [label, value, icon] of [
    ["Time", "7:14 AM", "clock"],
    ["Branch", "Default Branch", "shield"],
    ["Plan", "Hybrid Pro", "clipboard"],
    ["Status", "Approved", "check"]
  ] as const) {
    code.appendChild(detailLine(ctx, label, value, icon));
  }
  screen.appendChild(code);
  const next = glassCard("Next Up Card", 350, 14, TOKENS.radius.xl);
  next.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(next, 350);
  next.primaryAxisAlignItems = "SPACE_BETWEEN";
  next.counterAxisAlignItems = "CENTER";
  const nextIcon = iconDisk("dumbbell", 44, "lime");
  nextIcon.effects = [];
  next.appendChild(nextIcon);
  const copy = stack("Next copy", "VERTICAL", 4);
  copy.appendChild(text("Next up", ctx.styles.text.h3));
  copy.appendChild(text("Push Day workout assigned by Coach Rhea", ctx.styles.text.small, TOKENS.color.mutedText));
  next.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  next.appendChild(chip(ctx, "Open Plan", "lime", "chevron"));
  screen.appendChild(next);
  footerSpacer(screen);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Check-in"));
  return screen;
}

export function attendancePending(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 04 Attendance Pending Approval");
  screen.itemSpacing = 12;
  screen.appendChild(header(ctx, "Attendance", "Iron Temple Gym", "back"));
  const hero = stack("Pending hero", "VERTICAL", 8);
  hero.counterAxisAlignItems = "CENTER";
  hero.appendChild(progressRing(ctx, "◷", TOKENS.color.warning, 88));
  hero.appendChild(text("Waiting for desk approval", ctx.styles.text.h2));
  hero.appendChild(paragraph("Your check-in was received. Show this code at the front desk.", ctx.styles.text.small, 320, TOKENS.color.mutedText));
  screen.appendChild(hero);
  const code = glassCard("Entry Code Card", 350, 14, TOKENS.radius.xxl);
  code.primaryAxisAlignItems = "CENTER";
  code.appendChild(text("Entry Code", ctx.styles.text.small, TOKENS.color.mutedText));
  code.appendChild(text("ZK-7319", ctx.styles.text.display, TOKENS.color.warning));
  code.appendChild(divider(286));
  const chips = row("Pending chips", TOKENS.space.sm);
  chips.appendChild(chip(ctx, "Pending", "warning"));
  chips.appendChild(chip(ctx, "Membership active", "lime", "check"));
  code.appendChild(chips);
  code.appendChild(chip(ctx, "Desk confirmation needed", "warning", "warning"));
  screen.appendChild(code);
  const reason = glassCard("Why Review Card", 350, 14, TOKENS.radius.xl);
  reason.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(reason, 350);
  const reasonIcon = iconDisk("warning", 48, "warning");
  reasonIcon.effects = [];
  reason.appendChild(reasonIcon);
  const reasonCopy = stack("Reason copy", "VERTICAL", 4);
  reasonCopy.appendChild(text("Why confirmation?", ctx.styles.text.h3));
  reasonCopy.appendChild(paragraph("Your gym asks the desk to confirm some check-ins before entry is marked approved.", ctx.styles.text.small, 244, TOKENS.color.mutedText));
  reason.appendChild(reasonCopy);
  reasonCopy.layoutSizingHorizontal = "FILL";
  screen.appendChild(reason);
  screen.appendChild(button(ctx, "Show Code at Desk", "primary", "qr", 350));
  screen.appendChild(button(ctx, "Back to Home", "secondary", "home", 350));
  const history = text("View Attendance History", ctx.styles.text.small, TOKENS.color.mutedText, "History link");
  screen.appendChild(history);
  return screen;
}

export function memberShop(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 05 Shop Catalog");
  screen.itemSpacing = 8;
  const head = row("Shop header", TOKENS.space.md);
  head.resize(350, 64);
  head.primaryAxisSizingMode = "FIXED";
  head.counterAxisSizingMode = "FIXED";
  head.primaryAxisAlignItems = "SPACE_BETWEEN";
  const shopCopy = stack("Shop copy", "VERTICAL", 4);
  shopCopy.appendChild(text("Shop", ctx.styles.text.h1));
  shopCopy.appendChild(selectPill(ctx, "Iron Temple Gym", "dumbbell"));
  head.appendChild(shopCopy);
  const cart = iconButton("Cart badge button", "cart");
  const badge = fixedFrame("Cart badge 2", 16, 16);
  badge.cornerRadius = TOKENS.radius.round;
  badge.fills = [solid(TOKENS.color.accent)];
  badge.appendChild(text("2", ctx.styles.text.caption, TOKENS.color.background));
  cart.appendChild(badge);
  badge.x = 27;
  badge.y = -4;
  head.appendChild(cart);
  screen.appendChild(head);
  screen.appendChild(searchBar(ctx, "Search water, protein, towel…"));
  const categories = stack("Category chips", "VERTICAL", 6);
  categories.resize(350, 68);
  categories.primaryAxisSizingMode = "FIXED";
  categories.counterAxisSizingMode = "FIXED";
  const categoryRowOne = row("Category row 1", TOKENS.space.sm);
  const categoryRowTwo = row("Category row 2", TOKENS.space.sm);
  for (const [label, selected] of [
    ["All", true],
    ["Water", false],
    ["Recovery Drink", false],
    ["Shaker", false],
    ["Towel", false],
    ["Other", false]
  ] as const) {
    const target = label === "All" || label === "Water" || label === "Recovery Drink" ? categoryRowOne : categoryRowTwo;
    target.appendChild(chip(ctx, label, selected ? "lime" : "glass"));
  }
  categories.appendChild(categoryRowOne);
  categories.appendChild(categoryRowTwo);
  screen.appendChild(categories);
  const pickup = row("Pickup helper", TOKENS.space.sm);
  pickup.appendChild(chip(ctx, "Pickup at gym desk", "lime", "bag"));
  screen.appendChild(pickup);
  const grid = stack("Product Grid", "VERTICAL", TOKENS.space.sm);
  const r1 = row("Product row 1", TOKENS.space.md);
  r1.appendChild(productCard(ctx, "Recovery Drink", "₹149", "Ready at desk", "lime"));
  r1.appendChild(productCard(ctx, "Training Bottle", "₹399", "Low stock", "warning"));
  const r2 = row("Product row 2", TOKENS.space.md);
  r2.appendChild(productCard(ctx, "Gym Towel", "₹249", "In stock", "lime"));
  r2.appendChild(productCard(ctx, "Water Bottle", "₹40", "In stock", "lime"));
  grid.appendChild(r1);
  grid.appendChild(r2);
  screen.appendChild(grid);
  footerSpacer(screen);
  const miniCart = glassCard("Floating Mini Cart", 246, 12, TOKENS.radius.xxl);
  miniCart.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(miniCart, 246);
  miniCart.primaryAxisAlignItems = "SPACE_BETWEEN";
  miniCart.counterAxisAlignItems = "CENTER";
  miniCart.appendChild(createIcon("cart", 22, TOKENS.color.primaryText));
  miniCart.appendChild(text("2 items · ₹548", ctx.styles.text.bodyStrong));
  miniCart.appendChild(createIcon("chevron", 16, TOKENS.color.accent));
  screen.appendChild(miniCart);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Shop"));
  return screen;
}

export function memberPlanDetail(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 06 Plan Detail");
  screen.itemSpacing = 6;
  screen.appendChild(header(ctx, "Push Day", undefined, "back", "more"));
  const summary = glassCard("Plan Summary Card", 350, 14, TOKENS.radius.xl);
  summary.itemSpacing = 10;
  const summaryTop = row("Summary top", TOKENS.space.md);
  summaryTop.resize(322, 68);
  summaryTop.primaryAxisSizingMode = "FIXED";
  summaryTop.counterAxisSizingMode = "FIXED";
  summaryTop.primaryAxisAlignItems = "SPACE_BETWEEN";
  const coach = row("Coach", TOKENS.space.md);
  coach.appendChild(avatar(ctx, "CR", 44, "Coach Rhea avatar"));
  const coachCopy = stack("Coach copy", "VERTICAL", 4);
  coachCopy.appendChild(text("Assigned by", ctx.styles.text.small, TOKENS.color.mutedText));
  coachCopy.appendChild(text("Coach Rhea", ctx.styles.text.h3));
  coachCopy.appendChild(chip(ctx, "Trainer", "lime"));
  coach.appendChild(coachCopy);
  summaryTop.appendChild(coach);
  const facts = stack("Plan facts", "VERTICAL", 4);
  facts.appendChild(text("6 exercises", ctx.styles.text.bodyStrong));
  facts.appendChild(text("45–60 min", ctx.styles.text.bodyStrong));
  facts.appendChild(text("Difficulty: Medium", ctx.styles.text.bodyStrong, TOKENS.color.warning));
  summaryTop.appendChild(facts);
  summary.appendChild(summaryTop);
  const progress = glassCard("Progress inset", 322, 8, TOKENS.radius.lg);
  progress.itemSpacing = 6;
  progress.appendChild(text("Progress", ctx.styles.text.small, TOKENS.color.mutedText));
  const progressRow = row("Progress text", 4);
  progressRow.appendChild(text("2", ctx.styles.text.bodyStrong, TOKENS.color.accent));
  progressRow.appendChild(text("of 6 completed", ctx.styles.text.small, TOKENS.color.mutedText));
  progress.appendChild(progressRow);
  progress.appendChild(progressBar(298, 0.33));
  summary.appendChild(progress);
  screen.appendChild(summary);
  screen.appendChild(sectionTitle(ctx, "Exercises", "View tips"));
  const list = stack("Exercise List", "VERTICAL", TOKENS.space.sm);
  list.appendChild(exerciseRow(ctx, "Bench Press", "4 sets", "Barbell · 8–12 reps", true));
  list.appendChild(exerciseRow(ctx, "Incline Dumbbell Press", "3 sets", "Dumbbells · 8–12 reps", true));
  list.appendChild(exerciseRow(ctx, "Shoulder Press", "3 sets", "Dumbbells · 8–12 reps"));
  list.appendChild(exerciseRow(ctx, "Tricep Pushdown", "3 sets", "Cable · 10–15 reps"));
  list.appendChild(exerciseRow(ctx, "Lateral Raise", "3 sets", "Dumbbells · 12–15 reps"));
  list.appendChild(exerciseRow(ctx, "Push-up Finisher", "2 rounds", "To failure"));
  screen.appendChild(list);
  const sticky = glassCard("Sticky action bar", 350, 8, TOKENS.radius.xl);
  sticky.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(sticky, 350);
  sticky.itemSpacing = 8;
  sticky.primaryAxisAlignItems = "SPACE_BETWEEN";
  sticky.counterAxisAlignItems = "CENTER";
  sticky.appendChild(button(ctx, "Complete Workout", "primary", "check", 190));
  sticky.appendChild(button(ctx, "Send Feedback", "secondary", undefined, 136));
  screen.appendChild(sticky);
  return screen;
}

export const memberScreens = [memberHome, memberScanner, attendanceApproved, attendancePending, memberShop, memberPlanDetail];
