import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const SCENE_NAME = 'vector-range'

// A dark vector monitor: black glass with a faint green cast, and pale phosphor words.
const { theme, problems } = makeColors({
  label: 'Vector range',
  only: 'dark',
  roles: { accent: '#2fd673', danger: '#e5534b', success: '#7fcf45', warning: '#e0a526', pro: '#4aa8d8' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#060a08',
        'surface-1': '#0b110e',
        'surface-2': '#101814',
        'surface-3': '#131c17',
        'text-primary': '#e3f6ea',
        'text-secondary': '#b0cdb9',
        'text-muted': '#8aa894',
      },
    },
  },
})

// A small seeded generator, so the plain is the same drawing on every reload.
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
const HORIZON = 610
// The eye stands this high over the plain, and this far behind the picture.
const EYE = 60
const FOCAL = 900
// How far below the horizon the nearest things stand.
const NEAREST = 180
// A thing crosses the screen at this many units a second for each unit it stands below the horizon.
const DRIFT = 0.11
// Where a crossing starts and how far it runs: off the right edge to off the left.
const ENTER = 1950
const CROSSING = 2300

type Vertex = readonly [number, number, number]
type Solid = { vertices: Vertex[]; edges: (readonly [number, number])[] }

const fixed = (value: number): string => String(Math.round(value * 10) / 10)

// A four-sided solid: a rectangle on the ground under another, so a box, a slab or a mesa.
const prism = (width: number, depth: number, topWidth: number, topDepth: number, height: number, base = 0): Solid => {
  const [x, z, tx, tz] = [width / 2, depth / 2, topWidth / 2, topDepth / 2]

  return {
    vertices: [
      [-x, base, -z],
      [x, base, -z],
      [x, base, z],
      [-x, base, z],
      [-tx, base + height, -tz],
      [tx, base + height, -tz],
      [tx, base + height, tz],
      [-tx, base + height, tz],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
  }
}

const pyramid = (side: number, height: number, base = 0): Solid => {
  const half = side / 2

  return {
    vertices: [
      [-half, base, -half],
      [half, base, -half],
      [half, base, half],
      [-half, base, half],
      [0, base + height, 0],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
    ],
  }
}

const merge = (first: Solid, second: Solid, shiftX = 0): Solid => ({
  vertices: [...first.vertices, ...second.vertices.map(([x, y, z]): Vertex => [x + shiftX, y, z])],
  edges: [
    ...first.edges,
    ...second.edges.map(([a, b]) => [a + first.vertices.length, b + first.vertices.length] as const),
  ],
})

const SOLIDS: Record<string, Solid> = {
  pyramid: pyramid(84, 86),
  block: prism(64, 64, 64, 64, 44),
  slab: prism(110, 30, 110, 30, 62),
  mesa: prism(96, 96, 52, 52, 40),
  obelisk: merge(prism(26, 26, 16, 16, 106), pyramid(16, 14, 106)),
  gate: merge(
    merge(prism(16, 18, 16, 18, 72), prism(16, 18, 16, 18, 72), 78),
    prism(116, 22, 116, 22, 14, 72),
    39,
  ),
}

// A low survey rover of our own: a tapered hull on two skids, a cabin, and a mast with a dish.
const ROVER: Solid = merge(
  merge(
    merge(prism(120, 50, 92, 44, 14, 6), prism(58, 38, 34, 28, 18, 20), 12),
    {
      vertices: [
        [-56, 0, -25],
        [56, 0, -25],
        [-56, 0, 25],
        [56, 0, 25],
        [-40, 6, -25],
        [40, 6, -25],
        [-40, 6, 25],
        [40, 6, 25],
      ],
      edges: [
        [0, 1],
        [2, 3],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ],
    },
  ),
  {
    vertices: [
      [0, 38, 0],
      [0, 68, 0],
      [-11, 76, 0],
      [11, 76, 0],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 3],
    ],
  },
  26,
)

// Draws a solid standing `below` units under the horizon, turned by `yaw`, as one path.
const draw = (solid: Solid, below: number, yaw: number): string => {
  const distance = (FOCAL * EYE) / below
  const [cos, sin] = [Math.cos(yaw), Math.sin(yaw)]
  const points = solid.vertices.map(([x, y, z]) => {
    const away = distance + x * sin + z * cos

    return `${fixed((FOCAL * (x * cos - z * sin)) / away)} ${fixed(HORIZON + (FOCAL * (EYE - y)) / away)}`
  })

  return solid.edges.map(([a, b]) => `M${points[a]}L${points[b]}`).join('')
}

