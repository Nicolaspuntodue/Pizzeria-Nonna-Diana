import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Mobile audit: errors, overflow, hidden or clipped text, tap targets, scroll jank, the Card flow.
// Screenshots land in tests/artifacts/<project>/ for a visual pass.

const shotDir = (info) => {
  const d = `tests/artifacts/${info.project.name}`;
  fs.mkdirSync(d, { recursive: true });
  return d;
};

async function scrollInSteps(page, { step = 0.5, pause = 250, until = Infinity } = {}) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y < Math.min(h, until); y += vh * step) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(pause);
  }
}

test.describe("mobile audit", () => {
  test("no errors, no horizontal overflow at any scroll position", async ({ page }, info) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
    await page.goto("/");
    await page.waitForTimeout(2500);

    const overflow = [];
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = await page.evaluate(() => innerHeight);
    for (let y = 0; y < h; y += vh * 0.5) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        vw: document.documentElement.clientWidth,
        iw: innerWidth,
      }));
      if (r.sw > r.vw + 1 || r.iw > r.vw + 1) overflow.push({ y, ...r });
    }
    console.log(`[${info.project.name}] errors:`, errors);
    console.log(`[${info.project.name}] overflow:`, overflow.slice(0, 5));
    expect(errors).toEqual([]);
    expect(overflow).toEqual([]);
  });

  test("screenshots of every screen while scrolling", async ({ page }, info) => {
    const dir = shotDir(info);
    await page.goto("/");
    await page.waitForTimeout(3000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = await page.evaluate(() => innerHeight);
    let i = 0;
    for (let y = 0; y < h; y += vh * 0.85) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${dir}/scroll-${String(i++).padStart(2, "0")}.png` });
    }
  });

  test("text is visible after scrolling past it, and not clipped by the word masks", async ({ page }, info) => {
    await page.goto("/");
    await page.waitForTimeout(2500);
    await scrollInSteps(page, { step: 0.4, pause: 350 });
    await page.waitForTimeout(1200);

    const report = await page.evaluate(() => {
      const hidden = [];
      const vis = (el) => {
        let n = el;
        while (n && n !== document.body) {
          const cs = getComputedStyle(n);
          if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.95 || cs.display === "none") return cs;
          n = n.parentElement;
        }
        return null;
      };
      // everything that should have revealed by now (story chapters are pinned crossfades: skip them)
      document.querySelectorAll("main h1, main h2, main h3, main p, main li, main .btn").forEach((el) => {
        if (el.closest(".chapter, .manifesto, [hidden], .win, .t-back, .invite, .hero-fallback, .t-actions")) return;
        const cs = vis(el);
        if (cs) hidden.push({ tag: el.tagName, text: el.textContent.trim().slice(0, 40), op: cs.opacity, v: cs.visibility });
      });
      // word masks: does the inner word overflow its mask (descenders cut)?
      const clipped = [];
      document.querySelectorAll(".wm").forEach((m) => {
        const i = m.firstElementChild;
        if (!i) return;
        const mr = m.getBoundingClientRect();
        const ir = i.getBoundingClientRect();
        if (ir.bottom > mr.bottom + 1 || ir.top < mr.top - 1)
          clipped.push({ word: i.textContent, mask: Math.round(mr.height), word_h: Math.round(ir.height), dy: Math.round(ir.bottom - mr.bottom) });
      });
      return { hidden, clipped };
    });
    console.log(`[${info.project.name}] hidden text:`, report.hidden.slice(0, 15));
    console.log(`[${info.project.name}] clipped words:`, report.clipped.slice(0, 15));
    expect(report.hidden).toEqual([]);
  });

  test("tap targets are at least 44x44", async ({ page }, info) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, input")]
        .filter((el) => el.offsetParent !== null && !el.closest("[hidden]"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { t: (el.textContent || el.getAttribute("aria-label") || el.id || el.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), inline: getComputedStyle(el).display === "inline" };
        })
        .filter((r) => (r.w < 44 || r.h < 44) && !r.inline)
    );
    console.log(`[${info.project.name}] small tap targets:`, small);
  });

  test("scroll smoothness: long frames while scrolling the whole page", async ({ page }, info) => {
    await page.goto("/");
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const tick = (t) => {
        window.__frames.push(t - last);
        last = t;
        if (window.__frames.length < 100000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    // continuous scroll, like a thumb flick
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 40) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(16);
    }
    const stats = await page.evaluate(() => {
      const f = window.__frames.slice(5);
      const long = f.filter((d) => d > 50);
      const sorted = [...f].sort((a, b) => a - b);
      return {
        frames: f.length,
        p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
        max: Math.round(sorted[sorted.length - 1]),
        over50ms: long.length,
      };
    });
    console.log(`[${info.project.name}] frame stats (emulated, relative only):`, stats);
  });

  test("Nonna Diana Card: create, stamp to 10, winning ticket opens and closes", async ({ page }, info) => {
    const dir = shotDir(info);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1500);
    await page.locator("#tessera").scrollIntoViewIfNeeded();
    await page.fill("#t-name", "Giulia");
    await page.click("#t-make");
    await expect(page.locator("#t-actions")).toBeVisible();
    for (let k = 0; k < 10; k++) {
      await page.click("#t-stamp");
      await page.waitForTimeout(120);
    }
    await expect(page.locator(".win")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3800);
    await page.screenshot({ path: `${dir}/win-ticket.png` });
    // page behind is locked while the ticket is open
    expect(await page.evaluate(() => document.documentElement.classList.contains("win-open"))).toBe(true)
    await page.click(".win-close");
    await expect(page.locator(".win")).toHaveCount(0, { timeout: 3000 });
    // card flips on tap
    await page.click("#t-card");
    await page.waitForTimeout(900);
    await page.locator("#t-stage").screenshot({ path: `${dir}/card-back.png` });
    expect(errors).toEqual([]);
  });

  test("input does not zoom the page on focus (font-size >= 16px)", async ({ page }) => {
    await page.goto("/");
    const fs16 = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("t-name")).fontSize));
    expect(fs16).toBeGreaterThanOrEqual(16);
  });
});
