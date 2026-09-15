/**
 * Turn a scroll-driven stack into one image a human can judge.
 *
 * Drives the page with REAL wheel events (never scrollTo — Lenis's virtual
 * scroll ignores programmatic jumps, and the gap between the two is exactly
 * what let an unscrollable overlay ship once already). Captures N frames
 * across the stack's runway, then tiles them in a throwaway page so the
 * output is a single PNG with no extra image dependency.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5174/';
const selector = process.argv[3] ?? '#hero';
const outDir = process.argv[4] ?? 'scratchpad/filmstrip';
const FRAMES = 8;
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // let the intro island settle

  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`selector ${selector} not found at ${url}`);
  const runway = Math.max(0, box.height - vp.height);

  const shots = [];
  for (let i = 0; i < FRAMES; i += 1) {
    const target = box.y + (runway * i) / (FRAMES - 1);
    // Converge on the target with real wheel bursts; Lenis eases, so this
    // takes several passes and never lands exactly. 4px is close enough.
    for (let guard = 0; guard < 60; guard += 1) {
      const current = await page.evaluate(() => window.scrollY);
      const delta = target - current;
      if (Math.abs(delta) <= 4) break;
      await page.mouse.wheel(0, Math.max(-400, Math.min(400, delta)));
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(250); // let momentum die before the shutter
    const scrollY = await page.evaluate(() => Math.round(window.scrollY));
    shots.push({ b64: (await page.screenshot()).toString('base64'), scrollY });
  }
  await page.close();

  const tileW = 240;
  const tileH = Math.round((tileW * vp.height) / vp.width);
  const tiler = await browser.newPage({
    viewport: { width: FRAMES * (tileW + 8) + 40, height: tileH + 90 },
  });
  await tiler.setContent(`<body style="margin:0;background:#141414;display:flex;gap:8px;padding:20px;align-items:flex-start">
    ${shots
      .map(
        (s, i) => `<figure style="margin:0;flex:0 0 ${tileW}px">
        <img src="data:image/png;base64,${s.b64}" style="width:${tileW}px;display:block">
        <figcaption style="color:#999;font:11px ui-monospace,monospace;text-align:center;padding-top:6px">
          ${Math.round((i * 100) / (FRAMES - 1))}% · y=${s.scrollY}
        </figcaption></figure>`,
      )
      .join('')}
  </body>`);
  await tiler.screenshot({ path: path.join(outDir, `${vp.name}.png`), fullPage: true });
  await tiler.close();
  console.log(`${vp.name}: ${path.join(outDir, `${vp.name}.png`)}`);
}

await browser.close();
