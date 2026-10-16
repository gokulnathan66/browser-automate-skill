# browser-automate-skill

An agent skill for Claude Code and Cursor. It drives **your real, signed-in Google Chrome profile** with Playwright on macOS, using a private temp copy of login state and a loopback CDP port.

## Install

```bash
git clone https://github.com/gokulnathan66/browser-automate-skill.git
cd browser-automate-skill
npm ci
./install.sh
```

Requirements: macOS, Google Chrome, Node 18+, Python 3. Playwright is pinned in `package.json` (run `npm ci` from the repo root).

## Use

```bash
cd skills/browser-automate
python3 scripts/list_profiles.py --site wellfound.com
scripts/launch_profile_chrome.sh "Default" "https://wellfound.com/profile/edit"   # background
# note SESSION_ID=... and CDP port from output
node scripts/wellfound_add_skills.js --session <SESSION_ID> Python Docker "Power BI"
scripts/cleanup.sh --session <SESSION_ID>
```

Stale sessions (>15 minutes) are removed on the next launch, or run `scripts/cleanup.sh --stale`.

## Safety (read this)

- The clone holds **live session cookies** until cleanup.
- CDP listens on **127.0.0.1** only, but any local process can control the signed-in window while the session is open.
- Agents must **confirm with you** before Publish, pay, delete, message, apply, or security changes.
- Verify the **visible username** on the site matches the account you intended.

## Layout

```
skills/browser-automate/
├── SKILL.md
├── scripts/
│   ├── launch_profile_chrome.sh
│   ├── cleanup.sh
│   ├── copy_chrome_login.py
│   ├── list_profiles.py
│   ├── wellfound_add_skills.js
│   └── ...
└── references/          # per-site editor notes
```

## Tests

```bash
npm test
```

## License

MIT
