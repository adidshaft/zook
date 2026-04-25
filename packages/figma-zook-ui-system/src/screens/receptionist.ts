import { DesignContext, button, chip, glassCard, header, mobileShell, receptionistNavItems, row, stack, text, textField } from "../components";
import { TOKENS } from "../tokens";

export function receptionistPayment(ctx: DesignContext): FrameNode {
  const screen = mobileShell(ctx, "AUTO_EXPORT / Receptionist / 01 Offline Payment Entry");
  screen.appendChild(header(ctx, "Record Payment", "Aarav Mehta", "back"));
  const member = glassCard("Member Summary Card", 350);
  member.appendChild(text("Hybrid Pro renewal", ctx.styles.text.h3));
  member.appendChild(text("Amount due ₹2,499", ctx.styles.text.h1));
  member.appendChild(text("Membership expired yesterday", ctx.styles.text.body, TOKENS.color.warning));
  member.appendChild(text("Member ID: ZK-M-10234", ctx.styles.text.small, TOKENS.color.mutedText));
  screen.appendChild(member);
  const modes = row("Payment mode chips", TOKENS.space.sm);
  for (const [label, selected] of [["Cash", false], ["Direct UPI", true], ["Bank", false], ["Card", false], ["Manual", false]] as const) {
    modes.appendChild(chip(ctx, label, selected ? "lime" : "glass"));
  }
  screen.appendChild(modes);
  const fields = stack("Payment fields", "VERTICAL", TOKENS.space.md);
  fields.appendChild(textField(ctx, "Amount", "₹2,499"));
  fields.appendChild(textField(ctx, "Reference ID", "optional"));
  fields.appendChild(textField(ctx, "Payment note", "Desk renewal entry"));
  screen.appendChild(fields);
  const audit = glassCard("Audit Warning", 350);
  audit.appendChild(text("Manual records require reason and are saved in audit logs.", ctx.styles.text.small, TOKENS.color.warning));
  audit.appendChild(textField(ctx, "Reason", "Desk collected payment"));
  screen.appendChild(audit);
  const sticky = row("Sticky actions", TOKENS.space.sm);
  sticky.appendChild(button(ctx, "Record Payment", "primary", "rupee", 190));
  sticky.appendChild(button(ctx, "Cancel", "secondary", undefined, 150));
  screen.appendChild(sticky);
  return screen;
}

export const receptionistScreens = [receptionistPayment];
