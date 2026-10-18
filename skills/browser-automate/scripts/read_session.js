#!/usr/bin/env node
/** Print session JSON or a single field: node read_session.js <sessionId> [port|chrome_pid|...] */
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(os.tmpdir(), "browser-automate-sessions");
const id = process.argv[2];
const field = process.argv[3];
const file = path.join(root, `${id}.json`);

if (!id) {
  console.error("Usage: read_session.js <sessionId> [field]");
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error(`No session file: ${file}`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf8"));
if (field) {
  if (data[field] === undefined) process.exit(1);
  console.log(String(data[field]));
} else {
  console.log(JSON.stringify(data, null, 2));
}
