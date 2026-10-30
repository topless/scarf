# scarf

Your colours, in your calendar. scarf publishes one subscribable calendar feed per national team:
every game with kickoff, venue, TV channel and ticket link, and a reminder an hour before. Fans
subscribe once, and the calendar they already use keeps itself up to date. Wrapped up in the game.

Teams so far: Greece, Spain and Germany (men's football and basketball), France (men's basketball),
Switzerland and England (men's football). Pick your team at https://scarf.fan.

## Paths

Subscriptions point at these paths, so they are frozen (see [HANDOVER.md](HANDOVER.md)):

- `/{country}/{sport}.ics`: one feed per team, for example `/greece/football.ics` and `/greece/basketball.ics`.
- `/{country}/{sport}-alerts.ics`: the same feed plus an all-day "New game" entry on the day a game is announced,
  for fans who pick "Games and announcements" on the team page.
- `/{country}/{sport}/`: the team's page, for example `/greece/football/`, with its share image at
  `/{country}/{sport}/share.png`.
- `/{country}/`: the country's page listing its teams, for example `/greece/`, with its share image at
  `/{country}/share.png`.
- `/`: the page listing every team.

Each event's `UID` is the source's id (`uefa-…`, `fiba-…`) and never changes, so an updated game
replaces the old entry instead of duplicating it.

## Docs

- [docs/development.md](docs/development.md): how the build works, one-time setup, running it,
  maintaining it by hand, keeping it running and known limits.
- [docs/brand.md](docs/brand.md): the identity.
- [docs/calendar-event-spec.md](docs/calendar-event-spec.md): the exact calendar-event copy.
- [docs/observability.md](docs/observability.md): the plan for counting subscribers, visitors and
  subscribe clicks (#24).
- [docs/research-2026-10-02.md](docs/research-2026-10-02.md): background on the data sources.
- [docs/spike-team-picker.md](docs/spike-team-picker.md): the spike on a team picker and one feed for
  several teams (#17).
- [docs/issues.md](docs/issues.md): the backlog.
- [HANDOVER.md](HANDOVER.md): the design handover, where the identity, the exact calendar-event copy
  and the backlog come from.
