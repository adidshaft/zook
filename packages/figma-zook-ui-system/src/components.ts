import { createIcon, IconName } from "./icons";
import { StyleRegistry, TextSpec } from "./styles";
import { TOKENS, glassFill, glassStroke, layoutGrid, solid } from "./tokens";

export interface DesignContext {
  styles: StyleRegistry;
}

type Direction = "HORIZONTAL" | "VERTICAL";

export function stack(name: string, direction: Direction, gap: number = TOKENS.space.md): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.layoutMode = direction;
  node.itemSpacing = gap;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.fills = [];
  node.clipsContent = false;
  return node;
}

export function fixedFrame(name: string, width: number, height: number): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.resize(width, height);
  node.fills = [];
  node.clipsContent = false;
  return node;
}

export function text(
  value: string,
  style: TextSpec,
  color: string = TOKENS.color.primaryText,
  name = "Text"
): TextNode {
  const node = figma.createText();
  node.name = name;
  node.fontName = style.fontName;
  node.fontSize = style.fontSize;
  node.lineHeight = style.lineHeight;
  node.fills = [solid(color)];
  node.characters = value;
  return node;
}

export function spacer(width: number, height = 1): FrameNode {
  const node = fixedFrame("Spacer", width, height);
  node.fills = [];
  return node;
}

export function glassCard(
  name: string,
  width: number,
  padding: number = TOKENS.space.lg,
  radius: number = TOKENS.radius.xl
): FrameNode {
  const node = stack(name, "VERTICAL", TOKENS.space.md);
  node.resize(width, 10);
  node.layoutSizingHorizontal = "FIXED";
  node.paddingTop = padding;
  node.paddingBottom = padding;
  node.paddingLeft = padding;
  node.paddingRight = padding;
  node.cornerRadius = radius;
  node.fills = [glassFill()];
  node.strokes = [glassStroke()];
  node.strokeWeight = 1;
  node.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.42 },
      offset: { x: 0, y: 20 },
      radius: 42,
      spread: -18,
      visible: true,
      blendMode: "NORMAL"
    },
    { type: "BACKGROUND_BLUR", radius: 18, visible: true, blurType: "NORMAL" }
  ];
  return node;
}

export function row(name: string, gap: number = TOKENS.space.sm): FrameNode {
  const node = stack(name, "HORIZONTAL", gap);
  node.counterAxisAlignItems = "CENTER";
  return node;
}

export function iconButton(name: string, icon: IconName, selected = false): FrameNode {
  const node = fixedFrame(name, 40, 40);
  node.cornerRadius = TOKENS.radius.md;
  node.fills = [selected ? solid(TOKENS.color.accent, 0.12) : glassFill(TOKENS.opacity.glassLow)];
  node.strokes = [selected ? solid(TOKENS.color.accent, 0.36) : glassStroke(TOKENS.opacity.subtleStroke)];
  node.strokeWeight = 1;
  const glyph = createIcon(icon, 18, selected ? TOKENS.color.accent : TOKENS.color.mutedText);
  node.appendChild(glyph);
  glyph.x = 11;
  glyph.y = 11;
  return node;
}

export function chip(
  ctx: DesignContext,
  label: string,
  tone: "lime" | "glass" | "warning" | "danger" = "glass",
  icon?: IconName
): FrameNode {
  const node = row(`Chip / ${label}`, TOKENS.space.xs);
  node.paddingTop = 7;
  node.paddingBottom = 7;
  node.paddingLeft = 10;
  node.paddingRight = 10;
  node.cornerRadius = TOKENS.radius.round;
  const toneColor =
    tone === "lime"
      ? TOKENS.color.accent
      : tone === "warning"
        ? TOKENS.color.warning
        : tone === "danger"
          ? TOKENS.color.danger
          : TOKENS.color.mutedText;
  node.fills = [solid(toneColor, tone === "glass" ? 0.08 : 0.14)];
  node.strokes = [solid(toneColor, tone === "glass" ? 0.16 : 0.34)];
  node.strokeWeight = 1;
  if (icon) node.appendChild(createIcon(icon, 12, toneColor));
  node.appendChild(text(label, ctx.styles.text.caption, toneColor, "Label"));
  return node;
}

