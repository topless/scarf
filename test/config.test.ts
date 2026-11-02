import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { COMPETITIONS, countryOf, feedPath, teams } from '../src/config.ts'
import { flagFile } from '../src/flags.ts'
import { manual } from '../src/manual.ts'

test('every team has its own frozen feed path, named after the team', () => {
  assert.deepEqual(
    teams.map((team) => [feedPath(team), team.name]),
    [
      ['greece/football.ics', 'Greece football'],
      ['greece/basketball.ics', 'Greece basketball'],
      ['spain/football.ics', 'Spain football'],
      ['spain/basketball.ics', 'Spain basketball'],
      ['france/basketball.ics', 'France basketball'],
      ['germany/basketball.ics', 'Germany basketball'],
      ['switzerland/football.ics', 'Switzerland football'],
      ['england/football.ics', 'England football'],
      ['germany/football.ics', 'Germany football'],
      ['albania/football.ics', 'Albania football'],
      ['andorra/football.ics', 'Andorra football'],
      ['armenia/football.ics', 'Armenia football'],
      ['austria/football.ics', 'Austria football'],
      ['azerbaijan/football.ics', 'Azerbaijan football'],
      ['belarus/football.ics', 'Belarus football'],
      ['belgium/football.ics', 'Belgium football'],
      ['bosnia-and-herzegovina/football.ics', 'Bosnia and Herzegovina football'],
      ['bulgaria/football.ics', 'Bulgaria football'],
      ['croatia/football.ics', 'Croatia football'],
      ['cyprus/football.ics', 'Cyprus football'],
      ['czechia/football.ics', 'Czechia football'],
      ['denmark/football.ics', 'Denmark football'],
      ['estonia/football.ics', 'Estonia football'],
      ['faroe-islands/football.ics', 'Faroe Islands football'],
      ['finland/football.ics', 'Finland football'],
      ['france/football.ics', 'France football'],
      ['georgia/football.ics', 'Georgia football'],
      ['gibraltar/football.ics', 'Gibraltar football'],
      ['hungary/football.ics', 'Hungary football'],
      ['iceland/football.ics', 'Iceland football'],
      ['israel/football.ics', 'Israel football'],
      ['italy/football.ics', 'Italy football'],
      ['kazakhstan/football.ics', 'Kazakhstan football'],
      ['kosovo/football.ics', 'Kosovo football'],
      ['latvia/football.ics', 'Latvia football'],
      ['liechtenstein/football.ics', 'Liechtenstein football'],
      ['lithuania/football.ics', 'Lithuania football'],
      ['luxembourg/football.ics', 'Luxembourg football'],
      ['malta/football.ics', 'Malta football'],
      ['moldova/football.ics', 'Moldova football'],
      ['montenegro/football.ics', 'Montenegro football'],
      ['netherlands/football.ics', 'Netherlands football'],
      ['north-macedonia/football.ics', 'North Macedonia football'],
      ['northern-ireland/football.ics', 'Northern Ireland football'],
      ['norway/football.ics', 'Norway football'],
      ['poland/football.ics', 'Poland football'],
      ['portugal/football.ics', 'Portugal football'],
      ['republic-of-ireland/football.ics', 'Republic of Ireland football'],
      ['romania/football.ics', 'Romania football'],
      ['san-marino/football.ics', 'San Marino football'],
      ['scotland/football.ics', 'Scotland football'],
      ['serbia/football.ics', 'Serbia football'],
      ['slovakia/football.ics', 'Slovakia football'],
      ['slovenia/football.ics', 'Slovenia football'],
      ['sweden/football.ics', 'Sweden football'],
      ['turkiye/football.ics', 'Türkiye football'],
      ['ukraine/football.ics', 'Ukraine football'],
      ['wales/football.ics', 'Wales football'],
      ['bosnia-and-herzegovina/basketball.ics', 'Bosnia and Herzegovina basketball'],
      ['croatia/basketball.ics', 'Croatia basketball'],
      ['estonia/basketball.ics', 'Estonia basketball'],
      ['finland/basketball.ics', 'Finland basketball'],
      ['georgia/basketball.ics', 'Georgia basketball'],
      ['hungary/basketball.ics', 'Hungary basketball'],
      ['iceland/basketball.ics', 'Iceland basketball'],
      ['israel/basketball.ics', 'Israel basketball'],
      ['italy/basketball.ics', 'Italy basketball'],
      ['latvia/basketball.ics', 'Latvia basketball'],
      ['lithuania/basketball.ics', 'Lithuania basketball'],
      ['montenegro/basketball.ics', 'Montenegro basketball'],
      ['netherlands/basketball.ics', 'Netherlands basketball'],
      ['poland/basketball.ics', 'Poland basketball'],
      ['portugal/basketball.ics', 'Portugal basketball'],
      ['serbia/basketball.ics', 'Serbia basketball'],
      ['slovenia/basketball.ics', 'Slovenia basketball'],
      ['sweden/basketball.ics', 'Sweden basketball'],
      ['turkiye/basketball.ics', 'Türkiye basketball'],
      ['ukraine/basketball.ics', 'Ukraine basketball'],
      // Clubs: under the country and the sport, by the club's slug (src/clubs.ts).
      ['greece/basketball/olympiacos.ics', 'Olympiacos basketball'],
      ['greece/basketball/panathinaikos.ics', 'Panathinaikos basketball'],
      ['france/basketball/asvel.ics', 'ASVEL basketball'],
      ['france/basketball/paris-basketball.ics', 'Paris Basketball'],
      ['germany/basketball/bayern-munich.ics', 'Bayern Munich basketball'],
      ['turkiye/basketball/besiktas.ics', 'Beşiktaş basketball'],
      ['turkiye/basketball/anadolu-efes.ics', 'Anadolu Efes basketball'],
      ['turkiye/basketball/fenerbahce.ics', 'Fenerbahçe basketball'],
      ['israel/basketball/hapoel-tel-aviv.ics', 'Hapoel Tel Aviv basketball'],
      ['israel/basketball/maccabi-tel-aviv.ics', 'Maccabi Tel Aviv basketball'],
      ['italy/basketball/olimpia-milano.ics', 'Olimpia Milano basketball'],
      ['italy/basketball/virtus-bologna.ics', 'Virtus Bologna basketball'],
      ['lithuania/basketball/zalgiris.ics', 'Žalgiris basketball'],
      ['serbia/basketball/partizan.ics', 'Partizan basketball'],
      ['serbia/basketball/crvena-zvezda.ics', 'Crvena Zvezda basketball'],
      ['spain/basketball/barcelona.ics', 'Barcelona basketball'],
      ['spain/basketball/baskonia.ics', 'Baskonia basketball'],
      ['spain/basketball/real-madrid.ics', 'Real Madrid basketball'],
      ['spain/basketball/valencia-basket.ics', 'Valencia Basket'],
      ['united-arab-emirates/basketball/dubai-basketball.ics', 'Dubai Basketball'],
      ['bosnia-and-herzegovina/basketball/bosna.ics', 'Bosna basketball'],
      ['bulgaria/basketball/balkan-botevgrad.ics', 'Balkan Botevgrad basketball'],
      ['england/basketball/london-lions.ics', 'London Lions basketball'],
      ['france/basketball/jl-bourg.ics', 'JL Bourg basketball'],
      ['france/basketball/le-mans-sarthe.ics', 'Le Mans Sarthe basketball'],
      ['germany/basketball/skyliners-frankfurt.ics', 'Skyliners Frankfurt basketball'],
      ['germany/basketball/niners-chemnitz.ics', 'Niners Chemnitz basketball'],
      ['germany/basketball/rostock-seawolves.ics', 'Rostock Seawolves basketball'],
      ['germany/basketball/ulm.ics', 'Ulm basketball'],
      ['greece/basketball/aris.ics', 'Aris basketball'],
      ['greece/basketball/paok.ics', 'PAOK basketball'],
      ['israel/basketball/hapoel-jerusalem.ics', 'Hapoel Jerusalem basketball'],
      ['italy/basketball/roma-basketball.ics', 'Roma Basketball'],
      ['italy/basketball/maxima-roma.ics', 'Maxima Roma basketball'],
      ['italy/basketball/napoli-basketball.ics', 'Napoli Basketball'],
      ['italy/basketball/trento.ics', 'Trento basketball'],
      ['italy/basketball/derthona.ics', 'Derthona basketball'],
      ['italy/basketball/reyer-venezia.ics', 'Reyer Venezia basketball'],
      ['latvia/basketball/riga-zelli.ics', 'Riga Zelli basketball'],
      ['lithuania/basketball/neptunas.ics', 'Neptūnas basketball'],
      ['lithuania/basketball/lietkabelis.ics', 'Lietkabelis basketball'],
      ['lithuania/basketball/siauliai.ics', 'Šiauliai basketball'],
      ['montenegro/basketball/buducnost.ics', 'Budućnost basketball'],
      ['poland/basketball/slask-wroclaw.ics', 'Śląsk Wrocław basketball'],
      ['romania/basketball/u-cluj.ics', 'U Cluj basketball'],
      ['slovenia/basketball/cedevita-olimpija.ics', 'Cedevita Olimpija basketball'],
      ['spain/basketball/san-pablo-burgos.ics', 'San Pablo Burgos basketball'],
      ['spain/basketball/manresa.ics', 'Manresa basketball'],
      ['spain/basketball/la-laguna-tenerife.ics', 'La Laguna Tenerife basketball'],
      ['turkiye/basketball/bahcesehir-koleji.ics', 'Bahçeşehir Koleji basketball'],
      ['turkiye/basketball/tofas.ics', 'Tofaş basketball'],
      ['turkiye/basketball/turk-telekom.ics', 'Türk Telekom basketball'],
      ['austria/football/lask.ics', 'LASK football'],
      ['azerbaijan/football/sabah.ics', 'Sabah football'],
      ['belgium/football/club-brugge.ics', 'Club Brugge football'],
      ['czechia/football/slavia-praha.ics', 'Slavia Praha football'],
      ['england/football/arsenal.ics', 'Arsenal football'],
      ['england/football/aston-villa.ics', 'Aston Villa football'],
      ['england/football/liverpool.ics', 'Liverpool football'],
      ['england/football/manchester-city.ics', 'Manchester City football'],
      ['england/football/manchester-united.ics', 'Manchester United football'],
      ['france/football/lens.ics', 'Lens football'],
      ['france/football/lille.ics', 'Lille football'],
      ['france/football/paris-saint-germain.ics', 'Paris Saint-Germain football'],
      ['germany/football/bayern-munich.ics', 'Bayern Munich football'],
      ['germany/football/borussia-dortmund.ics', 'Borussia Dortmund football'],
      ['germany/football/rb-leipzig.ics', 'RB Leipzig football'],
      ['germany/football/vfb-stuttgart.ics', 'VfB Stuttgart football'],
      ['greece/football/aek-athens.ics', 'AEK Athens football'],
      ['italy/football/como.ics', 'Como football'],
      ['italy/football/inter.ics', 'Inter football'],
      ['italy/football/napoli.ics', 'Napoli football'],
      ['italy/football/roma.ics', 'Roma football'],
      ['netherlands/football/feyenoord.ics', 'Feyenoord football'],
      ['netherlands/football/psv.ics', 'PSV football'],
      ['norway/football/bodo-glimt.ics', 'Bodø/Glimt football'],
      ['norway/football/viking.ics', 'Viking football'],
      ['portugal/football/porto.ics', 'Porto football'],
      ['portugal/football/sporting-cp.ics', 'Sporting CP football'],
      ['slovakia/football/slovan-bratislava.ics', 'Slovan Bratislava football'],
      ['spain/football/atletico-madrid.ics', 'Atlético Madrid football'],
      ['spain/football/barcelona.ics', 'Barcelona football'],
      ['spain/football/real-betis.ics', 'Real Betis football'],
      ['spain/football/real-madrid.ics', 'Real Madrid football'],
      ['spain/football/villarreal.ics', 'Villarreal football'],
      ['turkiye/football/fenerbahce.ics', 'Fenerbahçe football'],
      ['turkiye/football/galatasaray.ics', 'Galatasaray football'],
      ['ukraine/football/shakhtar-donetsk.ics', 'Shakhtar Donetsk football'],
    ],
  )
  for (const team of teams) {
    assert.match(team.country, /^[a-z]+(-[a-z]+)*$/, team.name)
    assert.match(team.sport, /^[a-z]+$/, team.name)
    assert.match(team.side, /^\p{Lu}[\p{L}\d .'/-]+ men's (national )?(football|basketball) team$/u, team.name) // "Türkiye", "Bodø/Glimt", "Paris Saint-Germain", a club without "national"
  }
  // One feed per country and sport: two entries for one team would write the same files twice.
  assert.equal(new Set(teams.map(feedPath)).size, teams.length)
})

// A club's slug is the last segment of its frozen paths, /{country}/{sport}/{club}.ics and its page.
test('every club has a path slug, its home, a competition of its sport and its country flag', () => {
  const clubs = teams.flatMap((team) => (team.club ? [{ team, club: team.club }] : []))
  assert.ok(clubs.length > 0)
  for (const { team, club } of clubs) {
    assert.match(club.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, team.name)
    for (const fact of [club.name, club.city, club.ground]) assert.ok(fact.trim(), team.name)
    assert.equal(COMPETITIONS[club.competition].sport, team.sport, team.name)
    assert.equal(team.name, / Basket(ball)?$/.test(club.name) ? club.name : `${club.name} ${team.sport}`, team.name) // "Paris Basketball", not "Paris Basketball basketball"
    assert.equal(team.flag, countryOf(team).flag, team.name)
    if (club.crest) assert.ok(existsSync(new URL(`../assets/crests/${club.crest}`, import.meta.url)), `${team.name}: no file assets/crests/${club.crest}`)
  }
  // Two clubs on one slug in one country and sport would write the same page and feeds twice.
  assert.equal(new Set(clubs.map(({ team, club }) => `${team.country}/${team.sport}/${club.slug}`)).size, clubs.length)
})

test('every team has two or three stripe colours and a flag that flag-icons ships', () => {
  for (const team of teams) {
    assert.ok(team.colours.length === 2 || team.colours.length === 3, team.name)
    for (const colour of team.colours) assert.match(colour, /^#[0-9A-F]{6}$/, team.name)
    // The first is the calendar colour, and a white calendar reads as no colour at all.
    assert.notEqual(team.colours[0], '#FFFFFF', team.name)
    assert.match(team.flag, /^[a-z]{2}(-[a-z]{2,3})?$/, team.name)
    assert.ok(existsSync(flagFile(team.flag)), `${team.name}: flag-icons has no flag for the code "${team.flag}"`)
  }
})

// The landing card and the country page draw a country from its first team, so its national teams
// agree. A club keeps its own name and stripes under the country's flag.
test("a country's national teams share its name, stripes and flag", () => {
  const national = teams.filter((team) => !team.club)
  for (const team of national) {
    const first = national.find((other) => other.country === team.country)!
    assert.deepEqual([team.name.replace(/ \w+$/, ''), team.colours, team.flag], [first.name.replace(/ \w+$/, ''), first.colours, first.flag], team.name)
  }
})

test('source ids and codes fit their source, each team its own', () => {
  for (const { source, name } of teams) {
    if (source.kind === 'uefa') {
      assert.ok(Number.isInteger(source.teamId) && source.teamId > 0, name)
    } else if (source.kind === 'fiba') {
      assert.match(source.event, /^fiba-[a-z0-9-]+$/, name)
      assert.match(source.teamCode, /^[A-Z]{3}$/, name)
    } else {
      assert.match(source.season, /^[EU]\d{4}$/, name) // E: EuroLeague, U: EuroCup
      assert.match(source.clubCode, /^[A-Z]{3}$/, name)
    }
  }
  // Two teams on one id would show the same games twice under two names.
  const ids = teams.map(({ source }) =>
    source.kind === 'uefa' ? `uefa ${source.teamId}` : source.kind === 'fiba' ? `${source.event} ${source.teamCode}` : `${source.season} ${source.clubCode}`,
  )
  assert.equal(new Set(ids).size, teams.length)
})

test('hand-kept ticket links are https pages, and no TV line is a guess', () => {
  for (const { defaults, name } of teams) {
    if (defaults.tickets) assert.match(defaults.tickets, /^https:\/\/[^ ]+$/, name)
    if (defaults.tv) assert.match(defaults.tv, /^[^!?]+ \([A-Z][a-z]+ TV\)$/, name)
  }
})

// Runs before every build, so a typo stops the build instead of shipping a sale on the wrong day.
test('hand-kept game details: ticket links are https pages, on-sale days are real YYYY-MM-DD dates', () => {
  for (const [id, { tickets, onSale }] of Object.entries(manual)) {
    if (tickets) assert.match(tickets, /^https:\/\/[^ ]+$/, id)
    if (onSale === undefined) continue
    assert.match(onSale, /^\d{4}-\d{2}-\d{2}$/, id)
    // "2026-02-30" would roll over to 2 March.
    assert.equal(new Date(`${onSale}T00:00:00Z`).toISOString().slice(0, 10), onSale, id)
  }
})
