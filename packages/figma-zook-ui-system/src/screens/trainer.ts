import {
  DesignContext,
  avatar,
  bottomNav,
  button,
  chip,
  divider,
  footerSpacer,
  fixedFrame,
  glassCard,
  header,
  iconDisk,
  mobileShell,
  row,
  stack,
  text,
  trainerNavItems
} from "../components";
import { createIcon } from "../icons";
import { TOKENS, glassFill, solid } from "../tokens";

function segmentedTabs(ctx: DesignContext): FrameNode {
  const tabs = row("Segmented tabs", 0);
  tabs.resize(350, 42);
  tabs.primaryAxisSizingMode = "FIXED";
  tabs.counterAxisSizingMode = "FIXED";
  tabs.cornerRadius = TOKENS.radius.round;
  tabs.fills = [glassFill()];
  tabs.strokes = [solid(TOKENS.color.white, 0.1)];
  tabs.strokeWeight = 1;
  for (const label of ["Summary", "Plans", "Progress", "Notes"]) {
    const item = stack(`Tab / ${label}`, "VERTICAL", 0);
    item.resize(87.5, 42);
    item.primaryAxisSizingMode = "FIXED";
    item.counterAxisSizingMode = "FIXED";
    item.primaryAxisAlignItems = "CENTER";
    item.counterAxisAlignItems = "CENTER";
    item.cornerRadius = TOKENS.radius.round;
    item.fills = [label === "Summary" ? solid(TOKENS.color.accent, 0.12) : solid(TOKENS.color.white, 0)];
    item.appendChild(text(label, ctx.styles.text.small, label === "Summary" ? TOKENS.color.primaryText : TOKENS.color.mutedText));
    tabs.appendChild(item);
  }
  return tabs;
}

function clientSummaryCard(
  ctx: DesignContext,
  title: string,
  value: string,
  icon: "dumbbell" | "clipboard" | "shield" | "clock" | "check"
): FrameNode {
  const card = glassCard(`Client Summary / ${title}`, 350, 8, TOKENS.radius.lg);
  card.layoutMode = "HORIZONTAL";
  card.resize(350, 48);
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.primaryAxisAlignItems = "SPACE_BETWEEN";
  card.counterAxisAlignItems = "CENTER";
  card.itemSpacing = TOKENS.space.sm;
  card.appendChild(iconDisk(icon, 32, "glass"));
  const copy = stack("Copy", "VERTICAL", 2);
  copy.appendChild(text(title, ctx.styles.text.bodyStrong));
  copy.appendChild(text(value, ctx.styles.text.small, value.includes("7:14") || value.startsWith("2 ") ? TOKENS.color.accent : TOKENS.color.mutedText));
  card.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  card.appendChild(createIcon("chevron", 14, TOKENS.color.subtleText));
  return card;
}

