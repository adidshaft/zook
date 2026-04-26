import { createIcon, IconName } from "./icons";
import { StyleRegistry, TextSpec } from "./styles";
import { TOKENS, glassFill, glassStroke, layoutGrid, solid } from "./tokens";

export interface DesignContext {
  styles: StyleRegistry;
}

type Direction = "HORIZONTAL" | "VERTICAL";

const BUILD_STAGING_COORD = 0;

export function stack(name: string, direction: Direction, gap: number = TOKENS.space.md): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.x = BUILD_STAGING_COORD;
  node.y = BUILD_STAGING_COORD;
  node.layoutMode = direction;
  node.itemSpacing = gap;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.fills = [];
  node.clipsContent = false;
  return node;
}

function forceFixedAutoLayoutSize(node: FrameNode): void {
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "FIXED";
}

export function lockWidthHugHeight(node: FrameNode, width: number): void {
  node.resize(width, Math.max(1, node.height));
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "AUTO";
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "HUG";
}

export function fixedFrame(name: string, width: number, height: number): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.x = BUILD_STAGING_COORD;
  node.y = BUILD_STAGING_COORD;
  node.resize(width, height);
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "FIXED";
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
  node.x = BUILD_STAGING_COORD;
  node.y = BUILD_STAGING_COORD;
  node.fontName = style.fontName;
  node.fontSize = style.fontSize;
  node.lineHeight = style.lineHeight;
  node.textAutoResize = "WIDTH_AND_HEIGHT";
  node.fills = [solid(color)];
  node.characters = value;
  return node;
}

export function paragraph(
  value: string,
  style: TextSpec,
  width: number,
  color: string = TOKENS.color.mutedText,
  name = "Paragraph"
): TextNode {
  const node = text(value, style, color, name);
  node.textAutoResize = "HEIGHT";
  node.resize(width, node.height);
  return node;
}

export function spacer(width: number, height = 1): FrameNode {
  const node = fixedFrame("Spacer", width, height);
  node.fills = [];
  return node;
}

export function footerSpacer(parent: FrameNode): FrameNode {
  const node = spacer(1, 1);
  node.name = "Footer spacer";
  parent.appendChild(node);
  node.layoutSizingVertical = "FILL";
  return node;
}

export function divider(width: number = 310, opacity = 0.1): FrameNode {
  const node = fixedFrame("Divider", width, 1);
  node.fills = [solid(TOKENS.color.white, opacity)];
  return node;
}

export function iconDisk(
  icon: IconName,
  size = 44,
  tone: "lime" | "warning" | "danger" | "glass" = "glass",
  label = `Icon Disk / ${icon}`
): FrameNode {
  const node = fixedFrame(label, size, size);
  node.cornerRadius = TOKENS.radius.round;
  const toneColor =
    tone === "lime"
      ? TOKENS.color.accent
      : tone === "warning"
        ? TOKENS.color.warning
        : tone === "danger"
          ? TOKENS.color.danger
          : TOKENS.color.mutedText;
  node.fills = [solid(toneColor, tone === "glass" ? 0.1 : 0.16)];
  node.strokes = [solid(toneColor, tone === "glass" ? 0.1 : 0.3)];
  node.strokeWeight = 1;
  const glyph = createIcon(icon, Math.round(size * 0.46), toneColor);
  node.appendChild(glyph);
  glyph.x = (size - glyph.width) / 2;
  glyph.y = (size - glyph.height) / 2;
  if (tone !== "glass") {
    node.effects = [
      {
        type: "DROP_SHADOW",
        color: { ...solid(toneColor).color, a: 0.22 },
        offset: { x: 0, y: 0 },
        radius: 22,
        spread: -6,
        visible: true,
        blendMode: "NORMAL"
      }
    ];
  }
  return node;
}

