#!/usr/bin/env python3
"""List Chrome profiles (folder, name, account) and optionally a site's cookies per profile.

Usage:
  list_profiles.py
  list_profiles.py --site wellfound.com
"""
import argparse
import json
import os
import shutil
import sqlite3
import tempfile

CHROME_DIR = os.environ.get(
    "BROWSER_AUTOMATE_CHROME_DIR",
    os.path.expanduser("~/Library/Application Support/Google/Chrome"),
)


def profiles():
    with open(os.path.join(CHROME_DIR, "Local State")) as f:
        info = json.load(f).get("profile", {}).get("info_cache", {})
    for folder, meta in info.items():
        yield folder, meta.get("name"), meta.get("user_name") or ""


def site_cookie_names(folder, site):
    src = os.path.join(CHROME_DIR, folder, "Cookies")
    if not os.path.exists(src):
        src = os.path.join(CHROME_DIR, folder, "Network", "Cookies")
    if not os.path.exists(src):
        return None
    with tempfile.TemporaryDirectory() as tmp:
        dst = os.path.join(tmp, "Cookies")
        shutil.copy2(src, dst)
        con = sqlite3.connect(f"file:{dst}?mode=ro", uri=True)
        rows = con.execute(
            "select name from cookies where host_key like ?", (f"%{site}%",)
        ).fetchall()
        con.close()
    return sorted({r[0] for r in rows})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", help="domain to check for cookies, e.g. wellfound.com")
    args = parser.parse_args()

    for folder, name, email in profiles():
        print(f"{folder}\tname={name}\taccount={email}")
        if args.site:
            names = site_cookie_names(folder, args.site)
            if names is None:
                print("\t(no Cookies database)")
            else:
                print(f"\t{args.site} cookies: {', '.join(names) or '(none)'}")


if __name__ == "__main__":
    main()
