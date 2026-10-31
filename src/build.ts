import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { reusable, reusedNote, type SavedAnswers } from './answers.ts'
import { feedChanges } from './changes.ts'
import { alertsFeedPath, countrySharePath, feedPath, landingSharePath, sharePath, teams, type Team } from './config.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { flagFile, flagLicenseFile, flagPath } from './flags.ts'
import { byStart, keptSince, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, recordSeen, type KnownGames } from './known-games.ts'
import { manual } from './manual.ts'
import { renderCountryPage, renderHowItWorks, renderKit, renderLanding, renderTeamPage, type Section } from './page.ts'
import { renderCountryShareImage, renderLandingShareImage, renderShareImage } from './share.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, How it works at /how-it-works/, the
// unlisted identity kit at /kit/, and
// next to them the brand assets (stylesheets, icons) and the flags the teams use, copied out of
// flag-icons with its licence.
// Each country gets a page and a share image of its own too, listing its teams.
// Requests stay minimal: UEFA answers for every football team in one call, and a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers); a build on a push to main reuses the answers an earlier build saved less
// than a day ago. Any failure aborts the whole build, so the previously published files stay in place.
// With --fixtures (npm run build:fixtures) it builds the same site from the sources' answers saved
// in test/fixtures/ and makes no request at all: none to the sources, none to the live feeds.

const fixtures = process.argv.includes('--fixtures')
// A fixture build is dated on the day the newer fixture was saved, so the fixtures' games stay upcoming.
const now = fixtures ? new Date('2026-10-30') : new Date()
const today = now.toISOString().slice(0, 10)
const since = keptSince(today) // the first day a feed still carries: played games stay PLAYED_DAYS
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

// A JSON file an earlier build left, or {} when there is none yet.
const readSaved = async (file: string) =>
  JSON.parse(
    await readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return '{}'
      throw error
    }),
  )

// The games earlier builds saw, so this one can tell a newly announced game from an old one for
// the -alerts feeds. Not in git: the Actions job keeps it in its cache (.github/workflows/publish.yml).
// Missing on the first build, or once the cache is lost, which seeds it again and announces nothing.
// A fixture build starts from none and saves none, so the developer's own file stays as it was.
const KNOWN_GAMES = 'known-games.json'
const known: KnownGames = fixtures ? {} : await readSaved(KNOWN_GAMES)

// The sources' answers, which every build but a fixture build saves in source-answers/ with what each
// covers and when it was fetched (src/answers.ts). Not in git: the Actions job keeps the folder in its
// cache next to known-games.json and restores it only for a push to main, whose build reuses the
// answers that are less than a day old. The daily, manual and local builds always ask the sources.
const ANSWERS = 'source-answers'
const earlier: SavedAnswers = !fixtures && process.env.GITHUB_EVENT_NAME === 'push' ? await readSaved(`${ANSWERS}/index.json`) : {}
const answers: SavedAnswers = {} // the ones this build uses, by file name, saved last for the next build

// Where a source's answer comes from: in a fixture build that file in test/fixtures/; else an earlier
// build's while it is less than a day old and covers the request, or none, and it is fetched now.
// Outside a fixture build either one is noted in `answers`, to be saved.
function saved(fixture: string, file: string, teamIds?: number[]): URL | undefined {
  if (fixtures) return new URL(`../test/fixtures/${fixture}`, import.meta.url)
  const answer = earlier[file]
  if (reusable(answer, now, teamIds)) {
    answers[file] = answer
    return pathToFileURL(`${ANSWERS}/${file}`)
  }
  answers[file] = { fetched: now.toISOString(), teamIds }
  return undefined
}

const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const uefaMatches = uefaTeamIds.length ? await fetchUefaMatches(uefaTeamIds, today, saved('uefa-matches.json', 'uefa.json', uefaTeamIds)) : []
const fibaPages = new Map<string, string>()

for (const event of new Set(teams.flatMap(({ source }) => (source.kind === 'fiba' ? [source.event] : [])))) {
  // shortcut: one fixture page answers for every FIBA competition; give each its own file once there are two.
  const savedPage = saved('fiba-games.html', `${event}.html`)
  if (fibaPages.size > 0 && !savedPage) await pause(5000) // a breath before asking the same site for another page
  fibaPages.set(event, await fetchFibaPage(event, savedPage))
}

const gamesOf = ({ source }: Team): Game[] =>
  source.kind === 'uefa' ? parseUefaMatches(uefaMatches, source.teamId) : parseFibaGames(fibaPages.get(source.event)!, source.teamCode)

// The feed fans have now, to tell what this build changes (src/changes.ts). Our own site, not a
// source, so it does not count against the one-request-per-source rule.
async function liveFeed(team: Team): Promise<string> {
  const response = await fetch(`${siteUrl}/${feedPath(team)}`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`answered ${response.status}`)
  return response.text()
}

