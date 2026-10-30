import type { Details } from './game.ts'

// Lowercase wordmark, "Scarf" only at the start of a sentence. See docs/brand.md.
export const siteName = 'scarf'
// The public address when the build is given none (SITE_URL), as feeds and share cards print it.
export const defaultSiteUrl = 'https://scarf.fan'

// The sports scarf covers. The pages speak each sport's language (kickoff or tip-off, stadium or
// arena; see page.ts), so a new sport is added here and given its words there.
export type Sport = 'football' | 'basketball'

export interface Team {
  // URL slugs. The path scheme is frozen because subscriptions point at it (see HANDOVER.md):
  // the feed is /{country}/{sport}.ics and the team page /{country}/{sport}/.
  country: string
  sport: Sport
  name: string // "Greece football": how the page and the calendar name call the team
  side: string // how the feed description calls the team, in full
  // Stripe colours from the flag or kit; the first one is the calendar colour (docs/brand.md).
  colours: [string, string] | [string, string, string]
  // The team's flag as flag-icons names it: the ISO 3166-1 alpha-2 code in lowercase ('gr'), or
  // one of the package's sub-national codes for a team without a country of its own ('gb-eng').
  flag: string
  source: { kind: 'uefa'; teamId: number } | { kind: 'fiba'; event: string; teamCode: string }
  // TV and tickets are in no data source. The broadcaster is stable per rights cycle, so it is
  // kept here per team; see docs/research-2026-10-02.md.
  defaults: Pick<Details, 'tv' | 'tickets'>
}

export const feedPath = (team: Team): string => `${team.country}/${team.sport}.ics`
// The optional variant with a "New game" entry on the day a game is announced; frozen once published.
export const alertsFeedPath = (team: Team): string => `${team.country}/${team.sport}-alerts.ics`
// The calendar name: team first, brand last. The variant says so, so a fan can tell the two apart.
export const feedName = (team: Team, alerts = false): string => `${team.name}${alerts ? ' + alerts' : ''} · ${siteName}`
export const sharePath = (team: Team): string => `${team.country}/${team.sport}/share.png`
// The country page at /{country}/ lists the country's teams; its share image sits next to it.
export const countrySharePath = (team: Team): string => `${team.country}/share.png`
export const landingSharePath = 'share.png' // the landing page's, at the site root
export const shareSize = { width: 1200, height: 630 } // the share image, the size chat apps expect

