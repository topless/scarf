# scarf

[![Build feeds](https://github.com/topless/scarf/actions/workflows/publish.yml/badge.svg)](https://github.com/topless/scarf/actions/workflows/publish.yml)
[![Check feeds](https://github.com/topless/scarf/actions/workflows/check-feeds.yml/badge.svg)](https://github.com/topless/scarf/actions/workflows/check-feeds.yml)
[![scarf.fan](https://img.shields.io/website?url=https%3A%2F%2Fscarf.fan&label=scarf.fan)](https://scarf.fan)

Your colours, in your calendar. scarf publishes one subscribable calendar feed per national team:
every game with kickoff, venue, TV channel and ticket link, and a reminder an hour before. Fans
subscribe once, and the calendar they already use keeps itself up to date. Wrapped in the game.

Teams so far: men's football for all 54 UEFA nations in the Nations League, and men's basketball for
the 24 teams still in the FIBA World Cup 2027 European qualifiers. Pick your team at https://scarf.fan.

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
