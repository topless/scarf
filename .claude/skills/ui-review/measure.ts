// The measuring half of /ui-review (.claude/skills/ui-review/SKILL.md). Builds the site from the
// fixtures (no source request), serves dist/ on a free port, opens every page kind in headless Chrome at a phone
// and a desktop size, saves the first screen of each and measures what drifts: sideways overflow,
// where the headline starts, red actions on the first screen, the top bar's rows, the page's height,
// the Share button's room, and each component against docs/brand.md. With --base <ref> it builds
// that ref too and prints what changed. Run from the repository root:
//   node .claude/skills/ui-review/measure.ts [--base main]
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

// Tune here. The phone limits apply at PHONE; the Share rule wherever the button is.
const PHONE = { width: 390, height: 844 }
const NARROW = { width: 360, height: 780 } // team pages only: the width the Share button must still fit at
const DESKTOP = { width: 1280, height: 800 }
const LIMIT = { h1Top: 300, pageHeight: 6000, redInView: 1, topBarRows: 1, shareGap: 16, shareLines: 1 }
const PAGES = ['/', '/greece/', '/greece/football/', '/england/football/', '/bosnia-and-herzegovina/football/', '/how-it-works/']
// docs/brand.md, Components: height as [min, max] (inner: without the border, for the stripe band), radius and
// border in px, the card's border in ink. A kind with a height rule must also be one height per page.
const RULES: Record<string, { height?: [number, number]; inner?: [number, number]; radius?: number; border?: number; borderColor?: string }> = {
  '.btn-primary': { height: [52, 56], radius: 12 },
  '.btn-secondary': { height: [44, 48], radius: 12, border: 1.5 },
  '.pill': { height: [44, 44], radius: 999, border: 1.5 },
  '.country-chip': { height: [44, 44], radius: 999, border: 1.5 },
  '.switch a': { height: [40, 40], radius: 999 },
  '.sport-tag': { height: [34, 34], radius: 999, border: 1.5 },
  '.card': { radius: 16, border: 1.5, borderColor: 'rgb(23, 23, 28)' },
  '.card-stripe': { inner: [14, 14] },
  'input[type=text], input[type=search]': { height: [44, 46], radius: 10, border: 1.5 },
  '.row-tickets': { height: [44, 48], radius: 12, border: 1.5 },
}
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = 'dist/ui-review'
const PORT = 8787 // as the Browser pane's "site" entry in .claude/launch.json; the next free port while that server is up

// Runs inside the page. Every number is CSS pixels at load, scrolled to the top.
const MEASURE = `(() => {
  const doc = document.documentElement
  const rect = (el) => el.getBoundingClientRect()
  const shown = (el) => el.getClientRects().length > 0
  const px = (v) => Math.round(parseFloat(v) * 10) / 10
  const brand = rect(document.querySelector('.brand')), nav = rect(document.querySelector('.site-nav'))
  const share = document.querySelector('.share')
  // One line box per distinct top among the button's contents (the icon and the word).
  const lines = (el) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].map((c) => Math.round(c.top))).size }
  // The border width the stylesheet declares (its var() resolved on the element), from the last rule
  // that matches: Chrome draws a 1.5 px border as 1 px and reports 1, so the drawn width cannot tell
  // the brand's 1.5 from a typed 1.
  // shortcut: the last matching rule wins, with no specificity and @media conditions not evaluated; good
  // while no border is set inside a media query or overridden by an earlier, more specific rule.
  const declaredBorder = (el) => {
    let v = ''
    const walk = (rules) => { for (const r of rules) { if (r.selectorText && el.matches(r.selectorText)) v = r.style.borderTopWidth || r.style.borderWidth || r.style.border.split(' ')[0] || v; if (r.cssRules) walk(r.cssRules) } }
    for (const s of document.styleSheets) walk(s.cssRules)
    return v ? px(v.startsWith('var(') ? getComputedStyle(el).getPropertyValue(v.slice(4, -1)) : v) : 0
  }
  const components = {}
  for (const sel of ${JSON.stringify(Object.keys(RULES))}) {
    const seen = new Set()
    for (const el of document.querySelectorAll(sel)) {
      if (!shown(el)) continue
      const s = getComputedStyle(el)
      seen.add(JSON.stringify({ height: px(rect(el).height), inner: el.clientHeight, radius: px(s.borderTopLeftRadius), border: declaredBorder(el), borderColor: s.borderTopColor }))
    }
    components[sel] = [...seen].map((j) => JSON.parse(j))
  }
  return {
    viewport: [innerWidth, innerHeight],
    overflow: doc.scrollWidth - doc.clientWidth,
    pageHeight: doc.scrollHeight,
    h1Top: Math.round(rect(document.querySelector('h1')).top),
    redInView: [...document.querySelectorAll('.btn-primary, .pill-primary')].filter((el) => shown(el) && rect(el).top < innerHeight && rect(el).bottom > 0).length,
    topBarRows: nav.top >= brand.bottom ? 2 : 1,
    share: share && !share.hidden ? { gap: Math.round(innerWidth - rect(share).right), lines: lines(share) } : null,
    components,
  }
})()`