// The countries of the teams added in #76: the name the pages print, the stripes and the flag.
// Stripes follow docs/brand.md's rule for a flag; Denmark and Serbia take the values listed there,
// France those of its basketball team below.
const COUNTRIES = {
  albania: { name: 'Albania', colours: ['#FF0000', '#000000'], flag: 'al' },
  andorra: { name: 'Andorra', colours: ['#0018A8', '#FEDF00', '#D0103A'], flag: 'ad' },
  armenia: { name: 'Armenia', colours: ['#D90012', '#0033A0', '#F2A800'], flag: 'am' },
  austria: { name: 'Austria', colours: ['#C8102E', '#FFFFFF'], flag: 'at' },
  azerbaijan: { name: 'Azerbaijan', colours: ['#00B9E4', '#ED2939', '#3F9C35'], flag: 'az' },
  belarus: { name: 'Belarus', colours: ['#CE1720', '#007C30'], flag: 'by' },
  belgium: { name: 'Belgium', colours: ['#000000', '#FFD90C', '#F31830'], flag: 'be' },
  'bosnia-and-herzegovina': { name: 'Bosnia and Herzegovina', colours: ['#000099', '#FFCC00'], flag: 'ba' },
  bulgaria: { name: 'Bulgaria', colours: ['#00966E', '#D62612', '#FFFFFF'], flag: 'bg' },
  croatia: { name: 'Croatia', colours: ['#FF0000', '#FFFFFF', '#171796'], flag: 'hr' },
  cyprus: { name: 'Cyprus', colours: ['#D47600', '#FFFFFF'], flag: 'cy' },
  czechia: { name: 'Czechia', colours: ['#D7141A', '#11457E', '#FFFFFF'], flag: 'cz' },
  denmark: { name: 'Denmark', colours: ['#C60C30', '#FFFFFF'], flag: 'dk' },
  estonia: { name: 'Estonia', colours: ['#1791FF', '#000000', '#FFFFFF'], flag: 'ee' },
  'faroe-islands': { name: 'Faroe Islands', colours: ['#D72828', '#003897', '#FFFFFF'], flag: 'fo' },
  finland: { name: 'Finland', colours: ['#002F6C', '#FFFFFF'], flag: 'fi' },
  france: { name: 'France', colours: ['#0055A4', '#FFFFFF', '#EF4135'], flag: 'fr' },
  georgia: { name: 'Georgia', colours: ['#FF0000', '#FFFFFF'], flag: 'ge' },
  gibraltar: { name: 'Gibraltar', colours: ['#DA000C', '#FFFFFF'], flag: 'gi' },
  hungary: { name: 'Hungary', colours: ['#D43516', '#FFFFFF', '#388D00'], flag: 'hu' },
  iceland: { name: 'Iceland', colours: ['#003897', '#FFFFFF', '#D72828'], flag: 'is' },
  israel: { name: 'Israel', colours: ['#0038B8', '#FFFFFF'], flag: 'il' },
  italy: { name: 'Italy', colours: ['#009246', '#FFFFFF', '#CE2B37'], flag: 'it' },
  kazakhstan: { name: 'Kazakhstan', colours: ['#00ABC2', '#FFEC2D'], flag: 'kz' },
  kosovo: { name: 'Kosovo', colours: ['#244AA5', '#D0A650'], flag: 'xk' },
  latvia: { name: 'Latvia', colours: ['#981E32', '#FFFFFF'], flag: 'lv' },
  liechtenstein: { name: 'Liechtenstein', colours: ['#002B7F', '#CE1126'], flag: 'li' },
  lithuania: { name: 'Lithuania', colours: ['#FDB913', '#006A44', '#C1272D'], flag: 'lt' },
  luxembourg: { name: 'Luxembourg', colours: ['#ED2939', '#FFFFFF', '#00A1DE'], flag: 'lu' },
  malta: { name: 'Malta', colours: ['#CF142B', '#FFFFFF'], flag: 'mt' },
  moldova: { name: 'Moldova', colours: ['#00319C', '#FFDE00', '#DE2110'], flag: 'md' },
  montenegro: { name: 'Montenegro', colours: ['#C40308', '#D3AE3B'], flag: 'me' },
  netherlands: { name: 'Netherlands', colours: ['#AE1C28', '#FFFFFF', '#21468B'], flag: 'nl' },
  'north-macedonia': { name: 'North Macedonia', colours: ['#D20000', '#FFE600'], flag: 'mk' },
  'northern-ireland': { name: 'Northern Ireland', colours: ['#CC0000', '#FFFFFF'], flag: 'gb-nir' },
  norway: { name: 'Norway', colours: ['#ED2939', '#FFFFFF', '#002664'], flag: 'no' },
  poland: { name: 'Poland', colours: ['#DC143C', '#FFFFFF'], flag: 'pl' },
  portugal: { name: 'Portugal', colours: ['#006600', '#FF0000'], flag: 'pt' },
  'republic-of-ireland': { name: 'Republic of Ireland', colours: ['#009A49', '#FFFFFF', '#FF7900'], flag: 'ie' },
  romania: { name: 'Romania', colours: ['#00319C', '#FFDE00', '#DE2110'], flag: 'ro' },
  'san-marino': { name: 'San Marino', colours: ['#19B6EF', '#FFFFFF'], flag: 'sm' },
  scotland: { name: 'Scotland', colours: ['#0065BD', '#FFFFFF'], flag: 'gb-sct' },
  serbia: { name: 'Serbia', colours: ['#C6363C', '#0C4076', '#FFFFFF'], flag: 'rs' },
  slovakia: { name: 'Slovakia', colours: ['#0B4EA2', '#EE1C25', '#FFFFFF'], flag: 'sk' },
  slovenia: { name: 'Slovenia', colours: ['#0000BF', '#D50000', '#FFFFFF'], flag: 'si' },
  sweden: { name: 'Sweden', colours: ['#005293', '#FECB00'], flag: 'se' },
  turkiye: { name: 'Türkiye', colours: ['#E30A17', '#FFFFFF'], flag: 'tr' },
  ukraine: { name: 'Ukraine', colours: ['#0057B8', '#FFD700'], flag: 'ua' },
  wales: { name: 'Wales', colours: ['#00AB39', '#D21034', '#FFFFFF'], flag: 'gb-wls' },
} satisfies Record<string, { name: string; colours: Team['colours']; flag: string }>