export function trainerClientDetail(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Trainer / 01 Client Detail");
  screen.itemSpacing = 6;
  screen.appendChild(header(ctx, "Client Detail", undefined, "back", undefined, "Trainer"));
  const privacy = row("Privacy line", TOKENS.space.sm);
  privacy.appendChild(createIcon("shield", 14, TOKENS.color.mutedText));
  privacy.appendChild(text("You’re viewing your assigned client only", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(privacy);

  const profile = glassCard("Client Profile Card", 350, 10, TOKENS.radius.xxl);
  profile.itemSpacing = 8;
  const top = row("Profile top", TOKENS.space.md);
  top.resize(330, 56);
  top.primaryAxisSizingMode = "FIXED";
  top.counterAxisSizingMode = "FIXED";
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  top.appendChild(avatar(ctx, "AM", 50, "AM avatar"));
  const copy = stack("Client copy", "VERTICAL", 4);
  copy.appendChild(text("Aarav Mehta", ctx.styles.text.h2));
  const active = row("Active status", TOKENS.space.xs);
  const dot = fixedFrame("Green status dot", 8, 8);
  dot.cornerRadius = TOKENS.radius.round;
  dot.fills = [solid(TOKENS.color.accent)];
  active.appendChild(dot);
  active.appendChild(text("Active member", ctx.styles.text.small, TOKENS.color.accent));
  copy.appendChild(active);
  top.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  top.appendChild(createIcon("more", 18, TOKENS.color.primaryText));
  profile.appendChild(top);
  const facts = row("Client facts", TOKENS.space.sm);
  facts.resize(330, 34);
  facts.primaryAxisSizingMode = "FIXED";
  facts.primaryAxisAlignItems = "SPACE_BETWEEN";
  for (const [label, value, icon] of [
    ["Goal", "Muscle gain", "dumbbell"],
    ["PT Pack", "6 sessions left", "clipboard"],
    ["Tracking", "Opted in", "shield"]
  ] as const) {
    const fact = row(`Fact / ${label}`, TOKENS.space.sm);
    fact.appendChild(createIcon(icon, 18, TOKENS.color.accentSoft));
    const factCopy = stack("Copy", "VERTICAL", 1);
    factCopy.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.mutedText));
    factCopy.appendChild(text(value, ctx.styles.text.small, value.includes("Opted") ? TOKENS.color.accent : TOKENS.color.primaryText));
    fact.appendChild(factCopy);
    facts.appendChild(fact);
  }
  profile.appendChild(facts);
  screen.appendChild(profile);

  screen.appendChild(segmentedTabs(ctx));
  const cards = stack("Summary rows", "VERTICAL", 6);
  for (const [title, value, icon] of [
    ["Fitness goal", "Muscle gain", "dumbbell"],
    ["Diet note", "Vegetarian", "clipboard"],
    ["Allergy note", "None added", "shield"],
    ["Last check-in", "Today 7:14 AM", "clock"],
    ["Recent progress", "2 workouts completed this week", "check"]
  ] as const) {
    cards.appendChild(clientSummaryCard(ctx, title, value, icon));
  }
  screen.appendChild(cards);
  screen.appendChild(button(ctx, "Create Plan", "primary", "plus", 350));
  screen.appendChild(button(ctx, "Generate AI Draft", "secondary", "edit", 350));
  footerSpacer(screen);
  screen.appendChild(bottomNav(ctx, "Trainer", trainerNavItems, "Clients"));
  return screen;
}

function editableCard(ctx: DesignContext, title: string, body: string, icon: "dumbbell" | "clipboard" | "shield" | "clock"): FrameNode {
  const card = glassCard(`Editable Section / ${title}`, 350, 8, TOKENS.radius.lg);
  card.layoutMode = "HORIZONTAL";
  card.resize(350, 54);
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.itemSpacing = 8;
  card.primaryAxisAlignItems = "SPACE_BETWEEN";
  card.counterAxisAlignItems = "CENTER";
  card.appendChild(iconDisk(icon, 32, "lime"));
  const copy = stack("Editable copy", "VERTICAL", 3);
  copy.appendChild(text(title, ctx.styles.text.bodyStrong));
  copy.appendChild(text(body, ctx.styles.text.small, TOKENS.color.mutedText));
  card.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  card.appendChild(iconDisk("edit", 30, "glass"));
  return card;
}

