# Spike: where the build runs, and what would make scarf faster (#93)

**Scope.** The card asks how to build scarf for better maintainability, clarity, efficiency,
performance and developer experience, now that it runs on Cloudflare. What moved on 30 October is
the hosting (#82, #83). The build still runs on GitHub Actions, as docs/observability.md decided. So
this spike answers two questions: should the build move onto Cloudflare too, and what would make
scarf faster, lighter on its sources or easier to work on, wherever it runs. Out of scope: new
sources, the counting work in docs/observability.md (#70 to #73) and the staging deploy (#85),
except where they meet.

## Recommendation

**Keep the build on GitHub Actions and the site as static files on the Worker.** The build step
takes 3 to 6 seconds, and the site is already static, compressed and cached at Cloudflare's edge, so
moving the build buys fans nothing. Each move costs more than it saves. Building inside a Worker
needs Workers Paid, because the share images alone take about 2 seconds of CPU and the free plan
allows 10 milliseconds, and it needs a bundler and storage code on top. Workers Builds runs the same
build for free, but the alert state and the failure alert would need new homes, and the change
summary would move from the run page to a build log. What a move would fix is a daily run that starts 4 to 8 hours late and the keepalive against
GitHub's 60-day rule. Neither reaches fans today.

Three small changes are worth more, and they work where we are:

- **See the site without the sources (developer experience).** Today `npm run build` is the only way
  to see a page, and it calls UEFA and FIBA. A build from the test fixtures, browsed with
  `npx wrangler dev`, would fix that.
- **One source request a day, not one per push (efficiency).** Since 3 October, 39 of the 67 builds
  were pushes to main, up to 13 builds ran on one day, and every build that runs asks UEFA and FIBA
  again. Push builds can reuse the day's saved answers.
- **Fonts from scarf.fan (performance).** Every first page view waits for a stylesheet from
  fonts.googleapis.com before it renders, then fetches the fonts from fonts.gstatic.com. Serving
  them ourselves removes two origins, and with them the last third-party request listed in
  docs/observability.md.

## Options

| | A. Today | B. Build inside the Worker | C. Workers Builds | D. Cloudflare starts the Actions run |
|---|---|---|---|---|
| What runs where | Actions builds daily and on each push to main; `wrangler deploy` uploads `dist/` as static assets | A Cron Trigger fetches, renders and writes every file to R2; the Worker serves every path from R2 | Cloudflare's build container runs the same test, build and deploy on each push to main, and daily through a Deploy Hook that a Cron Trigger calls | Today's workflow, started daily by a Cron Trigger through GitHub's API instead of GitHub's own schedule |
| New parts | None | Worker code serving every path from R2 (types, ETags, trailing slashes: what static assets do for free), a pointer to the current build, fonts, flags and two wasm files bundled as modules, a separate deploy for code | Cloudflare's GitHub app on the repository, a `scheduled` handler, KV for `known-games.json`, a Queue and a consumer Worker for the failure alert | A `scheduled` handler of about ten lines, a GitHub token as a Worker secret |
| Cost | Free | Workers Paid, US$5 a month (CPU, below) | Free: 3,000 build minutes a month, today's job takes under a minute, and Queues are on the free plan | Free |
| For fans | Static files from Cloudflare's cache, Brotli-compressed | The same files, but every request runs the Worker and reads R2; static asset requests are free and unlimited, Worker requests are counted | As today | As today |
| Developer experience | No build step, `npm test` in 2.8 s; no way to see the site without calling the sources | A bundler and wasm shims; locally the build runs under `wrangler dev` instead of plain Node | Same code; build logs in the Cloudflare dashboard while PR checks stay on GitHub | As today |
| Schedule | Starts 4.3 to 7.8 h late; a keepalive job beats GitHub's 60-day rule | Cloudflare's scheduler, no 60-day rule; the docs promise no start time | As B for the build; "Check feeds" still needs a schedule somewhere | As B for the build; "Check feeds" keeps its GitHub schedule and keepalive as the watchdog |
| Alert state (`known-games.json`) | Actions cache, dropped after 7 days unused | KV or R2 | KV: the Workers Builds cache holds only npm's own files | Actions cache |
| Failure alert, change summary | `ops` issue, summary on the run page | Both rebuilt | Alert rebuilt (Queue, consumer, GitHub token); summary in the build log | As today |
| CLAUDE.md rules | All kept: a failed build never deploys | Kept only with care: the pointer moves after the last file is written, and no fetch may retry (Workflows retry a step 5 times by default) | All kept | All kept |
| Sources see requests from | GitHub's network | Cloudflare's network | Cloudflare's network | GitHub's network |

- **B's CPU.** Today's 16 share images took 2.2 s of CPU on a laptop. Workers Free allows 10 ms of
  CPU per Cron Trigger run; Workers Paid allows 15 minutes for one that runs daily. #76 (about 85
  teams) would mean roughly 140 images, about 20 s by estimate, more if many flags carry crests. B
  also cannot write its own static assets, which change only with a deploy: that is why it serves
  from R2. Cloudflare Workflows, the step-by-step variant, has the same CPU limit per step and the
  same rebuild.
- **C and D need a Worker script** for the Cron Trigger. The `scarf` Worker has none yet; #71 adds
  one.
- **B and C's network.** Whether UEFA or FIBA treat requests from Cloudflare's addresses differently
  from GitHub's is unknown, and finding out would take a request we don't make.
- **Unchanged by every option:** feed paths, UIDs, no cookies, and what the files say.

## Follow-up issues (proposed, not created)

1. **Build the site from the test fixtures, with no source requests.** A fixture mode writes `dist/`
   from `test/fixtures/`, dated on the fixtures' own day so their games never age out, and a page
   change can be checked with `npx wrangler dev`. It is the first piece of #85 and fits best after
   #50, which puts all fetching in one place.
2. **Push builds reuse the day's source answers.** The scheduled build saves UEFA's and FIBA's raw
   answers next to `known-games.json` in the Actions cache; a build on a push to main reads them
   while they are less than a day old and fetches only what they don't cover, such as a newly added
   competition.
3. **Serve the brand fonts from scarf.fan.** WOFF2 files under `assets/` instead of Google Fonts, so
   a page needs one origin instead of three. docs/brand.md and CLAUDE.md name Google Fonts, so the
   wording there changes too.

**Decisions that are Chris's**

1. Keep the build on Actions (recommended), or move it: C costs nothing, B needs Workers Paid.
2. Which of the three follow-ups to open.
3. The fonts change, which edits a line in docs/brand.md and CLAUDE.md.

## When to revisit

- The late start begins to matter, or GitHub's "scheduled workflow will be disabled soon" email
  arrives (the keepalive stopped working): D is the smallest step that keeps the build on time.
  "Check feeds" still runs on GitHub's schedule, so a broken keepalive also needs the fallback in
  the README's "Keeping it running".
- A lost Actions cache keeps resetting the alerts feeds: move `known-games.json` to Workers KV. A
  write per build, up to 13 a day so far, fits the free plan's 1,000, and it works from Actions too.
- A feature needs code at request time, like the uncapped personal feed (option (b) in
  docs/spike-team-picker.md) or the counting in #71. That is a Worker answering requests, and the
  build can stay where it is.

## Looked at, not worth it now

- **JSX or a framework for the pages.** Node runs our `.ts` files with no build step and rejects JSX
  (checked with Node 22.23), so it would add a compile step. The duplication worth removing is #50.
- **Wrangler as a dev dependency.** About 7 s of the deploy step go to `npx` fetching and starting
  Wrangler: seconds a day, against a large package in every install.
- **Longer cache lifetimes or compressed feeds.** File names carry no content hash, so a long
  `max-age` would serve old CSS after a deploy, and a feed is about 2 KB.
- **Rendering share images only when they change.** 2 s today; worth a look only if #76 makes the
  build slow.

## What was measured

On 30 October, from this repository, the "Build feeds" run history and five paths on scarf.fan.
Nothing was sent to UEFA or FIBA.

| What | Result |
|---|---|
| "Build feeds" job, six runs from 24 to 30 October | 22 to 37 s in all; build step 3 to 6 s; since the move, the Workers deploy step takes 13 to 19 s, the longest step |
| The deploy in the scheduled run of 30 October | 84 files in `dist/`; Wrangler uploaded the 18 that changed (as many as the feeds, which every build restamps) in 1 s; about 7 s went to `npx` fetching and starting Wrangler |
| Start of the 27 scheduled runs since 3 October, against the 04:23 UTC slot | 4.3 to 7.8 h late, median 5.9 h |
| What started the 67 runs since 3 October | 39 pushes to main, 27 on schedule, 1 by hand; up to 13 in one day |
| `npm ci`, local, warm npm cache | 0.7 s; 31 packages; 75 MB `node_modules`, of which 26 MB is TypeScript 7's native compiler and 25 MB Satori |
| `npm test`, local | 2.8 s: type check 0.3 s, 80 tests 2.3 s |
| The 16 share images, rendered from the fixtures on an Apple M1 Pro | 2.2 s CPU, 1.7 s wall. Most take 40 to 90 ms; the three with Spain's flag (an 81 KB SVG with the coat of arms) about 400 ms each; the first one 0.3 s while fonts and wasm load |
| Files rendered from the fixtures | Feeds 0.4 to 2.3 KB (the live `/greece/football.ics` is 1,544 bytes, the size of its fixture render); team pages up to 15 KB, 4.3 KB gzipped; landing page 20 KB; share images 46 to 60 KB |
| Response headers on five live paths | HTML and CSS Brotli-compressed, feeds sent uncompressed, every file `public, max-age=0, must-revalidate`, all through Cloudflare's cache |
| Code | `src/` 1,710 lines in 12 modules (`page.ts` 639), tests 1,120, workflows 214, of which about 40 of `publish.yml`'s 85 are the keepalive and the cache |

**Not measured or not verified:** real page load for fans (no Lighthouse or field data), so the
fonts gain is expected, not measured; CPU time on Cloudflare's machines, where the laptop figure is
only a guide; when Cloudflare actually starts a Cron Trigger, since its docs say scheduled Workers
run on spare capacity and give no time; and Satori and resvg inside a Worker. Satori's README
documents a standalone build for Workers; neither was tried here. The Cloudflare figures (plan
limits, prices, Deploy Hooks, build caching, Workflows retries) are from developers.cloudflare.com
on 30 October.
