// Resolve playwright from this repo's node_modules, then a global npm install.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

module.exports = function resolvePlaywright() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const local = path.join(repoRoot, "node_modules", "playwright");
  if (fs.existsSync(path.join(local, "package.json"))) {
    return local;
  }

  try {
    return require.resolve("playwright");
  } catch {}

  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
    const candidate = path.join(globalRoot, "playwright");
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  } catch {}

  throw new Error(
    "playwright not found; from repo root run: npm ci (or npm install)"
  );
};
