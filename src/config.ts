import type { Details } from './game.ts'

// Lowercase wordmark, "Scarf" only at the start of a sentence. See docs/brand.md.
export const siteName = 'scarf'

export interface Team {
  // URL slugs. The path scheme is frozen because subscriptions point at it (see HANDOVER.md):
  // the feed is /{country}/{sport}.ics and the team page /{country}/{sport}/.
  country: string
  sport: string
  name: string // "Greece football": how the page and the calendar name call the team
  side: string // how the feed description calls the team, in full
  // Stripe colours from the flag or kit; the first one is the calendar colour (docs/brand.md).
  colours: [string, string] | [string, string, string]
  flag?: string // file in assets/, shown next to the team on its page
  source: { kind: 'uefa'; teamId: number } | { kind: 'fiba'; event: string; teamCode: string }
  // TV and tickets are in no data source. The broadcaster is stable per rights cycle, so it is
  // kept here per team; see docs/research-2026-10-02.md.
  defaults: Pick<Details, 'tv' | 'tickets'>
}

export const feedPath = (team: Team): string => `${team.country}/${team.sport}.ics`
export const sharePath = (team: Team): string => `${team.country}/${team.sport}/share.png`
export const landingSharePath = 'share.png' // the landing page's, at the site root
export const shareSize = { width: 1200, height: 630 } // the share image, the size chat apps expect

