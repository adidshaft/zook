import { DesignContext, bottomNav, chip, glassCard, header, kpiCard, listRow, mobileShell, ownerNavItems, row, stack, text } from "../components";
import { TOKENS } from "../tokens";

export function ownerCommand(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Owner / 01 Command View");
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
  const attention = glassCard("Needs Attention", 350);
  attention.appendChild(text("Needs attention", ctx.styles.text.h3));
  attention.appendChild(listRow(ctx, "3 join requests waiting", undefined, "user", chip(ctx, "New", "lime")));
  attention.appendChild(listRow(ctx, "1 flagged check-in", undefined, "warning", chip(ctx, "Review", "warning")));
  attention.appendChild(listRow(ctx, "5 memberships expiring soon", undefined, "clock", chip(ctx, "Soon", "glass")));
  attention.appendChild(listRow(ctx, "2 products low stock", undefined, "bag", chip(ctx, "Low", "warning")));
  screen.appendChild(attention);
  const recent = glassCard("Recent Activity", 350);
  recent.appendChild(text("Recent activity", ctx.styles.text.h3));
  recent.appendChild(text("Receptionist recorded offline payment", ctx.styles.text.body, TOKENS.color.primaryText));
  recent.appendChild(text("Coach Rhea assigned Push Day", ctx.styles.text.body, TOKENS.color.primaryText));
  recent.appendChild(text("Protein Shake stock updated", ctx.styles.text.body, TOKENS.color.primaryText));
  screen.appendChild(recent);
  screen.appendChild(bottomNav(ctx, "Owner", ownerNavItems, "Command"));
  return screen;
}

export const ownerScreens = [ownerCommand];
