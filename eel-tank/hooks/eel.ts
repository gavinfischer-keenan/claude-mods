// The eel: a head and a chain of body pieces that all follow one looping track, each a little
// behind the one before, so the body bends wherever the track bends. The track carries a steady
// side-to-side wave, which is what makes the eel look as if it swims.

const TAU = Math.PI * 2

// The tank: the track's centre and reach, in the scene's own units.
const TANK = { x: 800, y: 462, reachX: 560, reachY: 268 }
// One lap, in seconds. The eel covers about 14 units a second.
const LAP = 220
// The wave across the track: how far it swings, and about how long one wave is.
const SWING = 20
const WAVE = 340
// How many points of the track the motion is spelled out at.
const STEPS = 160

// The body: pieces behind the head, how far apart, and half a piece's length.
const PIECES = 16
const SPACING = 24
const HALF = 16
const FIRST = 30
const LENGTH = 400
// The eel is drawn at one size and shown at this many times it.
const SIZE = 1.5

// The logo's own colours; the outline is slate so it reads on a dark ground.
const OUTLINE = '#1c5069'
const BACK = '#1f5183'
const BODY = '#29b2e0'
const SHINE = '#7ce4f0'
const INK = '#0c2a3d'
const PALE = '#e6f6fb'
const SPARK = '#ff3d2e'
const SPARK_EDGE = '#ffe0d8'

type Point = { x: number; y: number; angle: number; roll: number }

const fixed = (value: number): string => String(Math.round(value * 10) / 10)

// How thick the eel is, as a half-height, this far behind the head's middle.
const girth = (behind: number): number => 3 + 20 * (1 - Math.min(1, Math.max(0, behind) / LENGTH) ** 1.5)

// Which way up the eel is for a heading, in degrees clockwise from rightward: 1 while it heads
// right, -1 while it heads left, turning over as it dives or climbs. It rolls so its back stays up.
const rollFor = (heading: number): number => {
  const turn = ((heading % 360) + 360) % 360

  if (turn <= 60 || turn >= 300) {
    return 1
  }

  if (turn < 120) {
    return Math.cos(((turn - 60) / 60) * Math.PI)
  }

  return turn <= 240 ? -1 : -Math.cos(((turn - 240) / 60) * Math.PI)
}

// The track, as STEPS points evenly spaced along it, each with the way the eel faces there.
const layTrack = (): { points: Point[]; length: number } => {
  const count = 3600
  const loop: { x: number; y: number }[] = []

  // A soft-cornered loop that wanders a little in and out, run clockwise from its right side.
  for (let index = 0; index < count; index += 1) {
    const turn = (TAU * index) / count
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)]
    const wander = 1 + 0.1 * Math.sin(2 * turn + 1) + 0.07 * Math.sin(3 * turn + 2.2)

    loop.push({
      x: TANK.x + TANK.reachX * wander * Math.sign(cos) * Math.abs(cos) ** 0.77,
      y: TANK.y + TANK.reachY * wander * Math.sign(sin) * Math.abs(sin) ** 0.77,
    })
  }

  const at = <T,>(list: T[], index: number): T => list[((index % list.length) + list.length) % list.length] as T
  const along: number[] = [0]

  for (let index = 1; index <= count; index += 1) {
    const [from, to] = [at(loop, index - 1), at(loop, index)]

    along.push((along[index - 1] ?? 0) + Math.hypot(to.x - from.x, to.y - from.y))
  }

  const around = along[count] ?? 1
  const waves = Math.round(around / WAVE)

  // Swing each point across the track, and note the heading the plain loop has there.
  let heading = 90
  const swung = loop.map((point, index) => {
    const [before, after] = [at(loop, index - 5), at(loop, index + 5)]
    const [dx, dy] = [after.x - before.x, after.y - before.y]
    const size = Math.hypot(dx, dy) || 1
    const offset = SWING * Math.sin((TAU * waves * (along[index] ?? 0)) / around)
    let facing = (Math.atan2(dy, dx) * 180) / Math.PI

    while (facing - heading > 180) {
      facing -= 360
    }

    while (facing - heading < -180) {
      facing += 360
    }
    heading = facing

    return { x: point.x - (dy / size) * offset, y: point.y + (dx / size) * offset, heading: facing }
  })

  const run: number[] = [0]

  for (let index = 1; index <= count; index += 1) {
    const [from, to] = [at(swung, index - 1), at(swung, index)]

    run.push((run[index - 1] ?? 0) + Math.hypot(to.x - from.x, to.y - from.y))
  }

  const length = run[count] ?? 1
  const spots: { x: number; y: number; heading: number }[] = []
  let cursor = 0

  for (let step = 0; step < STEPS; step += 1) {
    const target = (length * step) / STEPS

    while ((run[cursor + 1] ?? Infinity) < target) {
      cursor += 1
    }

    const [from, to] = [at(swung, cursor), at(swung, cursor + 1)]
    const span = (run[cursor + 1] ?? 0) - (run[cursor] ?? 0) || 1
    const part = (target - (run[cursor] ?? 0)) / span
    // The last point's neighbour is the first, a full turn on.
    const ahead = cursor + 1 >= count ? to.heading + 360 : to.heading

    spots.push({
      x: from.x + (to.x - from.x) * part,
      y: from.y + (to.y - from.y) * part,
      heading: from.heading + (ahead - from.heading) * part,
    })
  }

  let angle = 90
  const points = spots.map((spot, index): Point => {
    const [before, after] = [at(spots, index - 1), at(spots, index + 1)]
    let facing = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI

    while (facing - angle > 180) {
      facing -= 360
    }

    while (facing - angle < -180) {
      facing += 360
    }
    angle = facing

    return { x: spot.x, y: spot.y, angle: facing, roll: rollFor(spot.heading) }
  })

  return { points, length }
}

