import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const SCENE_NAME = 'green-rain'

// Phosphor on black glass: every gray leans green, and the words stay near white.
const { theme, problems } = makeColors({
  label: 'Green rain',
  only: 'dark',
  roles: { accent: '#00d15a', danger: '#e5484d', success: '#8fd13a', warning: '#d9a514', pro: '#2bb8a6' },
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
      const opacity = (fade * strength).toFixed(2)
      const tone = row === 0 ? 'h' : row < 3 ? 'm' : 't'

      spans.push(
        `<tspan x="0" dy="${row === 0 ? 0 : -STEP}" class="${tone}" fill-opacity="${opacity}">${glyph}</tspan>`,
      )
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
    const parts = [`<g class="s c${index}" transform="translate(0 ${rest})">${stream(strength)}</g>`]

    rules.push(`.c${index}{animation-duration:${duration}s;animation-delay:-${delay}s}`)
    index += 1

    // Some columns carry a second stream, half a lap behind the first, so the two never meet.
    if (random() < 0.4) {
      const half = TRAVEL / 2
      const restBehind = ((rest - START + half) % TRAVEL) + START

      parts.push(`<g class="s c${index}" transform="translate(0 ${restBehind})">${stream(strength)}</g>`)
      rules.push(`.c${index}{animation-duration:${duration}s;animation-delay:-${delay + duration / 2}s}`)
      index += 1
    }

    columns.push(`<g transform="translate(${x} 0)">${parts.join('')}</g>`)
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">`,
    '<style>',
    'text{font-family:monospace;font-size:22px;font-weight:bold;text-anchor:middle}',
    '.h{fill:#d8ffe4}.m{fill:#4dea83}.t{fill:#19b84e}',
    '.s{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}',
    `@keyframes fall{from{transform:translateY(${START}px)}to{transform:translateY(${START + TRAVEL}px)}}`,
    rules.join(''),
    '</style>',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#030805"/>`,
    columns.join(''),
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
    // A build that takes no style still gets the colors and the rain.
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
      name: 'green-rain',
      description: 'Turn the green rain look on or off: /green-rain off, /green-rain on',
    })

    const set = await apply($)

    if (!set.isDrawn) {
      $.ui.log(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'green-rain' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'off') {
      await $.theme.clear()

      return { text: 'Green rain is off. /green-rain on brings it back.' }
    }

    const set = await apply($)

    return { text: set.isDrawn ? 'Green rain is on.' : `Green rain is set, but nothing draws it here: ${set.reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== SCENE_NAME || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="Columns of green characters falling slowly down a black screen" isInteractive />
  })
}
