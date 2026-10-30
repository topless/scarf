// The sources' answers a build used, saved in source-answers/ so that a build on a push to main can
// reuse the day's instead of asking UEFA and FIBA again. The Actions job keeps the folder in its cache
// next to known-games.json. Pure functions; the build reads and writes the files.

// What one saved answer covers, kept by file name in source-answers/index.json. UEFA's one answer
// lists the football teams it was asked for; a FIBA page covers the competition it is named after.
export interface SavedAnswer {
  fetched: string // when a build fetched it, as an ISO instant
  teamIds?: number[]
}

export type SavedAnswers = Record<string, SavedAnswer>

const HOUR = 3_600_000

// A saved answer stands in for a request while it is less than a day old and covers every team the
// request is for: a football team added since means asking UEFA again.
export function reusable(answer: SavedAnswer | undefined, now: Date, teamIds: number[] = []): boolean {
  return answer !== undefined && now.getTime() - Date.parse(answer.fetched) < 24 * HOUR && teamIds.every((id) => answer.teamIds?.includes(id))
}

// For the run summary: " (reused, 3.2 h old)" when saved answers stood in for a source's requests,
// counted when only some did, with the oldest one's age; nothing when the build asked for every one.
// An answer the build fetched itself is dated `now`.
export function reusedNote(answers: SavedAnswer[], now: Date): string {
  const ages = answers.map(({ fetched }) => now.getTime() - Date.parse(fetched)).filter((age) => age !== 0)
  if (ages.length === 0) return ''
  const count = ages.length < answers.length ? `${ages.length} ` : ''
  return ` (${count}reused, ${(Math.max(...ages) / HOUR).toFixed(1)} h old)`
}
