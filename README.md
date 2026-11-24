# claude-mods

Looks and mods for Claude Code.

## green-rain

A dark phosphor-green look for the Claude desktop and mobile apps: near-black green surfaces, pale green-white text, and slow columns of falling green characters behind the conversation. The streams are dimmer through the middle of the window, where the words sit, and the scene holds still for anyone who has asked for reduced motion.

It draws in the desktop and mobile apps only. A terminal or an editor keeps its own look.

Once installed:

- `/green-rain off` returns the app's own look for that session.
- `/green-rain on` brings the rain back.

### Install

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `gavinfischer-keenan/claude-mods`, then **Add plugin** and choose `green-rain`.

At the prompt of a terminal session:

```
/plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

From a shell:

```bash
claude plugin install green-rain --marketplace gavinfischer-keenan/claude-mods
```

Answer `y` to add the marketplace, then pick a scope. The user scope makes it the look of every session started afterwards.

### Tuning

The scene is drawn by `green-rain/hooks/register.tsx`. The numbers worth changing are near the top of `buildScene`: the column spacing (`x += 24`), the share of columns left empty (`0.1`), the share that carry a second stream (`0.4`), and each stream's lap time in seconds (`46 + random() * 44`). The `glass` setting decides how much of the rain shows through the app's panels.
