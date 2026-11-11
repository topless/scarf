import type { Competition, Sport, Team } from './config.ts'

// The home broadcaster of each competition in each club's country (#172), a club's TV line unless it
// names its own. Missing: no source names one (EuroCup: Bulgaria, England, France, Israel, Latvia,
// Romania).
// Champions League 2026-27: UEFA's "Where to watch" list of 2026-11-04, highlights-only channels left
// out, with the brand fans know where UEFA names the company (Belgium, Greece, Spain):
// https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-uefa-champions-league-tv-channels-live-streams/
const CLUB_TV: Record<Competition, Partial<Record<Team['country'], string>>> = {
  'champions-league': {
    austria: 'Sky Austria, Canal+ (Austrian TV)',
    azerbaijan: 'CBC Sport, TVNet, İçtimai TV (Azerbaijani TV)',
    belgium: 'VTM, RTL, Pickx, Play Sports (Belgian TV)', // DPG Media, RTL, Proximus, Telenet
    czechia: 'TV Nova (Czech TV)',
    england: 'TNT Sports, Amazon Prime Video (British TV)',
    france: 'Canal+ (French TV)',
    germany: 'DAZN, Amazon Prime Video (German TV)',
    greece: 'Mega, MagentaTV (Greek TV)', // Alter Ego (Mega) free-to-air for 2024-27, sportcal.com
    italy: 'Sky, Amazon Prime Video (Italian TV)',
    netherlands: 'Ziggo Sport (Dutch TV)',
    norway: 'TV 2 (Norwegian TV)',
    portugal: 'Sport TV, DAZN, LiveMode (Portuguese TV)',
    slovakia: 'TV Nova (Slovak TV)',
    spain: 'Movistar Plus+ (Spanish TV)', // Telefónica
    turkiye: 'TRT (Turkish TV)',
    ukraine: 'Megogo (Ukrainian TV)',
  },
  // EuroLeague Basketball's and the broadcasters' rights deals covering 2026-27.
  euroleague: {
    france: 'beIN Sports (French TV)', // https://www.eurohoops.net/en/euroleague/2004140/bein-sports-to-broadcast-euroleague-in-france/
    germany: 'MagentaSport (German TV)', // https://www.euroleaguebasketball.net/news/euroleague-basketball-and-deutsche-telekom-extend-partnership-for-three-more-seasons
    israel: 'Sport 5 (Israeli TV)', // https://www.eurohoops.net/en/euroleague/1813203/euroleague-extends-broadcast-deal-with-israels-sports-channel/
    italy: 'Sky Sport (Italian TV)', // https://www.euroleaguebasketball.net/news/sky-italia-to-exclusively-broadcast-euroleague-basketball-competitions-until-2028
    lithuania: 'Go3 (Lithuanian TV)', // https://www.tv3.lt/gaires/zalgiriu
    serbia: 'Sport Klub (Serbian TV)', // https://n1info.rs/english/news/euroleague-basketball-and-united-media-extend-nova-and-sportklub-partnerships/
    spain: 'Movistar Plus+ (Spanish TV)', // https://www.euroleaguebasketball.net/news/movistar-plus-and-euroleague-extend-broadcast-partnership-until-2031
    turkiye: 'S Sport (Turkish TV)', // https://eurohoops.net/en/euroleague/1796547/saran-media-and-euroleague-basketball-extend-media-rights-partnership-for-four-more-years
    'united-arab-emirates': 'Dubai Sports (Emirati TV)', // https://www.euroleaguebasketball.net/news/dubai-media-secures-landmark-broadcast-agreement-to-air-euroleague-across-the-mena-region
  },
  // The same deals, most of which carry the EuroCup too.
  eurocup: {
    'bosnia-and-herzegovina': 'Sport Klub (Bosnian TV)', // the Adriatic deal, n1info.rs above
    germany: 'MagentaSport (German TV)',
    greece: 'Novasports (Greek TV)', // the Greek deal, n1info.rs above
    italy: 'Sky Sport (Italian TV)',
    lithuania: 'Go3 (Lithuanian TV)', // https://www.tv3.lt/rubrika/naujienos/sportas/krepsinis/europos-taure
    montenegro: 'Sport Klub (Montenegrin TV)',
    poland: 'Polsat Sport (Polish TV)', // Śląsk v Budućnost on Polsat Sport 2: https://www.wroclaw.pl/sport/prezentacja-pergola-slask-budnocost-podgorica-transmisja
    slovenia: 'Sport Klub (Slovenian TV)',
    spain: 'Movistar Plus+ (Spanish TV)',
    turkiye: 'S Sport (Turkish TV)',
  },
}

