# Warpath — Global Game Jam 2019

A browser remake of [Synthetic Reality's Warpath](http://www.synthetic-reality.com/warpath.htm), built for Global Game Jam 2019 with Phaser 3.13, TypeScript, and Brunch.

## Run locally

Requires Node.js 24, npm, and Git (two historical development dependencies are pinned to GitHub commits). Verified with Node.js 24.19.0 and npm 11.17.0. If you use nvm, run `nvm use` to select the version from `.nvmrc`.

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

`npm test` checks TypeScript; there is no automated gameplay test suite. GitHub Actions runs a clean install, type check, and production build on pushes and pull requests using Node.js 24. The production build writes the game and assets to `public/`. Serve that directory over HTTP, for example:

```sh
python3 -m http.server 3333 --bind 127.0.0.1 --directory public
```

## Project status

The original latest commit is `d711692`, dated 27 January 2019. This is a playable jam prototype with a generated galaxy, three AI opponents, mining, colonization, planet investment, trading, and weapons. There is no backend or account setup.

The local restoration refreshes the npm lockfile, pins the original engine/build dependencies, fixes a stale population property in the unfinished event generator, and gives event types explicit module imports/exports so the production compiler handles them correctly.

The code still has jam-era rough edges: the event generator is unfinished and the top menu has no wired actions. The original build toolchain is deprecated and npm reports dependency warnings; a tooling modernization is separate work. Compatible dependency fixes have been applied, and unused CSS build plugins removed (the interface uses inline CSS). TypeScript is an explicit development dependency.

Use `npm audit` to inspect remaining dependency advisories. Do not run `npm audit fix --force` blindly: it proposes upgrading Brunch to a new major version whose package is now an unrelated project. A future build-tool migration should preserve Phaser 3.13 until gameplay compatibility has been tested separately.

## Source layout

- `app/scenes/default.ts`: scene setup and simulation loop.
- `app/ship.ts`, `app/enemy.ts`, `app/planet.ts`: player, AI, and planet behavior.
- `app/ui.ts`, `app/static/index.html`: interface and controls.
- `app/static/assets/`: images and audio.
- `brunch-config.coffee`: build and local server configuration.

## Extract the original Windows assets

Place the original `wpsetup.exe` in the project root. The extractor reads its ZIP archive and the Win16 resource table in `WARPATH.EXE`; it does not run either executable. Python 3 and Pillow are required (install Pillow in a virtual environment with `python3 -m pip install Pillow` if needed).

```sh
python3 scripts/extract-original-assets.py
python3 -m http.server 3334 --bind 127.0.0.1 --directory original-assets
```

Open http://127.0.0.1:3334 for the image and sound gallery. The supplied installer yields 27 original WAV files, 29 BMPs, 66 ICOs, and one CUR, plus lossless PNG previews and a contact sheet. The manifest records source hashes, resource IDs, offsets, and audio properties. All 213 executable resources are also preserved as raw bytes, including menus and dialogs; the original readme, executable, and help file are retained under `source/`. Help-file contents and the unrelated bundled NetSpades archive are not decoded.

Generated files live in the ignored `original-assets/` directory and are not bundled into the remake. The extractor refuses to overwrite an existing output directory; use `--output another-directory` for another extraction. Windows icon/cursor masks can invert the background, which cannot be fully represented by PNG alpha; the ICO/CUR copies preserve the original masks.

### Prepare the remake's assets

The game uses converted original artwork and PCM WAV effects from `app/static/assets/original/`. These files are included in the project, so running the game does not require Python or the installer. To reproduce them after extraction:

```sh
python3 scripts/prepare-original-assets.py
```

The conversion script maps resource IDs to portraits, ships, shop/weapon icons, and equipment; its output manifest records the source of each asset. Original bitmaps are projected onto rotating globes for the remake's eleven planet classes, and the original explosion icon is expanded/faded into compatible animation sheets. These animations are adaptations, not recovered animation sequences. Pixel art uses nearest-neighbor scaling, and the planet information panel uses a single preview frame.

Laser, impact, torpedo, mine, mining, explosion, neutron, menu, and defeat effects use original WAVs. One-shot audio is released after playback, and laser firing plays once per shot. The installer has no music track, so the jam soundtrack is no longer played. Existing CSS panels, starfield, HUD gauges, and simple beam/particle helpers remain. `warpath.hlp` matches the help file preserved from this installer byte for byte.
