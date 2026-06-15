async function main() {
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const frame = figma.createFrame();
  frame.name = "Plugin Smoke Test";
  frame.resize(640, 240);
  frame.x = 120;
  frame.y = 120;
  frame.cornerRadius = 24;
  frame.fills = [{ type: "SOLID", color: { r: 0.07, g: 0.09, b: 0.11 } }];
  frame.strokes = [{ type: "SOLID", color: { r: 0.72, g: 0.96, b: 0.33 } }];
  frame.strokeWeight = 3;

  const label = figma.createText();
  label.name = "Smoke Test Label";
  label.fontName = { family: "Inter", style: "Bold" };
  label.fontSize = 32;
  label.characters = "Plugin is running";
  label.x = 32;
  label.y = 32;
  label.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.97, b: 0.94 } }];
  frame.appendChild(label);

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify("Smoke test rendered.");
  figma.closePlugin();
}

main().catch((error) => {
  console.error(error);
  figma.notify(`Smoke test failed: ${error.message}`);
  figma.closePlugin();
});
