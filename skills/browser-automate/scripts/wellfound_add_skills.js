#!/usr/bin/env node
// Add skills to the Wellfound profile through the cloned Chrome's CDP port.
// Picks Wellfound's existing tags, skips "New ..." free-text entries, then reloads and prints the saved list.
//
// Usage: node wellfound_add_skills.js [--port 9333] [--remove "Exact Chip Text"] Python Docker "Power BI" ...
const { chromium } = require(require("./resolve_playwright.js")());

const SKILL_INPUT = 'input[placeholder="e.g. Python, React"]';
const CHIP = "span[class*='styles_component']";

const ALIASES = {
  "power bi": ["microsoft power bi"],
  "react": ["react.js"],
  "express": ["express.js"],
  "rest api": ["rest", "rest apis"],
  "postgres": ["postgresql"],
};

function parseArgs(argv) {
  const out = { port: 9333, remove: [], skills: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") out.port = Number(argv[++i]);
    else if (argv[i] === "--remove") out.remove.push(argv[++i]);
    else out.skills.push(argv[i]);
  }
  return out;
}

const label = raw => raw.replace(/\d[\d,]*\s*followers?/i, "").replace(/\s+/g, " ").trim();

const wantedNames = query => {
  const q = query.toLowerCase();
  return [q, ...(ALIASES[q] || [])];
};

// Exact or alias matches only: Wellfound hides tags already on the profile from suggestions,
// so a prefix fallback would pick a different tag (e.g. "Python" -> "Python Flask").
function choose(query, options) {
  const wanted = wantedNames(query);
  return options.map(label).find(n => wanted.includes(n.toLowerCase())) || null;
}

// Each chip change autosaves; firing the next change before that request returns can drop one.
async function clickAndAwaitSave(page, locator) {
  const saved = page
    .waitForResponse(r => r.request().method() === "POST" && r.url().includes("wellfound.com"), { timeout: 5000 })
    .catch(() => null);
  await locator.click();
  await saved;
  await page.waitForTimeout(300);
}

async function readSkills(page) {
  return page.evaluate(sel => {
    const input = document.querySelector(sel);
    let node = input && input.parentElement;
    for (let i = 0; i < 10 && node; i++) {
      if ((node.innerText || "").includes("Your Skills")) {
        return [...node.querySelectorAll("span[class*='styles_component']")].map(s => s.innerText.trim());
      }
      node = node.parentElement;
    }
    return [];
  }, SKILL_INPUT);
}

(async () => {
  const { port, remove, skills } = parseArgs(process.argv.slice(2));
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes("wellfound.com"));
  if (!page) {
    page = await context.newPage();
  }
  if (!page.url().includes("/profile/edit")) {
    await page.goto("https://wellfound.com/profile/edit", { waitUntil: "domcontentloaded" });
  }
  if (page.url().includes("/login")) {
    console.error("Not signed in to Wellfound on this profile.");
    process.exit(2);
  }

  const input = page.locator(SKILL_INPUT);
  await input.waitFor({ timeout: 15000 });
  await input.scrollIntoViewIfNeeded();

  const existing = new Set((await readSkills(page)).map(s => s.toLowerCase()));
  const added = [];
  const skipped = [];

  for (const query of skills) {
    if (wantedNames(query).some(n => existing.has(n))) {
      continue;
    }
    await input.click();
    await input.fill("");
    await page.keyboard.type(query, { delay: 40 });
    try {
      await page.waitForFunction(
        () => [...document.querySelectorAll('[role="option"]')].some(o => !/^new\b/i.test(o.innerText.trim())),
        { timeout: 4000 }
      );
    } catch {}
    const raw = (await page.locator('[role="option"]').allTextContents()).filter(t => !/^new\b/i.test(t.trim()));
    const pick = choose(query, raw);
    if (!pick) {
      skipped.push({ query, options: raw.map(label).slice(0, 5) });
      await page.keyboard.press("Escape");
      continue;
    }
    await clickAndAwaitSave(page, page.locator('[role="option"]').filter({ hasText: pick }).first());
    existing.add(pick.toLowerCase());
    added.push(`${query} -> ${pick}`);
  }

  for (const text of remove) {
    const chip = page.locator(CHIP).filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).first();
    if (await chip.count()) {
      await clickAndAwaitSave(page, chip.locator('[role="button"]'));
    }
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(SKILL_INPUT).waitFor({ timeout: 15000 });
  await page.locator(SKILL_INPUT).scrollIntoViewIfNeeded();
  const saved = await readSkills(page);
  await page.screenshot({ path: "/tmp/wellfound-skills.png" });

  console.log(JSON.stringify({ added, skipped, saved, screenshot: "/tmp/wellfound-skills.png" }, null, 2));
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
