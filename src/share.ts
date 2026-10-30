import { readFile } from 'node:fs/promises'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import satori from 'satori'
import { html } from 'satori-html'
import { shareSize, siteName, type Team } from './config.ts'
import { readFlag } from './flags.ts'
import type { Game } from './game.ts'
import { countryName, federation, federations, kickoffText, landingKind, shortDate, SPORTS, teamKind } from './page.ts'

// The 1200×630 share images behind the pages' og:image, ported from reference/share-card.html:
// one per team, and a neutral one for the landing page in the same layout. A card is HTML with
// inline styles, laid out by Satori (a flexbox subset, no browser) into an SVG that resvg
// rasterises. Fonts are the static instances in fonts/, so the render needs nothing from the
// network and behaves the same on every machine.

const { width: WIDTH, height: HEIGHT } = shareSize
export const SHARE_MAX_BYTES = 300 * 1024

// The site's address without the scheme, as printed in a card's footer.
const DEFAULT_HOST = 'scarf.fan'

const WOOL = '#FBF8F2'
const INK = '#17171C'
const RED = '#D7263D'
const STAND = '#6B675F'
const DISPLAY = "'Bricolage Grotesque', sans-serif"

// The card for a team and its next game as a PNG, the flag read from flag-icons.
export async function renderShareImage(team: Team, next: Game | undefined, siteUrl?: string): Promise<Buffer> {
  return renderSharePng(renderShareCard(team, next, siteUrl, await readFlag(team)))
}

// The card for the landing page as a PNG.
export function renderLandingShareImage(teams: Team[], siteUrl?: string): Promise<Buffer> {
  return renderSharePng(renderLandingShareCard(teams, siteUrl))
}

// A team's card: its stripe across the top, its flag and kind over the headline, the large mark
// in its colours, and its next game under a NEXT pill. The flag is optional so a card can be laid
// out without one; the build always passes it, in the 4:3 box flag-icons draws for.
export function renderShareCard(team: Team, next: Game | undefined, siteUrl?: string, flagSvg?: string): string {
  const [band, ...stripes] = team.colours
  return card(
    {
      band: stripeBand(team.colours),
      eyebrow: `${flagSvg ? image(flagSvg, 32, 24) : ''}<span>${esc(teamKind(team))}</span>`,
      headline: `${team.name}, in your calendar.`,
      label: 'NEXT',
      labelColour: RED,
      line: nextGameLine(next),
      mark: teamMark(band, stripes),
      path: `/${team.country}/${team.sport}`,
      source: federation(team),
    },
    siteUrl,
  )
}

// The landing page's card: the same layout in the brand's own colours, so the two read as one
// family. An ink band where a team's stripe would be, the large mark in terrace red and wool, the
// brand line as the headline, and every team by name where a team's card has its next game.
export function renderLandingShareCard(teams: Team[], siteUrl?: string): string {
  return card(
    {
      band: INK,
      eyebrow: `<span>${esc(landingKind(teams))}</span>`,
      headline: 'Your colours, in your calendar.',
      label: 'TEAMS',
      labelColour: INK,
      line: teamsLine(teams),
      mark: teamMark(RED, [WOOL]),
      path: '',
      source: federations(teams),
    },
    siteUrl,
  )
}

// The card for a country's page as a PNG, the flag read from flag-icons.
export async function renderCountryShareImage(teams: Team[], siteUrl?: string): Promise<Buffer> {
  return renderSharePng(renderCountryShareCard(teams, siteUrl, await readFlag(teams[0]!)))
}

// A country's card: a team's card in the country's stripes and flag, with its teams by name where
// a team's card has its next game, as on the landing's card. teams are the country's, which share
// their colours (they come from the flag).
export function renderCountryShareCard(countryTeams: Team[], siteUrl?: string, flagSvg?: string): string {
  // Football first, as on the page's card, whatever order config.ts lists the teams in.
  const teams = SPORTS.flatMap((sport) => countryTeams.filter((team) => team.sport === sport))
  const [team] = teams as [Team]
  const [band, ...stripes] = team.colours
  return card(
    {
      band: stripeBand(team.colours),
      eyebrow: `${flagSvg ? image(flagSvg, 32, 24) : ''}<span>${esc(teams.length > 1 ? landingKind(teams) : teamKind(team))}</span>`,
      headline: `${countryName(team)}, in your calendar.`,
      label: 'TEAMS',
      labelColour: INK,
      line: teamsLine(teams),
      mark: teamMark(band, stripes),
      path: `/${team.country}`,
      source: federations(teams),
    },
    siteUrl,
  )
}

// "Greece football · Greece basketball"
export const teamsLine = (teams: Team[]): string => teams.map((team) => team.name).join(' · ')

// "Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam", or "… · time not announced".
export function nextGameLine(game?: Game): string {
  if (!game) return 'No games announced yet · subscribe and they find you'
  return `${game.home} vs ${game.away} · ${kickoffText(game, shortDate)}`
}

// Rasterises a card into a PNG and refuses one over the size limit, so an oversized image fails
// the build instead of being deployed (the same policy as a failed fetch).
export async function renderSharePng(card: string): Promise<Buffer> {
  const svg = await satori(html(card), { width: WIDTH, height: HEIGHT, fonts: await fonts() })
  await wasm()
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
  if (png.byteLength > SHARE_MAX_BYTES) {
    throw new Error(`share image is ${png.byteLength} bytes, over the ${SHARE_MAX_BYTES} limit`)
  }
  return Buffer.from(png)
}

