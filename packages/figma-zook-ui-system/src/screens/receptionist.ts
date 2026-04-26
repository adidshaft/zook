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
  screen.itemSpacing = 9;
  screen.appendChild(header(ctx, "Record Payment", "Member: Aarav Mehta", "back"));

  const member = glassCard("Member Summary Card", 350, 14, TOKENS.radius.xl);
  member.layoutMode = "VERTICAL";
  member.counterAxisSizingMode = "AUTO";
  member.itemSpacing = 12;
  member.counterAxisAlignItems = "CENTER";
  const memberTop = row("Member top row", 8);
  memberTop.resize(322, 78);
  memberTop.primaryAxisSizingMode = "FIXED";
  memberTop.counterAxisSizingMode = "FIXED";
  memberTop.primaryAxisAlignItems = "SPACE_BETWEEN";
  memberTop.appendChild(avatar(ctx, "AM", 58, "Member AM avatar"));
  const left = stack("Member renewal copy", "VERTICAL", 4);
  left.resize(146, 74);
  left.primaryAxisSizingMode = "FIXED";
  left.counterAxisSizingMode = "FIXED";
  left.appendChild(text("Hybrid Pro", ctx.styles.text.h3));
  left.appendChild(text("Renewal · ZK-M-10234", ctx.styles.text.small, TOKENS.color.mutedText));
  left.appendChild(text("Expired yesterday", ctx.styles.text.caption, TOKENS.color.warning));
  memberTop.appendChild(left);
  const due = stack("Amount due", "VERTICAL", 4);
  due.resize(102, 74);
  due.primaryAxisSizingMode = "FIXED";
  due.counterAxisSizingMode = "FIXED";
  due.appendChild(text("Amount due", ctx.styles.text.small, TOKENS.color.mutedText));
  due.appendChild(text("₹2,499", ctx.styles.text.h1, TOKENS.color.accent));
  due.appendChild(text("Hybrid Pro", ctx.styles.text.caption, TOKENS.color.primaryText));
  memberTop.appendChild(due);
  member.appendChild(memberTop);
  member.appendChild(chip(ctx, "Membership expired yesterday", "warning", "warning"));
  screen.appendChild(member);

  screen.appendChild(text("Payment mode", ctx.styles.text.h3));
  const modes = stack("Payment mode chips", "VERTICAL", TOKENS.space.sm);
  modes.resize(350, 78);
  modes.primaryAxisSizingMode = "FIXED";
  modes.counterAxisSizingMode = "FIXED";
  const modeRowOne = row("Payment mode row 1", TOKENS.space.sm);
  const modeRowTwo = row("Payment mode row 2", TOKENS.space.sm);
  for (const [label, selected, icon] of [
    ["Cash", false, "rupee"],
    ["Direct UPI", true, "home"],
    ["Bank", false, "shield"],
    ["Card", false, "clipboard"],
    ["Manual", false, "edit"]
  ] as const) {
    (label === "Card" || label === "Manual" ? modeRowTwo : modeRowOne).appendChild(chip(ctx, label, selected ? "lime" : "glass", icon));
  }
  modes.appendChild(modeRowOne);
  modes.appendChild(modeRowTwo);
  screen.appendChild(modes);

  const fields = stack("Payment fields", "VERTICAL", TOKENS.space.sm);
  fields.appendChild(textField(ctx, "Amount", "₹2,499"));
  fields.appendChild(textField(ctx, "Reference ID (optional)", "UPI Ref No. / Transaction ID"));
  fields.appendChild(textField(ctx, "Payment note (optional)", "Add a note for this payment"));
  screen.appendChild(fields);

  const audit = glassCard("Audit Warning", 350, 10, TOKENS.radius.md);
  audit.layoutMode = "HORIZONTAL";
  audit.counterAxisSizingMode = "AUTO";
  audit.counterAxisAlignItems = "CENTER";
  audit.appendChild(createIcon("warning", 16, TOKENS.color.warning));
  audit.appendChild(paragraph("Manual records require reason and are saved in audit logs.", ctx.styles.text.caption, 290, TOKENS.color.warning));
  screen.appendChild(audit);

  const reason = glassCard("Reason Dropdown", 350, 12, TOKENS.radius.lg);
  reason.layoutMode = "HORIZONTAL";
  reason.resize(350, 58);
  reason.primaryAxisSizingMode = "FIXED";
  reason.counterAxisSizingMode = "FIXED";
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
