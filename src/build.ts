import { cp, mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { feedPath, landingSharePath, sharePath, teams, type Team } from './config.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { manual } from './manual.ts'
import { renderLanding, renderTeamPage, type Section } from './page.ts'
import { renderLandingShareImage, renderShareImage } from './share.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, and the brand assets (stylesheets, icons,
// flags) next to them.
// Requests stay minimal: UEFA answers for every football team in one call, and a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers). Any failure aborts the whole build, so the previously published files
// stay in place.

const now = new Date()
const today = now.toISOString().slice(0, 10)
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

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

const sections: Section[] = []
for (const team of teams) {
  const games = (await gamesOf(team))
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  await writeFile(`dist/${feedPath(team)}`, toIcs(team, games, now, siteUrl))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games`)
}
for (const section of sections) {
  const { team, games } = section
  await writeFile(`dist/${team.country}/${team.sport}/index.html`, renderTeamPage(section, teams, now, siteUrl))
  await writeFile(`dist/${sharePath(team)}`, await renderShareImage(team, games[0], siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, now, siteUrl))
await writeFile(`dist/${landingSharePath}`, await renderLandingShareImage(teams, siteUrl))
await cp('assets', 'dist', { recursive: true })
