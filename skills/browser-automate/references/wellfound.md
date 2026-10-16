# Wellfound: profile skills

Page: `https://wellfound.com/profile/edit`, **Profile** tab, **Your Skills** section. When skills are missing, a banner at the top says "Add relevant skills… #1 factor to increasing outreach from recruiters", and recruiters can't find the profile until they're added.

## Where the skills come from

Use the user's own source of truth, usually the "Technical Skills" section of their resume. Don't invent skills. If the user keeps a resume in a repo or vault, read that file instead of guessing.

## Picker behavior

- Input: `input[placeholder="e.g. Python, React"]` (a Downshift combobox; its id changes per load).
- Typing shows `[role="option"]` rows such as `Python1723757 followers`. Strip the follower count to get the tag name.
- The last option is always `New <query>`. That creates a free-text tag, so skip it; existing tags are what recruiter filters match.
- With `fill()` the suggestions sometimes haven't loaded and only `New …` shows. Type with `keyboard.type(query, {delay: 40})` and wait for a non-"New" option.
- Selecting an option saves immediately. No Save click is needed for this section, but reload to confirm.
- Each chip is a `span` with a `styles_component…` class containing a `[role="button"]` close (×) control.

## Canonical tag names seen

| Resume term | Wellfound tag |
| --- | --- |
| JavaScript | Javascript |
| React | React.js |
| Power BI | Microsoft Power BI |
| Express | Express.js |
| REST API | REST |
| Hugging Face | no clean tag (only bundled phrases); skip it |

The script picks only exact or alias matches. Wellfound hides tags already on the profile from the suggestions, so a "starts with" fallback would grab a different tag (`Python` → `Python Flask`, `React` → `React Native`). Bundled phrases such as `RAGs, ChatGPT, Hugging Face, LangChain, …` look odd on a profile too. When a query is skipped, read the options it printed and, if one is right, add it to `ALIASES` or pass that exact tag name.

## Batch script

After `launch_profile_chrome.sh`, use the printed session id:

```bash
node scripts/wellfound_add_skills.js --session <SESSION_ID> Python JavaScript SQL "C++" "Machine Learning" LangChain FastAPI \
  Django React "Node.js" Express.js AWS Docker Kubernetes PostgreSQL MySQL MongoDB DynamoDB \
  HTML CSS REST Git "Power BI" "Prompt Engineering"
```

It prints JSON with `added`, `skipped` (with the options it saw), and `saved` (the list after the reload), and writes `/tmp/wellfound-skills.png`. Use `--remove "Exact chip text"` to drop a wrong chip. Skills already on the profile are skipped, so the script is safe to re-run.

Afterwards, check that the "Add relevant skills" banner is gone from the page text.
