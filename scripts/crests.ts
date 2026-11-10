import { execFile } from 'node:child_process'
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import UPNG from 'upng-js'
import { clubs } from '../src/clubs.ts'
import type { Team } from '../src/config.ts'

// Fetches every club's crest once, by hand, into assets/crests/ (#132): UEFA's 700 px PNG by team id
// for a football club, the crest the EuroLeague Basketball clubs endpoint names for a basketball club.
// Not part of the build, which makes one request per source and never touches these CDNs; fans' browsers
// never do either, the files are served from scarf.fan. Each file is scaled to 192 px (twice the largest
// size a page shows) with macOS's sips and re-encoded with 256 colours (#162), so the repository and
// the pages stay light.
//
//   node scripts/crests.ts            fetches the crests that are missing
//   node scripts/crests.ts --force    fetches them all again (a rebrand, a new season)
//
// The crest is shown small, beside the club's name, unmodified, with the trademark line on the page;
// a club that asks has its file removed and its `crest` unset. A crest the CDN cannot give stays missing
// and fails config.test until the club's `crest` is set to undefined by hand, then the page falls back
// to the kit stripes: the summary says which.

const SIZE = 192
const DIR = new URL('../assets/crests/', import.meta.url)
const force = process.argv.includes('--force')
const run = promisify(execFile)
const headers = { 'User-Agent': 'scarf/0.1 (personal fixture calendar)' }

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res
}

// One request per season code: the clubs of the season, each with the URL of its crest.
const crestsBySeason = new Map<string, Map<string, string>>()
async function euroleagueCrest(season: string, code: string): Promise<string> {
  if (!crestsBySeason.has(season)) {
    const res = await get(`https://api-live.euroleague.net/v2/competitions/${season[0]}/seasons/${season}/clubs`)
    const answer = (await res.json()) as { data?: { code: string; images?: { crest?: string } }[] }
    if (!Array.isArray(answer.data)) throw new Error(`EuroLeague clubs answer for ${season} is not a list`)
    crestsBySeason.set(season, new Map(answer.data.flatMap((club) => (club.images?.crest ? [[club.code, club.images.crest]] : []))))
  }
  const url = crestsBySeason.get(season)!.get(code)
  if (!url) throw new Error(`EuroLeague lists no crest for ${code} in ${season}`)
  return url
}

const crestUrl = ({ source }: Team): Promise<string> =>
  source.kind === 'uefa'
    ? Promise.resolve(`https://img.uefa.com/imgml/TP/teams/logos/700x700/${source.teamId}.png`)
    : source.kind === 'euroleague'
      ? euroleagueCrest(source.season, source.clubCode)
      : Promise.reject(new Error(`no crest source for ${source.kind}`))

await mkdir(DIR, { recursive: true })
const done: string[] = []
const failed: string[] = []
const seen = new Set<string>()
for (const team of clubs) {
  const file = team.club!.crest
  if (!file) continue // removed on request, or unset by hand after the CDN could not give it
  if (seen.has(file)) continue // a club in two sports has two files; the same file twice would be a slug clash
  seen.add(file)
  const path = new URL(file, DIR)
  if (!force && (await access(path).then(() => true, () => false))) continue
  try {
    const res = await get(await crestUrl(team))
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
    // in place; sips keeps PNG as PNG. A half-made crest must not count as done next run.
    await run('sips', ['-Z', String(SIZE), path.pathname]).catch(async (error) => {
      await rm(path, { force: true })
      throw error
    })
    const crest = UPNG.decode(await readFile(path))
    await writeFile(path, Buffer.from(UPNG.encode(UPNG.toRGBA8(crest), crest.width, crest.height, 256)))
    done.push(`${file} ${Math.round((await stat(path)).size / 1024)} KB`)
  } catch (error) {
    failed.push(`${file}: ${(error as Error).message}`)
  }
}
console.log(`${done.length} crests fetched${done.length ? ':\n  ' + done.join('\n  ') : ''}`)
if (failed.length) {
  console.log(`${failed.length} missing, left to the kit stripes:\n  ${failed.join('\n  ')}`)
  process.exitCode = 1
}