export function trainerAiDraftReview(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Trainer / 02 AI Draft Review");
  screen.itemSpacing = 6;
  screen.appendChild(header(ctx, "AI Draft Review", undefined, "back", undefined, "Trainer"));
  screen.appendChild(chip(ctx, "Review required", "warning", "warning"));
  const alert = glassCard("AI Alert Card", 350, 8, TOKENS.radius.lg);
  alert.layoutMode = "HORIZONTAL";
  alert.resize(350, 54);
  alert.primaryAxisSizingMode = "FIXED";
  alert.counterAxisSizingMode = "FIXED";
  alert.counterAxisAlignItems = "CENTER";
  alert.appendChild(iconDisk("sparkle", 32, "warning"));
  const alertCopy = stack("Alert copy", "VERTICAL", 3);
  alertCopy.appendChild(text("AI generated this draft.", ctx.styles.text.bodyStrong));
  alertCopy.appendChild(text("Edit and approve before assigning.", ctx.styles.text.small, TOKENS.color.mutedText));
  alert.appendChild(alertCopy);
  screen.appendChild(alert);

  const summary = glassCard("Plan Summary", 350, 10, TOKENS.radius.xl);
  summary.itemSpacing = 8;
  const top = row("Plan top", TOKENS.space.md);
  top.resize(330, 44);
  top.primaryAxisSizingMode = "FIXED";
  top.counterAxisSizingMode = "FIXED";
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  top.appendChild(iconDisk("dumbbell", 36, "lime"));
  const copy = stack("Plan copy", "VERTICAL", 4);
  copy.appendChild(text("4-week Push/Pull Routine", ctx.styles.text.h3));
  top.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  top.appendChild(createIcon("more", 16, TOKENS.color.primaryText));
  summary.appendChild(top);
  const facts = row("Draft facts", 10);
  facts.resize(330, 32);
  facts.primaryAxisSizingMode = "FIXED";
  facts.counterAxisSizingMode = "FIXED";
  facts.primaryAxisAlignItems = "SPACE_BETWEEN";
  for (const [label, value, icon] of [
    ["Client", "Aarav Mehta", "user"],
    ["Goal", "Muscle gain", "dumbbell"],
    ["Difficulty", "Medium", "warning"]
  ] as const) {
    const fact = row(`Draft fact / ${label}`, 5);
    fact.appendChild(createIcon(icon, 12, label === "Difficulty" ? TOKENS.color.warning : TOKENS.color.accent));
    const factCopy = stack("Copy", "VERTICAL", 1);
    factCopy.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.mutedText));
    factCopy.appendChild(text(value, ctx.styles.text.caption, label === "Difficulty" ? TOKENS.color.warning : TOKENS.color.primaryText));
    fact.appendChild(factCopy);
    facts.appendChild(fact);
  }
  summary.appendChild(facts);
  screen.appendChild(summary);

  screen.appendChild(editableCard(ctx, "Week 1 Focus", "Hypertrophy emphasis with compound lifts", "clock"));
  screen.appendChild(editableCard(ctx, "Workout A", "Chest, Shoulders, Triceps · 45–60 min", "dumbbell"));
  screen.appendChild(editableCard(ctx, "Workout B", "Back, Biceps · 45–60 min", "clipboard"));
  screen.appendChild(editableCard(ctx, "Recovery Notes", "Mobility, sleep, hydration and deload guidance", "shield"));
  const safety = glassCard("Safety Panel", 350, 8, TOKENS.radius.xl);
  safety.itemSpacing = 7;
  const safetyTop = row("Safety review metrics", 10);
  safetyTop.resize(334, 42);
  safetyTop.primaryAxisSizingMode = "FIXED";
  safetyTop.counterAxisSizingMode = "FIXED";
  safetyTop.primaryAxisAlignItems = "SPACE_BETWEEN";
  safetyTop.appendChild(createIcon("shield", 18, TOKENS.color.accentSoft));
  for (const [label, value, tone] of [
    ["Blocked content", "None", TOKENS.color.accent],
    ["Medical-risk check", "Clear", TOKENS.color.accent],
    ["Trainer approval", "Required", TOKENS.color.warning]
  ] as const) {
    const metric = stack(`Safety metric / ${label}`, "VERTICAL", 2);
    metric.resize(82, 42);
    metric.primaryAxisSizingMode = "FIXED";
    metric.counterAxisSizingMode = "FIXED";
    metric.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.mutedText));
    metric.appendChild(text(value, ctx.styles.text.caption, tone));
    safetyTop.appendChild(metric);
  }
  safety.appendChild(safetyTop);
  safety.appendChild(divider(330, 0.08));
  const privacy = row("Draft privacy", TOKENS.space.sm);
  privacy.appendChild(createIcon("lock", 12, TOKENS.color.mutedText));
  privacy.appendChild(text("This draft is not visible to the client yet.", ctx.styles.text.caption, TOKENS.color.mutedText));
  safety.appendChild(privacy);
  screen.appendChild(safety);
  const sticky = glassCard("Sticky actions", 350, 8, TOKENS.radius.xl);
  sticky.itemSpacing = 7;
  sticky.counterAxisAlignItems = "CENTER";
  sticky.appendChild(button(ctx, "Assign Plan", "primary", "user", 326));
  sticky.appendChild(button(ctx, "Edit Draft", "secondary", "edit", 326));
  sticky.appendChild(text("Discard", ctx.styles.text.bodyStrong, TOKENS.color.mutedText));
  screen.appendChild(sticky);
  return screen;
}

export const trainerScreens = [trainerClientDetail, trainerAiDraftReview];