export function button(
  ctx: DesignContext,
  label: string,
  variant: "primary" | "secondary" | "danger" = "primary",
  icon?: IconName,
  width: number = 160
): FrameNode {
  const node = row(`Button / ${variant} / ${label}`, TOKENS.space.sm);
  node.resize(width, 48);
  node.layoutSizingHorizontal = "FIXED";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.cornerRadius = TOKENS.radius.lg;
  node.paddingLeft = TOKENS.space.lg;
  node.paddingRight = TOKENS.space.lg;
  const bg =
    variant === "primary"
      ? solid(TOKENS.color.accent)
      : variant === "danger"
        ? solid(TOKENS.color.danger)
        : glassFill();
  const fg = variant === "primary" ? TOKENS.color.background : TOKENS.color.primaryText;
  node.fills = [bg];
  node.strokes = [variant === "secondary" ? glassStroke() : solid(TOKENS.color.white, 0)];
  node.strokeWeight = variant === "secondary" ? 1 : 0;
  if (variant === "primary") {
    node.effects = [
      {
        type: "DROP_SHADOW",
        color: { ...solid(TOKENS.color.accent).color, a: 0.22 },
        offset: { x: 0, y: 8 },
        radius: 28,
        spread: -10,
        visible: true,
        blendMode: "NORMAL"
      }
    ];
  }
  if (icon) node.appendChild(createIcon(icon, 16, fg));
  node.appendChild(text(label, ctx.styles.text.bodyStrong, fg, "Label"));
  return node;
}

export function statusBar(ctx: DesignContext): FrameNode {
  const node = row("Status Bar", 0);
  node.resize(TOKENS.frame.mobile.width - 40, 24);
  node.layoutSizingHorizontal = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  node.appendChild(text("9:41", ctx.styles.text.caption, TOKENS.color.primaryText, "Time"));
  const indicators = row("Indicators", 4);
  indicators.appendChild(fixedFrame("Signal", 18, 10));
  indicators.appendChild(fixedFrame("WiFi", 14, 10));
  indicators.appendChild(fixedFrame("Battery", 22, 10));
  for (const child of indicators.children) {
    if ("fills" in child) child.fills = [solid(TOKENS.color.primaryText, 0.72)];
    if (child.type === "FRAME") child.cornerRadius = 3;
  }
  node.appendChild(indicators);
  return node;
}

export function mobileShell(ctx: DesignContext, name: string): FrameNode {
  const frame = stack(name, "VERTICAL", TOKENS.space.lg);
  frame.resize(TOKENS.frame.mobile.width, TOKENS.frame.mobile.height);
  frame.layoutSizingHorizontal = "FIXED";
  frame.layoutSizingVertical = "FIXED";
  frame.paddingTop = 14;
  frame.paddingBottom = TOKENS.space.lg;
  frame.paddingLeft = TOKENS.space.xl;
  frame.paddingRight = TOKENS.space.xl;
  frame.fills = [solid(TOKENS.color.background)];
  frame.layoutGrids = [layoutGrid()];
  frame.clipsContent = true;
  const glow = fixedFrame("Lime ambient glow", 220, 220);
  glow.fills = [solid(TOKENS.color.accent, 0.09)];
  glow.cornerRadius = TOKENS.radius.round;
  glow.effects = [{ type: "LAYER_BLUR", radius: 70, visible: true, blurType: "NORMAL" }];
  glow.layoutPositioning = "ABSOLUTE";
  frame.appendChild(glow);
  glow.x = 210;
  glow.y = -94;
  frame.appendChild(statusBar(ctx));
  return frame;
}

