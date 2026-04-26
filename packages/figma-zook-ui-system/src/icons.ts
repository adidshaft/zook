import { TOKENS } from "./tokens";

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
  | "towel"
  | "cash"
  | "upi"
  | "bank"
  | "card"
  | "manual";

const paths: Record<IconName, string> = {
  home: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>',
  qr: '<path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h2v2h-2z"/><path d="M18 14h2v6h-6v-2h4z"/>',
  clipboard: '<path d="M8 5h8"/><path d="M9 3h6v4H9z"/><path d="M6 6h12v15H6z"/><path d="M9 12h6"/><path d="M9 16h5"/>',
  bag: '<path d="M6 9h12l-1 12H7L6 9Z"/><path d="M9 9a3 3 0 0 1 6 0"/>',
  user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  back: '<path d="M15 5 8 12l7 7"/><path d="M9 12h12"/>',
  bell: '<path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z"/><path d="M10 21h4"/>',
  dumbbell: '<path d="M4 9v6"/><path d="M7 8v8"/><path d="M17 8v8"/><path d="M20 9v6"/><path d="M7 12h10"/>',
  shield: '<path d="M12 3 19 6v5c0 4.5-2.8 8.5-7 10-4.2-1.5-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-5"/>',
  rupee: '<path d="M7 5h10"/><path d="M7 9h10"/><path d="M9 5c4.8 0 5.2 7-1 7l7 7"/>',
  clock: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 7v5l3 2"/>',
  warning: '<path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  cart: '<path d="M4 5h2l2 11h10l2-8H7"/><path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="M17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>',
  more: '<circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/>',
  search: '<path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/><path d="m16 16 4 4"/>',
  filter: '<path d="M4 7h16"/><path d="M7 17h10"/><path d="M9 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/><path d="M12 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>',
  fire: '<path d="M12 22c4 0 7-2.7 7-6.5 0-2.8-1.6-5.1-4.8-7.4.1 2-1 3.4-2.3 4.2.2-2.7-1-5-3.6-7.3.2 4.1-3.3 6.1-3.3 10.5C5 19.3 8 22 12 22Z"/>',
  target: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>',
  location: '<path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"/><path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
  calendar: '<path d="M5 5h14v15H5z"/><path d="M5 9h14"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  headset: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2Z"/><path d="M20 13v4a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2Z"/><path d="M16 19h-3"/>',
  sparkle: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z"/><path d="M19 3v4"/><path d="M17 5h4"/>',
  lock: '<path d="M7 11V8a5 5 0 0 1 10 0v3"/><path d="M6 11h12v10H6z"/><path d="M12 15v2"/>',
  bottle: '<path d="M9 4h6"/><path d="M10 4v4l-2 2v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-9l-2-2V4"/><path d="M8 14h8"/>',
  towel: '<path d="M5 7h10a4 4 0 0 1 4 4v8H9a4 4 0 0 1-4-4V7Z"/><path d="M9 7v12"/><path d="M12 11h4"/><path d="M12 15h4"/>',
  cash: '<path d="M3 7h18v10H3z"/><path d="M7 7a4 4 0 0 1-4 4"/><path d="M17 17a4 4 0 0 1 4-4"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
  upi: '<path d="M5 17V7"/><path d="M5 7h5.2c2.4 0 3.8 1.2 3.8 3.2S12.6 13.4 10.2 13.4H7.8"/><path d="m15 8 4 4-4 4"/><path d="M19 12H10"/>',
  bank: '<path d="M4 9h16"/><path d="M5 19h14"/><path d="M6 9l6-5 6 5"/><path d="M7 9v10"/><path d="M12 9v10"/><path d="M17 9v10"/>',
  card: '<path d="M3 6h18v12H3z"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  manual: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h4"/><path d="M10 12h6"/><path d="M10 16h5"/>'
};

function iconSvg(name: IconName, size: number, color: string): string {
  const body = paths[name].replace(/currentColor/g, color);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="${color}">
    <g stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`;
}

export function createIcon(name: IconName, size = 20, color: string = TOKENS.color.mutedText): FrameNode {
  const node = figma.createNodeFromSvg(iconSvg(name, size, color));
  node.name = `Icon / ${name}`;
  node.x = 0;
  node.y = 0;
  node.resize(size, size);
  node.fills = [];
  return node;
}