type Size = { width: number; height: number }
type Shot = { page: string; viewport: string; shot: string; m: any }

// Chrome DevTools Protocol over Chrome's own pipe (fds 3 and 4), so nothing is installed.
function launchChrome(profile: string) {
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
  const pending = new Map<number, (msg: any) => void>()
  const waiting: [string, string | undefined, () => void][] = []
  let buffer = ''
  let id = 0
  chrome.stdio[4]!.setEncoding('utf8').on('data', (chunk: string) => {
    buffer += chunk
    for (let end; (end = buffer.indexOf('\0')) >= 0; buffer = buffer.slice(end + 1)) {
      const msg = JSON.parse(buffer.slice(0, end))
      if (msg.id) {
        pending.get(msg.id)?.(msg)
        pending.delete(msg.id)
      } else {
        const i = waiting.findIndex(([method, session]) => method === msg.method && session === msg.sessionId)
        if (i >= 0) waiting.splice(i, 1)[0]![2]()
      }
    }
  })
  const send = (method: string, params = {}, sessionId?: string) =>
    new Promise<any>((resolve, reject) => {
      pending.set(++id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
      chrome.stdio[3]!.write(JSON.stringify({ id, method, params, sessionId }) + '\0')
    })
  const once = (method: string, sessionId: string) => new Promise<void>((resolve) => waiting.push([method, sessionId, resolve]))
  return { chrome, send, once }
}

async function capture(cdp: ReturnType<typeof launchChrome>, url: string, { width, height }: Size, shot: string) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }, sessionId)
  const loaded = cdp.once('Page.loadEventFired', sessionId)
  await cdp.send('Page.navigate', { url }, sessionId)
  await loaded
  await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true }, sessionId)
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true }, sessionId)
  if (exceptionDetails) throw new Error(`${url}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
  writeFileSync(shot, Buffer.from(data, 'base64'))
  await cdp.send('Target.closeTarget', { targetId })
  if (result.value.viewport[0] !== width || result.value.viewport[1] !== height) throw new Error(`${url}: viewport is ${result.value.viewport}, asked ${width}x${height}`)
  return result.value
}

const up = (url: string) => fetch(url).then((r) => r.ok, () => false)

// The first port from start that nothing answers on: a server already there may be another worktree's,
// and its pages must never be measured as ours.
async function freePort(start: number): Promise<number> {
  let port = start
  while (await up(`http://127.0.0.1:${port}/`)) port++
  return port
}

async function serve(dir: string, port: number): Promise<ChildProcess> {
  const url = `http://127.0.0.1:${port}/`
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', dir], { stdio: 'ignore' })
  for (let i = 0; i < 50 && !(await up(url)); i++) await new Promise((r) => setTimeout(r, 100))
  if (!(await up(url))) throw new Error(`no server on ${url}`)
  return server
}

