"use strict";
const TOKENS = {
    background: "#070908",
    textPrimary: "#f4f7ef",
    textMuted: "#aeb8a8",
    brandAccent: "#b9f455",
    glassStroke: "#ffffff",
    warning: "#ffb650",
    danger: "#ff5d5d",
    info: "#7dd3fc",
    violet: "#b9a9ff"
};
const FONT_REGULAR = { family: "Inter", style: "Regular" };
const FONT_BOLD = { family: "Inter", style: "Bold" };
const Z_MARK_MAX_DIMENSION = 665;
let activeRegularFont = FONT_REGULAR;
let activeBoldFont = FONT_BOLD;
function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const value = parseInt(normalized, 16);
    return {
        r: ((value >> 16) & 255) / 255,
        g: ((value >> 8) & 255) / 255,
        b: (value & 255) / 255
    };
}
function makeSolidPaint(hex, opacity = 1) {
    return {
        type: "SOLID",
        color: hexToRgb(hex),
        opacity
    };
}
function makeRgba(hex, alpha) {
    const color = hexToRgb(hex);
    return {
        r: color.r,
        g: color.g,
        b: color.b,
        a: alpha
    };
}
function createText(text, fontSize, color) {
    const node = figma.createText();
    node.fontName = fontSize >= 44 ? activeBoldFont : activeRegularFont;
    node.characters = text;
    node.fontSize = fontSize;
    node.fills = [makeSolidPaint(color)];
    node.lineHeight = { unit: "PERCENT", value: 112 };
    return node;
}
function createRoundedFrame(name, width, height, x, y) {
    const frame = figma.createFrame();
    frame.name = name;
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
    frame.clipsContent = false;
    frame.fills = [];
    return frame;
}
function applyPngExport(node) {
    node.exportSettings = [
        {
            format: "PNG",
            constraint: { type: "SCALE", value: 1 }
        }
    ];
}
function roundedPolygonPath(points, radius) {
    const commands = [];
    points.forEach((point, index) => {
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];
        const toPrevious = Math.hypot(point.x - previous.x, point.y - previous.y);
        const toNext = Math.hypot(point.x - next.x, point.y - next.y);
        const appliedRadius = Math.min(radius, toPrevious / 2, toNext / 2);
        const start = {
            x: point.x + ((previous.x - point.x) / toPrevious) * appliedRadius,
            y: point.y + ((previous.y - point.y) / toPrevious) * appliedRadius
        };
        const end = {
            x: point.x + ((next.x - point.x) / toNext) * appliedRadius,
            y: point.y + ((next.y - point.y) / toNext) * appliedRadius
        };
        if (index === 0) {
            commands.push(`M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`);
        }
        else {
            commands.push(`L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`);
        }
        commands.push(`Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`);
    });
    commands.push("Z");
    return commands.join(" ");
}
function createPathShape(name, points, radius, fill) {
    const vector = figma.createVector();
    vector.name = name;
    vector.vectorPaths = [
        {
            windingRule: "NONZERO",
            data: roundedPolygonPath(points, radius)
        }
    ];
    vector.fills = [fill];
    vector.strokes = [];
    vector.effects = [
        {
            type: "DROP_SHADOW",
            color: makeRgba(TOKENS.brandAccent, fill.opacity ? fill.opacity * 0.18 : 0.18),
            offset: { x: 0, y: 18 },
            radius: 42,
            spread: 0,
            visible: true,
            blendMode: "NORMAL"
        }
    ];
    return vector;
}
function createZMark(scale, monochrome = false) {
    const accent = monochrome ? "#ffffff" : TOKENS.brandAccent;
    const shadowless = monochrome;
    const segments = [
        {
            name: "Z Mark / Top Segment",
            opacity: 1,
            points: [
                { x: 270, y: 308 },
                { x: 850, y: 308 },
                { x: 770, y: 430 },
                { x: 190, y: 430 }
            ]
        },
        {
            name: "Z Mark / Middle Segment",
            opacity: 0.82,
            points: [
                { x: 580, y: 446 },
                { x: 720, y: 446 },
                { x: 492, y: 706 },
                { x: 350, y: 706 }
            ]
        },
        {
            name: "Z Mark / Bottom Segment",
            opacity: 0.74,
            points: [
                { x: 270, y: 720 },
                { x: 830, y: 720 },
                { x: 745, y: 838 },
                { x: 185, y: 838 }
            ]
        }
    ];
    const nodes = segments.map((segment) => {
        const vector = createPathShape(segment.name, segment.points.map((point) => ({ x: point.x * scale, y: point.y * scale })), 22 * scale, makeSolidPaint(accent, monochrome ? 1 : segment.opacity));
        if (shadowless) {
            vector.effects = [];
        }
        return vector;
    });
    const group = figma.group(nodes, figma.currentPage);
    group.name = "Z Mark";
    return group;
}
function addDepthEllipses(parent, size) {
    const ellipses = [
        { name: "Depth Glow / Lime", x: -0.1, y: -0.08, w: 0.82, h: 0.72, color: TOKENS.brandAccent, opacity: 0.11 },
        { name: "Depth Glow / White", x: 0.22, y: 0.12, w: 0.92, h: 0.82, color: "#ffffff", opacity: 0.055 },
        { name: "Depth Glow / Cyan", x: 0.08, y: 0.46, w: 0.55, h: 0.45, color: TOKENS.info, opacity: 0.045 }
    ];
    ellipses.forEach((glow) => {
        const ellipse = figma.createEllipse();
        ellipse.name = glow.name;
        ellipse.resize(size * glow.w, size * glow.h);
        ellipse.x = size * glow.x;
        ellipse.y = size * glow.y;
        ellipse.fills = [makeSolidPaint(glow.color, glow.opacity)];
        ellipse.effects = [{ type: "LAYER_BLUR", blurType: "NORMAL", radius: size * 0.12, visible: true }];
        parent.appendChild(ellipse);
    });
}
function buildIconComposition(parent, size, options = {}) {
    var _a, _b, _c;
    const includeBackground = (_a = options.background) !== null && _a !== void 0 ? _a : true;
    const includePanel = (_b = options.panel) !== null && _b !== void 0 ? _b : true;
    const includeMark = (_c = options.mark) !== null && _c !== void 0 ? _c : true;
    const scale = size / 1024;
    parent.resize(size, size);
    parent.clipsContent = true;
    parent.fills = includeBackground ? [makeSolidPaint(TOKENS.background)] : [];
    if (includeBackground) {
        addDepthEllipses(parent, size);
    }
    if (includePanel) {
        const panel = figma.createRectangle();
        panel.name = "Glass Panel";
        panel.resize(900 * scale, 900 * scale);
        panel.x = 62 * scale;
        panel.y = 62 * scale;
        panel.cornerRadius = 210 * scale;
        panel.fills = [makeSolidPaint("#ffffff", 0.055)];
        panel.strokes = [makeSolidPaint("#ffffff", 0.08)];
        panel.strokeWeight = Math.max(1, 1.5 * scale);
        panel.effects = [
            {
                type: "INNER_SHADOW",
                color: makeRgba("#ffffff", 0.08),
                offset: { x: 0, y: 1 * scale },
                radius: 34 * scale,
                spread: 0,
                visible: true,
                blendMode: "NORMAL"
            },
            {
                type: "DROP_SHADOW",
                color: makeRgba("#000000", 0.34),
                offset: { x: 0, y: 34 * scale },
                radius: 80 * scale,
                spread: 0,
                visible: true,
                blendMode: "NORMAL"
            }
        ];
        parent.appendChild(panel);
    }
    if (includeMark) {
        const zMark = createZMark(scale, options.monochrome);
        parent.appendChild(zMark);
    }
}
function cloneIconToSize(size) {
    const frame = createRoundedFrame(`AppIcon-${size}`, size, size, 0, 0);
    buildIconComposition(frame, size);
    applyPngExport(frame);
    return frame;
}
function addLabel(parent, text, x, y, color = TOKENS.textMuted) {
    const label = createText(text, 18, color);
    label.name = `Label / ${text}`;
    label.x = x;
    label.y = y;
    parent.appendChild(label);
    return label;
}
function createSectionLabel(page, title, x, y) {
    const label = createText(title, 28, TOKENS.brandAccent);
    label.name = `Section Label / ${title}`;
    label.x = x;
    label.y = y;
    page.appendChild(label);
}
function createPages() {
    const currentPage = figma.currentPage;
    const created = [];
    try {
        const cover = figma.createPage();
        cover.name = "00_Cover";
        created.push(cover);
        const master = figma.createPage();
        master.name = "01_Icon Master";
        created.push(master);
        const ios = figma.createPage();
        ios.name = "02_iOS Exports";
        created.push(ios);
        const android = figma.createPage();
        android.name = "03_Android Adaptive";
        created.push(android);
        return { pages: { cover, master, ios, android }, fallback: false };
    }
    catch (error) {
        created.forEach((page) => {
            try {
                page.remove();
            }
            catch {
                // A best-effort cleanup keeps Starter-file fallbacks tidy.
            }
        });
        currentPage.name = currentPage.name || "Zook Icon Builder";
        return {
            pages: {
                cover: currentPage,
                master: currentPage,
                ios: currentPage,
                android: currentPage
            },
            fallback: true
        };
    }
}
function buildCover(page, offsetX, offsetY) {
    createSectionLabel(page, "00_Cover", offsetX, offsetY - 64);
    const cover = createRoundedFrame("Zook Icon System / Cover", 1440, 900, offsetX, offsetY);
    cover.fills = [makeSolidPaint(TOKENS.background)];
    cover.clipsContent = true;
    page.appendChild(cover);
    addDepthEllipses(cover, 900);
    const title = createText("Zook Icon System", 92, TOKENS.textPrimary);
    title.x = 96;
    title.y = 118;
    cover.appendChild(title);
    const subtitle = createText("Premium system-led icon exports for iOS and Android", 30, TOKENS.textMuted);
    subtitle.x = 104;
    subtitle.y = 238;
    cover.appendChild(subtitle);
    const preview = createRoundedFrame("Cover / Icon Preview", 360, 360, 980, 190);
    buildIconComposition(preview, 360);
    cover.appendChild(preview);
    const swatches = [
        TOKENS.background,
        TOKENS.textPrimary,
        TOKENS.textMuted,
        TOKENS.brandAccent,
        TOKENS.warning,
        TOKENS.danger,
        TOKENS.info,
        TOKENS.violet
    ];
    swatches.forEach((color, index) => {
        const swatch = figma.createRectangle();
        swatch.name = `Token Swatch / ${color}`;
        swatch.resize(68, 68);
        swatch.x = 104 + index * 92;
        swatch.y = 704;
        swatch.cornerRadius = 18;
        swatch.fills = [makeSolidPaint(color)];
        swatch.strokes = [makeSolidPaint("#ffffff", color === TOKENS.background ? 0.14 : 0.08)];
        cover.appendChild(swatch);
        const label = createText(color, 13, TOKENS.textMuted);
        label.name = `Token Label / ${color}`;
        label.x = swatch.x;
        label.y = swatch.y + 84;
        cover.appendChild(label);
    });
}
function buildMaster(page, offsetX, offsetY) {
    createSectionLabel(page, "01_Icon Master", offsetX, offsetY - 64);
    const master = createRoundedFrame("Icon / Master / 1024", 1024, 1024, offsetX, offsetY);
    buildIconComposition(master, 1024);
    page.appendChild(master);
    const guide = figma.createRectangle();
    guide.name = "Safe Area Guide / Hidden";
    guide.resize(820, 820);
    guide.x = 102;
    guide.y = 102;
    guide.fills = [];
    guide.strokes = [makeSolidPaint(TOKENS.info, 0.2)];
    guide.strokeWeight = 2;
    guide.visible = false;
    master.appendChild(guide);
}
function buildIosExports(page, offsetX, offsetY) {
    createSectionLabel(page, "02_iOS Exports", offsetX, offsetY - 64);
    const sizes = [1024, 180, 167, 152, 120, 87, 80, 60, 58, 40, 29];
    let x = offsetX;
    let y = offsetY;
    let rowHeight = 0;
    sizes.forEach((size, index) => {
        const icon = cloneIconToSize(size);
        icon.x = x;
        icon.y = y;
        page.appendChild(icon);
        addLabel(page, `AppIcon-${size}`, x, y + size + 18);
        const cellWidth = Math.max(size, 220) + 56;
        rowHeight = Math.max(rowHeight, size + 72);
        x += cellWidth;
        if (index === 0 || x > offsetX + 1160) {
            x = offsetX;
            y += rowHeight + 52;
            rowHeight = 0;
        }
    });
}
function buildAndroidAdaptive(page, offsetX, offsetY) {
    createSectionLabel(page, "03_Android Adaptive", offsetX, offsetY - 64);
    const specs = [
        { name: "Android / BG / 432", label: "ic_launcher_background.png", x: 0, y: 0, mode: "bg" },
        { name: "Android / FG / 432", label: "ic_launcher_foreground.png", x: 520, y: 0, mode: "fg" },
        { name: "Android / Mono / 432", label: "ic_launcher_monochrome.png", x: 0, y: 560, mode: "mono" },
        { name: "Android / Preview / 432", label: "Preview only", x: 520, y: 560, mode: "preview" }
    ];
    specs.forEach((spec) => {
        const frame = createRoundedFrame(spec.name, 432, 432, offsetX + spec.x, offsetY + spec.y);
        page.appendChild(frame);
        if (spec.mode === "bg") {
            frame.fills = [makeSolidPaint(TOKENS.background)];
            frame.clipsContent = true;
            addDepthEllipses(frame, 432);
            applyPngExport(frame);
        }
        if (spec.mode === "fg") {
            frame.fills = [];
            const mark = createZMark(288 / Z_MARK_MAX_DIMENSION);
            mark.x = (432 - mark.width) / 2;
            mark.y = (432 - mark.height) / 2;
            frame.appendChild(mark);
            applyPngExport(frame);
        }
        if (spec.mode === "mono") {
            frame.fills = [];
            const mark = createZMark(288 / Z_MARK_MAX_DIMENSION, true);
            mark.x = (432 - mark.width) / 2;
            mark.y = (432 - mark.height) / 2;
            frame.appendChild(mark);
            applyPngExport(frame);
        }
        if (spec.mode === "preview") {
            buildIconComposition(frame, 432, { panel: false, mark: false });
            const mark = createZMark(288 / Z_MARK_MAX_DIMENSION);
            mark.x = (432 - mark.width) / 2;
            mark.y = (432 - mark.height) / 2;
            frame.appendChild(mark);
            const guide = figma.createEllipse();
            guide.name = "Safe Area Circle / Hidden";
            guide.resize(288, 288);
            guide.x = 72;
            guide.y = 72;
            guide.fills = [];
            guide.strokes = [makeSolidPaint(TOKENS.info, 0.2)];
            guide.strokeWeight = 2;
            guide.visible = false;
            frame.appendChild(guide);
        }
        addLabel(page, spec.label, frame.x, frame.y + 450);
    });
}
async function loadFonts() {
    try {
        await Promise.all([figma.loadFontAsync(FONT_REGULAR), figma.loadFontAsync(FONT_BOLD)]);
        activeRegularFont = FONT_REGULAR;
        activeBoldFont = FONT_BOLD;
    }
    catch {
        const fallback = { family: "Inter", style: "Regular" };
        await figma.loadFontAsync(fallback);
        activeRegularFont = fallback;
        activeBoldFont = fallback;
    }
}
async function main() {
    await loadFonts();
    const { pages, fallback } = createPages();
    if (fallback) {
        buildCover(pages.cover, 0, 120);
        buildMaster(pages.master, 1580, 120);
        buildIosExports(pages.ios, 0, 1280);
        buildAndroidAdaptive(pages.android, 1580, 1280);
    }
    else {
        buildCover(pages.cover, 0, 120);
        buildMaster(pages.master, 0, 120);
        buildIosExports(pages.ios, 0, 120);
        buildAndroidAdaptive(pages.android, 0, 120);
        await figma.setCurrentPageAsync(pages.cover);
    }
    figma.notify("Zook icon system created.");
    figma.closePlugin("Zook icon system created.");
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    figma.notify(`Zook icon builder failed: ${message}`, { error: true });
    figma.closePlugin();
});
