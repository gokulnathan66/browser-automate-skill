# Hashnode — editor (new draft, confirm publish)

Usually signed in as **Gokul Nathan** / **Gokulnathan Blog** on Chrome **Profile 1** (`gokulg23011@gmail.com`). Confirm the blog name in the header.

## URLs

- Start from **Write** or **New** to create a **new** draft. Do not overwrite an unrelated open draft (check title is empty or matches your task).

## Selectors

- Title: `textarea[placeholder='Article Title...']`
- Body: `.ProseMirror` (rich) — paste HTML via clipboard event or type; avoid switching to Markdown if the toggle stalls
- Publish: **Publish** in the draft settings panel, then confirm **Publish** again in the sidebar

## Agent rules

1. Fill title and body; wait for word count / autosave.
2. **Ask the user to confirm** before the final **Publish** click.
3. Note the public URL after publish (slug under `gokulnathan66.hashnode.dev`).
