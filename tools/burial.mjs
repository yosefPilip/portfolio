/**
 * Measure, with real wheel events, how much of a hero's runway the front plate
 * needs to fully cover the hero title, and how much scrolling is left over
 * afterwards before the first project row is on screen. Both halves of "every
 * notch should move the mountain, and the list should arrive the moment the
 * title is gone" -- see the long comment on `#ridge .plate--front` in
 * src/styles/stack.css for what the numbers are used to compute.
 *
 * The title is recoloured magenta for the duration, so "covered" is a pixel
 * fact rather than an eyeball call: the ridge is snow, the title is bone, and
 * a bone test against snow is pure noise. A rate can be passed in to try a
 * candidate without editing the stylesheet:
 *
 *     node tools/burial.mjs http://localhost:5174/projects.html -570 25
 *
 * Args: url, --rate override (empty string for the shipped value), and the
 * scroll step in px -- 100 is about one wheel notch, 25 resolves the burial
 * point finely enough to solve for a rate.
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5174/projects.html';
const rate = process.argv[3];                       // optional --rate override
const VIEWPORTS = [
  { name: '1440x900 ', width: 1440, height: 900 },
  { name: '1440x1080', width: 1440, height: 1080 },
  { name: '1920x1200', width: 1920, height: 1200 },
  { name: '390x844  ', width: 390, height: 844 },
];
const NOTCH = Number(process.argv[4] ?? 100);

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { try { sessionStorage.setItem('yp-intro-shown', '1'); } catch { /* private */ } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `
    #ridge .plate--copy .display, #ridge .plate--copy h1 { color: #f0f !important; }
    ${rate ? `#ridge .plate--front { --rate: ${rate} !important; }` : ''}
  ` });
  await page.waitForTimeout(600);

  const stack = await page.locator('#ridge').boundingBox();
  const runway = Math.max(0, stack.height - vp.height);
  const h1 = await page.locator('#ridge h1').boundingBox();

  const visible = async () => {
    const clip = {
      x: Math.max(0, h1.x), y: 0,
      width: Math.min(vp.width - Math.max(0, h1.x), h1.width),
      height: vp.height,
    };
    const b64 = (await page.screenshot({ clip })).toString('base64');
    return page.evaluate(async (data) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + data;
      await img.decode();
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const { data: px } = g.getImageData(0, 0, img.width, img.height);
      let n = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 150 && px[i + 1] < 110 && px[i + 2] > 150) n += 1;
      }
      return n;
    }, b64);
  };

  const at0 = await visible();
  let covered = null, notch = 0;
  while (true) {
    notch += 1;
    for (let g = 0; g < 30; g += 1) {
      const y = await page.evaluate(() => window.scrollY);
      const d = (stack.y + Math.min(runway, notch * NOTCH)) - y;
      if (Math.abs(d) <= 3) break;
      await page.mouse.wheel(0, Math.max(-400, Math.min(400, d)));
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(280);
    const n = await visible();
    if (covered === null && n === 0) covered = notch * NOTCH;
    if (notch * NOTCH >= runway) break;
  }
  // How much further past the burial you must scroll before the first project
  // row is actually on screen -- the "no extra scrolling to reach the
  // information" half of the ask.
  let toRows = null;
  for (let g = 0; g < 400; g += 1) {
    const seen = await page.evaluate(() => {
      const row = document.querySelector('.work-item');
      if (!row) return null;
      return row.getBoundingClientRect().top <= window.innerHeight - 40;
    });
    if (seen) { toRows = await page.evaluate(() => window.scrollY); break; }
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(90);
  }
  const p = covered === null ? null : Math.min(1, covered / runway);
  console.log(
    `${vp.name}  runway ${String(Math.round(runway)).padStart(4)}px (${(runway / NOTCH).toFixed(1)} notches)` +
    `  title px at rest ${String(at0).padStart(5)}` +
    `  covered at ${covered === null ? 'NEVER' : `${String(covered).padStart(4)}px = p ${p.toFixed(2)}`}` +
    `  dead scroll after burial ${toRows === null ? '?' : `${Math.round(toRows - stack.y - (covered ?? 0))}px`}`,
  );
  await page.close();
}
await browser.close();
