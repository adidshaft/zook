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
  row,
  sectionTitle,
  stack,
  text
} from "../components";
import { TOKENS } from "../tokens";

export function ownerCommand(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Owner / 01 Command View");
  screen.itemSpacing = 12;
  screen.appendChild(header(ctx, "Command", "Iron Temple Gym · Pune", undefined, undefined, "Owner"));
  const kpis = stack("KPI Grid", "VERTICAL", TOKENS.space.md);
  const r1 = row("KPI row 1", TOKENS.space.md);
  r1.appendChild(kpiCard(ctx, "Active members", "412"));
  r1.appendChild(kpiCard(ctx, "Today check-ins", "48"));
  const r2 = row("KPI row 2", TOKENS.space.md);
  r2.appendChild(kpiCard(ctx, "Revenue", "₹82.4k"));
  r2.appendChild(kpiCard(ctx, "Pending approvals", "7", "warning"));
  kpis.appendChild(r1);
  kpis.appendChild(r2);
  screen.appendChild(kpis);

  screen.appendChild(sectionTitle(ctx, "Needs attention"));
  const attention = glassCard("Needs Attention", 350, 12, TOKENS.radius.xl);
  for (const [title, icon, label, tone] of [
    ["3 join requests waiting", "user", "New", "lime"],
    ["1 flagged check-in", "warning", "Review", "warning"],
    ["5 memberships expiring soon", "clock", "Soon", "glass"],
    ["2 products low stock", "bag", "Low", "warning"]
  ] as const) {
    const item = row(`Attention / ${title}`, TOKENS.space.sm);
    item.resize(318, 38);
    item.primaryAxisSizingMode = "FIXED";
    item.counterAxisSizingMode = "FIXED";
    item.primaryAxisAlignItems = "SPACE_BETWEEN";
    item.appendChild(text(title, ctx.styles.text.bodyStrong));
    item.appendChild(chip(ctx, label, tone, icon));
    attention.appendChild(item);
    if (title !== "2 products low stock") attention.appendChild(divider(318, 0.08));
  }
  screen.appendChild(attention);

  screen.appendChild(sectionTitle(ctx, "Recent activity"));
  const recent = glassCard("Recent Activity", 350, 14, TOKENS.radius.xl);
  for (const [title, subtitle] of [
    ["Offline payment recorded", "Receptionist · ₹2,499"],
    ["Push Day assigned", "Coach Rhea · Aarav Mehta"],
    ["Protein Shake stock updated", "Shop inventory · 18 left"]
  ] as const) {
    const item = row(`Activity / ${title}`, TOKENS.space.sm);
    item.resize(318, 38);
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
