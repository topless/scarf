import type { Details } from './game.ts'

// Details added by hand, keyed by game id. Host federations announce time, venue and tickets
// weeks before the official sources show them. Time and place here are used only until the
// source has its own values. A kickoff is in UTC and must end in "Z".
// An onSale day (YYYY-MM-DD at the venue) with a ticket link adds a "Tickets on sale" all-day
// event on that day, with a reminder at 09:00 venue time; it leaves the feed with the game.
// Remove the day to remove the event; add none for a sale that has already opened.
export const manual: Record<string, Details> = {
  // Spain v Greece, announced by the Spanish federation on 24 Sep 2026:
  // https://www.feb.es/2026/9/24/baloncesto/venta-las-entradas-para-espana-grecia-santiago-compostela/106297.aspx
  'fiba-127107': {
    kickoff: '2026-11-29T17:00:00Z',
    utcOffsetHours: 1,
    venue: 'Pabellón Multiusos Fontes do Sar',
    city: 'Santiago de Compostela',
    tickets: 'https://feb.entradas.plus/entradas/entradas-deporte-espana-vs-grecia-multiusos-fontes-do-sar-29-11',
  },
  // Germany's November games: the channel per game, from ARD's own Nations League page (the team
  // default only says which broadcaster has home and which away games):
  // https://www.sportschau.de/fussball/nationsleague/alles-wichtige-zur-nations-league,uefa-nations-league-faq-100.html
  'uefa-2047887': { tv: 'RTL (German TV)' }, // Serbia v Germany, 13 Nov 2026
  'uefa-2047909': { tv: 'ARD (German TV)' }, // Germany v Netherlands, 16 Nov 2026
}
