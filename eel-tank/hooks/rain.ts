// The falling code: twice the streams of the green rain, in narrower columns.

const STEP = 24
// A head starts above the screen and ends once its whole tail has left the foot.
const START = -60
const TRAVEL = 1760
// No slash: glyphs of one brightness sit side by side in the markup, and a slash beside a star
// there reads as the start of a comment, which the app refuses.
const GLYPHS = '0123456789ABCDEFXZΛΣΠΦΨΩλπµ=+*:|^'
// A glyph's brightness is one of these steps, each a one-letter class, to keep the drawing small.
// Every other class in the scene has two letters or more, so none differs from a step by its case alone.
const LEVELS = 'abcdefghijkl'

export const buildRain = (random: () => number, width: number): { css: string; body: string } => {
  const columns: string[] = []
  const rules: string[] = []
  let index = 0

  // One stream: a bright head and a tail that fades upward. Glyphs of one brightness share a span,
  // and the text itself carries where each glyph stands.
  const stream = (strength: number): string => {
    const length = 7 + Math.floor(random() * 17)
    const spans: string[] = []
    let run = ''
    let runClass = ''
    const rows: number[] = []

    for (let row = 0; row < length; row += 1) {
      const glyph = GLYPHS[Math.floor(random() * GLYPHS.length)] ?? '0'
      const fade = row === 0 ? 0.95 : 0.8 * (1 - row / length) ** 1.4
      const level = LEVELS[Math.min(LEVELS.length - 1, Math.floor(fade * strength * LEVELS.length))] ?? 'a'
      const name = `${row === 0 ? 'hd ' : row < 3 ? 'md ' : ''}${level}`

      if (name !== runClass && run !== '') {
        spans.push(`<tspan class="${runClass}">${run}</tspan>`)
        run = ''
      }
      runClass = name
      run += glyph
      rows.push(-row * STEP)
    }
    spans.push(`<tspan class="${runClass}">${run}</tspan>`)

    return `<text x="${rows.map(() => 0).join(' ')}" y="${rows.join(' ')}">${spans.join('')}</text>`
  }

  for (let x = 10; x < width; x += 20) {
    // Leave the odd gap, so the streams read as drips and not as a wall.
    if (random() < 0.04) {
      continue
    }

    // Dimmer through the middle, where the words sit.
    const offCenter = Math.abs(x - width / 2) / (width / 2)
    const strength = 0.4 + 0.6 * offCenter * offCenter
    const rest = Math.round(120 + random() * 1300)
    const duration = Math.round(46 + random() * 44)
    const delay = Math.round(random() * duration)
    const parts = [`<g class="st c${index}" transform="translate(0 ${rest})">${stream(strength)}</g>`]

    rules.push(`.c${index}{animation-duration:${duration}s;animation-delay:-${delay}s}`)
    index += 1

    // Nearly every column carries a second stream, half a lap behind the first, so the two never meet.
    if (random() < 0.95) {
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

  return {
    css: [
      'text{font-family:monospace;font-size:20px;font-weight:bold;text-anchor:middle;fill:#19b84e}',
      '.hd{fill:#d8ffe4}.md{fill:#4dea83}',
      levels,
      '.st{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}',
      `@keyframes fall{from{transform:translateY(${START}px)}to{transform:translateY(${START + TRAVEL}px)}}`,
      rules.join(''),
    ].join(''),
    body: columns.join(''),
  }
}