export const buildEel = (): { css: string; body: string } => {
  const { points, length } = layTrack()
  const speed = length / LAP
  const first = points[0] as Point

  // Where on the track something is at a moment of the lap.
  const place = (time: number): Point => {
    const spot = ((((time / LAP) % 1) + 1) % 1) * STEPS
    const index = Math.floor(spot)
    const part = spot - index
    const from = points[index % STEPS] as Point
    const next = points[(index + 1) % STEPS] as Point
    const to = index + 1 >= STEPS ? { ...next, angle: next.angle + 360 } : next

    return {
      x: from.x + (to.x - from.x) * part,
      y: from.y + (to.y - from.y) * part,
      angle: from.angle + (to.angle - from.angle) * part,
      roll: from.roll + (to.roll - from.roll) * part,
    }
  }

  // The still pose, for anyone who has asked for no motion: heading right along the top, left of the middle.
  let start = 0
  let nearest = Infinity

  points.forEach((point, index) => {
    const off = Math.abs(point.x - 640) + (point.roll === 1 && point.y < TANK.y ? 0 : 5000)

    if (off < nearest) {
      nearest = off
      start = (index / STEPS) * LAP
    }
  })

  const rules: string[] = []
  const delays = new Map<string, number>()

  // A part `behind` the head's middle is the head, that many units of track ago.
  const follow = (name: string, behind: number): { rest: string; roll: string } => {
    const lag = (behind * SIZE) / speed
    const now = place(start - lag)

    if (!delays.has(name)) {
      delays.set(name, lag)
      rules.push(`.${name}{animation-delay:-${fixed((((start - lag) % LAP) + LAP) % LAP)}s}`)
    }

    return {
      rest: `translate(${fixed(now.x)} ${fixed(now.y)}) rotate(${fixed(now.angle)}) scale(${SIZE})`,
      // Never quite flat, so a part caught mid-roll still shows in the still pose.
      roll: `scale(1 ${Math.abs(now.roll) < 0.08 ? 0.08 : Math.round(now.roll * 100) / 100})`,
    }
  }

  const outlines: string[] = []
  const fills: string[] = []
  const marks: string[] = []

  // The body, tail first, so each piece's markings lie over the piece behind it.
  for (let piece = PIECES - 1; piece >= 0; piece -= 1) {
    const behind = FIRST + piece * SPACING
    const [front, rear, mid] = [girth(behind - HALF), girth(behind + HALF), girth(behind)]
    const isTail = piece === PIECES - 1
    const shape = isTail
      ? `M${-HALF - 26} 0L${HALF} ${fixed(-front)}V${fixed(front)}Z`
      : `M${-HALF} ${fixed(-rear)}L${HALF} ${fixed(-front)}V${fixed(front)}L${-HALF} ${fixed(rear)}Z`
    const name = `k${piece + 1}`
    const { rest, roll } = follow(name, behind)

    outlines.push(`<g class="sw ${name}" transform="${rest}"><path d="${shape}"/></g>`)
    fills.push(`<g class="sw ${name}" transform="${rest}"><path d="${shape}"/></g>`)

    const art: string[] = []

    // A back fin of leaning spikes, tall and short by turns, over the front two thirds.
    if (piece < 12) {
      const tall = (piece % 2 === 0 ? 1 : 0.6) * (10 + mid * 0.55)

      art.push(
        `<path fill="${BODY}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="miter" d="M-2 ${fixed(-mid * 0.6)}L-15 ${fixed(-mid - tall)}L13 ${fixed(-mid * 0.6)}"/>`,
      )
    }

    if (!isTail) {
      // The dark back, its lower edge jagged like a bolt, and a pale stripe along the belly.
      art.push(
        `<path fill="${BACK}" d="M${-HALF} ${fixed(-rear)}L${HALF} ${fixed(-front)}V${fixed(-front * 0.3)}L5 ${fixed(-mid * 0.5)}L-5 ${fixed(-mid * 0.02)}L${-HALF} ${fixed(-rear * 0.3)}Z"/>`,
        `<path fill="${SHINE}" d="M${-HALF} ${fixed(rear * 0.34)}L${HALF} ${fixed(front * 0.34)}V${fixed(front * 0.56)}L${-HALF} ${fixed(rear * 0.56)}Z"/>`,
      )
    }

    marks.push(
      `<g class="sw ${name}" transform="${rest}"><g class="ro ${name}" transform="${roll}">${art.join('')}</g></g>`,
    )
  }

  // The head: a blunt snout, a scowling eye, a smile, a gill and a small fin, after the logo's.
  const head = follow('k0', 0)
  const skull = 'M-28 -22.7C-8 -24.5 18 -21 30 -9Q37 0 30 9C18 21 -8 24.5 -28 22.7Z'

  outlines.push(`<g class="sw k0" transform="${head.rest}"><path d="${skull}"/></g>`)
  fills.push(`<g class="sw k0" transform="${head.rest}"><path d="${skull}"/></g>`)
  marks.push(
    [
      `<g class="sw k0" transform="${head.rest}"><g class="ro k0" transform="${head.roll}">`,
      `<path fill="${BACK}" d="M-28 -22.7C-8 -24.5 18 -21 30 -9C17 -16 -4 -15 -12 -9L-20 -13L-28 -7Z"/>`,
      `<path fill="${SHINE}" d="M-28 7.7C-10 9 12 9 26 5C16 13 -8 14 -28 12.7Z"/>`,
      `<path fill="${SHINE}" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round" d="M-13 1Q-27 -2 -32 9Q-20 12 -13 1Z"/>`,
      `<path fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" d="M-8 -15Q-1 0 -8 15M33 4Q20 13 5 6M5 6Q3 4 4 2"/>`,
      `<path fill="${PALE}" d="M7 -9Q15 -14 24 -8Q16 -4 7 -9Z"/>`,
      `<circle cx="17.5" cy="-8.6" r="2.7" fill="${INK}"/>`,
      `<path fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" d="M5 -15L25 -9"/>`,
      `<circle cx="30" cy="-3" r="1.1" fill="${INK}"/>`,
      '</g></g>',
    ].join(''),
  )

  // Sparks: three places along the body throw a burst now and then, each on its own long count,
  // so bursts come singly and unevenly. A bolt waits unseen, then flies out sideways and fades.
  const bolt = 'M0 -3L13 -8L10 -1L25 -5L13 8L16 1L0 4Z'
  const fleck = 'M0 0L7 -3.4L14 0L7 3.4Z'
  const bursts = [
    { name: 'za', behind: 14, every: 19, throws: [-62, -118, 48, 112, -20, 150, -150] },
    { name: 'zb', behind: 150, every: 29, throws: [-90, -50, -132, 78, 125, 40] },
    { name: 'zc', behind: 280, every: 41, throws: [-75, -110, 62, 100, 138, -40] },
  ]
  const sparks = bursts.map(burst => {
    const { rest } = follow(`e${burst.name}`, burst.behind)
    // About a second and a quarter of flight, whatever the count.
    const leave = 100 - (1.25 / burst.every) * 100
    const reach = girth(burst.behind)

    rules.push(
      `.${burst.name}{animation:${burst.name} ${burst.every}s linear infinite}`,
      `@keyframes ${burst.name}{0%,${fixed(leave)}%{opacity:0;transform:translateX(${fixed(reach)}px) scale(.5)}${fixed(leave + (100 - leave) * 0.1)}%{opacity:1}${fixed(leave + (100 - leave) * 0.6)}%{opacity:1}100%{opacity:0;transform:translateX(${fixed(reach + 92)}px) scale(1.2)}}`,
      // A crackle across the body as the burst leaves: there for a third of a second.
      `.${burst.name}g{animation:${burst.name}g ${burst.every}s linear infinite}`,
      `@keyframes ${burst.name}g{0%,${fixed(leave)}%{opacity:0}${fixed(leave + (100 - leave) * 0.06)}%{opacity:1}${fixed(leave + (100 - leave) * 0.22)}%{opacity:.7}${fixed(leave + (100 - leave) * 0.3)}%{opacity:0}100%{opacity:0}}`,
    )

    const crackle = `<path class="${burst.name}g" opacity="0" fill="none" stroke="${SPARK}" stroke-width="2.6" d="M-30 ${fixed(-reach)}L-19 ${fixed(reach * 0.5)}L-8 ${fixed(-reach * 0.6)}L4 ${fixed(reach * 0.7)}L15 ${fixed(-reach * 0.5)}L27 ${fixed(reach)}"/>`

    const thrown = burst.throws.map((turn, index) => {
      const size = 0.7 + ((index * 37) % 60) / 100
      const shape = index % 3 === 2 ? fleck : bolt

      // Each bolt of a burst leaves a moment before the next.
      return `<g transform="rotate(${turn}) scale(${fixed(size)})"><path class="${burst.name} ld${index}" opacity="0" d="${shape}"/></g>`
    })

    return `<g class="sw e${burst.name}" transform="${rest}">${crackle}${thrown.join('')}</g>`
  })

  for (let index = 1; index < 7; index += 1) {
    rules.push(`.ld${index}{animation-delay:-${fixed(index * 0.09)}s}`)
  }

  const swim = points
    .map((point, index) => `${fixed((index * 100) / STEPS)}%{transform:translate(${fixed(point.x)}px,${fixed(point.y)}px) rotate(${fixed(point.angle)}deg) scale(${SIZE})}`)
    .concat(`100%{transform:translate(${fixed(first.x)}px,${fixed(first.y)}px) rotate(${fixed(first.angle + 360)}deg) scale(${SIZE})}`)
    .join('')

  // The roll only changes while the eel dives or climbs, so only those points are spelled out.
  const turns = points
    .map((point, index) => ({ at: (index * 100) / STEPS, roll: point.roll }))
    .concat({ at: 100, roll: first.roll })
    .filter((step, index, all) => {
      const [before, after] = [all[index - 1], all[index + 1]]

      return before === undefined || after === undefined || before.roll !== step.roll || after.roll !== step.roll
    })
    .map(step => `${fixed(step.at)}%{transform:scaleY(${Math.round(step.roll * 100) / 100})}`)
    .join('')

  return {
    css: [
      `.sw{animation:swim ${LAP}s linear infinite}`,
      `.ro{animation:roll ${LAP}s linear infinite}`,
      `@keyframes swim{${swim}}`,
      `@keyframes roll{${turns}}`,
      rules.join(''),
    ].join(''),
    body: [
      '<g opacity=".86">',
      `<g fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="7" stroke-linejoin="round">${outlines.join('')}</g>`,
      `<g fill="${BODY}" stroke="${BODY}" stroke-width="1" stroke-linejoin="round">${fills.join('')}</g>`,
      marks.join(''),
      '</g>',
      `<g fill="${SPARK}" stroke="${SPARK_EDGE}" stroke-width=".9" stroke-linejoin="round">${sparks.join('')}</g>`,
    ].join(''),
  }
}
