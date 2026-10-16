const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { choose, wantedNames } = require("../skills/browser-automate/scripts/wellfound_lib.js");

describe("wellfound_lib", () => {
  it("matches exact tag names only", () => {
    const options = ["Python1723757 followers", "Python Flask9616 followers", "New Python"];
    assert.equal(choose("Python", options), "Python");
    assert.equal(choose("React", ["React.js699905 followers", "React Native123 followers"]), "React.js");
  });

  it("does not prefix-match when exact tag is hidden", () => {
    const options = ["Python Flask9616 followers", "New Python"];
    assert.equal(choose("Python", options), null);
  });

  it("wantedNames includes aliases", () => {
    assert.ok(wantedNames("Power BI").includes("microsoft power bi"));
  });
});
