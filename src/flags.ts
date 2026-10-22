import { readFile } from 'node:fs/promises'
import type { Team } from './config.ts'

// Every flag comes from the flag-icons package (MIT, https://github.com/lipis/flag-icons), which
// ships one 4:3 SVG per ISO 3166-1 alpha-2 code plus the sub-national ones a national team can
// need (gb-eng, gb-sct, …). This is the only module that knows where the package keeps them.

// Where a flag is served under the site, so the build and the pages agree on it.
export const flagPath = (code: string): string => `flags/${code}.svg`

// The package's copy of a flag, resolved the way Node would import it.
export const flagFile = (code: string): URL => new URL(import.meta.resolve(`flag-icons/flags/4x3/${code}.svg`))

// The package's licence, which MIT asks to travel with every copy of its flags.
export const flagLicenseFile = (): URL => new URL(import.meta.resolve('flag-icons/LICENSE'))

// A team's flag as SVG text. A code the package has no flag for fails the build, the same policy
// as a failed fetch, instead of a broken image reaching the pages.
export async function readFlag(team: Team): Promise<string> {
  try {
    return await readFile(flagFile(team.flag), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    throw new Error(`${team.name}: flag-icons has no flag for the code "${team.flag}"`)
  }
}
