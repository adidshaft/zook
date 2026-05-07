import {
  DesignContext,
  bottomNav,
  chip,
  divider,
  footerSpacer,
  glassCard,
  header,
  kpiCard,
  mobileShell,
  ownerNavItems,
  paragraph,
  row,
  sectionTitle,
  stack,
  text
} from "../components";
import { createIcon } from "../icons";
import { TOKENS } from "../tokens";

export function ownerCommand(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Owner / 01 Command View");
  screen.itemSpacing = 8;
  screen.appendChild(header(ctx, "Command", "Iron Temple Gym · Pune", undefined, undefined, "Owner"));
  const kpis = stack("KPI Grid", "VERTICAL", TOKENS.space.sm);
  const r1 = row("KPI row 1", TOKENS.space.sm);
  r1.appendChild(kpiCard(ctx, "Active members", "412"));
  r1.appendChild(kpiCard(ctx, "Today check-ins", "48"));
  const r2 = row("KPI row 2", TOKENS.space.sm);
  r2.appendChild(kpiCard(ctx, "Revenue", "₹82.4k"));
  r2.appendChild(kpiCard(ctx, "Pending approvals", "7", "warning"));
  kpis.appendChild(r1);
  kpis.appendChild(r2);
  screen.appendChild(kpis);

  screen.appendChild(sectionTitle(ctx, "Needs attention"));
  const attention = glassCard("Needs Attention", 350, 10, TOKENS.radius.xl);
  attention.itemSpacing = 6;
  for (const [title, icon, label, tone] of [
    ["3 join requests waiting", "user", "New", "lime"],
    ["1 flagged check-in", "warning", "Review", "warning"],
    ["5 memberships expiring soon", "clock", "Soon", "glass"],
    ["2 products low stock", "bag", "Low", "warning"]
  ] as const) {
    const item = row(`Attention / ${title}`, TOKENS.space.sm);
    item.resize(318, 34);
    item.primaryAxisSizingMode = "FIXED";
    item.counterAxisSizingMode = "FIXED";
    item.primaryAxisAlignItems = "SPACE_BETWEEN";
    item.appendChild(paragraph(title, ctx.styles.text.bodyStrong, 176, TOKENS.color.primaryText, "Text"));
    item.appendChild(chip(ctx, label, tone, icon));
    item.appendChild(createIcon("chevron", 12, TOKENS.color.subtleText));
    attention.appendChild(item);
    if (title !== "2 products low stock") attention.appendChild(divider(318, 0.08));
  }
  screen.appendChild(attention);

  screen.appendChild(sectionTitle(ctx, "Recent activity"));
  const recent = glassCard("Recent Activity", 350, 10, TOKENS.radius.xl);
  recent.itemSpacing = 8;
  for (const [title, subtitle] of [
    ["Receptionist recorded offline payment", "₹2,499 · Aarav Mehta"],
    ["Coach Rhea assigned Push Day", "Aarav Mehta · Plan update"],
    ["Recovery Drink stock updated", "Shop inventory · 18 left"]
  ] as const) {
    const item = row(`Activity / ${title}`, TOKENS.space.sm);
    item.resize(318, 34);
    item.primaryAxisSizingMode = "FIXED";
    item.counterAxisSizingMode = "FIXED";
    const copy = stack("Copy", "VERTICAL", 2);
    copy.appendChild(text(title, ctx.styles.text.bodyStrong));
    copy.appendChild(text(subtitle, ctx.styles.text.caption, TOKENS.color.mutedText));
    item.appendChild(copy);
    copy.layoutSizingHorizontal = "FILL";
    recent.appendChild(item);
  }
  screen.appendChild(recent);
  footerSpacer(screen);
  screen.appendChild(bottomNav(ctx, "Owner", ownerNavItems, "Command"));
  return screen;
}

export const ownerScreens = [ownerCommand];
