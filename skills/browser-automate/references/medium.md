# Medium — new story (confirm publish)

Usually **@gokulnathan66** on Chrome **Profile 1**. Confirm **Write** / profile menu shows the expected account.

## URLs

- `https://medium.com/new-story`

## Selectors

- Title: `[data-testid="editorTitleParagraph"]`
- Body: `[data-testid="editorParagraphText"]` (paste HTML for headings/code)
- Publish flow: **Publish** → story preview → topics via `#tagMultiSelectMenu` / `Add a topic...` → final **Publish**

## Agent rules

1. Fill title and body.
2. Add topics from the menu (click suggestion rows; Enter alone may not attach).
3. **Ask the user to confirm** before the last **Publish** on the preview dialog.
4. Subtitle in preview is optional; keep under character limits.
