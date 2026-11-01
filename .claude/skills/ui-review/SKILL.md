---
name: ui-review
description: >
  UI/UX drift review of scarf's pages: builds the site from the fixtures (no source request),
  screenshots and measures every page kind at a phone and a desktop size, checks the components
  against docs/brand.md, compares the numbers with a base branch, and reports in ponytail-review's
  shape. Use for /ui-review, "review the pages", "UI review", "does the page still look right", and
  on any branch or PR that touches src/page.ts, assets/site.css, assets/brand-tokens.css or docs/brand.md.
argument-hint: "[base ref, e.g. main]"
---

Review the pages like the designer who signed off docs/brand.md: nothing moved, grew, doubled or
drifted without a reason. Numbers first, then eyes, then a report in ponytail-review's shape, so a
code review and a UI review read alike. Changes no code.

## 1. Measure

From the repository root, on the branch under review. The base is `$ARGUMENTS` when given (run
`git fetch origin` first and pass `origin/main` when the local main may be stale); none means this
branch alone.

```bash
node .claude/skills/ui-review/measure.ts --base main
```

It builds `dist/` from the fixtures with `SITE_URL` set (without it the pages leave out the Share
button), serves it on 8787, or on the next free port while the Browser pane's `site` server
(`.claude/launch.json`) holds 8787, and opens every page kind in headless Chrome at
390×844 and 1280×800, team pages also at 360 wide, the narrowest width the Share button must still
fit at. For each it saves the first screen to `dist/ui-review/<page>-<width>.png` and measures:
sideways overflow, where the headline starts, red actions on the first screen, whether the top bar
wraps, the page's height, the Share button's room and lines, and each component's height, radius
and declared border against docs/brand.md. With `--base` it builds that ref too (a plain copy under
`dist/ui-review/base/`, sharing this checkout's `node_modules`) and prints every number that changed.

It prints four lists: the measurements, the limits broken, the components off docs/brand.md, and
what changed since the base. The pages, limits and component rules sit at the top of `measure.ts`.
Chrome elsewhere: `CHROME=/path/to/chrome node …`. Everything it writes is under `dist/ui-review/`.

## 2. Look

Open every screenshot (Read the PNGs). Numbers miss what eyes catch: a squeezed headline, a column
far taller than its neighbour, the same element twice, a tag that repeats the switch and the
headline, copy against the voice rules (CLAUDE.md, Voice). Note the file of what you see.

## 3. Report

Plain English, short sentences, in ponytail-review's shape:

- `What this change does:` two or three sentences. With a base: what the change did to the pages,
  in before and after numbers. Without one: how the pages stand today.
- Findings in three groups, skip empty groups, numbered across groups so the user can say
  "fix 2 and 5":
  - **Must fix:** a page that scrolls sideways, a Share button cut or wrapped, text a fan cannot
    read, anything a fan cannot use.
  - **Should fix:** a limit broken (headline too far down, more than one red action on a screen,
    a top bar on two rows, a page over the height limit), a component off docs/brand.md, what the
    screenshots show out of balance.
  - **Nice to have:** spacing and copy.
- Every finding has the four parts, each one or two short sentences: **What this is**, **Problem**
  (with the number and the limit, or the screenshot's file), **Fix** (the smallest, naming the file),
  **If we skip it**.
- End with `Verdict: Ship.` or `Verdict: fix 1 and 3 first.`, then `Not checked:` in one line
  when something mattered and could not be checked (a page kind not built, a browser not run:
  the measurements are Chrome's, at scale 1, with no touch).
