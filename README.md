# KLIK — Free Browser Gaming Arcade

A Poki/CrazyGames-style game portal with **15 hand-built HTML5 games**, including the flagship
survival-horror game **99 Nights in the Forest**. Everything runs instantly in the browser — no
installs, no accounts, no ads.

![Klik](public/images/99-nights.jpg)

## ✨ Features

- **Instant play storefront** — rotating spotlight carousel, featured games, search, genre chips,
  favorites and “jump back in” recents (stored in `localStorage`).
- **Game player page** — full screen 16:9 play area, fullscreen mode, how-to-play/controls panel,
  shareable deep links (`#game-id`), related games rail and ESC-to-exit.
- **15 original games** — each written from scratch in TypeScript + Canvas/React (no third-party game code).
- **Procedural sound design** — all SFX generated with the Web Audio API, with a global mute toggle.
- Fully responsive, dark neon aesthetic, zero tracking.

## 🎮 The games

| Game | Genre | Highlights |
| --- | --- | --- |
| **99 Nights in the Forest** | Survival horror | Day/night loop, campfire fuel, traps/torches/medkits/batteries, flashlight that repels the Wendigo, 4 rescues; each rescue adds 2 nights at dawn |
| SkyBlox Parkour | Platformer | Procedural sky course, lava, bounce pads, checkpoints, double jump + dash |
| Cyber Drift GT | Racing | Pseudo-3D synthwave highway, traffic, near-miss combos, nitro |
| Astro Survivors | Roguelite | Auto-firing bullet-heaven, XP gems, 9 upgrade evolutions, bosses |
| Neon Slither Arena | .io | AI serpents, orbs, boost, leaderboard, minimap |
| Dungeon Forge Merge | Puzzle | 2048-style weapon merging that damages dungeon bosses |
| Zombie Siege Defense | Tower defense | 3 turret types, upgrades, escalating zombie waves |
| Turbo Street Hoops | Sports | Drag-to-shoot physics, swish streaks, shot clock |
| Neon Prism Breaker | Arcade | Breakout with multiball / wide paddle / extra-life powerups |
| Crystal Mine Tycoon | Idle | Clicker economy, 6 generators, frenzies, golden meteors |
| Shadow Katana Runner | Runner | Endless rooftop sprint, double jump, drone slicing |
| Cyber Pong Duel | 2 player | Local 2P keyboard duel or adaptive AI |
| Neon Block Blitz | Puzzle | Tetris with ghost piece, hard drop, speed levels |
| Quantum Minesweeper | Puzzle | 3 difficulties, safe first click, flags, timer |
| Holo Memory Matrix | Puzzle | 6/8/10 pair boards, combo streaks, best time |

## 🕹 Controls for 99 Nights in the Forest

| Keys | Action |
| --- | --- |
| `WASD` / arrows | Move |
| Mouse aim + left click | Swing axe (chop trees, forage, attack) |
| `Space` | Toggle flashlight beam |
| Hold right click | Aim the flashlight beam |
| `E` | Feed the campfire / rescue a child |
| `R` | Eat a berry ration |
| `1`–`4` | Craft spike trap / torch / medkit / battery |

Touch devices get an on-screen joystick, axe button, flashlight toggle and feed/eat buttons.

## 🚀 Development

```bash
npm install
npm run dev             # Vite dev server        → http://localhost:5173
npm run build           # production build       → dist/
npm run build:pages     # GitHub Pages build with the /Klik/ base path
npm run preview         # self-contained build served from dist/ (port 5173)
npm run serve           # serve an existing dist/ without rebuilding
npm run preview:vite    # plain Vite preview of dist/ (port 4173)

npm test                # boot every game in jsdom (smoke test)
npm run test:n99        # focused 99 Nights input/soak test
npm run test:boot       # bundle + boot the app, assert first paint
npm run test:standalone # build + boot the self-contained dist/index.html
npm run test:pages      # build + verify GitHub Pages paths and local assets
```

### GitHub Pages deployment

The Pages workflow runs the game smoke tests, builds the site with the project-site base path (`/Klik/`),
checks every bundled thumbnail, and deploys the generated `dist/` artifact from `main`. GitHub Pages must use
**GitHub Actions** as its build/deploy source (not the repository source branch), because the repository contains
Vite/TypeScript source that needs to be compiled before it can run in a browser.

### Self-contained build (single request)

`npm run preview` runs `vite build` and then `scripts/make-standalone.mjs`, which
folds the production CSS and JS straight into `dist/index.html`. The resulting
page is ~450 kB with **no external script or stylesheet requests** — only the game
thumbnails under `/images/` load separately. This removes every way a restrictive
preview host or proxy can block the bundle (module splitting, MIME types, CORS,
HMR websockets) and guarantees the storefront paints.

The bundle is safe to inline as a classic script: the build emits no `import.meta`,
no dynamic `import()` and no top-level `import`/`export`. It is moved to the end of
`<body>` so it runs after `#root` exists, and `scripts/serve.mjs` (zero
dependencies, binds `0.0.0.0`) serves it with correct MIME types, 404s for missing
assets and an SPA fallback for routes.

## 🗂 Project structure

```
src/
  App.tsx                 # storefront shell (hero, filters, grids, footer)
  components/             # Navbar, Hero, GameCard, GamePlayer, ui atoms
  data/games.ts           # game catalogue metadata
  games/                  # 15 game implementations + engine helpers + registry
  utils/sound.ts          # Web Audio SFX engine
  hooks/useLocal.ts       # localStorage state hook
public/images/            # game cover art
```

## 📝 Notes

*99 Nights in the Forest* on Klik is an **original fan-inspired re-imagining** of the survival-horror
genre concept — all code, artwork and audio in this repository are created from scratch for this
project. Every game is self-contained and works offline after the first load.
