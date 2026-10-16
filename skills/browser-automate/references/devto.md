# Dev.to — editor (draft first, confirm publish)

Account in this workflow is usually **gokulnathan66** on the **Default** Chrome profile (`gokulnathanb0@gmail.com`). Confirm the header shows that user before publishing.

## URLs

- New post: `https://dev.to/new` (must be signed in; `/dashboard` should not redirect to magic link)

## Selectors

- Title: `#article-form-title`
- Body (markdown): `#article_body_markdown`
- Tags: `#tag-input` — pick from suggestions, avoid free-text typos
- Publish opens confirmation; final publish from the post page or publish flow

## Agent rules

1. Fill title, body, and tags.
2. Use **Save Draft** or review preview if unsure.
3. **Ask the user to confirm** before clicking **Publish**.
4. Publish once; do not spam duplicate posts on retries.
