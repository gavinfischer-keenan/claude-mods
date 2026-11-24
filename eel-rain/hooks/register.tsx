import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { LOGO } from './logo.js'
import { makeColors } from './make-colors.js'

const SCENE_NAME = 'eel-rain'

// The green rain's phosphor palette, with the logo's blue for literals.
const { theme, problems } = makeColors({
  label: 'Eel rain',
  only: 'dark',
  roles: { accent: '#00d15a', danger: '#e5484d', success: '#8fd13a', warning: '#d9a514', pro: '#29b2e0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#050b07',
        'surface-1': '#0a140d',
        'surface-2': '#0f1c13',
        'surface-3': '#122017',
        'text-primary': '#dcfbe4',
        'text-secondary': '#a9dcb6',
        'text-muted': '#86b893',
      },
    },
  },
})

// A small seeded generator, so the rain is the same drawing on every reload.
const seeded = (seed: number) => {
  let state = seed

  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WIDTH = 1600
const HEIGHT = 1000
const STEP = 26
// A head starts above the screen and ends once its whole tail has left the foot.
const START = -60
const TRAVEL = 1760
const GLYPHS = '0123456789ABCDEFXZΛΣΠΦΨΩλπµ=+*:|/'
// A glyph's brightness is one of these steps, each a one-letter class, to keep the drawing small.
// Every other class has two letters or more, so none differs from a step by its case alone.
const LEVELS = 'abcdefghijklmnopqrstuvwx'
// The logo sits a little above the middle, small enough to stay whole on a phone or a wide window.
const BADGE = { x: WIDTH / 2, y: 470, size: 440 }

const buildScene = (): string => {
  const random = seeded(1999)
  const columns: string[] = []
  const rules: string[] = []
  let index = 0

  // One stream: a bright head and a tail that fades upward.
  const stream = (strength: number): string => {
    const length = 7 + Math.floor(random() * 17)
    const spans: string[] = []

    for (let row = 0; row < length; row += 1) {
      const glyph = GLYPHS[Math.floor(random() * GLYPHS.length)]
      const fade = row === 0 ? 0.95 : 0.8 * (1 - row / length) ** 1.4
      const level = LEVELS[Math.min(LEVELS.length - 1, Math.floor(fade * strength * LEVELS.length))]
      const tone = row === 0 ? 'hd ' : row < 3 ? 'md ' : ''

      spans.push(`<tspan x="0" dy="${row === 0 ? 0 : -STEP}" class="${tone}${level}">${glyph}</tspan>`)
    }

    return `<text>${spans.join('')}</text>`
  }

  for (let x = 12; x < WIDTH; x += 24) {
    // Leave a few gaps, so the streams read as drips and not as a wall.
    if (random() < 0.1) {
      continue
    }

    // Dimmer through the middle, where the words sit.
    const offCenter = Math.abs(x - WIDTH / 2) / (WIDTH / 2)
    const strength = 0.4 + 0.6 * offCenter * offCenter
    const rest = Math.round(120 + random() * 1300)
    const duration = Math.round(46 + random() * 44)
    const delay = Math.round(random() * duration)
    const parts = [`<g class="st c${index}" transform="translate(0 ${rest})">${stream(strength)}</g>`]

    rules.push(`.c${index}{animation-duration:${duration}s;animation-delay:-${delay}s}`)
    index += 1

    // Some columns carry a second stream, half a lap behind the first, so the two never meet.
    if (random() < 0.4) {
      const half = TRAVEL / 2
      const restBehind = ((rest - START + half) % TRAVEL) + START

      parts.push(`<g class="st c${index}" transform="translate(0 ${restBehind})">${stream(strength)}</g>`)
      rules.push(`.c${index}{animation-duration:${duration}s;animation-delay:-${delay + duration / 2}s}`)
      index += 1
    }

    columns.push(`<g transform="translate(${x} 0)">${parts.join('')}</g>`)
  }

  const levels = [...LEVELS]
    .map((name, step) => `.${name}{fill-opacity:${((step + 0.5) / LEVELS.length).toFixed(2)}}`)
    .join('')

  // The logo: a dark disc to hold the rain back, then its layers, softened as one.
  const scale = BADGE.size / LOGO.size
  const corner = `${BADGE.x - BADGE.size / 2} ${BADGE.y - BADGE.size / 2}`
  const badge = [
    `<circle cx="${BADGE.x}" cy="${BADGE.y}" r="${BADGE.size / 2 - 6}" fill="#030805" fill-opacity=".92"/>`,
    `<g class="logo" opacity=".6" transform="translate(${corner}) scale(${scale}) translate(0 ${LOGO.size}) scale(1 -1)">`,
    ...LOGO.layers.map(layer => `<path fill="${layer.fill}" fill-rule="evenodd" d="${layer.d}"/>`),
    '</g>',
  ].join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">`,
    '<style>',
    'text{font-family:monospace;font-size:22px;font-weight:bold;text-anchor:middle;fill:#19b84e}',
    '.hd{fill:#d8ffe4}.md{fill:#4dea83}',
    levels,
    '.st{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}',
    '.logo{animation:glow 10s ease-in-out infinite alternate}',
    `@keyframes fall{from{transform:translateY(${START}px)}to{transform:translateY(${START + TRAVEL}px)}}`,
    '@keyframes glow{from{opacity:.52}to{opacity:.68}}',
    rules.join(''),
    '</style>',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#030805"/>`,
    columns.join(''),
    badge,
    '</svg>',
  ].join('')
}

const SCENE = buildScene()

const BASE: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: SCENE_NAME, glass: { blur: 3, tint: '#040a06', opacity: 0.64 } },
}

const STYLED: ThemeSetArgs = {
  ...BASE,
  style: {
    Heading: { fontFamily: ['mono'], letterSpacing: 1 },
    UserMessage: {
      color: '#dcfbe4',
      fontFamily: ['mono'],
      backgroundColor: '#0c2414',
      borderColor: '#1f7a3d',
      borderWidth: 1,
      radius: 4,
    },
    ToolUse: { color: '#9be8b0', fontFamily: ['mono'], backgroundColor: '#07140b', radius: 4, paddingX: 8 },
  },
}

async function apply($: EngineInterface) {
  try {
    return await $.theme.set(STYLED)
  } catch (error) {
    // A build that takes no style still gets the colors, the rain and the logo.
    $.ui.log(String(error))

    return $.theme.set(BASE)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    await $.command.register({
      name: 'eel-rain',
      description: 'Turn the eel rain look on or off: /eel-rain off, /eel-rain on',
    })

    const set = await apply($)

    if (!set.isDrawn) {
      $.ui.log(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'eel-rain' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'off') {
      await $.theme.clear()

      return { text: 'Eel rain is off. /eel-rain on brings it back.' }
    }

    const set = await apply($)

    return { text: set.isDrawn ? 'Eel rain is on.' : `Eel rain is set, but nothing draws it here: ${set.reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== SCENE_NAME || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A blue eel curled inside a ring, softly lit, with columns of green characters falling slowly around it"
        isInteractive
      />
    )
  })
}