const buildScene = (): string => {
  const random = seeded(1980)
  const rules: string[] = []
  const brightness = (below: number): string => (0.3 + 0.6 * (below / NEAREST)).toFixed(2)

  // The sky: still stars, a few of them breathing, over everything but the mountains.
  const stars: string[] = []

  for (let index = 0; index < 64; index += 1) {
    const [x, y] = [Math.round(random() * WIDTH), Math.round(16 + random() * (HORIZON - 150))]
    const radius = (0.8 + random() * 0.9).toFixed(1)
    const opacity = (0.3 + random() * 0.5).toFixed(2)

    if (index % 5 === 0) {
      rules.push(`.t${index}{animation-duration:${Math.round(7 + random() * 7)}s;animation-delay:-${Math.round(random() * 9)}s}`)
    }

    stars.push(
      `<circle${index % 5 === 0 ? ` class="tw t${index}"` : ''} cx="${x}" cy="${y}" r="${radius}" fill="#c9f5d6" fill-opacity="${opacity}"/>`,
    )
  }

  // A ringed world low in the sky, drawn as a wire globe.
  const globe = 62
  const planet = [
    `<g class="a" stroke-opacity=".5" transform="translate(1330 196) rotate(-18)">`,
    `<path d="M${-globe} 0A${globe} ${globe} 0 1 0 ${globe} 0A${globe} ${globe} 0 1 0 ${-globe} 0"/>`,
    ...[-0.62, 0, 0.62].map(latitude => {
      const reach = fixed(globe * Math.cos(latitude))
      const y = fixed(-globe * Math.sin(latitude))
      const sag = fixed(globe * Math.cos(latitude) * 0.2)

      return `<path d="M-${reach} ${y}A${reach} ${sag} 0 1 0 ${reach} ${y}A${reach} ${sag} 0 1 0 -${reach} ${y}"/>`
    }),
    ...[0.36, 0.78].map(width => {
      const reach = fixed(globe * width)

      return `<path d="M0 ${-globe}A${reach} ${globe} 0 1 0 0 ${globe}A${reach} ${globe} 0 1 0 0 ${-globe}"/>`
    }),
    `<path d="M${-globe * 1.8} 0A${globe * 1.8} ${fixed(globe * 0.36)} 0 1 0 ${globe * 1.8} 0A${globe * 1.8} ${fixed(globe * 0.36)} 0 1 0 ${-globe * 1.8} 0"/>`,
    '</g>',
  ].join('')

  // Far mountains: one ridge line and the folds under its peaks, drawn twice to roll without a seam.
  let ridge = `M0 ${HORIZON}`
  let folds = ''
  let x = 0
  let isPeak = true

  while (x < WIDTH - 130) {
    x += 34 + random() * 74
    const rise = isPeak ? 34 + random() * 84 : random() * 22
    ridge += `L${fixed(x)} ${fixed(HORIZON - rise)}`

    if (isPeak && rise > 56) {
      folds += `M${fixed(x)} ${fixed(HORIZON - rise)}L${fixed(x + (random() - 0.35) * 46)} ${fixed(HORIZON - rise * (0.15 + random() * 0.3))}`
    }
    isPeak = !isPeak
  }
  ridge += `L${WIDTH} ${HORIZON}`

  const mountains = [0, WIDTH]
    .map(shift => `<path transform="translate(${shift} 0)" d="${ridge}${folds}"/>`)
    .join('')

  // Marks on the ground, in rows, the nearer rows passing sooner: they are what makes it a plain.
  const rows = [14, 24, 40, 64, 98, 144].map((below, row) => {
    let marks = ''

    for (let count = 0; count < 7; count += 1) {
      const at = random() * WIDTH
      const length = ((3 + random() * 6) * below) / EYE
      const y = fixed(HORIZON + below + (random() - 0.5) * below * 0.16)

      marks += `M${fixed(at)} ${y}h${fixed(length)}M${fixed(at + WIDTH)} ${y}h${fixed(length)}`
    }
    const lap = Math.round(WIDTH / (DRIFT * below))

    rules.push(`.r${row}{animation-duration:${lap}s;animation-delay:-${Math.round(random() * lap)}s}`)

    return `<path class="roll r${row}" stroke-opacity="${(0.2 + 0.4 * (below / NEAREST)).toFixed(2)}" d="${marks}"/>`
  })

  // What stands on the plain: far things small and slow, near things large and sooner gone.
  type Standing = { below: number; markup: (name: string, rest: number) => string; pace: number }
  const standing: Standing[] = []
  const kinds = Object.keys(SOLIDS)

  for (let index = 0; index < 22; index += 1) {
    const below = 10 + (NEAREST - 10) * random() ** 2.7
    const solid = SOLIDS[kinds[Math.floor(random() * kinds.length)] ?? 'pyramid'] ?? pyramid(84, 86)
    const path = draw(solid, below, (random() - 0.5) * 1.5)

    standing.push({
      below,
      pace: 1,
      markup: (name, rest) =>
        `<g class="o ${name}" stroke-opacity="${brightness(below)}" transform="translate(${rest} 0)"><path d="${path}"/></g>`,
    })
  }

  // Beacons: a mast with an amber marker that turns slowly at its top.
  for (const below of [34, 82, 132]) {
    const scale = below / EYE
    const [wide, tall] = [fixed(15 * scale), fixed(22 * scale)]
    const marker = `M0 -${tall}L${wide} 0L0 ${tall}L-${wide} 0Z`

    standing.push({
      below,
      pace: 1,
      markup: (name, rest) =>
        [
          `<g class="o ${name}" stroke-opacity="${brightness(below)}" transform="translate(${rest} 0)">`,
          `<path d="M0 ${fixed(HORIZON + below)}V${fixed(HORIZON + below - 72 * scale)}"/>`,
          `<g class="a" transform="translate(0 ${fixed(HORIZON + below - 96 * scale)})">`,
          `<path class="turn" d="${marker}"/><path class="turn late" transform="scale(.4 1)" d="${marker}"/>`,
          '</g></g>',
        ].join(''),
    })
  }

  // The rover drives the way the plain is passing, so it overtakes what stands near it.
  standing.push({
    below: 58,
    pace: 2.3,
    markup: (name, rest) =>
      `<g class="o ${name}" stroke-opacity=".8" transform="translate(${rest} 0)"><path d="${draw(ROVER, 58, 0.3)}"/></g>`,
  })

  const plain = standing
    .sort((a, b) => a.below - b.below)
    .map((thing, index) => {
      const lap = Math.round(CROSSING / (DRIFT * thing.below * thing.pace))

      rules.push(`.o${index}{animation-duration:${lap}s;animation-delay:-${Math.round(random() * lap)}s}`)

      return thing.markup(`o${index}`, Math.round(80 + random() * (WIDTH - 160)))
    })

  // Darker through the middle, where the words sit: bands, since the scene carries no gradient.
  let veil = ''

  for (let band = 0; band < 40; band += 1) {
    const off = Math.abs(band * 40 + 20 - WIDTH / 2) / (WIDTH / 2)
    const opacity = 0.45 * (1 - off ** 1.6)

    if (opacity > 0.02) {
      veil += `<rect x="${band * 40}" width="41" height="${HEIGHT}" fill="#020604" fill-opacity="${opacity.toFixed(3)}"/>`
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">`,
    '<style>',
    'path{fill:none;vector-effect:non-scaling-stroke}',
    '.g{stroke:#35e87a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}',
    '.a{stroke:#e2a93b}',
    '.o{animation-name:pass;animation-timing-function:linear;animation-iteration-count:infinite}',
    '.roll{animation-name:roll;animation-timing-function:linear;animation-iteration-count:infinite}',
    '.far{animation-duration:2400s}',
    '.turn{animation:turn 11s cubic-bezier(.37,0,.63,1) infinite alternate}',
    '.late{animation-delay:-5.5s}',
    '.tw{animation-name:tw;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}',
    '.sat{animation:sat 260s linear infinite}',
    `@keyframes pass{from{transform:translateX(${ENTER}px)}to{transform:translateX(${ENTER - CROSSING}px)}}`,
    `@keyframes roll{from{transform:translateX(0px)}to{transform:translateX(-${WIDTH}px)}}`,
    '@keyframes turn{from{transform:scaleX(1)}to{transform:scaleX(-1)}}',
    '@keyframes tw{from{opacity:1}to{opacity:.3}}',
    '@keyframes sat{from{transform:translate(-60px,330px)}to{transform:translate(1660px,96px)}}',
    rules.join(''),
    '</style>',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#020604"/>`,
    stars.join(''),
    '<g class="g">',
    planet,
    '<g class="sat" transform="translate(420 262)" stroke-opacity=".55"><path d="M-7 0L0 -4L7 0L0 4ZM-16 0H-7M7 0H16"/></g>',
    `<g class="roll far" stroke-opacity=".5">${mountains}</g>`,
    `<path stroke-opacity=".8" d="M0 ${HORIZON}H${WIDTH}"/>`,
    rows.join(''),
    plain.join(''),
    '</g>',
    veil,
    '</svg>',
  ].join('')
}

const SCENE = buildScene()

const BASE: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { scene: SCENE_NAME, glass: { blur: 2, tint: '#040806', opacity: 0.62 } },
}

