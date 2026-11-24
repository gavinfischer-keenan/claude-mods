# claude-mods

Looks and mods for Claude Code. Each look draws in the Claude desktop and mobile apps only; a terminal or an editor keeps its own look.

| Look | What it is |
| --- | --- |
| [`green-rain`](#green-rain) | Slow columns of falling green characters on black |
| [`vector-range`](#vector-range) | A slow drift across a green wireframe plain |
| [`eel-rain`](#eel-rain) | The eel logo, softened, with the green rain falling around it |
| [`eel-tank`](#eel-tank) | An electric eel swimming slowly around a tank of dense green rain |

## Install

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `gavinfischer-keenan/claude-mods`, then **Add plugin** and choose a look.

At the prompt of a terminal session:

```
/plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

```
/plugin install vector-range --marketplace gavinfischer-keenan/claude-mods
```

```
/plugin install eel-rain --marketplace gavinfischer-keenan/claude-mods
```

```
/plugin install eel-tank --marketplace gavinfischer-keenan/claude-mods
```

From a shell:

```bash
claude plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

```bash
claude plugin install vector-range --marketplace gavinfischer-keenan/claude-mods
```

```bash
claude plugin install eel-rain --marketplace gavinfischer-keenan/claude-mods
```

```bash
claude plugin install eel-tank --marketplace gavinfischer-keenan/claude-mods
```

Answer `y` to add the marketplace, then pick a scope. The user scope makes it the look of every session started afterwards.

### One look at a time

A session has one theme, so with more than one look installed the one that starts last wins. Keep one enabled as the default, or switch inside a session with each look's own command: `/green-rain on`, `/vector-range on`, `/eel-rain on` or `/eel-tank on`.

## green-rain

A dark phosphor-green look: near-black green surfaces, pale green-white text, and slow columns of falling green characters behind the conversation. The streams are dimmer through the middle of the window, where the words sit, and the scene holds still for anyone who has asked for reduced motion.

- `/green-rain off` returns the app's own look for that session.
- `/green-rain on` brings the rain back.

### Tuning

The scene is drawn by `green-rain/hooks/register.tsx`. The numbers worth changing are near the top of `buildScene`: the column spacing (`x += 24`), the share of columns left empty (`0.1`), the share that carry a second stream (`0.4`), and each stream's lap time in seconds (`46 + random() * 44`). The `glass` setting decides how much of the rain shows through the app's panels.

## vector-range

A look in the spirit of early-80s vector arcade screens: a slow sideways drift across a dark plain drawn in green lines. Wire pyramids, blocks, slabs, mesas, obelisks and gates stand at different distances, the far ones small and nearly still and the near ones large and sooner gone. Three masts carry amber markers that turn slowly, a small rover overtakes the monuments near it, and far mountains, stars and a ringed world sit behind it all. It is an original scene, not a copy of any game.

The scene is darker through the middle of the window, where the words sit, and holds still for anyone who has asked for reduced motion.

- `/vector-range off` returns the app's own look for that session.
- `/vector-range on` brings the plain back.

### Tuning

The scene is drawn by `vector-range/hooks/register.tsx`. The constants at the top set the pace and the depth: `DRIFT` is how fast everything passes, `NEAREST` is how close the largest monuments come, and `HORIZON` is where the plain meets the sky. In `buildScene`, the loop count (`index < 22`) is how many monuments stand on the plain, and the exponent beside it (`2.7`) pushes more of them into the distance as it grows. The `glass` setting decides how much of the scene shows through the app's panels.

## eel-rain

The eel logo at the centre of the green rain. The logo is traced from the artwork into flat vector layers: its blues are kept, and its black outlines and rings are drawn in a dark slate blue so they still read on a dark ground. It is softened to about 60% strength and brightens and dims very slowly. A dark disc behind it holds the rain back, so the code falls around the logo and not through it.

The rain, the colours and the message styling are `green-rain`'s. The logo is sized to stay whole on a phone and on a very wide window, and the scene holds still for anyone who has asked for reduced motion.

- `/eel-rain off` returns the app's own look for that session.
- `/eel-rain on` brings it back.

### Tuning

The scene is drawn by `eel-rain/hooks/register.tsx`. `BADGE` near the top sets where the logo sits and how large it is. In `buildScene`, the logo's strength is the `opacity` on its group and the two values in the `glow` keyframes, and the disc's `fill-opacity` decides how much rain shows behind the logo. The rain's numbers are the same as `green-rain`'s. The logo's shapes are in `eel-rain/hooks/logo.ts`, one path for each colour layer, back to front.

## eel-tank

An electric eel, redrawn after the logo's, swims one slow lap of the screen through rain twice as dense as `green-rain`'s. It is a head and sixteen body pieces that all follow the same wavy track, each a little behind the last, so the body bends wherever the track does. On the turns it rolls over, so its back stays up on the way back. Now and then one of three points along its body throws a burst of red sparks, with a brief crackle across the body.

The colours and the message styling are `green-rain`'s. On a phone only the middle of the tank shows, so the eel passes through. The scene holds still, eel posed along the top, for anyone who has asked for reduced motion.

- `/eel-tank off` returns the app's own look for that session.
- `/eel-tank on` brings it back.

### Tuning

The eel is drawn by `eel-tank/hooks/eel.ts`, and its constants are at the top: `LAP` is one circuit in seconds, `SIZE` is how large the eel is shown, `SWING` and `WAVE` shape the side-to-side wave, and `TANK` is the circuit's centre and reach. The `bursts` list in `buildEel` holds each spark point: where on the body it is, how many seconds between bursts, and the directions its bolts fly. The rain is drawn by `eel-tank/hooks/rain.ts`: the column spacing (`x += 20`) and the share of columns with a second stream (`0.95`) set its density. Its glyph set has no slash, because a slash beside a star in the markup reads as the start of a comment and the app refuses the scene.