// A team of one of those countries. TV and tickets stay empty until an official page confirms them.
function team(country: keyof typeof COUNTRIES, sport: Sport, source: Team['source']): Team {
  const { name, colours, flag } = COUNTRIES[country]
  return { country, sport, name: `${name} ${sport}`, side: `${name} men's national ${sport} team`, colours, flag, source, defaults: {} }
}
const football = (country: keyof typeof COUNTRIES, teamId: number) => team(country, 'football', { kind: 'uefa', teamId })
const basketball = (country: keyof typeof COUNTRIES, teamCode: string) =>
  team(country, 'basketball', { kind: 'fiba', event: 'fiba-basketball-world-cup-2027-european-qualifiers', teamCode })

export const teams: Team[] = [
  {
    country: 'greece',
    sport: 'football',
    name: 'Greece football',
    side: "Greece men's national football team",
    colours: ['#0D5EAF', '#FFFFFF'],
    flag: 'gr',
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
    flag: 'gr',
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
    flag: 'es',
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
    flag: 'es',
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
    flag: 'fr',
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
    flag: 'de',
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
    flag: 'ch',
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
    flag: 'gb-eng',
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
    flag: 'de',
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
  // Every other UEFA member (#76). Ids from the one probe of 2026-10-30, competitionId=2014: the 156
  // league-phase games of the Nations League 2026-27 name 54 teams, every member but suspended Russia.
  // Each comment is the team's group there; test/fixtures/uefa-matches.json keeps the games to come.
  football('albania', 2), // C1
  football('andorra', 60618), // D1
  football('armenia', 57419), // C2
  football('austria', 8), // B3
  football('azerbaijan', 57154), // D2
  football('belarus', 57155), // C1
  football('belgium', 13), // A1
  football('bosnia-and-herzegovina', 60094), // B4
  football('bulgaria', 20), // C4
  football('croatia', 56370), // A3
  football('cyprus', 33), // C2
  football('czechia', 58837), // A3
  football('denmark', 35), // A4
  football('estonia', 56556), // C4
  football('faroe-islands', 51218), // C3
  football('finland', 42), // C1
  football('france', 43), // A1
  football('georgia', 57157), // B2
  football('gibraltar', 94080), // D1
  football('hungary', 57), // B2
  football('iceland', 58), // C4
  football('israel', 65), // B3
  football('italy', 66), // A1
  football('kazakhstan', 65146), // C3
  football('kosovo', 2608110), // B3
  football('latvia', 56558), // C2
  football('liechtenstein', 81), // D2
  football('lithuania', 56557), // D2
  football('luxembourg', 82), // C4
  football('malta', 88), // D1
  football('moldova', 57160), // C3
  football('montenegro', 92853), // C2
  football('netherlands', 95), // A2
  football('north-macedonia', 59205), // B1
  football('northern-ireland', 63), // B2
  football('norway', 101), // A4
  football('poland', 109), // B4
  football('portugal', 110), // A4
  football('republic-of-ireland', 64), // B3
  football('romania', 113), // B4
  football('san-marino', 50168), // C1
  football('scotland', 117), // B1
  football('serbia', 147), // A2
  football('slovakia', 58836), // C3
  football('slovenia', 57163), // B1
  football('sweden', 127), // B4
  football('turkiye', 135), // A1
  football('ukraine', 57166), // B2
  football('wales', 144), // A4
  // Every other team still in the 2027 qualifiers (#76), from the page fetched once on 2026-10-30.
  // Each comment is the team's second-round group. The eight out after the first round (Austria,
  // Belgium, Cyprus, Czechia, Denmark, Great Britain, Romania, Switzerland) play other FIBA
  // competitions now, a page each, so they stay out, as Denmark did in #31.
  basketball('bosnia-and-herzegovina', 'BIH'), // J
  basketball('croatia', 'CRO'), // K
  basketball('estonia', 'EST'), // L
  basketball('finland', 'FIN'), // L
  basketball('georgia', 'GEO'), // I
  basketball('hungary', 'HUN'), // L
  basketball('iceland', 'ISL'), // J
  basketball('israel', 'ISR'), // K
  basketball('italy', 'ITA'), // J
  basketball('latvia', 'LAT'), // K
  basketball('lithuania', 'LTU'), // J
  basketball('montenegro', 'MNE'), // I
  basketball('netherlands', 'NED'), // K
  basketball('poland', 'POL'), // K
  basketball('portugal', 'POR'), // I
  basketball('serbia', 'SRB'), // J
  basketball('slovenia', 'SLO'), // L
  basketball('sweden', 'SWE'), // L
  basketball('turkiye', 'TUR'), // J
  basketball('ukraine', 'UKR'), // I
]
