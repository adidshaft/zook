import {
  DesignContext,
  bottomNav,
  button,
  chip,
  exerciseRow,
  fixedFrame,
  glassCard,
  header,
  iconButton,
  listRow,
  memberNavItems,
  mobileShell,
  productCard,
  row,
  searchBar,
  spacer,
  stack,
  text
} from "../components";
import { createIcon } from "../icons";
import { TOKENS, glassFill, glassStroke, solid } from "../tokens";

function progressRing(ctx: DesignContext, label: string, color = TOKENS.color.accent): FrameNode {
  const wrap = fixedFrame(`Progress Ring / ${label}`, 82, 82);
  const base = figma.createEllipse();
  base.name = "Ring base";
  base.resize(82, 82);
  base.fills = [];
  base.strokes = [solid(TOKENS.color.white, 0.1)];
  base.strokeWeight = 8;
  const active = figma.createEllipse();
  active.name = "Ring progress";
  active.resize(82, 82);
  active.fills = [];
  active.strokes = [solid(color)];
  active.strokeWeight = 8;
  active.strokeCap = "ROUND";
  active.dashPattern = [155, 90];
  active.rotation = -90;
  active.effects = [
    { type: "DROP_SHADOW", color: { ...solid(color).color, a: 0.28 }, offset: { x: 0, y: 0 }, radius: 18, spread: -2, visible: true, blendMode: "NORMAL" }
  ];
  const value = text(label, ctx.styles.text.h3, color, "Ring label");
  wrap.appendChild(base);
  wrap.appendChild(active);
  wrap.appendChild(value);
  value.x = 27;
  value.y = 29;
  return wrap;
}

export function memberHome(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 01 Home");
  screen.appendChild(header(ctx, "Good morning, Aarav", "Iron Temple Gym · Pune", undefined, "bell"));

  const membership = glassCard("Active Membership Card", 350, TOKENS.space.xl, TOKENS.radius.xxl);
  const top = row("Membership top", TOKENS.space.md);
  top.resize(310, 96);
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  const copy = stack("Membership copy", "VERTICAL", 6);
  copy.appendChild(text("Active Membership", ctx.styles.text.small, TOKENS.color.mutedText));
  copy.appendChild(text("Hybrid Pro — 22 days left", ctx.styles.text.h2));
  copy.appendChild(text("8 visits remaining", ctx.styles.text.body, TOKENS.color.accent));
  top.appendChild(copy);
  top.appendChild(progressRing(ctx, "68%"));
  membership.appendChild(top);
  const actions = row("Membership actions", TOKENS.space.sm);
  actions.appendChild(button(ctx, "Scan QR", "primary", "qr", 148));
  actions.appendChild(button(ctx, "Start Workout", "secondary", "dumbbell", 154));
  membership.appendChild(actions);
  screen.appendChild(membership);

  const plan = glassCard("Today’s Plan", 350);
  const planTop = row("Plan row", TOKENS.space.md);
  planTop.primaryAxisAlignItems = "SPACE_BETWEEN";
  const planCopy = stack("Plan copy", "VERTICAL", 4);
  planCopy.appendChild(text("Today’s Plan", ctx.styles.text.small, TOKENS.color.mutedText));
  planCopy.appendChild(text("Push Day · 6 exercises · Coach Rhea", ctx.styles.text.bodyStrong));
  planTop.appendChild(planCopy);
  planTop.appendChild(chip(ctx, "Assigned", "lime"));
  plan.appendChild(planTop);
  screen.appendChild(plan);

  const activity = glassCard("Activity Card", 350);
  activity.appendChild(text("Activity", ctx.styles.text.h3));
  activity.appendChild(listRow(ctx, "Streak 5 days", "Last check-in 7:12 AM", "clock", chip(ctx, "Weekly goal 3/5", "glass")));
  screen.appendChild(activity);
  screen.appendChild(spacer(1, 64));
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Home"));
  return screen;
}

