# Troubleshooting

## The site still shows its login page

- You're in Playwright MCP's own browser (`~/Library/Caches/ms-playwright-mcp/...`), not the clone. Close it (`browser_close`) and connect to the clone over CDP instead.
- You cloned the wrong profile. Run `list_profiles.py --site <domain>` and pick the folder whose cookies include the site's session cookie.
- The cookies were copied, but the site binds the session to something else, such as device-bound sessions or local storage. Ask the user to sign in once in the cloned window; it persists until cleanup.

## `ECONNREFUSED 127.0.0.1:9333`

The cloned Chrome isn't running. The usual cause is starting `launch_profile_chrome.sh` in the foreground: when the shell call timed out or returned, Chrome died with it. Start it in the background and wait for `CDP ready`.

## Shell hangs after the Playwright script finishes

`connectOverCDP` keeps Node's event loop alive. End the script with `process.exit(0)`, and don't call `browser.close()` unless you want Chrome closed.

## Why not attach to the real profile directly?

- Chrome won't enable `--remote-debugging-port` on its default data directory, and the real one is already in use by the running Chrome.
- Pointing Playwright `launchPersistentContext` at `~/Library/Application Support/Google/Chrome` fails with a lock error while Chrome is open, and quitting the user's browser to free it is disruptive.

Cloning the login files avoids both problems.

## AppleScript errors (if you tried the osascript route)

- "Executing JavaScript through AppleScript is turned off": the setting is View > Developer > Allow JavaScript from Apple Events, and it's stored per profile. It's easy to enable on a different profile than the one whose tab you're scripting. The CDP route doesn't need it.
- "osascript is not allowed assistive access": System Events UI scripting needs Accessibility permission for the terminal app. Don't route around this. The CDP route doesn't need it either.

## Cookies don't decrypt (signed out in the clone on another machine)

Chrome cookies are encrypted with the "Chrome Safe Storage" Keychain key of the macOS user. A clone works only on the same Mac and the same user. Copying a profile to another machine signs you out.
