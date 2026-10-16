#!/usr/bin/env node
// Add skills to the Wellfound profile through a browser-automate CDP session.
//
// Usage:
//   node wellfound_add_skills.js --session <SESSION_ID> [--remove "Tag"] Python Docker ...
//   node wellfound_add_skills.js --port <PORT> ...   # legacy; prefer --session
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require(require("./resolve_playwright.js")());
const { label, wantedNames, choose } = require("./wellfound_lib.js");

const SKILL_INPUT = 'input[placeholder="e.g. Python, React"]';
const CHIP = "span[class*='styles_component']";

function parseArgs(argv) {
  const out = { port: null, sessionId: null, remove: [], skills: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") out.port = Number(argv[++i]);
    else if (argv[i] === "--session") out.sessionId = argv[++i];
    else if (argv[i] === "--remove") out.remove.push(argv[++i]);
    else out.skills.push(argv[i]);
  }
  return out;
}

function resolvePort({ port, sessionId }) {
  if (port) return port;
  if (!sessionId) {
    console.error("Pass --session <SESSION_ID> (from launch_profile_chrome.sh) or --port");
    process.exit(2);
  }
  const file = path.join(os.tmpdir(), "browser-automate-sessions", `${sessionId}.json`);
  if (!fs.existsSync(file)) {
    console.error(`No session file: ${file}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return data.port;
}

async function clickAndAwaitSave(page, locator) {
  const saved = page
    .waitForResponse(r => r.request().method() === "POST" && r.url().includes("wellfound.com"), {
      timeout: 5000,
    })
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

function verifySaved(saved, added, remove) {
  const lower = new Set(saved.map(s => s.toLowerCase()));
  for (const entry of added) {
    const pick = entry.split(" -> ")[1];
    if (!pick || !lower.has(pick.toLowerCase())) {
      throw new Error(`After reload, expected skill "${pick}" on profile`);
    }
  }
  for (const text of remove) {
    if (lower.has(text.toLowerCase())) {
      throw new Error(`After reload, removed skill "${text}" is still present`);
    }
  }
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const port = resolvePort(args);
  const { remove, skills } = args;

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes("wellfound.com"));
  if (!page) page = await context.newPage();
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
    if (wantedNames(query).some(n => existing.has(n.toLowerCase()))) continue;
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
    const chip = page
      .locator(CHIP)
      .filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
      .first();
    if (await chip.count()) {
      await clickAndAwaitSave(page, chip.locator('[role="button"]'));
    }
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(SKILL_INPUT).waitFor({ timeout: 15000 });
  const saved = await readSkills(page);
  verifySaved(saved, added, remove);

  console.log(JSON.stringify({ added, skipped, saved }, null, 2));
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
