import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { feedChanges } from './changes.ts'
import { alertsFeedPath, countrySharePath, feedPath, landingSharePath, sharePath, teams, type Team } from './config.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { flagFile, flagLicenseFile, flagPath } from './flags.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, recordSeen, type KnownGames } from './known-games.ts'
import { manual } from './manual.ts'
import { renderCountryPage, renderKit, renderLanding, renderTeamPage, type Section } from './page.ts'
import { renderCountryShareImage, renderLandingShareImage, renderShareImage } from './share.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, the unlisted identity kit at /kit/, and
// next to them the brand assets (stylesheets, icons) and the flags the teams use, copied out of
// flag-icons with its licence.
// Each country gets a page and a share image of its own too, listing its teams.
// Requests stay minimal: UEFA answers for every football team in one call, and a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers). Any failure aborts the whole build, so the previously published files
// stay in place.

const now = new Date()
const today = now.toISOString().slice(0, 10)
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

// The games earlier builds saw, so this one can tell a newly announced game from an old one for
// the -alerts feeds. Not in git: the Actions job keeps it in its cache (.github/workflows/publish.yml).
// Missing on the first build, or once the cache is lost, which seeds it again and announces nothing.
const KNOWN_GAMES = 'known-games.json'
const known = JSON.parse(
  await readFile(KNOWN_GAMES, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '{}'
    throw error
  }),
) as KnownGames

const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const uefaMatches = uefaTeamIds.length ? await fetchUefaMatches(uefaTeamIds, today) : []
const fibaPages = new Map<string, string>()

async function gamesOf(team: Team): Promise<Game[]> {
  const { source } = team
  if (source.kind === 'uefa') return parseUefaMatches(uefaMatches, source.teamId)
  let page = fibaPages.get(source.event)
  if (page === undefined) {
    if (fibaPages.size > 0) await pause(5000) // a breath between two pages of the same site
    page = await fetchFibaPage(source.event)
    fibaPages.set(source.event, page)
  }
  return parseFibaGames(page, source.teamCode)
}

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
  const games = (await gamesOf(team))
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  const key = `${team.country}/${team.sport}`
  const seen = recordSeen(known[key], games.map((game) => game.id), today)
  known[key] = seen.feed
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  const ics = toIcs(team, games, now, siteUrl)
  await writeFile(`dist/${feedPath(team)}`, ics)
  await writeFile(`dist/${alertsFeedPath(team)}`, toIcs(team, games, now, siteUrl, announced(seen.feed)))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games, ${seen.fresh.length} new`)
  if (siteUrl) {
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
await mkdir('dist/kit', { recursive: true })
await writeFile('dist/kit/index.html', renderKit(teams))
await cp('assets', 'dist', { recursive: true })
// Only the flags a team uses, never the whole package; the licence sits next to the copies, as
// MIT asks. Every flag was already read for its share image, so a wrong code failed before this.
for (const code of new Set(teams.map((team) => team.flag))) await cp(flagFile(code), `dist/${flagPath(code)}`)
await cp(flagLicenseFile(), 'dist/flags/LICENSE')
// On the run's page in Actions (GITHUB_STEP_SUMMARY), printed elsewhere. A local build has no
// SITE_URL, so nothing to compare with and no summary.
if (siteUrl) {
  const sources = [
    uefaTeamIds.length && `UEFA answered one request for ${uefaTeamIds.length} football teams`,
    fibaPages.size && `FIBA answered ${fibaPages.size} competition ${fibaPages.size === 1 ? 'page' : 'pages'}`,
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
// Last, so a build that fails part-way leaves the file as it was; the job caches it after the deploy.
await writeFile(KNOWN_GAMES, JSON.stringify(known, null, 2) + '\n')
