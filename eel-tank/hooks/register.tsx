import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { buildEel } from './eel.js'
import { makeColors } from './make-colors.js'
import { buildRain } from './rain.js'

const SCENE_NAME = 'eel-tank'

// The green rain's phosphor palette, with the eel's blue for literals.
const { theme, problems } = makeColors({
  label: 'Eel tank',
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

const buildScene = (): string => {
  const rain = buildRain(seeded(1999), WIDTH)
  const eel = buildEel()

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">`,
    `<style>${rain.css}${eel.css}</style>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#030805"/>`,
    rain.body,
    eel.body,
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
    // A build that takes no style still gets the colors, the rain and the eel.
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
      name: 'eel-tank',
      description: 'Turn the eel tank look on or off: /eel-tank off, /eel-tank on',
    })

    const set = await apply($)

    if (!set.isDrawn) {
      $.ui.log(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'eel-tank' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'off') {
      await $.theme.clear()

      return { text: 'Eel tank is off. /eel-tank on brings it back.' }
    }

    const set = await apply($)

    return { text: set.isDrawn ? 'Eel tank is on.' : `Eel tank is set, but nothing draws it here: ${set.reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== SCENE_NAME || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A blue electric eel swimming slowly around a dark tank of falling green characters, now and then throwing off red sparks"
        isInteractive
      />
    )
  })
}
