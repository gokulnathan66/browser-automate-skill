# browser-automate-skill

An agent skill for Claude Code and Cursor. It lets an agent drive **your real, signed-in Google Chrome profile** with Playwright on macOS, so automation runs as you instead of in a blank, logged-out browser.

Playwright MCP and similar tools start Chrome with a throwaway profile, so every site shows its login page. Your real profile can't be attached while Chrome is open: the folder is locked, and Chrome won't open a debugging port on its default data directory. This skill copies one profile's login state (cookies, preferences) into a temp directory, launches a second Chrome on it with a DevTools port, and connects Playwright over CDP. Your normal Chrome keeps running.

It ships with one site recipe: **filling the Wellfound profile "Your Skills" section** from your resume, using Wellfound's canonical tags.

## Install

```bash
git clone https://github.com/gokulnathan66/browser-automate-skill.git
cd browser-automate-skill
./install.sh            # links into ~/.claude/skills and ~/.cursor/skills
```

Requirements: macOS, Google Chrome, Node 18+, Python 3, and a `playwright` npm package (`npm i -g playwright`, or the copy Playwright MCP already put in `~/.npm/_npx`).

## Use

Ask your agent things like:

- "Fill my Wellfound skills from my resume, use my gokulnathanb0 Chrome profile"
- "Update my LinkedIn headline using my logged-in Chrome, not a fresh browser"

Manual run:

```bash
cd skills/browser-automate
python3 scripts/list_profiles.py --site wellfound.com        # pick a profile folder
scripts/launch_profile_chrome.sh Default https://wellfound.com/profile/edit &
node scripts/wellfound_add_skills.js Python Docker "Power BI" React
scripts/cleanup.sh                                           # quit clone, delete temp profile
```

## Layout

```
skills/browser-automate/
├── SKILL.md                      workflow the agent follows
├── scripts/
│   ├── list_profiles.py          profiles, accounts, per-site cookies
│   ├── launch_profile_chrome.sh  clone profile + launch Chrome with CDP
│   ├── resolve_playwright.js     find an installed playwright package
│   ├── wellfound_add_skills.js   Wellfound skills recipe
│   └── cleanup.sh                quit clone, remove temp profile
└── references/
    ├── wellfound.md
    └── troubleshooting.md
```

## Safety

- The cloned profile holds live session cookies. `cleanup.sh` deletes it, so run it when you're done.
- Clones work only on the same Mac and macOS user, because cookies are encrypted with that user's Keychain key.
- Nothing is uploaded anywhere; the scripts only read your local Chrome files and talk to `127.0.0.1`.

## License

MIT
