---
name: browser-automate
description: Drive the user's real, signed-in Google Chrome profile with Playwright on macOS, so automation runs as the user instead of in a blank, logged-out browser. Use this whenever the user wants an agent to fill out, update, or click through a website they are already logged into (Wellfound, LinkedIn, job portals, dashboards, admin panels, profile or settings pages), mentions "use my Chrome", "my existing profile", "my logged-in browser", a specific Chrome profile or Gmail account, or complains that Playwright or the browser tool opened a fresh window with no login. Also use it for the Wellfound profile skills recipe ("fill my Wellfound skills", "add skills to my Wellfound profile").
---

# Browser automation in the user's signed-in Chrome

Playwright MCP and similar browser tools launch Chrome with a throwaway profile, so every site shows its login page. The user's real profile can't be attached directly either: while their Chrome is open, the profile folder is locked, and Chrome won't open a debugging port on its default data directory.

What works: copy the chosen profile's login state (cookies, preferences, Local State) into a temporary data directory, start a second Chrome on that copy with a DevTools port, and connect Playwright over CDP. On the same Mac and macOS user, Chrome decrypts the copied cookies with the same Keychain key, so the session is already signed in. The user's own Chrome window keeps running untouched.

Prefer this over AppleScript `execute javascript`. That path needs "Allow JavaScript from Apple Events", which is a per-profile setting and easy to enable on the wrong profile. It also gives you only string eval, with no real clicks or waits.

## Workflow

### 1. Pick the profile

```bash
python3 scripts/list_profiles.py
```

This prints each profile folder (`Default`, `Profile 1`, …) with its display name and Google account email. Match what the user said, such as an email, a name, or "gokulnathanb0", to a folder. If it's ambiguous, ask; the wrong profile means the wrong account.

To confirm the profile is actually logged into the target site, check for its cookies:

```bash
python3 scripts/list_profiles.py --site wellfound.com
```

If the site has no session cookie, such as `_wellfound` or a `*session*` cookie, the user needs to sign in on that profile first.

### 2. Launch the cloned Chrome

Run it in the background. It blocks while Chrome is open, and a foreground shell timeout kills Chrome along with it, so don't run it in the foreground.

```bash
scripts/launch_profile_chrome.sh "Default" "https://wellfound.com/profile/edit"   # background
```

Arguments are the profile folder, the start URL, and an optional port (default `9333`). Wait for `CDP ready` in the output, or poll `curl -s http://127.0.0.1:9333/json/version`.

The script strips extensions from the copy. Copied extension state points at files that weren't copied, and the noise isn't useful. Sync is disabled so the clone doesn't register as a second sync client.

### 3. Drive it with Playwright over CDP

Script paths below are relative to this skill's directory; use the absolute path when running from elsewhere.

```js
const { chromium } = require(require("<skill-dir>/scripts/resolve_playwright.js")());
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = browser.contexts()[0].pages().find(p => p.url().includes("example.com"));
```

`scripts/resolve_playwright.js` finds a usable `playwright` package: the global install, the local one, or the npx cache Playwright MCP leaves behind. If none exists, run `npm i -g playwright`. You don't need `npx playwright install`, because this drives the real Chrome app.

Habits that keep runs reliable:

- **End scripts with `process.exit(0)`.** A CDP connection keeps Node alive, so without it the shell call hangs until timeout. Don't call `browser.close()` on a CDP connection unless you mean to close Chrome.
- **Inspect before acting.** Dump headings, inputs (placeholder, id, name), and button text first, and take a screenshot. Site markup changes, so pick selectors from what's on the page now.
- **Prefer the site's own suggestions.** For tag or skill pickers, type the query, wait for real `[role="option"]` results, and choose an existing entry. Skip "New …" or "Create …" entries; they make free-text tags that recruiters' filters don't match.
- **Verify by reloading.** Reload, then re-read the saved state. Many forms autosave on selection, but some need a Save button; the reload tells you which.
- **Fix bad picks.** If an option picks a bundled phrase ("RAGs, ChatGPT, Hugging Face, …"), remove it through its chip's close control instead of leaving it.

### 4. Clean up

```bash
scripts/cleanup.sh            # default port 9333
```

This quits the cloned Chrome and deletes the temp profile. The copy holds live session cookies, so don't leave it lying around in `/tmp`.

### 5. Report

Tell the user what changed on the site, quoting the final saved state you read after the reload, plus anything you skipped and why. Show the screenshot if you took one.

## Site recipes

- **Wellfound profile skills:** `references/wellfound.md`. Covers the skills picker selectors, how to map resume skills to Wellfound's canonical tags, and the batch script `scripts/wellfound_add_skills.js`.

When you automate a new site successfully and it's likely to recur, add a recipe file under `references/` and list it here.

## Troubleshooting

Read `references/troubleshooting.md` for these symptoms: the login page still appears, `ECONNREFUSED` on the port, the shell hangs after the script finishes, "Executing JavaScript through AppleScript is turned off", or "osascript is not allowed assistive access".
