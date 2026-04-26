import { TOKENS, solid } from "./tokens";

export type IconName =
  | "home"
  | "qr"
  | "clipboard"
  | "bag"
  | "user"
  | "back"
  | "bell"
  | "dumbbell"
  | "shield"
  | "rupee"
  | "clock"
  | "warning"
  | "edit"
  | "trash"
  | "plus"
  | "chevron"
  | "check"
  | "cart"
  | "more"
  | "search"
  | "filter"
  | "fire"
  | "target"
  | "location"
  | "calendar"
  | "headset"
  | "sparkle"
  | "lock"
  | "bottle"
  | "towel";

function primitive(name: string, x: number, y: number, width: number, height: number, color: string, radius = 1): RectangleNode {
  const node = figma.createRectangle();
  node.name = name;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.cornerRadius = radius;
  node.fills = [solid(color)];
  return node;
}

function dot(name: string, x: number, y: number, diameter: number, color: string): EllipseNode {
  const node = figma.createEllipse();
  node.name = name;
  node.resize(diameter, diameter);
  node.x = x;
  node.y = y;
  node.fills = [solid(color)];
  return node;
}

function addLine(frame: FrameNode, name: string, x: number, y: number, width: number, thickness: number, color: string, rotation = 0): void {
  const line = primitive(name, x, y, width, thickness, color, thickness / 2);
  line.rotation = rotation;
  frame.appendChild(line);
}

