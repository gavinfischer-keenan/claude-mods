# claude-mods

Looks and mods for Claude Code. Each look draws in the Claude desktop and mobile apps only; a terminal or an editor keeps its own look.

| Look | What it is |
| --- | --- |
| [`green-rain`](#green-rain) | Slow columns of falling green characters on black |
| [`vector-range`](#vector-range) | A slow drift across a green wireframe plain |

## Install

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `gavinfischer-keenan/claude-mods`, then **Add plugin** and choose a look.

At the prompt of a terminal session:

```
/plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

```
/plugin install vector-range --marketplace gavinfischer-keenan/claude-mods
```

From a shell:

```bash
claude plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

```bash
claude plugin install vector-range --marketplace gavinfischer-keenan/claude-mods
```

Answer `y` to add the marketplace, then pick a scope. The user scope makes it the look of every session started afterwards.

### One look at a time

A session has one theme, so with both looks installed the one that starts last wins. Keep one enabled as the default, or switch inside a session with each look's own command: `/green-rain on` or `/vector-range on`.

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