const sections: Section[] = []
const changes: string[] = [] // a Markdown block per team whose feed changed, for the run summary
for (const team of teams) {
  // The feed keeps the games played since `since` exactly as they were. The pages and the record of
  // known games take only those still to come, so a played game is never announced as new.
  const feed = gamesOf(team)
    .filter((game) => game.date >= since)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  const games = feed.filter((game) => game.date >= today)
  const key = `${team.country}/${team.sport}`
  const seen = recordSeen(known[key], games.map((game) => game.id), today)
  known[key] = seen.feed
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  const ics = toIcs(team, feed, now, siteUrl)
  await writeFile(`dist/${feedPath(team)}`, ics)
  await writeFile(`dist/${alertsFeedPath(team)}`, toIcs(team, feed, now, siteUrl, announced(seen.feed)))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games, ${seen.fresh.length} new`)
  if (siteUrl && !fixtures) {
    const lines = await liveFeed(team).then(
      (live) => feedChanges(live, ics, today),
      (error: Error) => [`Couldn't read the live feed: ${error.message}`],
    )
    if (lines.length) changes.push(`**${team.name}**`, ...lines.map((line) => `- ${line}`), '')
  }
}
for (const section of sections) {
  const { team, games } = section
  await writeFile(`dist/${team.country}/${team.sport}/index.html`, renderTeamPage(section, teams, siteUrl))
  await writeFile(`dist/${sharePath(team)}`, await renderShareImage(team, games[0], siteUrl))
}
for (const country of new Set(teams.map((team) => team.country))) {
  const group = sections.filter((section) => section.team.country === country)
  await writeFile(`dist/${country}/index.html`, renderCountryPage(group, siteUrl))
  await writeFile(`dist/${countrySharePath(group[0]!.team)}`, await renderCountryShareImage(group.map((section) => section.team), siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, siteUrl))
await writeFile(`dist/${landingSharePath}`, await renderLandingShareImage(teams, siteUrl))
await mkdir('dist/how-it-works', { recursive: true })
await writeFile('dist/how-it-works/index.html', renderHowItWorks(sections, siteUrl))
await mkdir('dist/kit', { recursive: true })
await writeFile('dist/kit/index.html', renderKit(teams))
await cp(new URL('../assets', import.meta.url), 'dist', { recursive: true }) // found from any working folder
// Only the flags a team uses, never the whole package; the licence sits next to the copies, as
// MIT asks. Every flag was already read for its share image, so a wrong code failed before this.
for (const code of new Set(teams.map((team) => team.flag))) await cp(flagFile(code), `dist/${flagPath(code)}`)
await cp(flagLicenseFile(), 'dist/flags/LICENSE')
// On the run's page in Actions (GITHUB_STEP_SUMMARY), printed elsewhere. A local build has no
// SITE_URL, so nothing to compare with and no summary; nor has a fixture build, whatever its SITE_URL.
if (siteUrl && !fixtures) {
  const fibaAnswers = [...fibaPages.keys()].map((event) => answers[`${event}.html`])
  const sources = [
    uefaTeamIds.length && `UEFA answered one request for ${uefaTeamIds.length} football teams with ${uefaMatches.length} matches${reusedNote([answers['uefa.json']], now)}`,
    fibaPages.size && `FIBA answered ${fibaPages.size} competition ${fibaPages.size === 1 ? 'page' : 'pages'}${reusedNote(fibaAnswers, now)}`,
  ].filter(Boolean)
  const counts = sections.map(({ team, games }) => `${team.name} ${games.length}`).join(' · ')
  const report = [
    '## What this build changed',
    '',
    `${sources.join(' · ')}. Upcoming games: ${counts}.`,
    '',
    ...(changes.length ? changes : ['No game changed in any feed.']),
  ]
  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) await appendFile(summaryFile, report.join('\n') + '\n')
  else console.log(report.join('\n'))
}
// Last, so a build that fails part-way leaves the files as they were; the job caches them after the deploy.
if (!fixtures) {
  await writeFile(KNOWN_GAMES, JSON.stringify(known, null, 2) + '\n')
  // Every answer this build used, for a push build to reuse; a reused one keeps the time it was fetched.
  await mkdir(ANSWERS, { recursive: true })
  if (uefaTeamIds.length) await writeFile(`${ANSWERS}/uefa.json`, JSON.stringify(uefaMatches))
  for (const [event, page] of fibaPages) await writeFile(`${ANSWERS}/${event}.html`, page)
  await writeFile(`${ANSWERS}/index.json`, JSON.stringify(answers, null, 2) + '\n')
}
