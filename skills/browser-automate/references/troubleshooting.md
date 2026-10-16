# Troubleshooting

## Login page still appears

- You are in Playwright MCP's empty profile, not the clone. Close it and use CDP against the session port from `launch_profile_chrome.sh`.
- Wrong Chrome profile folder. Run `list_profiles.py --site <domain>` and pick the folder with session cookies.
- Cookies copied but the site needs local storage: sign in once in the clone, then retry (still same Mac user only).

## `ECONNREFUSED` on the CDP port

- Launch script not running or exited. Start `launch_profile_chrome.sh` in the background and wait for `CDP ready`.
- Session already cleaned up. Launch again and use the new `SESSION_ID`.

## Wrong account on the site

- Profile folder does not match the user's intended Google account. List profiles and cookies per site; verify the visible username before acting.

## Shell hangs after a Node script

- `connectOverCDP` keeps the event loop open. End with `process.exit(0)`. Do not call `browser.close()` unless you intend to close Chrome.

## Session or temp dir left behind

- Run `scripts/cleanup.sh --session <SESSION_ID>` or `scripts/cleanup.sh --stale`.
- Crashed runs: stale cleanup on next launch removes sessions older than 15 minutes.

## CDP security

The debugging port listens on loopback only, but **any local process** on your Mac can connect to it while the session is open. Do not share the port or leave a session running unattended.

## AppleScript errors

- "Executing JavaScript through AppleScript is turned off": enable per profile under View → Developer, or use this CDP workflow instead.
- "osascript is not allowed assistive access": not needed for CDP.

## Clones on another machine

Cookie encryption uses this Mac's Keychain user. Copies do not decrypt on another machine or another OS user.
