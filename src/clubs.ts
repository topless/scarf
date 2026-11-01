import type { Sport, Team } from './config.ts'

// docs/brand.md's placeholder stripes, for a club whose kit colours are not known yet.
const KIT_UNKNOWN: Team['colours'] = ['#E6E1D8', '#FBF8F2']

// The clubs: under their countries, below the national teams, and on their competition's page.
// Each names the season its source lists (E2026 is EuroLeague 2026-27, U2026 EuroCup 2026-27); once
// the next season's games are published (July, as a rule), the code moves on. Kit colours marked
// "to confirm" are read off kits, not the club's own brand values. City and ground are the club's
// home as fans name it; a game's own venue, from the source, may differ (a renovation, a final).
// A club playing its home games away from home this season (Shakhtar, the Israeli clubs) takes the
// city and ground of those games, as its card sits next to them, with its own ground in a comment.
// A club with teams in two sports is two entries on one slug (Real Madrid, Barcelona, Bayern,
// Fenerbahçe), which is what links them; two clubs that only share a city name do not share one.
export const clubs: Team[] = [
  // The Greek clubs in the EuroLeague (#113).
  {
    country: 'greece',
    sport: 'basketball',
    // The clubs list of 2026-11-02 names SEF as the club's venue; the season's home games are split,
    // ten there and nine at SUNEL Arena, Athens.
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
  // Every kit colour from here on is from memory of the club's kit, to confirm against its own values;
  // KIT_UNKNOWN where the kit is not known. TV and tickets stay empty until an official page names them.

  // The other 18 of the EuroLeague 2026-27: its clubs list fetched once on 2026-11-02 (E2026, 20
  // clubs), grounds from the season's games of 2026-10-31 (#113).
  euroleague('france', 'fr', 'ASV', { slug: 'asvel', name: 'ASVEL', city: 'Villeurbanne', ground: 'LDLC Arena' }, ['#00573F', '#FFFFFF']), // 5 of 19 at the Astroballe
  euroleague('france', 'fr', 'PRS', { slug: 'paris-basketball', name: 'Paris Basketball', city: 'Paris', ground: 'Adidas Arena' }, ['#000000', '#FFFFFF']),
  euroleague('germany', 'de', 'MUN', { slug: 'bayern-munich', name: 'Bayern Munich', city: 'Munich', ground: 'SAP Garden' }, ['#DC052D', '#FFFFFF']),
  // The clubs list gives the club another venue code (APX, in none of the games), likely its own BJK Akatlar Arena.
  euroleague('turkiye', 'tr', 'BES', { slug: 'besiktas', name: 'Beşiktaş', city: 'Istanbul', ground: 'Turkcell Basketball Development Center' }, ['#000000', '#FFFFFF']),
  euroleague('turkiye', 'tr', 'IST', { slug: 'anadolu-efes', name: 'Anadolu Efes', city: 'Istanbul', ground: 'Turkcell Basketball Development Center' }, ['#003A70', '#FFFFFF']),
  euroleague('turkiye', 'tr', 'ULK', { slug: 'fenerbahce', name: 'Fenerbahçe', city: 'Istanbul', ground: 'Ülker Sports and Event Hall' }, ['#002D72', '#FFED00']),
  // Home games in Sofia this season (two in Botevgrad); its own ground is in Tel Aviv, Menora Mivtachim Arena (to confirm).
  euroleague('israel', 'il', 'HTA', { slug: 'hapoel-tel-aviv', name: 'Hapoel Tel Aviv', city: 'Sofia', ground: 'Arena 8888 Sofia' }, ['#E30613', '#FFFFFF']),
  // Home games in Belgrade this season; its own ground is Menora Mivtachim Arena, Tel Aviv.
  euroleague('israel', 'il', 'TEL', { slug: 'maccabi-tel-aviv', name: 'Maccabi Tel Aviv', city: 'Belgrade', ground: 'Aleksandar Nikolić Hall' }, ['#FFD100', '#003DA5']),
  euroleague('italy', 'it', 'MIL', { slug: 'olimpia-milano', name: 'Olimpia Milano', city: 'Milan', ground: 'Unipol Forum' }, ['#E30613', '#FFFFFF']),
  euroleague('italy', 'it', 'VIR', { slug: 'virtus-bologna', name: 'Virtus Bologna', city: 'Bologna', ground: 'Virtus Arena' }, ['#000000', '#FFFFFF']), // 7 of 19 at the PalaDozza
  euroleague('lithuania', 'lt', 'ZAL', { slug: 'zalgiris', name: 'Žalgiris', city: 'Kaunas', ground: 'Žalgirio Arena' }, ['#006633', '#FFFFFF']),
  euroleague('serbia', 'rs', 'PAR', { slug: 'partizan', name: 'Partizan', city: 'Belgrade', ground: 'Belgrade Arena' }, ['#000000', '#FFFFFF']),
  euroleague('serbia', 'rs', 'RED', { slug: 'crvena-zvezda', name: 'Crvena Zvezda', city: 'Belgrade', ground: 'Belgrade Arena' }, ['#D2001F', '#FFFFFF']),
  euroleague('spain', 'es', 'BAR', { slug: 'barcelona', name: 'Barcelona', city: 'Barcelona', ground: 'Palau Blaugrana' }, ['#004D98', '#A50044']),
  euroleague('spain', 'es', 'BAS', { slug: 'baskonia', name: 'Baskonia', city: 'Vitoria-Gasteiz', ground: 'Buesa Arena' }, ['#002F6C', '#B5121B']),
  euroleague('spain', 'es', 'MAD', { slug: 'real-madrid', name: 'Real Madrid', city: 'Madrid', ground: 'Movistar Arena' }, ['#00529F', '#FFFFFF']), // a white kit: the crest's blue first
  euroleague('spain', 'es', 'PAM', { slug: 'valencia-basket', name: 'Valencia Basket', city: 'Valencia', ground: 'Roig Arena' }, ['#EB6608', '#000000']),
  euroleague('united-arab-emirates', 'ae', 'DUB', { slug: 'dubai-basketball', name: 'Dubai Basketball', city: 'Dubai', ground: 'Coca-Cola Arena' }, KIT_UNKNOWN),

  // The EuroCup 2026-27 (#115): its four groups of eight, from the season's games fetched once on
  // 2026-11-02 (U2026). Grounds are where each club plays its home games in them.
  eurocup('bosnia-and-herzegovina', 'ba', 'BOS', { slug: 'bosna', name: 'Bosna', city: 'Sarajevo', ground: 'Zetra Olympic Hall' }, KIT_UNKNOWN),
  eurocup('bulgaria', 'bg', 'BLK', { slug: 'balkan-botevgrad', name: 'Balkan Botevgrad', city: 'Botevgrad', ground: 'Arena Botevgrad' }, KIT_UNKNOWN),
  eurocup('england', 'gb-eng', 'LLI', { slug: 'london-lions', name: 'London Lions', city: 'London', ground: 'Copper Box Arena' }, KIT_UNKNOWN),
  eurocup('france', 'fr', 'BOU', { slug: 'jl-bourg', name: 'JL Bourg', city: 'Bourg-en-Bresse', ground: 'Ekinox' }, KIT_UNKNOWN),
  eurocup('france', 'fr', 'LEM', { slug: 'le-mans-sarthe', name: 'Le Mans Sarthe', city: 'Le Mans', ground: 'Antarès' }, KIT_UNKNOWN),
  eurocup('germany', 'de', 'FRA', { slug: 'skyliners-frankfurt', name: 'Skyliners Frankfurt', city: 'Frankfurt', ground: 'Süwag Energie Arena' }, KIT_UNKNOWN),
  eurocup('germany', 'de', 'NIN', { slug: 'niners-chemnitz', name: 'Niners Chemnitz', city: 'Chemnitz', ground: 'Messe Chemnitz' }, KIT_UNKNOWN),
  eurocup('germany', 'de', 'RTK', { slug: 'rostock-seawolves', name: 'Rostock Seawolves', city: 'Rostock', ground: 'Stadthalle Rostock' }, KIT_UNKNOWN),
  eurocup('germany', 'de', 'ULM', { slug: 'ulm', name: 'Ulm', city: 'Ulm', ground: 'ratiopharm arena' }, ['#F28C00', '#FFFFFF']),
  eurocup('greece', 'gr', 'ARI', { slug: 'aris', name: 'Aris', city: 'Thessaloniki', ground: 'Alexandreio Melathron' }, ['#FFD700', '#000000']),
  eurocup('greece', 'gr', 'PAO', { slug: 'paok', name: 'PAOK', city: 'Thessaloniki', ground: 'PAOK Sports Arena' }, ['#000000', '#FFFFFF']),
  // Home games in Belgrade this season; its own ground is Pais Arena, Jerusalem (to confirm).
  eurocup('israel', 'il', 'JER', { slug: 'hapoel-jerusalem', name: 'Hapoel Jerusalem', city: 'Belgrade', ground: 'Ranko Žeravica Sports Hall' }, ['#E30613', '#FFFFFF']),
  eurocup('italy', 'it', 'BCR', { slug: 'roma-basketball', name: 'Roma Basketball', city: 'Rome', ground: 'Palazzetto dello Sport' }, KIT_UNKNOWN),
  eurocup('italy', 'it', 'MRO', { slug: 'maxima-roma', name: 'Maxima Roma', city: 'Rome', ground: 'Palazzetto dello Sport' }, KIT_UNKNOWN), // 2 of 7 at the PalaEUR
  eurocup('italy', 'it', 'NAP', { slug: 'napoli-basketball', name: 'Napoli Basketball', city: 'Naples', ground: 'Alcott Arena' }, ['#12A0D7', '#FFFFFF']),
  eurocup('italy', 'it', 'TRN', { slug: 'trento', name: 'Trento', city: 'Trento', ground: 'BTS Arena' }, KIT_UNKNOWN),
  eurocup('italy', 'it', 'TRT', { slug: 'derthona', name: 'Derthona', city: 'Tortona', ground: 'Nova Arena' }, KIT_UNKNOWN),
  eurocup('italy', 'it', 'VNC', { slug: 'reyer-venezia', name: 'Reyer Venezia', city: 'Venice', ground: 'Palasport Taliercio' }, ['#7C1E2B', '#E3A71C']),
  eurocup('latvia', 'lv', 'RIG', { slug: 'riga-zelli', name: 'Riga Zelli', city: 'Riga', ground: 'Xiaomi Arena' }, KIT_UNKNOWN),
  eurocup('lithuania', 'lt', 'KLA', { slug: 'neptunas', name: 'Neptūnas', city: 'Klaipėda', ground: 'Švyturio Arena' }, ['#00539F', '#FFFFFF']),
  eurocup('lithuania', 'lt', 'LKB', { slug: 'lietkabelis', name: 'Lietkabelis', city: 'Panevėžys', ground: 'Kalnapilio Arena' }, KIT_UNKNOWN),
  eurocup('lithuania', 'lt', 'SIA', { slug: 'siauliai', name: 'Šiauliai', city: 'Šiauliai', ground: 'Šiaulių Arena' }, KIT_UNKNOWN),
  eurocup('montenegro', 'me', 'BUD', { slug: 'buducnost', name: 'Budućnost', city: 'Podgorica', ground: 'Morača Sports Center' }, ['#0055A5', '#FFFFFF']),
  eurocup('poland', 'pl', 'WRO', { slug: 'slask-wroclaw', name: 'Śląsk Wrocław', city: 'Wrocław', ground: 'Hala Orbita' }, ['#00843D', '#FFFFFF']),
  eurocup('romania', 'ro', 'CLU', { slug: 'u-cluj', name: 'U Cluj', city: 'Cluj-Napoca', ground: 'BT Arena' }, ['#000000', '#FFFFFF']),
  eurocup('slovenia', 'si', 'LJU', { slug: 'cedevita-olimpija', name: 'Cedevita Olimpija', city: 'Ljubljana', ground: 'Arena Stožice' }, KIT_UNKNOWN),
  eurocup('spain', 'es', 'BGS', { slug: 'san-pablo-burgos', name: 'San Pablo Burgos', city: 'Burgos', ground: 'Coliseum Burgos' }, KIT_UNKNOWN),
  eurocup('spain', 'es', 'MAN', { slug: 'manresa', name: 'Manresa', city: 'Manresa', ground: 'Pavelló Nou Congost' }, KIT_UNKNOWN),
  eurocup('spain', 'es', 'TNF', { slug: 'la-laguna-tenerife', name: 'La Laguna Tenerife', city: 'La Laguna', ground: 'Pabellón Santiago Martín' }, KIT_UNKNOWN),
  eurocup('turkiye', 'tr', 'BAH', { slug: 'bahcesehir-koleji', name: 'Bahçeşehir Koleji', city: 'Istanbul', ground: 'Sinan Erdem Dome' }, KIT_UNKNOWN),
  eurocup('turkiye', 'tr', 'BUR', { slug: 'tofas', name: 'Tofaş', city: 'Bursa', ground: 'Tofaş Sports Hall' }, ['#0055A5', '#FFFFFF']),
  eurocup('turkiye', 'tr', 'TTK', { slug: 'turk-telekom', name: 'Türk Telekom', city: 'Ankara', ground: 'Ankara Sports Hall' }, KIT_UNKNOWN),

  // The Champions League 2026-27 (#131): the 36 clubs of its league phase, as a match's group.teams
  // listed them in the probe of 2026-11-02, by UEFA team id. Grounds as each club calls its own; UEFA's
  // matches name them without sponsors ("Arsenal Stadium").
  championsLeague('austria', 'at', 63405, { slug: 'lask', name: 'LASK', city: 'Linz', ground: 'Raiffeisen Arena' }, ['#000000', '#FFFFFF']),
  championsLeague('azerbaijan', 'az', 2609356, { slug: 'sabah', name: 'Sabah', city: 'Baku', ground: 'Baku Olympic Stadium' }, KIT_UNKNOWN), // every European home game there
  championsLeague('belgium', 'be', 50043, { slug: 'club-brugge', name: 'Club Brugge', city: 'Bruges', ground: 'Jan Breydelstadion' }, ['#0067CE', '#000000']),
  championsLeague('czechia', 'cz', 52498, { slug: 'slavia-praha', name: 'Slavia Praha', city: 'Prague', ground: 'Fortuna Arena' }, ['#E30613', '#FFFFFF']),
  championsLeague('england', 'gb-eng', 52280, { slug: 'arsenal', name: 'Arsenal', city: 'London', ground: 'Emirates Stadium' }, ['#EF0107', '#FFFFFF']),
  championsLeague('england', 'gb-eng', 52683, { slug: 'aston-villa', name: 'Aston Villa', city: 'Birmingham', ground: 'Villa Park' }, ['#670E36', '#95BFE5']),
  championsLeague('england', 'gb-eng', 7889, { slug: 'liverpool', name: 'Liverpool', city: 'Liverpool', ground: 'Anfield' }, ['#C8102E', '#FFFFFF']),
  championsLeague('england', 'gb-eng', 52919, { slug: 'manchester-city', name: 'Manchester City', city: 'Manchester', ground: 'Etihad Stadium' }, ['#6CABDD', '#FFFFFF']),
  championsLeague('england', 'gb-eng', 52682, { slug: 'manchester-united', name: 'Manchester United', city: 'Manchester', ground: 'Old Trafford' }, ['#DA291C', '#FFFFFF']),
  championsLeague('france', 'fr', 52277, { slug: 'lens', name: 'Lens', city: 'Lens', ground: 'Stade Bollaert-Delelis' }, ['#FFD100', '#E30613']), // UEFA's city is "Lens Agglo"
  championsLeague('france', 'fr', 75797, { slug: 'lille', name: 'Lille', city: 'Lille', ground: 'Decathlon Arena Stade Pierre-Mauroy' }, ['#E01E13', '#20325F']),
  championsLeague('france', 'fr', 52747, { slug: 'paris-saint-germain', name: 'Paris Saint-Germain', city: 'Paris', ground: 'Parc des Princes' }, ['#004170', '#DA291C']),
  championsLeague('germany', 'de', 50037, { slug: 'bayern-munich', name: 'Bayern Munich', city: 'Munich', ground: 'Allianz Arena' }, ['#DC052D', '#FFFFFF']),
  championsLeague('germany', 'de', 52758, { slug: 'borussia-dortmund', name: 'Borussia Dortmund', city: 'Dortmund', ground: 'Signal Iduna Park' }, ['#FDE100', '#000000']),
  championsLeague('germany', 'de', 2603790, { slug: 'rb-leipzig', name: 'RB Leipzig', city: 'Leipzig', ground: 'Red Bull Arena' }, ['#DD0741', '#FFFFFF']),
  championsLeague('germany', 'de', 50107, { slug: 'vfb-stuttgart', name: 'VfB Stuttgart', city: 'Stuttgart', ground: 'MHP Arena' }, ['#E32219', '#FFFFFF']),
  championsLeague('greece', 'gr', 50129, { slug: 'aek-athens', name: 'AEK Athens', city: 'Athens', ground: 'OPAP Arena' }, ['#FFD700', '#000000']),
  championsLeague('italy', 'it', 79946, { slug: 'como', name: 'Como', city: 'Como', ground: 'Stadio Giuseppe Sinigaglia' }, ['#1C5BA4', '#FFFFFF']),
  championsLeague('italy', 'it', 50138, { slug: 'inter', name: 'Inter', city: 'Milan', ground: 'San Siro' }, ['#0068A8', '#000000']),
  championsLeague('italy', 'it', 50136, { slug: 'napoli', name: 'Napoli', city: 'Naples', ground: 'Stadio Diego Armando Maradona' }, ['#12A0D7', '#FFFFFF']),
  championsLeague('italy', 'it', 50137, { slug: 'roma', name: 'Roma', city: 'Rome', ground: 'Stadio Olimpico' }, ['#8E1F2F', '#F0BC42']),
  championsLeague('netherlands', 'nl', 52749, { slug: 'feyenoord', name: 'Feyenoord', city: 'Rotterdam', ground: 'De Kuip' }, ['#E30613', '#FFFFFF']),
  championsLeague('netherlands', 'nl', 50062, { slug: 'psv', name: 'PSV', city: 'Eindhoven', ground: 'Philips Stadion' }, ['#ED1C24', '#FFFFFF']),
  championsLeague('norway', 'no', 59333, { slug: 'bodo-glimt', name: 'Bodø/Glimt', city: 'Bodø', ground: 'Aspmyra Stadion' }, ['#FFD700', '#000000']),
  championsLeague('norway', 'no', 52319, { slug: 'viking', name: 'Viking', city: 'Stavanger', ground: 'SR-Bank Arena' }, ['#00205B', '#FFFFFF']),
  championsLeague('portugal', 'pt', 50064, { slug: 'porto', name: 'Porto', city: 'Porto', ground: 'Estádio do Dragão' }, ['#003893', '#FFFFFF']),
  championsLeague('portugal', 'pt', 50149, { slug: 'sporting-cp', name: 'Sporting CP', city: 'Lisbon', ground: 'Estádio José Alvalade' }, ['#008057', '#FFFFFF']),
  championsLeague('slovakia', 'sk', 52797, { slug: 'slovan-bratislava', name: 'Slovan Bratislava', city: 'Bratislava', ground: 'Tehelné pole' }, ['#7AB2E1', '#FFFFFF']),
  championsLeague('spain', 'es', 50124, { slug: 'atletico-madrid', name: 'Atlético Madrid', city: 'Madrid', ground: 'Riyadh Air Metropolitano' }, ['#CB3524', '#FFFFFF']),
  championsLeague('spain', 'es', 50080, { slug: 'barcelona', name: 'Barcelona', city: 'Barcelona', ground: 'Spotify Camp Nou' }, ['#004D98', '#A50044']),
  // Its own ground, the Benito Villamarín, is being rebuilt: the club plays its home games across Seville.
  championsLeague('spain', 'es', 52265, { slug: 'real-betis', name: 'Real Betis', city: 'Seville', ground: 'Estadio La Cartuja de Sevilla' }, ['#00954C', '#FFFFFF']),
  championsLeague('spain', 'es', 50051, { slug: 'real-madrid', name: 'Real Madrid', city: 'Madrid', ground: 'Estadio Santiago Bernabéu' }, ['#00529F', '#FFFFFF']), // as for basketball
  championsLeague('spain', 'es', 70691, { slug: 'villarreal', name: 'Villarreal', city: 'Villarreal', ground: 'Estadio de la Cerámica' }, ['#FFE114', '#005187']),
  // The sponsor's name for it is longer: Chobani Stadyumu Fenerbahçe Şükrü Saracoğlu Spor Kompleksi.
  championsLeague('turkiye', 'tr', 52692, { slug: 'fenerbahce', name: 'Fenerbahçe', city: 'Istanbul', ground: 'Şükrü Saracoğlu Stadium' }, ['#002D72', '#FFED00']),
  championsLeague('turkiye', 'tr', 50067, { slug: 'galatasaray', name: 'Galatasaray', city: 'Istanbul', ground: 'RAMS Park' }, ['#A90432', '#FDB912']),
  // Home games in London this season; its own ground is the Donbass Arena, Donetsk, where it has not played since 2014.
  championsLeague('ukraine', 'ua', 52707, { slug: 'shakhtar-donetsk', name: 'Shakhtar Donetsk', city: 'London', ground: 'Stamford Bridge' }, ['#F26522', '#000000']),
]

// A club's team. Its name is the club's and the sport's ("Olympiacos basketball"), or the club's alone
// when that already says basketball ("Paris Basketball", "Valencia Basket").
function team(country: Team['country'], flag: string, sport: Sport, club: NonNullable<Team['club']>, colours: Team['colours'], source: Team['source']): Team {
  const name = / Basket(ball)?$/.test(club.name) ? club.name : `${club.name} ${sport}`
  return { country, sport, club, name, side: `${club.name} men's ${sport} team`, colours, flag, source, defaults: {} }
}
type Club = Omit<NonNullable<Team['club']>, 'competition'>
function euroleague(country: Team['country'], flag: string, clubCode: string, club: Club, colours: Team['colours']): Team {
  return team(country, flag, 'basketball', { ...club, competition: 'euroleague' }, colours, { kind: 'euroleague', season: 'E2026', clubCode })
}
function eurocup(country: Team['country'], flag: string, clubCode: string, club: Club, colours: Team['colours']): Team {
  return team(country, flag, 'basketball', { ...club, competition: 'eurocup' }, colours, { kind: 'euroleague', season: 'U2026', clubCode })
}
function championsLeague(country: Team['country'], flag: string, teamId: number, club: Club, colours: Team['colours']): Team {
  return team(country, flag, 'football', { ...club, competition: 'champions-league' }, colours, { kind: 'uefa', teamId })
}