function build(cwd: string, port: number) {
  execFileSync('npm', ['run', 'build:fixtures'], { cwd, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, SITE_URL: `http://localhost:${port}` } })
}

// The base ref as a plain copy (no worktree, no stash), sharing this checkout's node_modules.
// shortcut: a base whose dependencies differ builds with the wrong ones; run npm ci in the copy when package-lock.json differs.
function checkout(ref: string): string {
  const dir = `${OUT}/base`
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  execFileSync('tar', ['-x', '-C', dir], { input: execFileSync('git', ['archive', '--format=tar', ref], { maxBuffer: 1 << 28 }) })
  symlinkSync(resolve('node_modules'), `${dir}/node_modules`)
  return dir
}

const slug = (page: string) => page.replaceAll('/', '-').replace(/^-|-$/g, '') || 'landing'

async function measureSite(cdp: ReturnType<typeof launchChrome>, port: number, prefix: string): Promise<Shot[]> {
  const shots: Shot[] = []
  for (const page of PAGES) {
    const sizes = page.split('/').length === 4 ? [PHONE, DESKTOP, NARROW] : [PHONE, DESKTOP]
    for (const size of sizes) {
      const viewport = `${size.width}x${size.height}`
      const shot = `${OUT}/${prefix}${slug(page)}-${size.width}.png`
      shots.push({ page, viewport, shot, m: await capture(cdp, `http://127.0.0.1:${port}${page}`, size, shot) })
    }
  }
  // Canary for the stylesheet walk in MEASURE: its first version read 0 everywhere and nothing said so.
  if (!shots.some((s) => s.m.components['.card']?.some((c: any) => c.border))) throw new Error('the border walk found no bordered card')
  return shots
}

function fails({ page, viewport, m }: Shot): string[] {
  const out: string[] = []
  const at = `${page} at ${viewport}:`
  if (m.overflow > 0) out.push(`${at} the page scrolls sideways by ${m.overflow} px`)
  if (m.redInView > LIMIT.redInView) out.push(`${at} ${m.redInView} red actions on the first screen (limit ${LIMIT.redInView})`)
  if (viewport.startsWith(`${PHONE.width}x`)) {
    if (m.h1Top > LIMIT.h1Top) out.push(`${at} the headline starts ${m.h1Top} px down (limit ${LIMIT.h1Top})`)
    if (m.topBarRows > LIMIT.topBarRows) out.push(`${at} the top bar wraps to ${m.topBarRows} rows`)
    if (m.pageHeight > LIMIT.pageHeight) out.push(`${at} the page is ${m.pageHeight} px tall (limit ${LIMIT.pageHeight})`)
  }
  if (m.share && m.share.gap < LIMIT.shareGap) out.push(`${at} Share is ${m.share.gap} px from the right edge (at least ${LIMIT.shareGap})`)
  if (m.share && m.share.lines > LIMIT.shareLines) out.push(`${at} Share wraps to ${m.share.lines} lines`)
  return out
}

