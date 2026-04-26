import {
  DesignContext,
  avatar,
  button,
  chip,
  fixedFrame,
  glassCard,
  header,
  iconDisk,
  mobileShell,
  paragraph,
  row,
  stack,
  text,
  textField
} from "../components";
import { createIcon } from "../icons";
import { TOKENS, solid } from "../tokens";

export function receptionistPayment(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Receptionist / 01 Offline Payment Entry");
  screen.itemSpacing = 10;
  screen.appendChild(header(ctx, "Record Payment", "Member: Aarav Mehta", "back"));

  const member = glassCard("Member Summary Card", 350, 14, TOKENS.radius.xl);
  member.layoutMode = "HORIZONTAL";
  member.primaryAxisAlignItems = "SPACE_BETWEEN";
  member.counterAxisAlignItems = "CENTER";
  member.appendChild(avatar(ctx, "AM", 58, "Member AM avatar"));
  const left = stack("Member renewal copy", "VERTICAL", 7);
  left.appendChild(text("Hybrid Pro renewal", ctx.styles.text.h3));
  left.appendChild(chip(ctx, "Membership expired yesterday", "warning", "warning"));
  left.appendChild(text("Member ID  ZK-M-10234", ctx.styles.text.small, TOKENS.color.mutedText));
  member.appendChild(left);
  left.layoutSizingHorizontal = "FILL";
  const due = stack("Amount due", "VERTICAL", 4);
  due.appendChild(text("Amount due", ctx.styles.text.small, TOKENS.color.mutedText));
  due.appendChild(text("₹2,499", ctx.styles.text.h2, TOKENS.color.accent));
  due.appendChild(text("Hybrid Pro", ctx.styles.text.caption, TOKENS.color.mutedText));
  due.appendChild(text("Yesterday", ctx.styles.text.caption, TOKENS.color.warning));
  member.appendChild(due);
  screen.appendChild(member);

  screen.appendChild(text("Payment mode", ctx.styles.text.h3));
  const modes = row("Payment mode chips", TOKENS.space.sm);
  modes.resize(350, 44);
  modes.primaryAxisSizingMode = "FIXED";
  modes.clipsContent = true;
  for (const [label, selected, icon] of [
    ["Cash", false, "rupee"],
    ["Direct UPI", true, "home"],
    ["Bank", false, "shield"],
    ["Card", false, "clipboard"],
    ["Manual", false, "edit"]
  ] as const) {
    modes.appendChild(chip(ctx, label, selected ? "lime" : "glass", icon));
  }
  screen.appendChild(modes);

  const fields = stack("Payment fields", "VERTICAL", TOKENS.space.sm);
  fields.appendChild(textField(ctx, "Amount", "₹2,499"));
  fields.appendChild(textField(ctx, "Reference ID (optional)", "UPI Ref No. / Transaction ID"));
  fields.appendChild(textField(ctx, "Payment note (optional)", "Add a note for this payment"));
  screen.appendChild(fields);

  const audit = glassCard("Audit Warning", 350, 10, TOKENS.radius.md);
  audit.layoutMode = "HORIZONTAL";
  audit.counterAxisAlignItems = "CENTER";
  audit.appendChild(createIcon("warning", 16, TOKENS.color.warning));
  audit.appendChild(paragraph("Manual records require reason and are saved in audit logs.", ctx.styles.text.caption, 290, TOKENS.color.warning));
  screen.appendChild(audit);

  const reason = glassCard("Reason Dropdown", 350, 12, TOKENS.radius.lg);
  reason.layoutMode = "HORIZONTAL";
  reason.primaryAxisAlignItems = "SPACE_BETWEEN";
  reason.counterAxisAlignItems = "CENTER";
  const reasonCopy = stack("Reason copy", "VERTICAL", 4);
  reasonCopy.appendChild(text("Reason", ctx.styles.text.caption, TOKENS.color.mutedText));
  reasonCopy.appendChild(text("Desk collected payment", ctx.styles.text.bodyStrong));
  reason.appendChild(reasonCopy);
  reason.appendChild(createIcon("chevron", 16, TOKENS.color.mutedText));
  screen.appendChild(reason);

  const sticky = glassCard("Sticky actions", 350, 12, TOKENS.radius.xl);
  sticky.appendChild(button(ctx, "Record Payment", "primary", "rupee", 326));
  const cancel = fixedFrame("Cancel touch target", 326, 36);
  cancel.fills = [solid(TOKENS.color.white, 0)];
  const cancelText = text("Cancel", ctx.styles.text.bodyStrong, TOKENS.color.mutedText);
  cancel.appendChild(cancelText);
  cancelText.x = (326 - cancelText.width) / 2;
  cancelText.y = 8;
  sticky.appendChild(cancel);
  screen.appendChild(sticky);
  return screen;
}

export const receptionistScreens = [receptionistPayment];
