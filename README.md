# Warpath — Global Game Jam 2019

A browser remake of [Synthetic Reality's Warpath](http://www.synthetic-reality.com/warpath.htm), built for Global Game Jam 2019 with Phaser 3.13, TypeScript, and Brunch.

## Run locally

Requires Node.js, npm, and Git (two historical development dependencies are pinned to GitHub commits). Verified with Node.js 24.19.0 and npm 11.17.0.

```sh
npm ci
npm start
```

Open http://127.0.0.1:3333. The game starts immediately. The development server watches source files and rebuilds automatically; stop it with Ctrl+C. It listens on localhost only.

Use a desktop browser and a large window; the original jam interface includes a fixed 600 × 600 game canvas and can clip on smaller screens. Browser zoom-out helps fit the whole interface.

## Controls

- Left-click in space to fly toward the pointer; click a planet to travel to it and stop there.
- Right-click to fire the selected weapon toward the pointer.
- Hold **C** while stopped at a mineable planet to mine, or use the **Mine** button.
- Use **Colonise**, **Invest**, and **Buy** when available at a planet.
- Select weapons and equipment with the buttons below the game canvas.

WASD and Space are registered in the original code but do not have movement actions attached.

## Checks and production build

```sh
npm test
npm run build
```

`npm test` checks TypeScript; there is no automated gameplay test suite. The production build writes the game and assets to `public/`. Serve that directory over HTTP, for example:

```sh
python3 -m http.server 3333 --bind 127.0.0.1 --directory public
```

## Project status

The original latest commit is `d711692`, dated 27 January 2019. This is a playable jam prototype with a generated galaxy, three AI opponents, mining, colonization, planet investment, trading, and weapons. There is no backend or account setup.

The local restoration refreshes the npm lockfile, pins the original engine/build dependencies, fixes a stale population property in the unfinished event generator, and gives event types explicit module imports/exports so the production compiler handles them correctly.

The code still has jam-era rough edges: the event generator is unfinished, the top menu has no wired actions, and the victory overlay reuses the defeat wording. The original build toolchain is deprecated and npm reports dependency warnings; a tooling modernization is separate work.

## Source layout

- `app/scenes/default.ts`: scene setup and simulation loop.
- `app/ship.ts`, `app/enemy.ts`, `app/planet.ts`: player, AI, and planet behavior.
- `app/ui.ts`, `app/static/index.html`: interface and controls.
- `app/static/assets/`: images and audio.
- `brunch-config.coffee`: build and local server configuration.