export function avatar(ctx: DesignContext, initials: string, size = 64, name = "Avatar"): FrameNode {
  const node = fixedFrame(name, size, size);
  node.cornerRadius = TOKENS.radius.round;
  node.fills = [solid(TOKENS.color.accent, 0.13)];
  node.strokes = [solid(TOKENS.color.accent, 0.38)];
  node.strokeWeight = 1;
  const glow = fixedFrame("Avatar inner glow", size - 8, size - 8);
  glow.cornerRadius = TOKENS.radius.round;
  glow.fills = [solid(TOKENS.color.white, 0.05)];
  node.appendChild(glow);
  glow.x = 4;
  glow.y = 4;
  const label = text(initials, ctx.styles.text.h2, TOKENS.color.accent, "Initials");
  node.appendChild(label);
  label.x = (size - label.width) / 2;
  label.y = (size - label.height) / 2;
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
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "FIXED";
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

export function selectPill(ctx: DesignContext, label: string, icon: IconName = "dumbbell"): FrameNode {
  const node = row(`Selector / ${label}`, TOKENS.space.sm);
  node.paddingTop = 8;
  node.paddingBottom = 8;
  node.paddingLeft = 12;
  node.paddingRight = 12;
  node.cornerRadius = TOKENS.radius.round;
  node.fills = [glassFill(TOKENS.opacity.glassLow)];
  node.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  node.strokeWeight = 1;
  node.appendChild(createIcon(icon, 15, TOKENS.color.accent));
  node.appendChild(text(label, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Label"));
  node.appendChild(createIcon("chevron", 12, TOKENS.color.mutedText));
  return node;
}

export function sectionTitle(ctx: DesignContext, title: string, action?: string): FrameNode {
  const node = row(`Section Title / ${title}`, TOKENS.space.sm);
  node.resize(350, 24);
  forceFixedAutoLayoutSize(node);
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  node.appendChild(text(title, ctx.styles.text.h3, TOKENS.color.primaryText, "Title"));
  if (action) {
    const link = row("Action", TOKENS.space.xs);
    link.appendChild(text(action, ctx.styles.text.small, TOKENS.color.accent, "Label"));
    link.appendChild(createIcon("chevron", 12, TOKENS.color.accent));
    node.appendChild(link);
  }
  return node;
}

export function metricTile(
  ctx: DesignContext,
  icon: IconName,
  label: string,
  value: string,
  width = 102,
  tone: "lime" | "warning" | "glass" = "lime"
): FrameNode {
  const node = stack(`Metric / ${label}`, "VERTICAL", 6);
  node.resize(width, 96);
  forceFixedAutoLayoutSize(node);
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.appendChild(iconDisk(icon, 34, tone));
  node.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.mutedText, "Label"));
  node.appendChild(text(value, ctx.styles.text.h3, TOKENS.color.primaryText, "Value"));
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
  node.resize(width, 46);
  forceFixedAutoLayoutSize(node);
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
  forceFixedAutoLayoutSize(node);
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
  forceFixedAutoLayoutSize(frame);
  frame.counterAxisAlignItems = "CENTER";
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
  frame.appendChild(glow);
  glow.layoutPositioning = "ABSOLUTE";
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
  node.resize(TOKENS.frame.mobile.width - 40, 50);
  forceFixedAutoLayoutSize(node);
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
  forceFixedAutoLayoutSize(node);
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
    forceFixedAutoLayoutSize(entry);
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
  const node = glassCard(`KPI Card / ${label}`, 160, 10, TOKENS.radius.lg);
  node.itemSpacing = 2;
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
  node.resize(310, 52);
  forceFixedAutoLayoutSize(node);
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  if (icon) node.appendChild(iconButton("Icon", icon));
  const copy = stack("Copy", "VERTICAL", 2);
  copy.appendChild(text(title, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  if (subtitle) copy.appendChild(text(subtitle, ctx.styles.text.small, TOKENS.color.mutedText, "Subtitle"));
  node.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  node.appendChild(trailing ?? createIcon("chevron", 16, TOKENS.color.subtleText));
  return node;
}

export function textField(ctx: DesignContext, label: string, value: string): FrameNode {
  const node = stack(`Text Field / ${label}`, "VERTICAL", 6);
  node.resize(350, 64);
  forceFixedAutoLayoutSize(node);
  node.appendChild(text(label, ctx.styles.text.caption, TOKENS.color.subtleText, "Label"));
  const box = row("Input", TOKENS.space.sm);
  box.resize(350, 40);
  forceFixedAutoLayoutSize(box);
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
  forceFixedAutoLayoutSize(node);
  node.paddingLeft = TOKENS.space.lg;
  node.paddingRight = TOKENS.space.lg;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [glassFill()];
  node.strokes = [glassStroke()];
  node.strokeWeight = 1;
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  const left = row("Search input", TOKENS.space.sm);
  left.appendChild(createIcon("search", 16, TOKENS.color.subtleText));
  const placeholderText = paragraph(placeholder, ctx.styles.text.body, 238, TOKENS.color.subtleText, "Placeholder");
  left.appendChild(placeholderText);
  node.appendChild(left);
  node.appendChild(createIcon("filter", 16, TOKENS.color.mutedText));
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
  const visual = fixedFrame("Product silhouette", 138, 54);
  visual.cornerRadius = TOKENS.radius.md;
  visual.fills = [solid(TOKENS.color.accent, 0.08)];
  visual.strokes = [solid(TOKENS.color.white, 0.08)];
  visual.strokeWeight = 1;
  const productIcon: IconName = product.includes("Shake") || product.includes("Bottle") ? "bottle" : product.includes("Towel") ? "towel" : "bag";
  const bag = createIcon(productIcon, 28, TOKENS.color.accent);
  visual.appendChild(bag);
  bag.x = 55;
  bag.y = 13;
  node.appendChild(visual);
  node.appendChild(text(product, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Name"));
  node.appendChild(text(price, ctx.styles.text.h3, TOKENS.color.accent, "Price"));
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
  const wrap = fixedFrame(`Exercise Row / ${title}`, 350, 58);
  wrap.cornerRadius = TOKENS.radius.lg;
  wrap.fills = slid ? [solid(TOKENS.color.danger, 0.18)] : [];
  if (slid) {
    const del = stack("Delete action", "VERTICAL", TOKENS.space.xs);
    del.resize(78, 58);
    forceFixedAutoLayoutSize(del);
    del.primaryAxisAlignItems = "CENTER";
    del.counterAxisAlignItems = "CENTER";
    del.cornerRadius = TOKENS.radius.lg;
    del.fills = [solid(TOKENS.color.danger, 0.84)];
    del.appendChild(createIcon("trash", 17, TOKENS.color.primaryText));
    del.appendChild(text("Delete", ctx.styles.text.caption, TOKENS.color.primaryText, "Label"));
    wrap.appendChild(del);
    del.x = 272;
    del.y = 0;
  }
  const node = row("Exercise content", TOKENS.space.md);
  node.resize(350, 58);
  forceFixedAutoLayoutSize(node);
  node.paddingLeft = TOKENS.space.md;
  node.paddingRight = TOKENS.space.md;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [glassFill()];
  node.strokes = [glassStroke(TOKENS.opacity.subtleStroke)];
  node.strokeWeight = 1;
  const check = fixedFrame(complete ? "Completed check" : "Open check", 28, 28);
  check.cornerRadius = TOKENS.radius.round;
  check.fills = [complete ? solid(TOKENS.color.accent) : solid(TOKENS.color.white, 0.04)];
  check.strokes = [complete ? solid(TOKENS.color.accent) : glassStroke()];
  check.strokeWeight = 1;
  if (complete) {
    const mark = createIcon("check", 14, TOKENS.color.background);
    check.appendChild(mark);
    mark.x = 7;
    mark.y = 7;
  }
  node.appendChild(check);
  const thumb = iconDisk("dumbbell", 36, complete ? "lime" : "glass", "Exercise thumb");
  node.appendChild(thumb);
  const copy = stack("Copy", "VERTICAL", 2);
  copy.appendChild(text(`${title} · ${sets}`, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Title"));
  copy.appendChild(text(detail, ctx.styles.text.small, TOKENS.color.mutedText, "Detail"));
  node.appendChild(copy);
  copy.layoutSizingHorizontal = "FILL";
  wrap.appendChild(node);
  node.x = slid ? -56 : 0;
  node.y = 0;
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

function libraryComponent(ctx: DesignContext, name: string, width = 300, height = 64, icon: IconName = "shield"): FrameNode {
  const node = row(name, TOKENS.space.md);
  node.name = name;
  node.resize(width, height);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "FIXED";
  node.primaryAxisAlignItems = "SPACE_BETWEEN";
  node.counterAxisAlignItems = "CENTER";
  node.paddingLeft = TOKENS.space.md;
  node.paddingRight = TOKENS.space.md;
  node.paddingTop = TOKENS.space.sm;
  node.paddingBottom = TOKENS.space.sm;
  node.cornerRadius = TOKENS.radius.lg;
  node.fills = [glassFill()];
  node.strokes = [glassStroke()];
  node.strokeWeight = 1;
  node.effects = [{ type: "BACKGROUND_BLUR", radius: 16, visible: true, blurType: "NORMAL" }];

  const left = row("Preview", TOKENS.space.sm);
  left.appendChild(iconDisk(icon, 34, name.includes("Danger") ? "danger" : name.includes("Status") ? "warning" : "lime"));
  const copy = stack("Component label", "VERTICAL", 2);
  copy.appendChild(text(name, ctx.styles.text.bodyStrong, TOKENS.color.primaryText, "Name"));
  copy.appendChild(text("Reusable auto-layout component", ctx.styles.text.caption, TOKENS.color.mutedText, "Description"));
  left.appendChild(copy);
  node.appendChild(left);
  left.layoutSizingHorizontal = "FILL";
  node.appendChild(createIcon("chevron", 14, TOKENS.color.subtleText));
  return node;
}

export function createComponentLibrary(ctx: DesignContext, page: PageNode, x = 520, y = 120): void {
  const title = text("Reusable Components", ctx.styles.text.h2, TOKENS.color.primaryText);
  title.x = x;
  title.y = y - 48;
  page.appendChild(title);

  const components = [
    ["AppShell / Mobile", "home"],
    ["Card / Glass", "shield"],
    ["Button / Primary Lime", "plus"],
    ["Button / Secondary Glass", "chevron"],
    ["Button / Danger Swipe", "trash"],
    ["Chip / Status", "warning"],
    ["Chip / Role", "user"],
    ["Bottom Nav / Member", "home"],
    ["Bottom Nav / Trainer", "dumbbell"],
    ["Bottom Nav / Owner", "shield"],
    ["Bottom Nav / Receptionist", "rupee"],
    ["Header / Mobile", "bell"],
    ["KPI Card", "rupee"],
    ["List Row", "clipboard"],
    ["Text Field", "edit"],
    ["Search Bar", "qr"],
    ["Product Card", "bag"],
    ["Exercise Row", "dumbbell"],
    ["Safety Panel", "shield"],
    ["Status Bar", "clock"]
  ] as const;

  components.forEach(([name, icon], index) => {
    const component = libraryComponent(ctx, name, 300, 64, icon);
    page.appendChild(component);
    component.x = x + (index % 3) * 324;
    component.y = y + Math.floor(index / 3) * 88;
  });
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