export function header(
  ctx: DesignContext,
  title: string,
  subtitle?: string,
  leftIcon?: IconName,
  rightIcon?: IconName,
  chipLabel?: string
): FrameNode {
  const node = row(`Header / ${title}`, TOKENS.space.md);
  node.resize(TOKENS.frame.mobile.width - 40, 52);
  node.layoutSizingHorizontal = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  const left = row("Left", TOKENS.space.md);
  if (leftIcon) left.appendChild(iconButton("Back", leftIcon));
  const copy = stack("Copy", "VERTICAL", 2);
  copy.appendChild(text(title, ctx.styles.text.h3, TOKENS.color.primaryText, "Title"));
  if (subtitle) copy.appendChild(text(subtitle, ctx.styles.text.small, TOKENS.color.mutedText, "Subtitle"));
  left.appendChild(copy);
  node.appendChild(left);
  if (chipLabel) {
    node.appendChild(chip(ctx, chipLabel, "lime"));
  } else if (rightIcon) {
    node.appendChild(iconButton("Action", rightIcon));
  }
  return node;
}

export interface NavItem {
  label: string;
  icon: IconName;
}

export function bottomNav(ctx: DesignContext, name: string, items: NavItem[], selected: string): FrameNode {
  const node = row(`Bottom Nav / ${name}`, 2);
  node.resize(TOKENS.frame.mobile.width - 40, 72);
  node.layoutSizingHorizontal = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  node.paddingTop = 8;
  node.paddingBottom = 8;
  node.paddingLeft = 8;
  node.paddingRight = 8;
  node.cornerRadius = TOKENS.radius.xxl;
  node.fills = [glassFill()];
  node.strokes = [glassStroke()];
  node.strokeWeight = 1;
  node.effects = [{ type: "BACKGROUND_BLUR", radius: 18, visible: true, blurType: "NORMAL" }];
  for (const item of items) {
    const active = item.label === selected;
    const entry = stack(`Nav Item / ${item.label}`, "VERTICAL", 3);
    entry.resize(64, 54);
    entry.primaryAxisAlignItems = "CENTER";
    entry.counterAxisAlignItems = "CENTER";
    entry.cornerRadius = TOKENS.radius.lg;
    entry.fills = [active ? solid(TOKENS.color.accent, 0.12) : solid(TOKENS.color.white, 0)];
    entry.appendChild(createIcon(item.icon, 18, active ? TOKENS.color.accent : TOKENS.color.subtleText));
    entry.appendChild(text(item.label, ctx.styles.text.caption, active ? TOKENS.color.accent : TOKENS.color.subtleText));
    node.appendChild(entry);
  }
  return node;
}

export function kpiCard(ctx: DesignContext, label: string, value: string, tone: "lime" | "warning" = "lime"): FrameNode {
  const node = glassCard(`KPI Card / ${label}`, 160, TOKENS.space.md, TOKENS.radius.lg);
  node.itemSpacing = TOKENS.space.xs;
  node.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.mutedText, "Label"));
  node.appendChild(text(value, ctx.styles.text.metric, tone === "lime" ? TOKENS.color.primaryText : TOKENS.color.warning, "Value"));
  return node;
}

export function listRow(
  ctx: DesignContext,
  title: string,
  subtitle?: string,
  icon?: IconName,
  trailing?: SceneNode
): FrameNode {
  const node = row(`List Row / ${title}`, TOKENS.space.md);
  node.resize(310, 58);
  node.layoutSizingHorizontal = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  if (icon) node.appendChild(iconButton("Icon", icon));
  const copy = stack("Copy", "VERTICAL", 2);
  copy.layoutSizingHorizontal = "FILL";
  copy.appendChild(text(title, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  if (subtitle) copy.appendChild(text(subtitle, ctx.styles.text.small, TOKENS.color.mutedText, "Subtitle"));
  node.appendChild(copy);
  node.appendChild(trailing ?? createIcon("chevron", 16, TOKENS.color.subtleText));
  return node;
}

export function textField(ctx: DesignContext, label: string, value: string): FrameNode {
  const node = stack(`Text Field / ${label}`, "VERTICAL", 6);
  node.resize(310, 68);
  node.layoutSizingHorizontal = "FIXED";
  node.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.subtleText, "Label"));
  const box = row("Input", TOKENS.space.sm);
  box.resize(310, 44);
  box.layoutSizingHorizontal = "FIXED";
  box.paddingLeft = TOKENS.space.md;
  box.paddingRight = TOKENS.space.md;
  box.cornerRadius = TOKENS.radius.md;
  box.fills = [glassFill(TOKENS.opacity.glassLow)];
  box.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  box.strokeWeight = 1;
  box.appendChild(text(value, ctx.styles.text.body, TOKENS.color.primaryText, "Value"));
  node.appendChild(box);
  return node;
}

