#!/usr/bin/env python3
"""Copy minimal Chrome login state into a fresh user-data dir (cookies via SQLite backup)."""
import json
import os
import shutil
import sqlite3
import sys

CHROME_DIR = os.path.expanduser("~/Library/Application Support/Google/Chrome")


def cookie_src(profile_folder: str) -> str:
    base = os.path.join(CHROME_DIR, profile_folder)
    legacy = os.path.join(base, "Cookies")
    if os.path.exists(legacy):
        return legacy
    return os.path.join(base, "Network", "Cookies")


def backup_sqlite(src: str, dst: str) -> None:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst):
        os.remove(dst)
    src_uri = f"file:{src}?mode=ro"
    con = sqlite3.connect(src_uri, uri=True)
    try:
        dst_con = sqlite3.connect(dst)
        try:
            con.backup(dst_con)
        finally:
            dst_con.close()
    finally:
        con.close()


def strip_preferences(src_prefs: str, dst_prefs: str) -> None:
    with open(src_prefs) as f:
        prefs = json.load(f)
    prefs.pop("extensions", None)
    prefs.pop("account_info", None)
    # Reduce accidental token leakage in the clone; sync stays off via Chrome flags.
    for key in list(prefs.keys()):
        if "token" in key.lower():
            prefs.pop(key, None)
    os.makedirs(os.path.dirname(dst_prefs), exist_ok=True)
    with open(dst_prefs, "w") as f:
        json.dump(prefs, f)


def profile_email(profile_folder: str) -> str:
    with open(os.path.join(CHROME_DIR, "Local State")) as f:
        info = json.load(f).get("profile", {}).get("info_cache", {})
    meta = info.get(profile_folder) or {}
    return meta.get("user_name") or meta.get("gaia_name") or "?"


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: copy_chrome_login.py <profile-folder> <user-data-dir>", file=sys.stderr)
        return 2
    profile, dst_root = sys.argv[1], sys.argv[2]
    src_profile = os.path.join(CHROME_DIR, profile)
    if not os.path.isdir(src_profile):
        print(f"No profile: {src_profile}", file=sys.stderr)
        return 1

    default = os.path.join(dst_root, "Default")
    os.makedirs(default, exist_ok=True)

    shutil.copy2(os.path.join(CHROME_DIR, "Local State"), os.path.join(dst_root, "Local State"))

    src_cookies = cookie_src(profile)
    if not os.path.exists(src_cookies):
        print(f"No Cookies database at {src_cookies}", file=sys.stderr)
        return 1

    if "/Network/" in src_cookies:
        net = os.path.join(default, "Network")
        os.makedirs(net, exist_ok=True)
        backup_sqlite(src_cookies, os.path.join(net, "Cookies"))
    else:
        backup_sqlite(src_cookies, os.path.join(default, "Cookies"))

    src_prefs = os.path.join(src_profile, "Preferences")
    if os.path.exists(src_prefs):
        strip_preferences(src_prefs, os.path.join(default, "Preferences"))

    print(profile_email(profile))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
