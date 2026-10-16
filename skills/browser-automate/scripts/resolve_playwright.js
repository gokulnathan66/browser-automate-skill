// Returns a path that require() can load as the playwright package.
// Order: local/global install, then the npx cache Playwright MCP leaves behind.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

module.exports = function resolvePlaywright() {
  try {
    return require.resolve("playwright");
  } catch {}

  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
    const candidate = path.join(globalRoot, "playwright");
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  } catch {}

  const npxDir = path.join(os.homedir(), ".npm", "_npx");
  if (fs.existsSync(npxDir)) {
    const hits = fs
      .readdirSync(npxDir)
      .map(d => path.join(npxDir, d, "node_modules", "playwright"))
      .filter(p => fs.existsSync(path.join(p, "package.json")))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (hits.length) return hits[0];
  }

  throw new Error("playwright not found; run: npm i -g playwright");
};
