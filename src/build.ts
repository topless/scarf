import { appendFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { reusable, reusedNote, type SavedAnswers } from './answers.ts'
import { feedChanges } from './changes.ts'
import { alertsFeedPath, COMPETITIONS, competitionPath, countrySharePath, feedPath, landingSharePath, sharePath, teamPath, teams, type Competition, type Team } from './config.ts'
import { fetchEuroleagueGames, parseEuroleagueGames } from './euroleague.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { flagFile, flagLicenseFile, flagPath } from './flags.ts'
import { byStart, keptSince, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, recordSeen, type KnownGames } from './known-games.ts'
import { manual } from './manual.ts'
import { renderCompetitionPage, renderCountryPage, renderHowItWorks, renderKit, renderLanding, renderPrivacy, renderTeamPage, type Section } from './page.ts'
import { renderCountryShareImage, renderLandingShareImage, renderShareImage } from './share.ts'
import { feedVersion } from './version.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, How it works at /how-it-works/, the
// unlisted identity kit at /kit/, the privacy page at /privacy/, versions.json (each feed's version, for the
// Worker's count), and
// next to them the brand assets (stylesheets, icons) and the flags the teams use, copied out of
// flag-icons with its licence.
// Each country gets a page and a share image of its own too, listing its teams.
// Requests stay minimal: UEFA answers for every football team in one call, a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers), and a EuroLeague season is fetched once for every club in it; a build on
// a push to main reuses the answers an earlier build saved, whatever their age. Any failure aborts
// the whole build, so the previously published files stay in place.
// With --fixtures (npm run build:fixtures) it builds the same site from the sources' answers saved
// in test/fixtures/ and makes no request at all: none to the sources, none to the live feeds.
// With --saved (npm run build:staging, the staging deploy) it builds from the answers a daily build
// saved in source-answers/, whatever their age, and from the fixture for a source that has none:
// production's data, and no request either.

const fixtures = process.argv.includes('--fixtures')
const staging = process.argv.includes('--saved')
const live = !fixtures && !staging // asks the sources, compares with the live feeds, saves what it used
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

// The sources' answers, which a live build saves in source-answers/ with what each covers and when it
// was fetched (src/answers.ts). Not in git: the Actions job keeps the folder in its cache next to
// known-games.json and restores it for a push to main, whose build reuses the answers that cover its
// requests, and for a staging build, which takes them as they are, both whatever their age. The daily,
// manual and local builds always ask the sources.
const ANSWERS = 'source-answers'
const earlier: SavedAnswers = staging || (live && process.env.GITHUB_EVENT_NAME === 'push') ? await readSaved(`${ANSWERS}/index.json`) : {}
if (staging && Object.keys(earlier).length === 0) throw new Error(`${ANSWERS}/index.json is missing or empty: a staging build shows what the last "Build feeds" run saved in its Actions cache`)
const answers: SavedAnswers = {} // the ones this build uses, by file name, saved last for the next build

// Where a source's answer comes from: in a fixture build that file in test/fixtures/, as for a source a
// staging build has no saved answer for (one this branch adds); else an earlier build's, in a staging
// build as it is and in a live build when it covers the request, or none, and it is fetched now.
// Outside a fixture build either one is noted in `answers`, to be saved.
function saved(fixture: string, file: string, teamIds?: number[]): URL | undefined {
  const answer = earlier[file]
  if (staging && !answer) console.log(`${file}: no saved answer, so the fixture ${fixture} stands in`)
  if (fixtures || (staging && !answer)) return new URL(`../test/fixtures/${fixture}`, import.meta.url)
  if (staging || reusable(answer, teamIds)) {
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

// A EuroLeague season's games, which every club playing in it shares.
const euroleagueSeasons = new Map<string, string>()
for (const season of new Set(teams.flatMap(({ source }) => (source.kind === 'euroleague' ? [source.season] : [])))) {
  euroleagueSeasons.set(season, await fetchEuroleagueGames(season, saved(season.startsWith('U') ? 'eurocup-games.json' : 'euroleague-games.json', `euroleague-${season}.json`)))
}

function gamesOf({ source }: Team): Game[] {
  switch (source.kind) {
    case 'uefa':
      return parseUefaMatches(uefaMatches, source.teamId)
    case 'fiba':
      return parseFibaGames(fibaPages.get(source.event)!, source.teamCode)
    case 'euroleague':
      return parseEuroleagueGames(euroleagueSeasons.get(source.season)!, source.clubCode)
  }
}

// The feed fans have now, to tell what this build changes (src/changes.ts). Our own site, not a
// source, so it does not count against the one-request-per-source rule.
async function liveFeed(team: Team): Promise<string> {
  const response = await fetch(`${siteUrl}/${feedPath(team)}`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`answered ${response.status}`)
  return response.text()
}

const sections: Section[] = []
const versions: Record<string, string> = {} // each feed's version, for the Worker's count (src/version.ts)
const changes: string[] = [] // a Markdown block per team whose feed changed, for the run summary
await rm('dist', { recursive: true, force: true }) // a file from an older build must not keep answering
for (const team of teams) {
  // The feed keeps the games played since `since` exactly as they were. The pages and the record of
  // known games take only those still to come, so a played game is never announced as new.
  const feed = gamesOf(team)
    .filter((game) => game.date >= since)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  const games = feed.filter((game) => game.date >= today)
  const key = teamPath(team)
  const seen = recordSeen(known[key], games.map((game) => game.id), today)
  known[key] = seen.feed
  await mkdir(`dist/${key}`, { recursive: true })
  const ics = toIcs(team, feed, now, siteUrl)
  await writeFile(`dist/${feedPath(team)}`, ics)
  const alerts = toIcs(team, feed, now, siteUrl, announced(seen.feed))
  await writeFile(`dist/${alertsFeedPath(team)}`, alerts)
  versions[feedPath(team)] = feedVersion(ics)
  versions[alertsFeedPath(team)] = feedVersion(alerts)
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games, ${seen.fresh.length} new`)
  if (siteUrl && live) {
    const lines = await liveFeed(team).then(
      (live) => feedChanges(live, ics, since),
      (error: Error) => [`Couldn't read the live feed: ${error.message}`],
    )
    const vanished = lines.filter((line) => line.startsWith('Removed:')).length
    // Two, not one: a single cancelled last friendly must not block every build.
    if (games.length === 0 && vanished >= 2) throw new Error(`${team.name}: every upcoming game vanished at once (${vanished} removed); the last published feeds stay online`)
    if (lines.length) changes.push(`**${team.name}**`, ...lines.map((line) => `- ${line}`), '')
  }
}
for (const section of sections) {
  const { team, games } = section
  await writeFile(`dist/${teamPath(team)}/index.html`, renderTeamPage(section, teams, siteUrl))
  await writeFile(`dist/${sharePath(team)}`, await renderShareImage(team, games[0], siteUrl))
}
for (const country of new Set(teams.map((team) => team.country))) {
  const group = sections.filter((section) => section.team.country === country)
  await writeFile(`dist/${country}/index.html`, renderCountryPage(group, siteUrl))
  await writeFile(`dist/${countrySharePath(group[0]!.team)}`, await renderCountryShareImage(group.map((section) => section.team), siteUrl))
}
// A competition's page at /{sport}/{competition}/ lists this season's clubs; no feed of its own.
for (const competition of Object.keys(COMPETITIONS) as Competition[]) {
  const group = sections.filter(({ team }) => team.club?.competition === competition)
  if (group.length === 0) continue
  await mkdir(`dist/${competitionPath(competition)}`, { recursive: true })
  await writeFile(`dist/${competitionPath(competition)}/index.html`, renderCompetitionPage(competition, group, siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, today, siteUrl))
await writeFile(`dist/${landingSharePath}`, await renderLandingShareImage(teams, siteUrl))
await mkdir('dist/how-it-works', { recursive: true })
await writeFile('dist/how-it-works/index.html', renderHowItWorks(sections, siteUrl))
await writeFile('dist/versions.json', JSON.stringify(versions))
await mkdir('dist/privacy', { recursive: true })
await writeFile('dist/privacy/index.html', renderPrivacy(siteUrl))
await mkdir('dist/kit', { recursive: true })
await writeFile('dist/kit/index.html', renderKit(teams))
await cp(new URL('../assets', import.meta.url), 'dist', { recursive: true }) // found from any working folder
// Only the flags a team uses, never the whole package; the licence sits next to the copies, as
// MIT asks. Every flag was already read for its share image, so a wrong code failed before this.
for (const code of new Set(teams.map((team) => team.flag))) await cp(flagFile(code), `dist/${flagPath(code)}`)
await cp(flagLicenseFile(), 'dist/flags/LICENSE')
// On the run's page in Actions (GITHUB_STEP_SUMMARY), printed elsewhere. A local build has no
// SITE_URL, so nothing to compare with and no summary; nor has a fixture or staging build, whatever its SITE_URL.
if (siteUrl && live) {
  const fibaAnswers = [...fibaPages.keys()].map((event) => answers[`${event}.html`])
  const euroleagueAnswers = [...euroleagueSeasons.keys()].map((season) => answers[`euroleague-${season}.json`])
  const sources = [
    uefaTeamIds.length && `UEFA answered one request for ${uefaTeamIds.length} football teams with ${uefaMatches.length} matches${reusedNote([answers['uefa.json']], now)}`,
    fibaPages.size && `FIBA answered ${fibaPages.size} competition ${fibaPages.size === 1 ? 'page' : 'pages'}${reusedNote(fibaAnswers, now)}`,
    euroleagueSeasons.size && `EuroLeague answered ${euroleagueSeasons.size} season ${euroleagueSeasons.size === 1 ? 'schedule' : 'schedules'}${reusedNote(euroleagueAnswers, now)}`,
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
if (live) {
  await writeFile(KNOWN_GAMES, JSON.stringify(known, null, 2) + '\n')
  // Every answer this build used, for a push build to reuse; a reused one keeps the time it was fetched.
  await mkdir(ANSWERS, { recursive: true })
  if (uefaTeamIds.length) await writeFile(`${ANSWERS}/uefa.json`, JSON.stringify(uefaMatches))
  for (const [event, page] of fibaPages) await writeFile(`${ANSWERS}/${event}.html`, page)
  for (const [season, json] of euroleagueSeasons) await writeFile(`${ANSWERS}/euroleague-${season}.json`, json)
  await writeFile(`${ANSWERS}/index.json`, JSON.stringify(answers, null, 2) + '\n')
}
