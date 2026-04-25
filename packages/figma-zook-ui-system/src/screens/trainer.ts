import { DesignContext, bottomNav, button, chip, fixedFrame, glassCard, header, listRow, mobileShell, row, safetyPanel, stack, text, trainerNavItems } from "../components";
import { createIcon } from "../icons";
import { TOKENS, glassFill, solid } from "../tokens";

export function trainerClientDetail(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Trainer / 01 Client Detail");
  screen.appendChild(header(ctx, "Client Detail", undefined, "back", undefined, "Trainer"));
  screen.appendChild(text("You’re viewing your assigned client only", ctx.styles.text.small, TOKENS.color.mutedText));
  const profile = glassCard("Client Profile Card", 350, TOKENS.space.xl, TOKENS.radius.xxl);
  const top = row("Profile top", TOKENS.space.md);
  const avatar = fixedFrame("AM Avatar", 58, 58);
  avatar.cornerRadius = TOKENS.radius.round;
  avatar.fills = [solid(TOKENS.color.accent, 0.16)];
  const initials = text("AM", ctx.styles.text.h3, TOKENS.color.accent);
  avatar.appendChild(initials);
  initials.x = 15;
  initials.y = 18;
  top.appendChild(avatar);
  const copy = stack("Client copy", "VERTICAL", 5);
  copy.appendChild(text("Aarav Mehta", ctx.styles.text.h2));
  copy.appendChild(text("Active member", ctx.styles.text.small, TOKENS.color.accent));
  copy.appendChild(text("Goal: Muscle gain", ctx.styles.text.small, TOKENS.color.mutedText));
  top.appendChild(copy);
  profile.appendChild(top);
  const chips = row("Profile chips", TOKENS.space.sm);
  chips.appendChild(chip(ctx, "PT Pack: 6 sessions left", "lime"));
  chips.appendChild(chip(ctx, "Tracking: Opted in", "glass"));
  profile.appendChild(chips);
  screen.appendChild(profile);
  const tabs = row("Segmented tabs", 0);
  tabs.resize(350, 44);
  tabs.cornerRadius = TOKENS.radius.lg;
  tabs.fills = [glassFill()];
  for (const label of ["Summary", "Plans", "Progress", "Notes"]) tabs.appendChild(chip(ctx, label, label === "Summary" ? "lime" : "glass"));
  screen.appendChild(tabs);
  const cards = glassCard("Compact Summary Cards", 350);
  for (const item of [
    "Fitness goal: Muscle gain",
    "Diet note: Vegetarian",
    "Allergy note: None added",
    "Last check-in: Today 7:14 AM",
    "Recent progress: 2 workouts completed this week"
  ]) {
    cards.appendChild(text(item, ctx.styles.text.body, TOKENS.color.primaryText));
  }
  screen.appendChild(cards);
  const actions = row("Trainer actions", TOKENS.space.sm);
  actions.appendChild(button(ctx, "Create Plan", "primary", "plus", 168));
  actions.appendChild(button(ctx, "Generate AI Draft", "secondary", "edit", 172));
  screen.appendChild(actions);
  screen.appendChild(bottomNav(ctx, "Trainer", trainerNavItems, "Clients"));
  return screen;
}

function editableCard(ctx: DesignContext, title: string, body: string): FrameNode {
  const card = glassCard(`Editable Section / ${title}`, 350, TOKENS.space.md, TOKENS.radius.lg);
  const top = row("Editable title", TOKENS.space.md);
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  top.appendChild(text(title, ctx.styles.text.bodyStrong));
  top.appendChild(createIcon("edit", 16, TOKENS.color.accent));
  card.appendChild(top);
  card.appendChild(text(body, ctx.styles.text.small, TOKENS.color.mutedText));
  return card;
}

export function trainerAiDraftReview(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Trainer / 02 AI Draft Review");
  screen.appendChild(header(ctx, "AI Draft Review", undefined, "back", undefined, "Trainer"));
  screen.appendChild(chip(ctx, "Review required", "warning"));
  const alert = glassCard("AI Alert Card", 350);
  alert.appendChild(text("AI generated this draft. Edit and approve before assigning.", ctx.styles.text.bodyStrong, TOKENS.color.warning));
  screen.appendChild(alert);
  const summary = glassCard("Plan Summary", 350);
  summary.appendChild(text("4-week Push/Pull Routine", ctx.styles.text.h3));
  summary.appendChild(text("Client Aarav Mehta", ctx.styles.text.small, TOKENS.color.mutedText));
  summary.appendChild(text("Goal Muscle gain", ctx.styles.text.small, TOKENS.color.mutedText));
  summary.appendChild(text("Difficulty Medium", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(summary);
  screen.appendChild(editableCard(ctx, "Week 1 Focus", "Build movement quality and moderate volume."));
  screen.appendChild(editableCard(ctx, "Workout A", "Bench Press, Shoulder Press, Lateral Raise."));
  screen.appendChild(editableCard(ctx, "Workout B", "Rows, Pull-downs, Curl variation."));
  screen.appendChild(editableCard(ctx, "Recovery Notes", "Sleep 7 hours, deload if shoulder pain appears."));
  screen.appendChild(safetyPanel(ctx, ["Blocked content: none", "Medical-risk check: clear", "Trainer approval required", "This draft is not visible to the client yet."]));
  const sticky = row("Sticky actions", TOKENS.space.sm);
  sticky.appendChild(button(ctx, "Assign Plan", "primary", "check", 136));
  sticky.appendChild(button(ctx, "Edit Draft", "secondary", "edit", 108));
  sticky.appendChild(button(ctx, "Discard", "danger", "trash", 98));
  screen.appendChild(sticky);
  return screen;
}

export const trainerScreens = [trainerClientDetail, trainerAiDraftReview];