function drift(shots: Shot[]): string[] {
  const where = new Map<string, Set<string>>()
  const note = (finding: string, page: string) => (where.get(finding) ?? where.set(finding, new Set()).get(finding))!.add(page)
  for (const { page, m } of shots) {
    for (const [sel, rule] of Object.entries(RULES)) {
      const found = m.components[sel] ?? []
      const heights = new Set(found.map((c: any) => c.height))
      if (rule.height && heights.size > 1) note(`${sel}: ${heights.size} heights on one page (${[...heights].join(', ')})`, page)
      for (const c of found) {
        const bad: string[] = []
        const range = ([min, max]: [number, number]) => (min === max ? min : `${min} to ${max}`)
        if (rule.height && (c.height < rule.height[0] || c.height > rule.height[1])) bad.push(`height ${c.height} (rule ${range(rule.height)})`)
        if (rule.inner && (c.inner < rule.inner[0] || c.inner > rule.inner[1])) bad.push(`inner height ${c.inner} (rule ${range(rule.inner)})`)
        if (rule.radius !== undefined && c.radius !== rule.radius) bad.push(`radius ${c.radius} (rule ${rule.radius})`)
        if (rule.border !== undefined && c.border !== rule.border) bad.push(`border ${c.border} (rule ${rule.border})`)
        if (rule.borderColor && c.borderColor !== rule.borderColor) bad.push(`border colour ${c.borderColor} (rule ink)`)
        if (bad.length) note(`${sel}: ${bad.join(', ')}`, page)
      }
    }
  }
  return [...where].map(([finding, pages]) => `${finding}, on ${[...pages].join(' ')}`)
}

const METRICS: [string, (m: any) => unknown][] = [
  ['overflow', (m) => m.overflow],
  ['h1 top', (m) => m.h1Top],
  ['red in view', (m) => m.redInView],
  ['top bar rows', (m) => m.topBarRows],
  ['page height', (m) => m.pageHeight],
  ['share gap', (m) => m.share?.gap ?? '-'],
  ['share lines', (m) => m.share?.lines ?? '-'],
]

function changed(before: Shot[], after: Shot[]): string[] {
  const out: string[] = []
  for (const b of before) {
    const a = after.find((s) => s.page === b.page && s.viewport === b.viewport)
    if (!a) continue
    for (const [name, get] of METRICS) if (get(a.m) !== get(b.m)) out.push(`${b.page} at ${b.viewport}: ${name} was ${get(b.m)}, now ${get(a.m)}`)
  }
  return out
}

const list = (title: string, items: string[], empty: string) => `\n### ${title}\n\n${items.length ? items.map((s) => `- ${s}`).join('\n') : empty}\n`

async function main() {
  const flag = process.argv.indexOf('--base')
  const base = flag < 0 ? undefined : process.argv[flag + 1]
  if (flag >= 0 && !base) throw new Error('--base needs a ref, e.g. --base main')
  if (!existsSync(CHROME)) throw new Error(`no Chrome at ${CHROME}; set CHROME=/path/to/chrome`)
  mkdirSync(OUT, { recursive: true })
  const profile = mkdtempSync(`${tmpdir()}/ui-review-`)
  const stop: ChildProcess[] = []
  try {
    const port = await freePort(PORT)
    build('.', port)
    stop.push(await serve('dist', port))
    const cdp = launchChrome(profile)
    stop.push(cdp.chrome)
    const shots = await measureSite(cdp, port, '')
    let baseShots: Shot[] = []
    if (base) {
      const dir = checkout(base)
      const basePort = await freePort(port + 1)
      build(dir, basePort)
      stop.push(await serve(`${dir}/dist`, basePort))
      baseShots = await measureSite(cdp, basePort, 'base-')
    }

    console.log(`## Measurements\n\n| page | viewport | ${METRICS.map(([n]) => n).join(' | ')} | screenshot |\n|${'---|'.repeat(METRICS.length + 3)}`)
    for (const s of shots) console.log(`| ${s.page} | ${s.viewport} | ${METRICS.map(([, get]) => get(s.m)).join(' | ')} | ${s.shot} |`)
    console.log(list('Limits broken', shots.flatMap(fails), 'None.'))
    console.log(list('Components off docs/brand.md', drift(shots), 'None.'))
    if (base) console.log(list(`Changed since ${base}`, changed(baseShots, shots), 'Nothing: every number is the same.'))
  } finally {
    for (const p of stop) p.kill()
    for (const p of stop) if (p.exitCode === null && p.signalCode === null) await new Promise((r) => p.once('exit', r)) // Chrome still writes its profile while it quits
    rmSync(profile, { recursive: true, force: true })
  }
}

await main()
