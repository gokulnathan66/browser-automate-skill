const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const scripts = path.join(root, "skills/browser-automate/scripts");

describe("repo safety", () => {
  it("cleanup.sh does not use pkill -f", () => {
    const body = fs.readFileSync(path.join(scripts, "cleanup.sh"), "utf8");
    assert.equal(body.includes("pkill -f"), false);
  });

  it("resolve_playwright does not read npx cache", () => {
    const body = fs.readFileSync(path.join(scripts, "resolve_playwright.js"), "utf8");
    assert.equal(body.includes("_npx"), false);
  });

  it("list_profiles.py output has no cookie values", () => {
    const chromeFixture = path.join(root, "tests/fixtures/chrome");
    const out = execSync(`python3 "${path.join(scripts, "list_profiles.py")}" --site wellfound.com`, {
      encoding: "utf8",
      env: { ...process.env, BROWSER_AUTOMATE_CHROME_DIR: chromeFixture },
    });
    assert.match(out, /cookies:/);
    assert.match(out, /_wellfound/);
    assert.doesNotMatch(out, /plaintext-should-never-print/);
    assert.doesNotMatch(out, /=[A-Za-z0-9._-]{20,}/);
  });

  it("rejects invalid profile folder names", () => {
    const cmd = `source "${path.join(scripts, "session_common.sh")}" && validate_profile_folder '../Default'`;
    assert.throws(() => execSync(`bash -c '${cmd}'`, { stdio: "pipe" }), /Invalid profile/);
  });

  it("rejects non-http start URLs", () => {
    const cmd = `source "${path.join(scripts, "session_common.sh")}" && validate_start_url 'file:///etc/passwd'`;
    assert.throws(() => execSync(`bash -c '${cmd}'`, { stdio: "pipe" }), /http or https/);
  });
});