export function searchBar(ctx: DesignContext, placeholder: string): FrameNode {
  const node = row("Search Bar", TOKENS.space.sm);
  node.resize(350, 48);
  node.layoutSizingHorizontal = "FIXED";
  node.paddingLeft = TOKENS.space.lg;
  node.paddingRight = TOKENS.space.lg;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [glassFill()];
  node.strokes = [glassStroke()];
  node.strokeWeight = 1;
  node.appendChild(createIcon("qr", 16, TOKENS.color.subtleText));
  node.appendChild(text(placeholder, ctx.styles.text.body, TOKENS.color.subtleText, "Placeholder"));
  return node;
}

export function productCard(
  ctx: DesignContext,
  product: string,
  price: string,
  stock: string,
  tone: "lime" | "warning" | "glass" = "glass"
): FrameNode {
  const node = glassCard(`Product Card / ${product}`, 166, TOKENS.space.md, TOKENS.radius.lg);
  node.itemSpacing = TOKENS.space.sm;
  const visual = fixedFrame("Product silhouette", 138, 72);
  visual.cornerRadius = TOKENS.radius.md;
  visual.fills = [solid(TOKENS.color.accent, 0.1)];
  const bag = createIcon("bag", 28, TOKENS.color.accent);
  visual.appendChild(bag);
  bag.x = 55;
  bag.y = 22;
  node.appendChild(visual);
  node.appendChild(text(product, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Name"));
  node.appendChild(text(price, ctx.styles.text.h3, TOKENS.color.primaryText, "Price"));
  const footer = row("Footer", TOKENS.space.sm);
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.resize(138, 30);
  footer.appendChild(chip(ctx, stock, tone));
  footer.appendChild(iconButton("Add", "plus", true));
  node.appendChild(footer);
  return node;
}

export function exerciseRow(
  ctx: DesignContext,
  title: string,
  sets: string,
  detail: string,
  complete = false,
  slid = false
): FrameNode {
  const wrap = fixedFrame(`Exercise Row / ${title}`, 350, 66);
  wrap.cornerRadius = TOKENS.radius.lg;
  wrap.fills = slid ? [solid(TOKENS.color.danger, 0.18)] : [];
  if (slid) {
    const del = row("Delete action", TOKENS.space.xs);
    del.resize(78, 66);
    del.primaryAxisAlignItems = "CENTER";
    del.counterAxisAlignItems = "CENTER";
    del.appendChild(createIcon("trash", 16, TOKENS.color.danger));
    del.appendChild(text("Delete", ctx.styles.text.caption, TOKENS.color.danger, "Label"));
    wrap.appendChild(del);
    del.x = 272;
    del.y = 0;
  }
  const node = row("Exercise content", TOKENS.space.md);
  node.resize(350, 66);
  node.layoutSizingHorizontal = "FIXED";
  node.paddingLeft = TOKENS.space.md;
  node.paddingRight = TOKENS.space.md;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [glassFill()];
  node.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  node.strokeWeight = 1;
  const check = fixedFrame(complete ? "Completed check" : "Open check", 26, 26);
  check.cornerRadius = TOKENS.radius.round;
  check.fills = [complete ? solid(TOKENS.color.accent) : solid(TOKENS.color.white, 0.04)];
  check.strokes = [complete ? solid(TOKENS.color.accent) : glassStroke()];
  check.strokeWeight = 1;
  if (complete) {
    const mark = createIcon("check", 14, TOKENS.color.background);
    check.appendChild(mark);
    mark.x = 6;
    mark.y = 6;
  }
  node.appendChild(check);
  const copy = stack("Copy", "VERTICAL", 2);
  copy.layoutSizingHorizontal = "FILL";
  copy.appendChild(text(`${title} · ${sets}`, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  copy.appendChild(text(detail, ctx.styles.text.small, TOKENS.color.mutedText, "Detail"));
  node.appendChild(copy);
  wrap.appendChild(node);
  if (slid) node.x = -56;
  return wrap;
}

export function safetyPanel(ctx: DesignContext, lines: string[]): FrameNode {
  const node = glassCard("Safety Panel", 350, TOKENS.space.lg, TOKENS.radius.xl);
  const title = row("Safety title", TOKENS.space.sm);
  title.appendChild(createIcon("shield", 18, TOKENS.color.accent));
  title.appendChild(text("Safety review", ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  node.appendChild(title);
  for (const line of lines) {
    node.appendChild(text(line, ctx.styles.text.small, TOKENS.color.mutedText, "Line"));
  }
  return node;
}

export function createComponentLibrary(ctx: DesignContext, page: PageNode, x = 520, y = 120): void {
  const section = stack("Reusable Components", "VERTICAL", TOKENS.space.xl);
  section.x = x;
  section.y = y;
  page.appendChild(section);

  const samples = [
    mobileShell(ctx, "AppShell / Mobile"),
    glassCard("Card / Glass", 310),
    button(ctx, "Scan QR", "primary", "qr"),
    button(ctx, "Cancel", "secondary"),
    button(ctx, "Delete", "danger", "trash"),
    chip(ctx, "Assigned", "lime"),
    chip(ctx, "Trainer", "glass"),
    bottomNav(ctx, "Member", memberNavItems, "Home"),
    bottomNav(ctx, "Trainer", trainerNavItems, "Clients"),
    bottomNav(ctx, "Owner", ownerNavItems, "Command"),
    bottomNav(ctx, "Receptionist", receptionistNavItems, "Desk"),
    header(ctx, "Header / Mobile", "Iron Temple Gym", "back", "bell"),
    kpiCard(ctx, "Active members", "412"),
    listRow(ctx, "List Row", "Operational detail", "clock"),
    textField(ctx, "Amount", "₹2,499"),
    searchBar(ctx, "Search water, protein, towel..."),
    productCard(ctx, "Protein Shake", "₹149", "Ready", "lime"),
    exerciseRow(ctx, "Bench Press", "4 sets", "Barbell · 8–12 reps"),
    safetyPanel(ctx, ["Blocked content: none", "Medical-risk check: clear"]),
    statusBar(ctx)
  ];

  for (const sample of samples) {
    const component = figma.createComponent();
    component.name = sample.name;
    component.resize(sample.width, sample.height);
    component.appendChild(sample);
    sample.x = 0;
    sample.y = 0;
    section.appendChild(component);
  }
}

export const memberNavItems: NavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Check-in", icon: "qr" },
  { label: "Plans", icon: "clipboard" },
  { label: "Shop", icon: "bag" },
  { label: "Profile", icon: "user" }
];

export const trainerNavItems: NavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Clients", icon: "user" },
  { label: "Plans", icon: "clipboard" },
  { label: "Inbox", icon: "bell" },
  { label: "Profile", icon: "user" }
];

export const ownerNavItems: NavItem[] = [
  { label: "Command", icon: "home" },
  { label: "Approvals", icon: "shield" },
  { label: "Revenue", icon: "rupee" },
  { label: "Stock", icon: "bag" },
  { label: "Profile", icon: "user" }
];

export const receptionistNavItems: NavItem[] = [
  { label: "Desk", icon: "home" },
  { label: "Payments", icon: "rupee" },
  { label: "Check-ins", icon: "qr" },
  { label: "Members", icon: "user" },
  { label: "Profile", icon: "user" }
];
