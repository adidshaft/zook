import {
  DesignContext,
  avatar,
  button,
  chip,
  fixedFrame,
  glassCard,
  header,
  iconDisk,
  lockWidthHugHeight,
  mobileShell,
  paragraph,
  row,
  stack,
  text,
  textField
} from "../components";
import { createIcon } from "../icons";
import { TOKENS, glassFill, glassStroke, solid } from "../tokens";

function paymentModeChip(ctx: DesignContext, label: string, icon: "cash" | "upi" | "bank" | "card" | "manual", selected = false, width = 108): FrameNode {
  const node = row(`Payment Mode / ${label}`, TOKENS.space.sm);
  node.resize(width, 38);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.paddingLeft = 10;
  node.paddingRight = 10;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [selected ? solid(TOKENS.color.accent, 0.12) : glassFill(TOKENS.opacity.glassLow)];
  node.strokes = [selected ? solid(TOKENS.color.accent, 0.8) : glassStroke(TOKENS.opacity.subtleStroke)];
  node.strokeWeight = 1;
  node.appendChild(createIcon(icon, 17, selected ? TOKENS.color.accent : TOKENS.color.mutedText));
  node.appendChild(text(label, ctx.styles.text.caption, selected ? TOKENS.color.primaryText : TOKENS.color.mutedText, "Label"));
  return node;
}

export function receptionistPayment(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Receptionist / 01 Offline Payment Entry");
  screen.itemSpacing = 7;
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
  const modes = stack("Payment mode chips", "VERTICAL", 7);
  modes.resize(350, 83);
  modes.primaryAxisSizingMode = "FIXED";
  modes.counterAxisSizingMode = "FIXED";
  const modeRowOne = row("Payment mode row 1", 8);
  modeRowOne.appendChild(paymentModeChip(ctx, "Cash", "cash", false, 108));
  modeRowOne.appendChild(paymentModeChip(ctx, "Direct UPI", "upi", true, 118));
  modeRowOne.appendChild(paymentModeChip(ctx, "Bank", "bank", false, 108));
  const modeRowTwo = row("Payment mode row 2", 8);
  modeRowTwo.appendChild(paymentModeChip(ctx, "Card", "card", false, 171));
  modeRowTwo.appendChild(paymentModeChip(ctx, "Manual", "manual", false, 171));
  modes.appendChild(modeRowOne);
  modes.appendChild(modeRowTwo);
  screen.appendChild(modes);

  const fields = stack("Payment fields", "VERTICAL", TOKENS.space.sm);
  fields.appendChild(textField(ctx, "Amount", "₹2,499"));
  fields.appendChild(textField(ctx, "Reference ID (optional)", "UPI Ref No. / Transaction ID"));
  fields.appendChild(textField(ctx, "Payment note (optional)", "Add a note for this payment"));
  screen.appendChild(fields);

  const audit = glassCard("Audit Warning", 350, 8, TOKENS.radius.md);
  audit.layoutMode = "HORIZONTAL";
  lockWidthHugHeight(audit, 350);
  audit.counterAxisAlignItems = "CENTER";
  audit.appendChild(createIcon("warning", 16, TOKENS.color.warning));
  audit.appendChild(paragraph("Manual records require reason and are saved in audit logs.", ctx.styles.text.caption, 290, TOKENS.color.warning));
  screen.appendChild(audit);

  const reason = glassCard("Reason Dropdown", 350, 10, TOKENS.radius.lg);
  reason.layoutMode = "HORIZONTAL";
  reason.resize(350, 54);
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

  const sticky = glassCard("Sticky actions", 350, 10, TOKENS.radius.xl);
  sticky.itemSpacing = 7;
  sticky.appendChild(button(ctx, "Record Payment", "primary", "card", 326));
  const cancel = fixedFrame("Cancel touch target", 326, 30);
  cancel.fills = [solid(TOKENS.color.white, 0)];
  const cancelText = text("Cancel", ctx.styles.text.bodyStrong, TOKENS.color.mutedText);
  cancel.appendChild(cancelText);
  cancelText.x = (326 - cancelText.width) / 2;
  cancelText.y = 5;
  sticky.appendChild(cancel);
  screen.appendChild(sticky);
  return screen;
}

export const receptionistScreens = [receptionistPayment];