// The clubs: under their countries, below the national teams, and on their competition's page.
// Each names the season its source lists (E2026 is EuroLeague 2026-27, U2026 EuroCup 2026-27); once
// the next season's games are published (July, as a rule), the code moves on. Kit colours: the first
// is the colour fans call the club's own (never white), the second its partner; each line names its
// source and the day it was read. The hex is sampled from the club's crest in assets/crests (the
// club's own mark, as UEFA and EuroLeague Basketball supply it) unless the line says it was read off
// a kit photo or the club's site; the pair and its order come from the page the line names (the
// Wikipedia infobox or text of the club, a kit launch, the press). City and ground are the club's
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
    club: { slug: 'olympiacos', name: 'Olympiacos', city: 'Piraeus', ground: 'Peace and Friendship Stadium', competition: 'euroleague', crest: 'olympiacos-basketball.png' },
    name: 'Olympiacos basketball',
    side: "Olympiacos men's basketball team",
    colours: ['#D30D24', '#FFFFFF'], // Wikipedia "Red, White", crest, 2026-11-02
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
    club: { slug: 'panathinaikos', name: 'Panathinaikos', city: 'Athens', ground: 'Telekom Center Athens', competition: 'euroleague', crest: 'panathinaikos-basketball.png' },
    name: 'Panathinaikos basketball',
    side: "Panathinaikos men's basketball team",
    colours: ['#016A41', '#FFFFFF'], // Wikipedia "Green, White", crest, 2026-11-02
    flag: 'gr',
    source: { kind: 'euroleague', season: 'E2026', clubCode: 'PAN' },
    defaults: {
      tv: 'Novasports (Greek TV)', // as for Olympiacos above
      // The club's "Match tickets" link on paobc.gr (checked 2026-10-31).
      tickets: 'https://paobc.more.com/gr-el/tickets/',
    },
  },
  // Tickets stay empty from here on until an official page names them; TV is CLUB_TV's.

  // The other 18 of the EuroLeague 2026-27: its clubs list fetched once on 2026-11-02 (E2026, 20
  // clubs), grounds from the season's games of 2026-10-31 (#113).
  euroleague('france', 'fr', 'ASV', { slug: 'asvel', name: 'ASVEL', city: 'Villeurbanne', ground: 'LDLC Arena' }, ['#232323', '#FFFFFF']), // crest; the new logo drops the green, black and white (lyoncapitale.fr, Wikipedia); 5 of 19 at the Astroballe, 2026-11-02
  euroleague('france', 'fr', 'PRS', { slug: 'paris-basketball', name: 'Paris Basketball', city: 'Paris', ground: 'Adidas Arena' }, ['#000000', '#FFFFFF']), // crest only (black and white); no page names the 2026-27 kit, 2026-11-02
  euroleague('germany', 'de', 'MUN', { slug: 'bayern-munich', name: 'Bayern Munich', city: 'Munich', ground: 'SAP Garden' }, ['#ED0135', '#FFFFFF']), // Wikipedia "Red, white", crest, 2026-11-02
  // The clubs list gives the club another venue code (APX, in none of the games); ticket listings put its home games at Akatlar Sports Hall, the games list names the Turkcell centre, kept.
  euroleague('turkiye', 'tr', 'BES', { slug: 'besiktas', name: 'Beşiktaş', city: 'Istanbul', ground: 'Turkcell Basketball Development Center' }, ['#000000', '#FFFFFF']), // crest; the "siyah-beyazlılar" (aspor.com.tr, 2026-06-26), 2026-11-02
  euroleague('turkiye', 'tr', 'IST', { slug: 'anadolu-efes', name: 'Anadolu Efes', city: 'Istanbul', ground: 'Turkcell Basketball Development Center' }, ['#092D74', '#FFFFFF']), // Wikipedia "Navy, white, red, light blue", crest, 2026-11-02
  euroleague('turkiye', 'tr', 'ULK', { slug: 'fenerbahce', name: 'Fenerbahçe', city: 'Istanbul', ground: 'Ülker Sports and Event Hall' }, ['#193353', '#F6E336']), // Wikipedia "Yellow, navy blue", crest, 2026-11-02
  // Home games in Sofia this season (two in Botevgrad; eurohoops.net, 2026-11-02); its own ground is Menora Mivtachim Arena, Tel Aviv (Wikipedia).
  euroleague('israel', 'il', 'HTA', { slug: 'hapoel-tel-aviv', name: 'Hapoel Tel Aviv', city: 'Sofia', ground: 'Arena 8888 Sofia' }, ['#D71921', '#FFFFFF']), // Wikipedia "Red, White", crest, 2026-11-02
  // Home games in Belgrade this season; its own ground is Menora Mivtachim Arena, Tel Aviv.
  euroleague('israel', 'il', 'TEL', { slug: 'maccabi-tel-aviv', name: 'Maccabi Tel Aviv', city: 'Belgrade', ground: 'Aleksandar Nikolić Hall' }, ['#F7D036', '#223B79']), // Wikipedia "Yellow, Blue", crest, 2026-11-02
  euroleague('italy', 'it', 'MIL', { slug: 'olimpia-milano', name: 'Olimpia Milano', city: 'Milan', ground: 'Unipol Forum' }, ['#AC1B2E', '#FFFFFF']), // Wikipedia "White, red", crest, 2026-11-02
  euroleague('italy', 'it', 'VIR', { slug: 'virtus-bologna', name: 'Virtus Bologna', city: 'Bologna', ground: 'Virtus Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "White, black", crest; 7 of 19 at the PalaDozza, 2026-11-02
  euroleague('lithuania', 'lt', 'ZAL', { slug: 'zalgiris', name: 'Žalgiris', city: 'Kaunas', ground: 'Žalgirio Arena' }, ['#00803F', '#FFFFFF']), // Wikipedia "Dartmouth green, white", crest, 2026-11-02
  euroleague('serbia', 'rs', 'PAR', { slug: 'partizan', name: 'Partizan', city: 'Belgrade', ground: 'Belgrade Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "Black and White", crest, 2026-11-02
  euroleague('serbia', 'rs', 'RED', { slug: 'crvena-zvezda', name: 'Crvena Zvezda', city: 'Belgrade', ground: 'Belgrade Arena' }, ['#E10816', '#FFFFFF']), // Wikipedia "Red, white", crest, 2026-11-02
  euroleague('spain', 'es', 'BAR', { slug: 'barcelona', name: 'Barcelona', city: 'Barcelona', ground: 'Palau Blaugrana' }, ['#004998', '#A40344']), // crest; blue and garnet (Wikipedia), as for football, 2026-11-02
  euroleague('spain', 'es', 'BAS', { slug: 'baskonia', name: 'Baskonia', city: 'Vitoria-Gasteiz', ground: 'Buesa Arena' }, ['#0B213F', '#B9132D']), // crest; the azulgrana home kit of 2026-27 (gasteizhoy.com, about.macron.com), 2026-11-02
  euroleague('spain', 'es', 'MAD', { slug: 'real-madrid', name: 'Real Madrid', city: 'Madrid', ground: 'Movistar Arena' }, ['#0351A0', '#FFFFFF']), // a white kit (Wikipedia football), the crest's blue first, 2026-11-02
  euroleague('spain', 'es', 'PAM', { slug: 'valencia-basket', name: 'Valencia Basket', city: 'Valencia', ground: 'Roig Arena' }, ['#EE6C23', '#191B1A']), // Wikipedia "Orange and Black", crest, 2026-11-02
  euroleague('united-arab-emirates', 'ae', 'DUB', { slug: 'dubai-basketball', name: 'Dubai Basketball', city: 'Dubai', ground: 'Coca-Cola Arena' }, ['#000000', '#C7B190']), // 2026-27 jerseys read off the club's photo, black with sand trim (gulfnews.com, 2026-09-14), 2026-11-02

  // The EuroCup 2026-27 (#115): its four groups of eight, from the season's games fetched once on
  // 2026-11-02 (U2026). Grounds are where each club plays its home games in them.
  eurocup('bosnia-and-herzegovina', 'ba', 'BOS', { slug: 'bosna', name: 'Bosna', city: 'Sarajevo', ground: 'Zetra Olympic Hall' }, ['#6B0512', '#FFFFFF']), // Wikipedia "Maroon, white", crest, 2026-11-02
  eurocup('bulgaria', 'bg', 'BLK', { slug: 'balkan-botevgrad', name: 'Balkan Botevgrad', city: 'Botevgrad', ground: 'Arena Botevgrad' }, ['#018C3B', '#FFFFFF']), // Wikipedia "Green, White", crest, 2026-11-02
  eurocup('england', 'gb-eng', 'LLI', { slug: 'london-lions', name: 'London Lions', city: 'London', ground: 'Copper Box Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "Black, white, red, grey", crest, 2026-11-02
  eurocup('france', 'fr', 'BOU', { slug: 'jl-bourg', name: 'JL Bourg', city: 'Bourg-en-Bresse', ground: 'Ekinox' }, ['#DA0A1D', '#FFFFFF']), // Wikipedia "Red, white", crest, 2026-11-02
  eurocup('france', 'fr', 'LEM', { slug: 'le-mans-sarthe', name: 'Le Mans Sarthe', city: 'Le Mans', ground: 'Antarès' }, ['#FF341D', '#FFFFFF']), // Wikipedia "Orange, Grey, White", crest; the crest's orange is a red-orange, 2026-11-02
  eurocup('germany', 'de', 'FRA', { slug: 'skyliners-frankfurt', name: 'Skyliners Frankfurt', city: 'Frankfurt', ground: 'Süwag Energie Arena' }, ['#02529A', '#FFFFFF']), // Wikipedia "Blue, sky blue, white", crest, 2026-11-02
  eurocup('germany', 'de', 'NIN', { slug: 'niners-chemnitz', name: 'Niners Chemnitz', city: 'Chemnitz', ground: 'Messe Chemnitz' }, ['#EB7404', '#9F172F']), // Wikipedia "Orange, red, white", crest, 2026-11-02
  eurocup('germany', 'de', 'RTK', { slug: 'rostock-seawolves', name: 'Rostock Seawolves', city: 'Rostock', ground: 'Stadthalle Rostock' }, ['#1A2F63', '#F59C02']), // Wikipedia "Navy blue, light blue, orange, white", crest, 2026-11-02
  eurocup('germany', 'de', 'ULM', { slug: 'ulm', name: 'Ulm', city: 'Ulm', ground: 'ratiopharm arena' }, ['#EF7408', '#000000']), // Wikipedia "Black, white, orange", crest, 2026-11-02
  eurocup('greece', 'gr', 'ARI', { slug: 'aris', name: 'Aris', city: 'Thessaloniki', ground: 'Alexandreio Melathron' }, ['#F7CD1A', '#000000']), // Wikipedia "Yellow, Black", crest, 2026-11-02
  eurocup('greece', 'gr', 'PAO', { slug: 'paok', name: 'PAOK', city: 'Thessaloniki', ground: 'PAOK Sports Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "Black, white", crest, 2026-11-02
  // Home games in Belgrade this season (ticket listings; the EuroCup's own notices said so for 2024-25 and 2025-26); its own ground is Pais Arena, Jerusalem (Wikipedia).
  eurocup('israel', 'il', 'JER', { slug: 'hapoel-jerusalem', name: 'Hapoel Jerusalem', city: 'Belgrade', ground: 'Ranko Žeravica Sports Hall' }, ['#D21919', '#282828']), // Wikipedia "Red, Black, White", crest, 2026-11-02
  eurocup('italy', 'it', 'BCR', { slug: 'roma-basketball', name: 'Roma Basketball', city: 'Rome', ground: 'Palazzetto dello Sport' }, ['#B72127', '#EEAF20']), // crest red and gold, the giallorossi of BC Roma (Italian press search); home hall PalaTiziano, 2026-11-02
  eurocup('italy', 'it', 'MRO', { slug: 'maxima-roma', name: 'Maxima Roma', city: 'Rome', ground: 'Palazzetto dello Sport' }, ['#EBAF30', '#FFFFFF']), // crest gold; "oro e bianco" per its fans (Italian press search); 2 of 7 at the PalaEur, which EUR S.p.A. makes its venue, 2026-11-02
  eurocup('italy', 'it', 'NAP', { slug: 'napoli-basketball', name: 'Napoli Basketball', city: 'Naples', ground: 'Alcott Arena' }, ['#0AA3DD', '#19233E']), // Wikipedia "Blue and white", crest azure and navy; the games list names Alcott Arena, Wikipedia the PalaBarbuto, 2026-11-02
  eurocup('italy', 'it', 'TRN', { slug: 'trento', name: 'Trento', city: 'Trento', ground: 'BTS Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "White, black", crest; black first kit (ladige.it), 2026-11-02
  eurocup('italy', 'it', 'TRT', { slug: 'derthona', name: 'Derthona', city: 'Tortona', ground: 'Nova Arena' }, ['#FF7B4B', '#000000']), // derthonabasket.it's own palette (its most used colour), Wikipedia "White, black, orange", Sky Sport 2026-09-01 "red, black, white", 2026-11-02
  eurocup('italy', 'it', 'VNC', { slug: 'reyer-venezia', name: 'Reyer Venezia', city: 'Venice', ground: 'Palasport Taliercio' }, ['#6E0C2E', '#C5A86E']), // Wikipedia "Garnet Red, Gold, White", crest, 2026-11-02
  eurocup('latvia', 'lv', 'RIG', { slug: 'riga-zelli', name: 'Riga Zelli', city: 'Riga', ground: 'Xiaomi Arena' }, ['#FE20FF', '#020067']), // Wikipedia infobox "Pink, blue" with FE20FF, crest, 2026-11-02
  eurocup('lithuania', 'lt', 'KLA', { slug: 'neptunas', name: 'Neptūnas', city: 'Klaipėda', ground: 'Švyturio Arena' }, ['#214094', '#FFFFFF']), // Wikipedia "Blue and white", crest, 2026-11-02
  eurocup('lithuania', 'lt', 'LKB', { slug: 'lietkabelis', name: 'Lietkabelis', city: 'Panevėžys', ground: 'Kalnapilio Arena' }, ['#602630', '#FFFFFF']), // Wikipedia "Burgundy, white, pale gold", crest, 2026-11-02
  eurocup('lithuania', 'lt', 'SIA', { slug: 'siauliai', name: 'Šiauliai', city: 'Šiauliai', ground: 'Šiaulių Arena' }, ['#EFA339', '#000000']), // Wikipedia "Yellow, black", crest, 2026-11-02
  eurocup('montenegro', 'me', 'BUD', { slug: 'buducnost', name: 'Budućnost', city: 'Podgorica', ground: 'Morača Sports Center' }, ['#0F4068', '#FFFFFF']), // Wikipedia "Blue and white", crest, 2026-11-02
  eurocup('poland', 'pl', 'WRO', { slug: 'slask-wroclaw', name: 'Śląsk Wrocław', city: 'Wrocław', ground: 'Hala Orbita' }, ['#4BA15A', '#FFFFFF']), // Wikipedia "Green, white, red", crest, 2026-11-02
  eurocup('romania', 'ro', 'CLU', { slug: 'u-cluj', name: 'U Cluj', city: 'Cluj-Napoca', ground: 'BT Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "White, Black", crest, 2026-11-02
  eurocup('slovenia', 'si', 'LJU', { slug: 'cedevita-olimpija', name: 'Cedevita Olimpija', city: 'Ljubljana', ground: 'Arena Stožice' }, ['#01642D', '#F58232']), // Wikipedia "Green, orange, white", crest, 2026-11-02
  eurocup('spain', 'es', 'BGS', { slug: 'san-pablo-burgos', name: 'San Pablo Burgos', city: 'Burgos', ground: 'Coliseum Burgos' }, ['#1C4C9D', '#EF7718']), // Wikipedia "Blue, white and orange", crest, 2026-11-02
  eurocup('spain', 'es', 'MAN', { slug: 'manresa', name: 'Manresa', city: 'Manresa', ground: 'Pavelló Nou Congost' }, ['#CF1923', '#FFFFFF']), // Wikipedia "Red, blue, white", red and white lead its kits (naciodigital.cat, 2023-24), crest, 2026-11-02
  eurocup('spain', 'es', 'TNF', { slug: 'la-laguna-tenerife', name: 'La Laguna Tenerife', city: 'La Laguna', ground: 'Pabellón Santiago Martín' }, ['#FBC901', '#1B1B1A']), // Wikipedia "Gold, Black", crest, 2026-11-02
  eurocup('turkiye', 'tr', 'BAH', { slug: 'bahcesehir-koleji', name: 'Bahçeşehir Koleji', city: 'Istanbul', ground: 'Sinan Erdem Dome' }, ['#242064', '#ED1921']), // Wikipedia "Navy, Red, White", crest, 2026-11-02
  eurocup('turkiye', 'tr', 'BUR', { slug: 'tofas', name: 'Tofaş', city: 'Bursa', ground: 'Tofaş Sports Hall' }, ['#110D66', '#6EC173']), // Wikipedia "Blue, white, green", crest, 2026-11-02
  eurocup('turkiye', 'tr', 'TTK', { slug: 'turk-telekom', name: 'Türk Telekom', city: 'Ankara', ground: 'Ankara Sports Hall' }, ['#014887', '#02ACDB']), // Wikipedia "Sky Blue, dark Blue, white", crest, 2026-11-02

  // The Champions League 2026-27 (#131): the 36 clubs of its league phase, as a match's group.teams
  // listed them in the probe of 2026-11-02, by UEFA team id. Grounds as each club calls its own; UEFA's
  // matches name them without sponsors ("Arsenal Stadium").
  championsLeague('austria', 'at', 63405, { slug: 'lask', name: 'LASK', city: 'Linz', ground: 'Raiffeisen Arena' }, ['#000000', '#FFFFFF']), // Wikipedia "black and white", crest, 2026-11-02
  championsLeague('azerbaijan', 'az', 2609356, { slug: 'sabah', name: 'Sabah', city: 'Baku', ground: 'Baku Olympic Stadium' }, ['#000000', '#ED5FAF']), // black home kit with pink (footyheadlines.com photo, 2026-08-26), Wikipedia "black-pink", crest; every European home game there, 2026-11-02
  championsLeague('belgium', 'be', 50043, { slug: 'club-brugge', name: 'Club Brugge', city: 'Bruges', ground: 'Jan Breydelstadion' }, ['#1F6EB6', '#000000']), // Wikipedia "blue and black", crest, 2026-11-02
  championsLeague('czechia', 'cz', 52498, { slug: 'slavia-praha', name: 'Slavia Praha', city: 'Prague', ground: 'Fortuna Arena' }, ['#ED1B2F', '#FFFFFF']), // Wikipedia "red and white", crest, 2026-11-02
  championsLeague('england', 'gb-eng', 52280, { slug: 'arsenal', name: 'Arsenal', city: 'London', ground: 'Emirates Stadium' }, ['#E30613', '#FFFFFF']), // Wikipedia "bright red shirts with white sleeves", crest, 2026-11-02
  championsLeague('england', 'gb-eng', 52683, { slug: 'aston-villa', name: 'Aston Villa', city: 'Birmingham', ground: 'Villa Park' }, ['#470323', '#94BEE5']), // Wikipedia "claret shirt with sky blue sleeves", crest, 2026-11-02
  championsLeague('england', 'gb-eng', 7889, { slug: 'liverpool', name: 'Liverpool', city: 'Liverpool', ground: 'Anfield' }, ['#BE0020', '#FFFFFF']), // Wikipedia "all red", crest, 2026-11-02
  championsLeague('england', 'gb-eng', 52919, { slug: 'manchester-city', name: 'Manchester City', city: 'Manchester', ground: 'Etihad Stadium' }, ['#6DADDE', '#FFFFFF']), // Wikipedia "sky blue and white", crest, 2026-11-02
  championsLeague('england', 'gb-eng', 52682, { slug: 'manchester-united', name: 'Manchester United', city: 'Manchester', ground: 'Old Trafford' }, ['#E01B22', '#FFFFFF']), // Wikipedia "red shirts, white shorts", crest, 2026-11-02
  championsLeague('france', 'fr', 52277, { slug: 'lens', name: 'Lens', city: 'Lens', ground: 'Stade Bollaert-Delelis' }, ['#C51315', '#FED500']), // Wikipedia "red and gold", crest; UEFA's city is "Lens Agglo", 2026-11-02
  championsLeague('france', 'fr', 75797, { slug: 'lille', name: 'Lille', city: 'Lille', ground: 'Decathlon Arena Stade Pierre-Mauroy' }, ['#E41B13', '#211E5F']), // Wikipedia "red, white and blue; red the main colour", crest, 2026-11-02
  championsLeague('france', 'fr', 52747, { slug: 'paris-saint-germain', name: 'Paris Saint-Germain', city: 'Paris', ground: 'Parc des Princes' }, ['#014172', '#D60101']), // Wikipedia "red, blue and white", crest, 2026-11-02
  championsLeague('germany', 'de', 50037, { slug: 'bayern-munich', name: 'Bayern Munich', city: 'Munich', ground: 'Allianz Arena' }, ['#ED0136', '#FFFFFF']), // Wikipedia "red and white", crest, 2026-11-02
  championsLeague('germany', 'de', 52758, { slug: 'borussia-dortmund', name: 'Borussia Dortmund', city: 'Dortmund', ground: 'Signal Iduna Park' }, ['#FEF300', '#000000']), // Wikipedia "black and yellow", crest, 2026-11-02
  championsLeague('germany', 'de', 2603790, { slug: 'rb-leipzig', name: 'RB Leipzig', city: 'Leipzig', ground: 'Red Bull Arena' }, ['#E3194B', '#FFFFFF']), // crest only (red, white, navy); Wikipedia names no colours, 2026-11-02
  championsLeague('germany', 'de', 50107, { slug: 'vfb-stuttgart', name: 'VfB Stuttgart', city: 'Stuttgart', ground: 'MHP Arena' }, ['#D30228', '#FFFFFF']), // Wikipedia "white shirt with a horizontal red stripe", crest, 2026-11-02
  championsLeague('greece', 'gr', 50129, { slug: 'aek-athens', name: 'AEK Athens', city: 'Athens', ground: 'Agia Sophia Stadium' }, ['#FED500', '#000000']), // Wikipedia "yellow and black", crest, 2026-11-02
  championsLeague('italy', 'it', 79946, { slug: 'como', name: 'Como', city: 'Como', ground: 'Stadio Giuseppe Sinigaglia' }, ['#095692', '#FFFFFF']), // the 2026-27 home kit photo, royal blue (footyheadlines.com, 2026-04); crest navy, 2026-11-02
  championsLeague('italy', 'it', 50138, { slug: 'inter', name: 'Inter', city: 'Milan', ground: 'San Siro' }, ['#13499F', '#231F20']), // Wikipedia "black-and-blue jerseys", crest, 2026-11-02
  championsLeague('italy', 'it', 50136, { slug: 'napoli', name: 'Napoli', city: 'Naples', ground: 'Stadio Diego Armando Maradona' }, ['#00A7E1', '#FFFFFF']), // Wikipedia "sky blue shirts, white shorts", crest, 2026-11-02
  championsLeague('italy', 'it', 50137, { slug: 'roma', name: 'Roma', city: 'Rome', ground: 'Stadio Olimpico' }, ['#990B29', '#FABA00']), // Wikipedia "carmine red and golden yellow", crest, 2026-11-02
  championsLeague('netherlands', 'nl', 52749, { slug: 'feyenoord', name: 'Feyenoord', city: 'Rotterdam', ground: 'De Kuip' }, ['#FF0101', '#FFFFFF']), // Wikipedia "red and white split down the middle", crest, 2026-11-02
  championsLeague('netherlands', 'nl', 50062, { slug: 'psv', name: 'PSV', city: 'Eindhoven', ground: 'Philips Stadion' }, ['#EC1B23', '#FFFFFF']), // Wikipedia "red and white", crest, 2026-11-02
  championsLeague('norway', 'no', 59333, { slug: 'bodo-glimt', name: 'Bodø/Glimt', city: 'Bodø', ground: 'Aspmyra Stadion' }, ['#FEDF00', '#151415']), // crest only (yellow, black); Wikipedia shows its kit in images, 2026-11-02
  championsLeague('norway', 'no', 52319, { slug: 'viking', name: 'Viking', city: 'Stavanger', ground: 'Lyse Arena' }, ['#1F243F', '#FFFFFF']), // Wikipedia "dark blue", the 2026-27 European shirt photo (footyheadlines.com); the crest's red is its 2022 badge, 2026-11-02
  championsLeague('portugal', 'pt', 50064, { slug: 'porto', name: 'Porto', city: 'Porto', ground: 'Estádio do Dragão' }, ['#02508F', '#FFFFFF']), // Wikipedia "blue and white stripes", crest, 2026-11-02
  championsLeague('portugal', 'pt', 50149, { slug: 'sporting-cp', name: 'Sporting CP', city: 'Lisbon', ground: 'Estádio José Alvalade' }, ['#027F56', '#FFFFFF']), // Wikipedia "green and white striped", crest, 2026-11-02
  championsLeague('slovakia', 'sk', 52797, { slug: 'slovan-bratislava', name: 'Slovan Bratislava', city: 'Bratislava', ground: 'Tehelné pole' }, ['#2DB1E5', '#FFFFFF']), // crest, the "Belasí" (Sky Blues) of Wikipedia, 2026-11-02
  championsLeague('spain', 'es', 50124, { slug: 'atletico-madrid', name: 'Atlético Madrid', city: 'Madrid', ground: 'Riyadh Air Metropolitano' }, ['#E8151E', '#FFFFFF']), // Wikipedia "red and white vertical stripes", crest, 2026-11-02
  championsLeague('spain', 'es', 50080, { slug: 'barcelona', name: 'Barcelona', city: 'Barcelona', ground: 'Spotify Camp Nou' }, ['#004998', '#A40344']), // Wikipedia "dark shades of blue and garnet stripes", crest, 2026-11-02
  // Its own ground, the Benito Villamarín, is being rebuilt: the club plays its home games across Seville.
  championsLeague('spain', 'es', 52265, { slug: 'real-betis', name: 'Real Betis', city: 'Seville', ground: 'Estadio La Cartuja de Sevilla' }, ['#018834', '#FFFFFF']), // Wikipedia "green and white", crest, 2026-11-02
  championsLeague('spain', 'es', 50051, { slug: 'real-madrid', name: 'Real Madrid', city: 'Madrid', ground: 'Estadio Santiago Bernabéu' }, ['#0351A0', '#FFFFFF']), // a white kit (Wikipedia "traditionally worn a white home kit"), the crest's blue first; as for basketball, 2026-11-02
  championsLeague('spain', 'es', 70691, { slug: 'villarreal', name: 'Villarreal', city: 'Villarreal', ground: 'Estadio de la Cerámica' }, ['#FEE76F', '#005186']), // Wikipedia "the club's famous yellow kit", crest, 2026-11-02
  // The sponsor's name for it is longer: Chobani Stadyumu Fenerbahçe Şükrü Saracoğlu Spor Kompleksi.
  championsLeague('turkiye', 'tr', 52692, { slug: 'fenerbahce', name: 'Fenerbahçe', city: 'Istanbul', ground: 'Şükrü Saracoğlu Stadium' }, ['#193353', '#F6E336']), // Wikipedia "yellow and navy blue stripes", crest, 2026-11-02
  championsLeague('turkiye', 'tr', 50067, { slug: 'galatasaray', name: 'Galatasaray', city: 'Istanbul', ground: 'RAMS Park' }, ['#A7092D', '#FBBA01']), // Wikipedia "dark shades of red and yellow", crest, 2026-11-02
  // Home games in London this season; its own ground is the Donbass Arena, Donetsk, where it has not played since 2014.
  championsLeague('ukraine', 'ua', 52707, { slug: 'shakhtar-donetsk', name: 'Shakhtar Donetsk', city: 'London', ground: 'Stamford Bridge' }, ['#FF5701', '#000000']), // Wikipedia "black and orange since 1961", crest, 2026-11-02
]

// A club's team. Its name is the club's and the sport's ("Olympiacos basketball"), or the club's alone
// when that already says basketball ("Paris Basketball", "Valencia Basket").
function team(country: Team['country'], flag: string, sport: Sport, club: NonNullable<Team['club']>, colours: Team['colours'], source: Team['source']): Team {
  const name = / Basket(ball)?$/.test(club.name) ? club.name : `${club.name} ${sport}`
  // The crest file scripts/crests.ts fetches, by convention; the config test checks it is there.
  const tv = CLUB_TV[club.competition][country]
  return { country, sport, club: { crest: `${club.slug}-${sport}.png`, ...club }, name, side: `${club.name} men's ${sport} team`, colours, flag, source, defaults: tv ? { tv } : {} }
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
