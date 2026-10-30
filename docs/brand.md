# scarf · brand spec

Direction: **fan culture**. The scarf is the one fan object shared by football and basketball,
national teams and clubs. The brand stays neutral: wool, ink, one terrace red. Every team
brings its own colours as a knitted stripe. That stripe becomes the team's calendar colour, the
card header, the share image and the recoloured mark.

- Name: **scarf**, lowercase wordmark, always. "Scarf" only at the start of a sentence.
- Line: **Your colours, in your calendar.**
- Motto: **Wrapped up in the game.**

## Colour tokens

| Token | Hex | Use |
|---|---|---|
| Wool | `#FBF8F2` | page ground |
| Ink | `#17171C` | text, outlines, dark bands |
| Terrace red | `#D7263D` | primary actions, links, the mark's band |
| Stand | `#6B675F` | captions, secondary text (4.5:1 on wool and white) |
| Chalk | `#E6E1D8` | rules, light borders |
| White | `#FFFFFF` | cards |
| Ink-muted | `#B8B4AC` | secondary text on ink |

Contrast notes: white text on Terrace red passes AA (4.9:1); Terrace red text on wool passes at
normal size (4.7:1). Never put Stand on red or red on ink.

## Team stripes

Each team has an ordered colour list taken from its flag or kit. Render as hard-stop stripes:

```css
/* two colours */   background: repeating-linear-gradient(90deg, C1 0 18px, C2 18px 36px);
/* three colours */ background: repeating-linear-gradient(90deg, C1 0 12px, C2 12px 24px, C3 24px 36px);
```

| Team | Colours | Calendar colour (C1) |
|---|---|---|
| Greece | `#0D5EAF`, `#FFFFFF` | `#0D5EAF` |
| Spain | `#AA151B`, `#F1BF00` | `#AA151B` |
| Denmark | `#C60C30`, `#FFFFFF` | `#C60C30` |
| Serbia | `#C6363C`, `#0C4076`, `#FFFFFF` | `#C6363C` |
| A club | from its kit; placeholder stripes `#E6E1D8` / `#FBF8F2` until set | not set |

Stripe sizes: 12–14 px band as a card header (with a 1.5 px ink border below), 24–28 px band at the
top of a page or share card.

## Countries and sports

**Colour says who, lines say what.** Stripes alone collide (England and Switzerland are both red and
white), so a country is its flag (from flag-icons), its name and its stripes. A sport never takes a
team colour: it is a ball icon, a line drawing of the pitch or court, and its own words (kickoff and
stadium, tip-off and arena). The icons and drawings live with each sport's words in `src/page.ts`.
The identity kit at `/kit/` (unlisted, `noindex`) shows every country, sport and team card side by
side: check it after adding a team or a sport.

- Ball icons: stroke SVG like the other icons. The football is in ink, its pentagons filled (the
  centre one and the five cut by the rim) so dark and light patches alternate, with its seams at
  1.4 so the hexagons stay open at 18 px.
- Drawings: ink lines at 28 % opacity, stroke 1.6, on wool, between a card's stripe and its body.
  Decoration only: hidden from screen readers, the words do the telling.

**The one exception: the basketball is orange `#D9600F`**, the ball's own colour, used only for the
basketball icon. It passes the 3:1 that a meaningful graphic needs (3.5:1 on wool, 3.7:1 on white,
4.8:1 on ink) and sits at hue 24°, well clear of terrace red's 352°, so it never reads as an action.
The football icon stays ink. Where a sport has no team yet, its icon greys out to Stand like the text.

## Typography

Google Fonts: `https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,300..800&display=swap`

| Role | Face | Size / weight / tracking |
|---|---|---|
| Wordmark | Bricolage Grotesque | 800, letter-spacing −0.045em, lowercase |
| H1 (page) | Bricolage Grotesque | clamp(44px, 6vw, 76px), 800, −0.04em, line-height 0.95 |
| H2 | Bricolage Grotesque | 34px, 700, −0.03em |
| Card title | Bricolage Grotesque | 40–44px, 700, −0.035em |
| Body | Albert Sans | 16–19px, 400, line-height 1.5 |
| Meta / labels | Albert Sans | 13–14px, 600 |
| Times | Albert Sans | `font-variant-numeric: tabular-nums` |

Fallback stacks: `'Bricolage Grotesque', system-ui, sans-serif` and `'Albert Sans', system-ui, sans-serif`.

## Logo

Mark: a tilted (−14°) striped band with fringe. Files in `assets/`:

- `scarf-mark.svg`: brand colours (red band, wool stripes, ink outline). Use on wool/white.
- `scarf-mark-greece.svg`: team recolour (blue band, white stripes). Use on team surfaces.
- On ink backgrounds, outline and fringe become wool `#FBF8F2`.
- App icon / favicon: red `#D7263D` rounded square (radius ≈ 23 %), mark in wool with ink stripes.

Lockup: mark at 1.25× the wordmark's cap height, 10–12 px gap, baseline-aligned. Minimum mark size 24 px.
Never rotate the mark further, never stretch, never add a drop shadow.

## Components

- **Primary button**: Terrace red fill, white text, 700, height 52–56 px, radius 12 px.
- **Secondary button**: transparent, 1.5 px ink border, ink text 600, height 44–48 px, radius 12 px.
- **Nav pill / chip**: height 44 px, radius 999 px, 1.5 px border; a country chip carries its flag
  (20 × 15 px) at the left. "Add" chips use a dashed red border.
- **Sport switch**: a white pill holding one 40 px segment per sport (ball icon and name), the
  current one filled ink. Only on a team page whose country has more than one sport.
- **Sport tag**: 34 px white pill, 1.5 px ink border, ball icon and "Men's football · UEFA".
- **Card**: white, 1.5 px ink border, radius 16 px, `overflow: hidden`; team cards open with a 14 px
  stripe header and a 1.5 px ink rule under it. Padding 24–28 px.
- **Input**: height 44–46 px, 1.5 px chalk border, radius 10 px, white.
- **Fixture row**: date block (Bricolage 800 28 px + Stand meta), title 22 px 600, meta 14 px Stand,
  tickets as a secondary button; rows divided by 1.5 px chalk.
- Icons: inline stroke SVG, 18 px, stroke 1.8, round caps. Never emoji.

## Voice

- Warm, communal, a little cheeky: the friend who always knows when we play. Cheerful about the
  team, the players and the game; never preachy.
- "We" is the team, "you" is the fan. Sentence case. No exclamation marks, no emoji, no em dashes.
- Times name their city ("21:45 in Volos"). Unknowns are said plainly: "time not announced",
  "venue not announced". Never TBA, TBC, "don't miss out", "notification".
- Colour comes from the teams, never from us: no gradients, no decorative red fills, one red element
  per screen is plenty. The orange basketball is the one sport colour (see Countries and sports).
