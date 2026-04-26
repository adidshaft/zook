export const exportFrameNames = [
  "AUTO_EXPORT / 01-member-home",
  "AUTO_EXPORT / 02-member-checkin-scanner",
  "AUTO_EXPORT / 03-attendance-approved",
  "AUTO_EXPORT / 04-attendance-pending",
  "AUTO_EXPORT / 05-member-shop",
  "AUTO_EXPORT / 06-member-plan-detail",
  "AUTO_EXPORT / 07-receptionist-payment",
  "AUTO_EXPORT / 08-trainer-client-detail",
  "AUTO_EXPORT / 09-trainer-ai-draft-review",
  "AUTO_EXPORT / 10-owner-command"
] as const;

export function applyAutoExportSettings(root: PageNode | FrameNode = figma.currentPage): FrameNode[] {
  const frames = root.children.filter(
    (node): node is FrameNode => node.type === "FRAME" && node.name.startsWith("AUTO_EXPORT")
  );
  for (const frame of frames) {
    frame.exportSettings = [
      { format: "PNG", constraint: { type: "SCALE", value: 2 }, suffix: "@2x" },
      { format: "JPG", constraint: { type: "SCALE", value: 1 }, suffix: "@1x" }
    ];
  }
  return frames;
}

export async function exportAutoFrames(): Promise<void> {
  const frames = applyAutoExportSettings();
  const cleanExportFrames = frames.filter((frame) => exportFrameNames.includes(frame.name as (typeof exportFrameNames)[number]));
  console.log(`Zook AUTO_EXPORT frames ready: ${frames.length} total, ${cleanExportFrames.length} clean export frames.`);
  console.log("Figma plugins cannot write arbitrary local files directly. Export page \"07 — Export Frames\" to ./exports from Figma's export panel.");
  for (const frame of cleanExportFrames) {
    const png = await frame.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
    console.log(`${frame.name}: PNG @2x bytes=${png.byteLength}`);
  }
}
