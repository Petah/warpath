# Warpath — Global Game Jam 2019

A browser remake of [Synthetic Reality's Warpath](http://www.synthetic-reality.com/warpath.htm), built for Global Game Jam 2019 with Phaser 3.13, TypeScript, and Brunch.

## Run locally

Requires Node.js 24, npm, and Git (two historical development dependencies are pinned to GitHub commits). Verified with Node.js 24.19.0 and npm 11.17.0. If you use nvm, run `nvm use` to select the version from `.nvmrc`.

```sh
npm ci
npm start
```

Open http://127.0.0.1:3333. The solo registration dialog lets you choose a captain, Path, empire portrait, ship, and one to three opponents. The development server watches source files and rebuilds automatically; stop it with Ctrl+C. It listens on localhost only.

Use a desktop browser with a mouse. The cockpit scales to fit the window (verified at 800 × 600 and 1440 × 1000), while the simulation retains a 600 × 600 sector view. File → Fullscreen expands it.

## Controls and the solo game

- Left-click the sector view or galaxy map to set a course. Flight continues until you stop or reach a planet you specifically selected.
- Right-click to fire at a point. **1–6** select weapons; the last round in your inventory is usable.
- **+ / −** or **Up / Down** change speed by one notch; **Space** stops; **R** reverses course. Toolbar buttons provide the same actions.
- Hold **C** or press **Mine** in orbit around an uninhabited planet. Mining temporarily lowers your shields. Return to a friendly or neutral inhabited planet to sell ore.
- Friendly planets provide colonists and refuel up to their spaceport capacity. Colonizing requires at least 200 colonists. Neutral and hostile worlds do not refuel you.
- Buy pods and equipment, then invest in colonies or neutral worlds. Investment raises development and allegiance. The broker lets you change the investment amount.
- The scanner reveals sectors as you enter them and records planetary allegiance after orbit. **G** opens the planetary guide; selecting a world engages autopilot. Click a captain portrait to watch that ship, or use the camera buttons for ship/sector views.
- Stealth hides your ship from AI targeting but disables defensive shields and firing. Disrupters weaken all shields in the sector. Warp is installed equipment: engage it, then click the map; each jump consumes charge rather than the drive.
- Plague bombs infect planets; orbit can spread infection. A cure crystal sterilizes the current sector. Energy barriers damage ships crossing quadrant boundaries. You have three ships; losing the last ends the game.
- **P** pauses; **Escape** closes a dialog or toggles pause; **F1** opens help. Dialogs and hidden tabs pause automatically. Sound and registration preferences persist locally; game progress does not.

The classic cockpit includes working File/Actions/Windows/Tutorial/Help menus, a radio log, planet scan and guide, empire report, inventory, and a broker dialog modeled on the supplied original screenshots. Radio messages explain transactions and report low-resource worlds. The simulation advances at 60 logical ticks per second independently of display refresh rate.

## Checks and production build

```sh
npm test
npm run build
```

`npm test` checks TypeScript and runs eleven regression tests covering credit limits, upgrades, docking/refuelling, ammunition, stealth/shields, warp, investment, shared Path allegiance, final-ship loss, and stopping. GitHub Actions runs a clean install, type check, and production build on pushes and pull requests using Node.js 24. The production build writes the game and assets to `public/`. Serve that directory over HTTP, for example:

```sh
python3 -m http.server 3333 --bind 127.0.0.1 --directory public
```

## Project status

The original latest commit is `d711692`, dated 27 January 2019. This is a playable jam prototype with a generated galaxy, three AI opponents, mining, colonization, planet investment, trading, and weapons. There is no backend or account setup.

The local restoration refreshes the npm lockfile, pins the original engine/build dependencies, fixes a stale population property in the unfinished event generator, and gives event types explicit module imports/exports so the production compiler handles them correctly.

The classic solo pass follows the supplied screenshots and the 1994–1997 help manual for navigation, exploration, trading, colonization, allegiance, and equipment. It remains a remake, not emulation: full seven-empire diplomacy, banking/loans, finite shop stock, modem/network multiplayer, and saved games are not implemented. Ship and planet stats, damage, and economic rates are approximations, and the old scripted-event generator remains unfinished.

The original build toolchain is deprecated and npm reports dependency warnings; a tooling modernization is separate work. Compatible dependency fixes have been applied, and unused CSS build plugins removed (styles are served directly from the static directory). TypeScript is an explicit development dependency.

Use `npm audit` to inspect remaining dependency advisories. Do not run `npm audit fix --force` blindly: it proposes upgrading Brunch to a new major version whose package is now an unrelated project. A future build-tool migration should preserve Phaser 3.13 until gameplay compatibility has been tested separately.

## Source layout

- `app/scenes/default.ts`: scene setup and simulation loop.
- `app/ship.ts`, `app/enemy.ts`, `app/planet.ts`: player, AI, and planet behavior.
- `app/ui.ts`, `app/classic.ts`, `app/static/index.html`, `app/static/classic.css`: cockpit, menus, registration, and controls.
- `tests/gameplay.cjs`: regression tests for the ship and economy rules.
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

Laser, impact, torpedo, mine, mining, explosion, neutron, menu, and defeat effects use original WAVs. One-shot audio is released after playback, and laser firing plays once per shot. The installer has no music track, so the jam soundtrack is no longer played. The classic cockpit uses CSS panels and gauges, a lightweight starfield, and simple beam/particle helpers. `warpath.hlp` matches the help file preserved from this installer byte for byte.

## Original references

The layout was checked against the files in `screenshots/`, including the main cockpit, solo registration, and McDOW Investment Brokers. `warpath.hlp` was decompiled locally using [HelpDeco](https://github.com/pmachapman/helpdeco); its navigation, galaxy map, energy, colonies, investment, and weapons topics informed the rules above. HelpDeco reported unresolved legacy browse links, but the text and embedded illustrations were readable. The help file, installer, and supplied screenshots are reference material and are not needed to build or run the game.