export function memberScanner(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 02 QR Check-in Scanner");
  screen.appendChild(header(ctx, "Scan Gym QR", "Iron Temple Gym", "back"));
  const scanner = glassCard("Scanner Frame", 350, TOKENS.space.xl, TOKENS.radius.xxl);
  scanner.resize(350, 356);
  scanner.primaryAxisAlignItems = "CENTER";
  const viewport = fixedFrame("Rolling QR scanner viewport", 286, 286);
  viewport.cornerRadius = TOKENS.radius.xl;
  viewport.fills = [solid(TOKENS.color.white, 0.03)];
  viewport.strokes = [solid(TOKENS.color.accent, 0.28)];
  viewport.strokeWeight = 1;
  for (let i = 0; i < 6; i += 1) {
    const line = fixedFrame(`Grid line ${i + 1}`, i % 2 === 0 ? 286 : 1, i % 2 === 0 ? 1 : 286);
    line.fills = [solid(TOKENS.color.white, 0.06)];
    viewport.appendChild(line);
    line.x = i % 2 === 0 ? 0 : 48 + i * 30;
    line.y = i % 2 === 0 ? 48 + i * 30 : 0;
  }
  const scan = fixedFrame("Horizontal scan line", 250, 2);
  scan.fills = [solid(TOKENS.color.accent, 0.9)];
  scan.effects = [{ type: "DROP_SHADOW", color: { ...solid(TOKENS.color.accent).color, a: 0.42 }, offset: { x: 0, y: 0 }, radius: 18, spread: 2, visible: true, blendMode: "NORMAL" }];
  viewport.appendChild(scan);
  scan.x = 18;
  scan.y = 132;
  scanner.appendChild(viewport);
  scanner.appendChild(text("Scan the rolling QR at the reception desk.", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(scanner);
  const validation = glassCard("Validation Card", 350);
  validation.appendChild(chip(ctx, "Membership active", "lime", "shield"));
  validation.appendChild(chip(ctx, "Branch verified", "lime", "check"));
  validation.appendChild(chip(ctx, "Server-authorized check-in", "lime", "check"));
  screen.appendChild(validation);
  const support = glassCard("Support Panel", 350);
  support.appendChild(text("Need help? Ask receptionist", ctx.styles.text.bodyStrong));
  screen.appendChild(support);
  screen.appendChild(spacer(1, 32));
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Check-in"));
  return screen;
}

export function attendanceApproved(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 03 Attendance Result Approved");
  screen.appendChild(header(ctx, "Attendance"));
  const hero = stack("Approved hero", "VERTICAL", TOKENS.space.md);
  hero.counterAxisAlignItems = "CENTER";
  hero.appendChild(progressRing(ctx, "✓"));
  hero.appendChild(text("Checked in", ctx.styles.text.h1));
  hero.appendChild(text("Entry approved for Iron Temple Gym", ctx.styles.text.body, TOKENS.color.mutedText));
  screen.appendChild(hero);
  const code = glassCard("Entry Code Card", 350);
  code.primaryAxisAlignItems = "CENTER";
  code.appendChild(text("Entry Code", ctx.styles.text.small, TOKENS.color.mutedText));
  code.appendChild(text("ZK-4821", ctx.styles.text.h1, TOKENS.color.accent));
  code.appendChild(text("Show this to the front desk if asked.", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(code);
  const details = glassCard("Details List", 350);
  for (const line of ["Time: 7:14 AM", "Branch: Default Branch", "Plan: Hybrid Pro", "Status: Approved"]) {
    details.appendChild(text(line, ctx.styles.text.body, TOKENS.color.primaryText));
  }
  screen.appendChild(details);
  const next = glassCard("Next Up Card", 350);
  next.appendChild(text("Push Day workout assigned by Coach Rhea", ctx.styles.text.bodyStrong));
  next.appendChild(button(ctx, "Open Plan", "primary", "clipboard", 310));
  screen.appendChild(next);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Check-in"));
  return screen;
}

export function attendancePending(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 04 Attendance Pending Approval");
  screen.appendChild(header(ctx, "Attendance"));
  const hero = stack("Pending hero", "VERTICAL", TOKENS.space.md);
  hero.counterAxisAlignItems = "CENTER";
  hero.appendChild(progressRing(ctx, "…", TOKENS.color.warning));
  hero.appendChild(text("Waiting for desk approval", ctx.styles.text.h2, TOKENS.color.primaryText));
  hero.appendChild(text("Your check-in was received. Please show this code to the receptionist.", ctx.styles.text.body, TOKENS.color.mutedText));
  screen.appendChild(hero);
  const code = glassCard("Entry Code Card", 350);
  code.primaryAxisAlignItems = "CENTER";
  code.appendChild(text("ZK-7319", ctx.styles.text.h1, TOKENS.color.warning));
  const chips = row("Pending chips", TOKENS.space.sm);
  chips.appendChild(chip(ctx, "Pending approval", "warning"));
  chips.appendChild(chip(ctx, "Membership active", "lime"));
  code.appendChild(chips);
  code.appendChild(chip(ctx, "Manual review required", "warning"));
  screen.appendChild(code);
  const reason = glassCard("Why Review Card", 350);
  reason.appendChild(text("Why review?", ctx.styles.text.h3));
  reason.appendChild(text("This scan needs staff confirmation because attendance approval mode is enabled.", ctx.styles.text.body, TOKENS.color.mutedText));
  screen.appendChild(reason);
  screen.appendChild(button(ctx, "View Attendance History", "secondary", "clock", 350));
  screen.appendChild(button(ctx, "Back to Home", "primary", "home", 350));
  return screen;
}

export function memberShop(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 05 Shop Catalog");
  const head = header(ctx, "Shop", "Iron Temple Gym", undefined, "cart");
  const badge = fixedFrame("Cart badge 2", 16, 16);
  badge.cornerRadius = TOKENS.radius.round;
  badge.fills = [solid(TOKENS.color.accent)];
  badge.appendChild(text("2", ctx.styles.text.caption, TOKENS.color.background));
  head.appendChild(badge);
  screen.appendChild(head);
  screen.appendChild(searchBar(ctx, "Search water, protein, towel…"));
  const categories = row("Category chips", TOKENS.space.sm);
  for (const [label, selected] of [["All", true], ["Water", false], ["Protein Shake", false], ["Shaker", false], ["Towel", false], ["Supplement", false]] as const) {
    categories.appendChild(chip(ctx, label, selected ? "lime" : "glass"));
  }
  screen.appendChild(categories);
  const grid = stack("Product Grid", "VERTICAL", TOKENS.space.md);
  const r1 = row("Product row 1", TOKENS.space.md);
  r1.appendChild(productCard(ctx, "Protein Shake", "₹149", "Ready at desk", "lime"));
  r1.appendChild(productCard(ctx, "Zook Shaker", "₹399", "Low stock", "warning"));
  const r2 = row("Product row 2", TOKENS.space.md);
  r2.appendChild(productCard(ctx, "Gym Towel", "₹249", "In stock", "lime"));
  r2.appendChild(productCard(ctx, "Water Bottle", "₹40", "In stock", "lime"));
  grid.appendChild(r1);
  grid.appendChild(r2);
  screen.appendChild(grid);
  const cart = glassCard("Floating Mini Cart", 350, TOKENS.space.md, TOKENS.radius.xl);
  cart.layoutMode = "HORIZONTAL";
  cart.primaryAxisAlignItems = "SPACE_BETWEEN";
  cart.counterAxisAlignItems = "CENTER";
  cart.appendChild(text("2 items · ₹548", ctx.styles.text.bodyStrong));
  cart.appendChild(iconButton("Open cart", "chevron", true));
  screen.appendChild(cart);
  screen.appendChild(bottomNav(ctx, "Member", memberNavItems, "Shop"));
  return screen;
}

export function memberPlanDetail(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Member / 06 Plan Detail");
  screen.appendChild(header(ctx, "Push Day", undefined, "back", "more"));
  const summary = glassCard("Plan Summary Card", 350);
  summary.appendChild(text("Assigned by Coach Rhea", ctx.styles.text.bodyStrong));
  const meta = row("Plan meta", TOKENS.space.sm);
  for (const item of ["6 exercises", "45–60 min", "Difficulty: Medium"]) meta.appendChild(chip(ctx, item, "glass"));
  summary.appendChild(meta);
  summary.appendChild(text("2 of 6 completed", ctx.styles.text.small, TOKENS.color.mutedText));
  const bar = fixedFrame("Progress 33 percent", 310, 8);
  bar.cornerRadius = TOKENS.radius.round;
  bar.fills = [solid(TOKENS.color.white, 0.08)];
  const fill = fixedFrame("Progress fill", 102, 8);
  fill.cornerRadius = TOKENS.radius.round;
  fill.fills = [solid(TOKENS.color.accent)];
  bar.appendChild(fill);
  summary.appendChild(bar);
  screen.appendChild(summary);
  const list = stack("Exercise List", "VERTICAL", TOKENS.space.sm);
  list.appendChild(exerciseRow(ctx, "Bench Press", "4 sets", "Barbell · 8–12 reps", true));
  list.appendChild(exerciseRow(ctx, "Incline Dumbbell Press", "3 sets", "Dumbbells · 8–12 reps", true));
  list.appendChild(exerciseRow(ctx, "Shoulder Press", "3 sets", "Dumbbells · 8–12 reps", false, true));
  list.appendChild(exerciseRow(ctx, "Tricep Pushdown", "3 sets", "Cable · 10–15 reps"));
  list.appendChild(exerciseRow(ctx, "Lateral Raise", "3 sets", "Dumbbells · 12–15 reps"));
  list.appendChild(exerciseRow(ctx, "Push-up Finisher", "2 rounds", "To failure"));
  screen.appendChild(list);
  const sticky = row("Sticky action bar", TOKENS.space.sm);
  sticky.appendChild(button(ctx, "Complete", "primary", "check", 166));
  sticky.appendChild(button(ctx, "Add Exercise", "secondary", "plus", 174));
  screen.appendChild(sticky);
  return screen;
}

export const memberScreens = [memberHome, memberScanner, attendanceApproved, attendancePending, memberShop, memberPlanDetail];
