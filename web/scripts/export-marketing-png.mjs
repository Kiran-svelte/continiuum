import fs from "fs";
import path from "path";

// Uses Playwright (already in devDependencies) to render SVGs and screenshot them to PNG.
// If Chromium isn't installed yet, run: npx playwright install chromium

const svgDir = path.resolve(process.cwd(), "public", "marketing", "v2");
const pngDir = path.resolve(svgDir, "png");
fs.mkdirSync(pngDir, { recursive: true });

const files = fs
  .readdirSync(svgDir)
  .filter((f) => f.toLowerCase().endsWith(".svg"))
  .sort();

if (files.length === 0) {
  console.error(`No SVG files found in ${svgDir}`);
  process.exit(1);
}

async function main() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });

  for (const file of files) {
    const svgPath = path.join(svgDir, file);
    const svg = fs.readFileSync(svgPath, "utf8");

    // Wrap in HTML to ensure deterministic rendering
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #050611; }
    svg { display: block; width: 1080px; height: 1350px; }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;

    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(50);

    const pngName = file.replace(/\.svg$/i, ".png");
    const pngPath = path.join(pngDir, pngName);

    await page.screenshot({ path: pngPath, type: "png" });
    process.stdout.write(`✔ ${pngName}\n`);
  }

  await browser.close();
  console.log(`\nExported ${files.length} PNGs to: ${pngDir}`);
}

main().catch((err) => {
  console.error("PNG export failed:", err);
  process.exit(1);
});