interface Card {
  band: string // the CSS background of the band across the top
  eyebrow: string // HTML: the line over the headline, with a flag when there is one
  headline: string
  label: string // the pill before the last line, and its colour
  labelColour: string
  line: string // the last line: a team's next game, or the landing page's teams
  mark: string // the SVG filling the right-hand side
  path: string // the page's path under the site, "" for the landing page
  source: string // "UEFA" or "UEFA and FIBA": who the footer says the feed is updated from
}

// A card as HTML in the subset Satori lays out: every box is a flex box, styles are inline, and
// the SVGs (brand mark, flag, large mark) are embedded as images. The last line wraps under its
// pill when it is long, each line as tall as the pill.
function card(c: Card, siteUrl?: string): string {
  const host = (siteUrl ?? DEFAULT_HOST).replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `<div style="display: flex; flex-direction: column; width: ${WIDTH}px; height: ${HEIGHT}px; background: ${WOOL}; color: ${INK}; font-family: 'Albert Sans', sans-serif">
  <div style="height: 28px; background: ${c.band}; border-bottom: 2.5px solid ${INK}"></div>
  <div style="flex: 1; display: flex; gap: 40px; padding: 48px 64px 40px">
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 24px">
      <div style="display: flex; align-items: center; gap: 12px">
        ${image(brandMark(), 48, 48)}
        <span style="font-family: ${DISPLAY}; font-weight: 800; font-size: 40px; line-height: 1; letter-spacing: -0.045em">${siteName}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px">
        <div style="display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 600; color: ${STAND}">${c.eyebrow}</div>
        <div style="font-family: ${DISPLAY}; font-weight: 800; font-size: 84px; line-height: 0.92; letter-spacing: -0.045em; max-width: 720px">${esc(c.headline)}</div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 14px; font-size: 22px; font-weight: 600">
        <span style="display: flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 999px; background: ${c.labelColour}; color: #FFFFFF; font-size: 15px; font-weight: 700; letter-spacing: 0.04em">${c.label}</span>
        <span style="flex: 1; line-height: 36px">${esc(c.line)}</span>
      </div>
    </div>
    <div style="width: 340px; display: flex; align-items: center; justify-content: center">
      ${image(c.mark, 340, 340)}
    </div>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 64px 28px; font-size: 17px; color: ${STAND}">
    <span>${esc(host + c.path)}</span>
    <span>Free · updated daily from ${esc(c.source)}</span>
  </div>
</div>`
}

// Hard-stop stripes, 40 px per colour as in the reference card (the page uses 18 and 24).
function stripeBand(colours: string[]): string {
  return `repeating-linear-gradient(90deg, ${colours.map((c, i) => `${c} ${i * 40}px ${(i + 1) * 40}px`).join(', ')})`
}

// The brand mark, as in assets/scarf-mark.svg.
function brandMark(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><g transform="rotate(-14 32 32)"><rect x="8" y="22" width="48" height="20" rx="7" fill="${RED}"/><rect x="17" y="22" width="7" height="20" fill="${WOOL}"/><rect x="29" y="22" width="7" height="20" fill="${WOOL}"/><rect x="41" y="22" width="7" height="20" fill="${WOOL}"/><rect x="8" y="22" width="48" height="20" rx="7" stroke="${INK}" stroke-width="3"/><path d="M8 27H2M8 32H2M8 37H2M56 27h6M56 32h6M56 37h6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g></svg>`
}

// The large mark on the right of a card: the band in the first colour, the knitted stripes
// cycling through the rest. A team's colours on its card, terrace red and wool on the landing one.
function teamMark(band: string, stripes: string[]): string {
  const stripe = (x: number, width: number, i: number) =>
    `<rect x="${x}" y="22" width="${width}" height="20" fill="${stripes[i % stripes.length]}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><g transform="rotate(-24 32 32)"><rect x="4" y="22" width="56" height="20" rx="7" fill="${band}"/>${stripe(13, 7, 0)}${stripe(25, 7, 1)}${stripe(37, 7, 2)}${stripe(49, 5, 3)}<rect x="4" y="22" width="56" height="20" rx="7" stroke="${INK}" stroke-width="2"/><path d="M4 27H0M4 32H0M4 37H0M60 27h4M60 32h4M60 37h4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g></svg>`
}

function image(svg: string, width: number, height: number): string {
  return `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${width}" height="${height}">`
}

function esc(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

// Static instances of the brand faces (docs/brand.md), read once; Satori reads TrueType, not the
// variable fonts Google Fonts serves to browsers.
const FONT_FILES = [
  { name: 'Bricolage Grotesque', weight: 800, file: 'BricolageGrotesque-ExtraBold.ttf' },
  { name: 'Albert Sans', weight: 400, file: 'AlbertSans-Regular.ttf' },
  { name: 'Albert Sans', weight: 600, file: 'AlbertSans-SemiBold.ttf' },
  { name: 'Albert Sans', weight: 700, file: 'AlbertSans-Bold.ttf' },
] as const

type Font = { name: string; weight: 400 | 600 | 700 | 800; style: 'normal'; data: ArrayBuffer }
let loadedFonts: Promise<Font[]> | undefined
function fonts(): Promise<Font[]> {
  loadedFonts ??= Promise.all(
    FONT_FILES.map(async ({ name, weight, file }) => {
      const data = await readFile(new URL(`../fonts/${file}`, import.meta.url))
      return { name, weight, style: 'normal' as const, data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }
    }),
  )
  return loadedFonts
}

let wasmReady: Promise<void> | undefined
function wasm(): Promise<void> {
  wasmReady ??= readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'))).then(initWasm)
  return wasmReady
}
