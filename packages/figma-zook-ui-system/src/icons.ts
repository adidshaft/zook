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
  | "more";

const paths: Record<IconName, string> = {
  home: '<path d="M4 11.2 12 4l8 7.2v8.3a.5.5 0 0 1-.5.5h-5v-5h-5v5h-5a.5.5 0 0 1-.5-.5v-8.3Z"/>',
  qr: '<path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v6h-6v-2h4v-4ZM6 6v2h2V6H6Zm10 0v2h2V6h-2ZM6 16v2h2v-2H6Z"/>',
  clipboard: '<path d="M9 4h6l1 2h2v15H6V6h2l1-2Zm0 6h6v2H9v-2Zm0 4h7v2H9v-2Z"/>',
  bag: '<path d="M7 8h10l1.5 13h-13L7 8Zm2 0a3 3 0 1 1 6 0h-2a1 1 0 1 0-2 0H9Z"/>',
  user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0H5Z"/>',
  back: '<path d="M14.5 5 7.5 12l7 7 1.8-1.8-5.2-5.2 5.2-5.2L14.5 5Z"/>',
  bell: '<path d="M6 18h12l-1.4-2V10a4.6 4.6 0 0 0-3.6-4.5V4a1 1 0 0 0-2 0v1.5A4.6 4.6 0 0 0 7.4 10v6L6 18Zm4 2h4a2 2 0 0 1-4 0Z"/>',
  dumbbell: '<path d="M4 9h3v6H4V9Zm13 0h3v6h-3V9ZM8 11h8v2H8v-2ZM2 10h2v4H2v-4Zm18 0h2v4h-2v-4Z"/>',
  shield: '<path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Zm-1 12 5-5-1.5-1.5L11 12l-1.5-1.5L8 12l3 3Z"/>',
  rupee: '<path d="M7 4h11v2h-4a4 4 0 0 1 1 2h3v2h-3.1A5 5 0 0 1 10 14h-.3l5.8 6H12l-6-6v-2h4a3 3 0 0 0 2.8-2H7V8h5.6A3 3 0 0 0 10 6H7V4Z"/>',
  clock: '<path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm1-10.4V7h-2v6l5 3 1-1.7-4-2.7Z"/>',
  warning: '<path d="M12 3 22 20H2L12 3Zm-1 6v6h2V9h-2Zm0 8v2h2v-2h-2Z"/>',
  edit: '<path d="M5 17.5V21h3.5L19 10.5 15.5 7 5 17.5ZM17 5.5 18.5 4 22 7.5 20.5 9 17 5.5Z"/>',
  trash: '<path d="M7 7h10l-.8 14H7.8L7 7Zm2-3h6l1 2H8l1-2Zm-3 2h12v2H6V6Z"/>',
  plus: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/>',
  chevron: '<path d="m9 5 7 7-7 7-1.8-1.8 5.2-5.2-5.2-5.2L9 5Z"/>',
  check: '<path d="M9.5 16.6 4.8 12l-1.6 1.6 6.3 6.2L21 8.3 19.4 6.7 9.5 16.6Z"/>',
  cart: '<path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 4h2l2.4 10h9.8L20 7H7.1L6.5 5H3V4Z"/>',
  more: '<path d="M5 12a2 2 0 1 0 0 .1V12Zm7 0a2 2 0 1 0 0 .1V12Zm7 0a2 2 0 1 0 0 .1V12Z"/>'
};

export function createIcon(name: IconName, size = 20, color = TOKENS.color.mutedText): FrameNode {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${paths[name]}</svg>`;
  const node = figma.createNodeFromSvg(svg) as FrameNode;
  node.name = `Icon / ${name}`;
  node.resize(size, size);
  node.fills = [solid(color)];
  for (const child of node.findAll()) {
    if ("fills" in child) {
      child.fills = [solid(color)];
    }
  }
  return node;
}