const STYLED: ThemeSetArgs = {
  ...BASE,
  style: {
    Heading: { fontFamily: ['mono'], letterSpacing: 1 },
    UserMessage: {
      color: '#e3f6ea',
      fontFamily: ['mono'],
      backgroundColor: '#0a1a11',
      borderColor: '#2a8f52',
      borderWidth: 1,
      radius: 0,
    },
    ToolUse: { color: '#9fe6b6', fontFamily: ['mono'], backgroundColor: '#07110b', radius: 0, paddingX: 8 },
  },
}

async function apply($: EngineInterface) {
  try {
    return await $.theme.set(STYLED)
  } catch (error) {
    // A build that takes no style still gets the colors and the plain.
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
      name: 'vector-range',
      description: 'Turn the vector range look on or off: /vector-range off, /vector-range on',
    })

    const set = await apply($)

    if (!set.isDrawn) {
      $.ui.log(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'vector-range' }, async ($, e) => {
    if (e.args.trim().toLowerCase() === 'off') {
      await $.theme.clear()

      return { text: 'Vector range is off. /vector-range on brings it back.' }
    }

    const set = await apply($)

    return { text: set.isDrawn ? 'Vector range is on.' : `Vector range is set, but nothing draws it here: ${set.reason}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== SCENE_NAME || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A slow drift across a dark plain drawn in green lines: wire pyramids, gates and beacons under far mountains and a ringed world"
        isInteractive
      />
    )
  })
}