export function createIcon(name: IconName, size = 20, color: string = TOKENS.color.mutedText): FrameNode {
  const node = figma.createFrame();
  node.name = `Icon / ${name}`;
  node.x = 0;
  node.y = 0;
  node.resize(size, size);
  node.fills = [];
  node.clipsContent = false;

  const s = size / 24;
  const p = (value: number) => value * s;
  const line = (label: string, x: number, y: number, width: number, thickness = 2, rotation = 0) =>
    addLine(node, label, p(x), p(y), p(width), p(thickness), color, rotation);
  const rect = (label: string, x: number, y: number, width: number, height: number, radius = 2) =>
    node.appendChild(primitive(label, p(x), p(y), p(width), p(height), color, p(radius)));
  const circle = (label: string, x: number, y: number, diameter: number) => node.appendChild(dot(label, p(x), p(y), p(diameter), color));

  switch (name) {
    case "plus":
      line("Vertical", 11, 5, 14, 2, 90);
      line("Horizontal", 5, 11, 14);
      break;
    case "back":
      line("Upper", 7, 11, 9, 2, -45);
      line("Lower", 7, 11, 9, 2, 45);
      break;
    case "chevron":
      line("Upper", 8, 6, 9, 2, 45);
      line("Lower", 8, 18, 9, 2, -45);
      break;
    case "check":
      line("Short", 5, 13, 6, 2, 45);
      line("Long", 10, 16, 11, 2, -45);
      break;
    case "more":
      circle("Dot 1", 4, 10, 4);
      circle("Dot 2", 10, 10, 4);
      circle("Dot 3", 16, 10, 4);
      break;
    case "search":
      circle("Lens", 4, 4, 12);
      line("Handle", 14, 14, 7, 2, 45);
      break;
    case "filter":
      line("Slider 1", 4, 7, 16);
      circle("Knob 1", 8, 5, 4);
      line("Slider 2", 4, 15, 16);
      circle("Knob 2", 14, 13, 4);
      break;
    case "fire":
      rect("Flame", 7, 5, 10, 15, 6);
      rect("Inner", 10, 12, 4, 7, 3);
      break;
    case "target":
      circle("Outer", 3, 3, 18);
      circle("Middle", 7, 7, 10);
      circle("Center", 10, 10, 4);
      break;
    case "location":
      circle("Pin body", 4, 3, 16);
      circle("Pin dot", 9, 8, 6);
      rect("Pin point", 10, 16, 4, 5, 2);
      break;
    case "calendar":
      rect("Calendar body", 5, 7, 14, 12, 2);
      rect("Calendar top", 5, 7, 14, 3, 1);
      line("Ring left", 8, 4, 4, 2, 90);
      line("Ring right", 16, 4, 4, 2, 90);
      break;
    case "headset":
      circle("Headset arc", 4, 4, 16);
      rect("Left cup", 4, 12, 4, 6, 2);
      rect("Right cup", 16, 12, 4, 6, 2);
      line("Mic", 14, 18, 5, 2);
      break;
    case "sparkle":
      line("Spark vertical", 12, 4, 16, 2, 90);
      line("Spark horizontal", 4, 12, 16);
      line("Small vertical", 18, 4, 6, 2, 90);
      line("Small horizontal", 15, 7, 6);
      break;
    case "lock":
      rect("Lock body", 6, 10, 12, 10, 2);
      line("Shackle left", 8, 11, 6, 2, -90);
      line("Shackle top", 8, 5, 8);
      line("Shackle right", 16, 5, 6, 2, 90);
      break;
    case "bottle":
      rect("Bottle body", 8, 7, 8, 13, 3);
      rect("Bottle cap", 9, 4, 6, 3, 1);
      line("Label", 9, 13, 6);
      break;
    case "towel":
      rect("Fold", 5, 8, 14, 10, 2);
      line("Fold line", 8, 8, 10);
      line("Edge", 7, 15, 9);
      break;
    case "qr":
      rect("Cell 1", 4, 4, 6, 6);
      rect("Cell 2", 14, 4, 6, 6);
      rect("Cell 3", 4, 14, 6, 6);
      rect("Cell 4", 14, 14, 2, 2);
      rect("Cell 5", 18, 14, 2, 6);
      break;
    case "clock":
      circle("Face", 3, 3, 18);
      line("Hand hour", 12, 7, 6, 2, 90);
      line("Hand min", 12, 12, 5, 2, 28);
      break;
    case "warning":
      rect("Triangle body", 6, 5, 12, 14, 2);
      rect("Bang", 11, 9, 2, 6, 1);
      rect("Dot", 11, 17, 2, 2, 1);
      break;
    case "user":
      circle("Head", 8, 4, 8);
      rect("Body", 5, 14, 14, 6, 3);
      break;
    case "home":
      rect("Body", 6, 11, 12, 9, 2);
      line("Roof left", 5, 11, 9, 2, -35);
      line("Roof right", 12, 6, 9, 2, 35);
      break;
    case "trash":
      rect("Bin", 7, 8, 10, 12, 2);
      rect("Lid", 6, 5, 12, 2, 1);
      break;
    case "edit":
      line("Pencil", 6, 17, 13, 3, -45);
      rect("Tip", 4, 18, 4, 2, 1);
      break;
    case "bag":
    case "cart":
      rect("Bag", 6, 9, 12, 10, 2);
      line("Handle", 9, 8, 6, 2, 0);
      break;
    case "dumbbell":
      rect("Left", 3, 8, 4, 8, 1);
      rect("Right", 17, 8, 4, 8, 1);
      rect("Bar", 7, 11, 10, 2, 1);
      break;
    case "rupee":
      line("Top", 7, 5, 10);
      line("Mid", 7, 9, 10);
      line("Stem", 8, 7, 12, 2, 58);
      break;
    case "shield":
      rect("Shield", 6, 4, 12, 16, 5);
      rect("Cut", 10, 8, 4, 8, 2);
      break;
    case "clipboard":
      rect("Board", 6, 5, 12, 16, 2);
      rect("Clip", 9, 3, 6, 3, 1);
      line("Line 1", 9, 11, 6);
      line("Line 2", 9, 15, 7);
      break;
    case "bell":
      rect("Bell", 7, 7, 10, 10, 5);
      rect("Base", 6, 16, 12, 2, 1);
      circle("Dot", 10, 19, 4);
      break;
    default:
      rect("Glyph", 5, 5, 14, 14, 4);
  }

  return node;
}
