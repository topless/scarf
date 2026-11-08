# scarf

[![Build feeds](https://github.com/topless/scarf/actions/workflows/publish.yml/badge.svg)](https://github.com/topless/scarf/actions/workflows/publish.yml)
[![Check feeds](https://github.com/topless/scarf/actions/workflows/check-feeds.yml/badge.svg)](https://github.com/topless/scarf/actions/workflows/check-feeds.yml)
[![scarf.fan](https://img.shields.io/website?url=https%3A%2F%2Fscarf.fan&label=scarf.fan)](https://scarf.fan)

Your colours, in your calendar. scarf publishes one subscribable calendar feed per team, national or
club: every game with kickoff, venue, TV channel and ticket link, and a reminder an hour before. Fans
subscribe once, and the calendar they already use keeps itself up to date. Wrapped in the game.

Teams so far: men's football for all 54 UEFA nations in the Nations League, men's basketball for the
24 teams still in the FIBA World Cup 2027 European qualifiers, and the clubs of the three European
competitions: the UEFA Champions League, the EuroLeague and the EuroCup. Pick your team at https://scarf.fan.

- `/{country}/{sport}.ics`, `-alerts.ics` and `/{country}/{sport}/`: a national team's feeds and page.
- `/{country}/{sport}/{club}.ics`, `-alerts.ics` and `/{country}/{sport}/{club}/`: a club's.
- `/{country}/`: a country's national teams and clubs.
- `/{sport}/{competition}/`: a competition's clubs, for example `/basketball/euroleague/`.

Every path, and which ones are frozen: [docs/development.md](docs/development.md), Paths.

The national teams are in [src/config.ts](src/config.ts), the clubs in [src/clubs.ts](src/clubs.ts).

The brand as a browsable design system, with every token, the marks and a live preview per component:
https://claude.ai/artifact/AcsMKUmVFMtBqYnPmt8D3N. Its source is this repository (docs/brand.md).

## Docs

- [docs/development.md](docs/development.md): how the build works, the paths, one-time setup,
  running it, what done means for a feed change, maintaining it by hand, keeping it running and
  known limits.
- [docs/brand.md](docs/brand.md): the identity, where it came from, and the design system built from it.
- [docs/calendar-event-spec.md](docs/calendar-event-spec.md): the exact calendar-event copy.
- [docs/observability.md](docs/observability.md): the plan for counting subscribers, visitors and
  subscribe clicks (#24).
- [docs/research-2026-10-02.md](docs/research-2026-10-02.md): background on the data sources.
- [docs/archive/](docs/archive/): the spikes behind decisions already taken.
- [GitHub issues](https://github.com/topless/scarf/issues): the backlog.
