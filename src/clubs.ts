import type { Team } from './config.ts'

// The clubs: under their countries, below the national teams, and on their competition's page.
// Each names the season its source lists (E2026 is EuroLeague 2026-27, U2026 EuroCup 2026-27); once
// the next season's games are published (July, as a rule), the code moves on. Kit colours marked
// "to confirm" are read off kits, not the club's own brand values. City and ground are the club's
// home as fans name it; a game's own venue, from the source, may differ (a renovation, a final).
export const clubs: Team[] = [
  // The Greek clubs in the EuroLeague (#113).
  {
    country: 'greece',
    sport: 'basketball',
    // The season's games list SUNEL Arena, Athens, for home games: the club's ground is Piraeus's SEF. To confirm.
    club: { slug: 'olympiacos', name: 'Olympiacos', city: 'Piraeus', ground: 'Peace and Friendship Stadium', competition: 'euroleague' },
    name: 'Olympiacos basketball',
    side: "Olympiacos men's basketball team",
    colours: ['#E4002B', '#FFFFFF'], // the kit's red and white; the red is to confirm against the club's own value
    flag: 'gr',
    source: { kind: 'euroleague', season: 'E2026', clubCode: 'OLY' },
    defaults: {
      // Novasports holds the EuroLeague in Greece and Cyprus: EuroLeague's deal with its owner United
      // Media runs five seasons, 2023-24 to 2027-28 (SportBusiness, to confirm on novasports.gr):
      // https://www.sportbusiness.com/news/euroleague-extends-united-media-deals-in-greece-cyprus-and-balkans/
      tv: 'Novasports (Greek TV)',
      // The club's "Online ticketing" link on olympiacosbc.gr (checked 2026-10-31).
      tickets: 'https://www.ticketmaster.gr/osfpbc/',
    },
  },
  {
    country: 'greece',
    sport: 'basketball',
    club: { slug: 'panathinaikos', name: 'Panathinaikos', city: 'Athens', ground: 'Telekom Center Athens', competition: 'euroleague' },
    name: 'Panathinaikos basketball',
    side: "Panathinaikos men's basketball team",
    colours: ['#007A33', '#FFFFFF'], // the kit's green and white; the green is to confirm against the club's own value
    flag: 'gr',
    source: { kind: 'euroleague', season: 'E2026', clubCode: 'PAN' },
    defaults: {
      tv: 'Novasports (Greek TV)', // as for Olympiacos above
      // The club's "Match tickets" link on paobc.gr (checked 2026-10-31).
      tickets: 'https://paobc.more.com/gr-el/tickets/',
    },
  },
]