export const teams: Team[] = [
  {
    country: 'greece',
    sport: 'football',
    name: 'Greece football',
    side: "Greece men's national football team",
    colours: ['#0D5EAF', '#FFFFFF'],
    flag: 'flag-gr.svg',
    source: { kind: 'uefa', teamId: 49 },
    defaults: {
      // Confirmed for the Nations League 2026-27. Euro 2028 qualifiers are likely but
      // unconfirmed: re-check in early 2027.
      tv: 'Alpha, Novasports (Greek TV)',
      tickets: 'https://www.pame-ethniki.gr/gnfc/showProductList.html',
    },
  },
  {
    country: 'greece',
    sport: 'basketball',
    name: 'Greece basketball',
    side: "Greece men's national basketball team",
    colours: ['#0D5EAF', '#FFFFFF'],
    flag: 'flag-gr.svg',
    // One FIBA event per competition: a new competition needs a new event here.
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'GRE' },
    defaults: {
      tv: 'ERT (Greek TV)',
    },
  },
  {
    country: 'spain',
    sport: 'football',
    name: 'Spain football',
    side: "Spain men's national football team",
    colours: ['#AA151B', '#F1BF00'],
    flag: 'flag-es.svg',
    source: { kind: 'uefa', teamId: 122 },
    defaults: {
      // RTVE shows the Nations League 2026-27 on La 1 and RTVE Play (checked 2026-10-17):
      // https://www.rtve.es/play/videos/uefa-nations-league/nations-league-croacia-espana-hora/17253700/
      tv: 'La 1 (Spanish TV)',
      // The federation's own ticket shop, which lists every national-team game on sale.
      tickets: 'https://tickets.rfef.es/',
    },
  },
  {
    country: 'spain',
    sport: 'basketball',
    name: 'Spain basketball',
    side: "Spain men's national basketball team",
    colours: ['#AA151B', '#F1BF00'],
    flag: 'flag-es.svg',
    // The same competition page as Greece, so the build fetches it once for both. The team code
    // is the one the page uses (test/fixtures/fiba-games.html).
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'ESP' },
    defaults: {
      // The federation's previews of the 2027 qualifiers name Teledeporte and Vamos (checked 2026-10-17):
      // https://www.feb.es/seleccionmasculina/2026/8/30/baloncesto/enorme-desafio-atenas-frente-grecia-lunes-1800h-teledeporte-vamos/106145.aspx
      tv: 'Teledeporte, Vamos (Spanish TV)',
      // The federation's ticket page for the men's team: one link per home game as it goes on sale.
      tickets: 'https://www.feb.es/entradasseam.aspx',
    },
  },
  {
    country: 'france',
    sport: 'basketball',
    name: 'France basketball',
    side: "France men's national basketball team",
    colours: ['#0055A4', '#FFFFFF', '#EF4135'],
    flag: 'flag-fr.svg',
    // The same competition page as Greece and Spain; one request serves all three.
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'FRA' },
    defaults: {
      // The team's official calendar lists every 2027 qualifier on beIN Sports (checked 2026-10-17):
      // https://www.teamfrancebasket.com/schedule/2026
      tv: 'beIN Sports (French TV)',
      // The federation's ticket shop, linked from every ffbb.com page.
      tickets: 'https://billetterie.ffbb.com/fr',
    },
  },
  {
    country: 'germany',
    sport: 'basketball',
    name: 'Germany basketball',
    side: "Germany men's national basketball team",
    colours: ['#000000', '#DD0000', '#FFCC00'],
    flag: 'flag-de.svg',
    source: { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode: 'GER' },
    defaults: {
      // The federation's preview of the 2027 qualifiers window says "bei MagentaSport" (checked 2026-10-17):
      // https://www.basketball-bund.de/dbb-herren-world-cup-qualifier-gegen-polen-in-frankfurt/
      tv: 'MagentaSport (German TV)',
      // The federation's ticket shop ("Tickets für DBB-Events" on basketball-bund.de).
      tickets: 'https://www.ticket-onlineshop.com/ols/dbb/',
    },
  },
  {
    country: 'switzerland',
    sport: 'football',
    name: 'Switzerland football',
    side: "Switzerland men's national football team",
    colours: ['#D52B1E', '#FFFFFF'],
    flag: 'flag-ch.svg',
    // Team id confirmed on 2026-10-17: uefa.com's team page is /teams/128--switzerland/, and the one
    // probe allowed by #35 (teamId=128,47,39, November 2026) answered Slovenia v Switzerland and
    // Switzerland v Scotland for it.
    source: { kind: 'uefa', teamId: 128 },
    defaults: {
      // SRG SSR holds every game of the men's team through the 2027-28 season, Nations League
      // included, on SRF, RTS and RSI; a few games per two years are sublicensed to CH Media's
      // channels in German-speaking Switzerland (checked 2026-10-17):
      // https://www.srgssr.ch/de/news-medien/news/nationalmannschafts-fussball-bis-2028-bei-der-srg
      tv: 'SRF, RTS, RSI (Swiss TV)',
      // The federation's ticketing page, which announces each home game as it goes on sale.
      tickets: 'https://www.football.ch/sfv/nationalteams/ticketing.aspx',
    },
  },
  {
    country: 'england',
    sport: 'football',
    name: 'England football',
    side: "England men's national football team",
    colours: ['#CE1124', '#FFFFFF'], // red first, so the calendar is not white
    flag: 'flag-en.svg',
    // Team id 39: in the batched probe response of 2026-10-17 (test/fixtures/uefa-matches.json)
    // and again in the #35 probe (England v Croatia, Spain v England).
    source: { kind: 'uefa', teamId: 39 },
    defaults: {
      // The FA: ITV shows every England men's game outside tournament finals, Nations League,
      // qualifiers and friendlies, from September 2024 to June 2028 (checked 2026-10-22):
      // https://www.englandfootball.com/articles/2023/Sep/19/itv-england-men-games-tv-deal-2024-2028-20230919
      tv: 'ITV (British TV)',
      // Wembley's ticket page, where the "England Tickets" link on englandfootball.com goes: every
      // England game on sale, home and away.
      tickets: 'https://www.wembleystadium.com/tickets/',
    },
  },
  {
    country: 'germany',
    sport: 'football',
    name: 'Germany football',
    side: "Germany men's national football team",
    colours: ['#000000', '#DD0000', '#FFCC00'],
    flag: 'flag-de.svg',
    // Team id confirmed on 2026-10-17: uefa.com's team page is /teams/47--germany/, and the #35
    // probe answered Serbia v Germany and Germany v Netherlands for it.
    source: { kind: 'uefa', teamId: 47 },
    defaults: {
      // Nations League 2026-27: ARD and ZDF share the home games, RTL has the away games, per the
      // federation's match FAQs and ZDF's press note (checked 2026-10-17):
      // https://www.dfb.de/news/nations-league-klopp-premiere-gegen-die-niederlande-live-bei-rtl
      // https://presseportal.zdf.de/pressemitteilung/uefa-nations-league-2026-2027-live-im-zdf-deutschland-serbien-im-oktober
      // The channel of a given game goes in src/manual.ts once a rights holder has named it.
      tv: 'ARD or ZDF at home, RTL away (German TV)',
      // The federation's ticket shop, which lists every national-team game on sale.
      tickets: 'https://tickets.dfb.de/',
    },
  },
]
