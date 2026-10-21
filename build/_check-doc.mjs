import puppeteer from "puppeteer";

const files = process.argv.slice(2);
const exe = process.env.USERPROFILE + "/.cache/puppeteer/chrome-headless-shell/win64-155.0.8059.79/chrome-headless-shell-win64/chrome-headless-shell.exe";
const browser = await puppeteer.launch({ executablePath: exe });
let bad = 0;
for (const f of files) {
  const page = await browser.newPage();
  await page.goto(new URL("../" + f, "file:///" + process.cwd().replace(/\\/g, "/") + "/").href, { waitUntil: "load" });
  const out = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    const texts = [...svg.querySelectorAll("text")].map((t) => {
      const b = t.getBBox();
      return { t: t.textContent.trim().slice(0, 40), x: b.x, y: b.y, w: b.width, h: b.height, fs: +t.getAttribute("font-size") };
    });
    const outside = texts.filter((t) => t.x < -0.5 || t.y < -0.5 || t.x + t.w > W + 0.5 || t.y + t.h > H + 0.5).map((t) => t.t);
    const small = texts.filter((t) => t.fs < 12).map((t) => t.t);
    const overlap = [];
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 1 && oy > 1) overlap.push([a.t, b.t, Math.round(ox), Math.round(oy)]);
      }
    const rects = [...svg.querySelectorAll("rect")].map((r) => {
      const b = r.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    const spill = [];
    for (const t of texts) {
      const owners = rects.filter(
        (r) => r.x <= t.x + 0.5 && r.y <= t.y + 0.5 && r.x + r.w >= t.x + t.w - 0.5 && r.y + r.h >= t.y + t.h - 0.5 && r.w > 60 && r.h > 40
      );
      if (!owners.length) continue;
      const r = owners[0];
      if (t.x + t.w > r.x + r.w - 4 || t.y + t.h > r.y + r.h - 2) spill.push([t.t, Math.round(r.x + r.w - 4 - (t.x + t.w)), Math.round(r.y + r.h - 2 - (t.y + t.h))]);
    }
    return { count: texts.length, outside, small, overlap, spill };
  });
  if (out.outside.length || out.small.length || out.overlap.length || out.spill.length) bad++;
  console.log(f, JSON.stringify(out));
  await page.close();
}
await browser.close();
process.exitCode = bad ? 1 : 0;
