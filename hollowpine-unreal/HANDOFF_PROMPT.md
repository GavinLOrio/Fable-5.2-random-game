# Hollowpine in Unreal Engine: set-up and port

You are working on my Mac (Apple MacBook Pro, computer name "Gavins-MacBook-Pro-2"). Your job is to get everything installed and downloaded for building **Hollowpine** in **Unreal Engine 5.8**, then set up the Unreal project and start porting the game with much better graphics. Work through the phases in order, tell me in one line what you are doing at each step, and stop to ask me whenever a step needs my password, an account sign-in, a licence acceptance or a payment. Never pay for anything. Ask before deleting anything.

## What Hollowpine is

Hollowpine is a first-person survival game I already have as a browser game (one HTML file, three.js).

- Play it: https://claude.ai/artifact/AuVSsS5hAfHepG2CsDAzXf
- Source: https://github.com/GavinLOrio/Fable-5.2-random-game (public), branch `claude/dreamy-fermi-6gljcz`
  - `hollowpine/src/` is the browser game: `main.js` (player, combat, survival, weather, saving, death and respawn, containers), `world.js` and `places.js` (terrain and every location), `nature.js` (plants, rocks, fallen logs, ground clutter), `build.js` (building), `entities.js` (animals and enemies), `items.js` and `models.js` (item and weapon models), `ui.js` (inventory, crafting, research, map), `data.js` (all game data).
  - `hollowpine-godot/data/*.json` is all of the game data exported as JSON (89 items, 56 recipes, research, 25 structures, building tiers, loot, creatures, crops, weather, fuel/cooking/smelting, container layouts, stack sizes). Use these for Unreal data tables. (`hollowpine-godot/` is an earlier Godot set-up; ignore the rest of it.)
  - `hollowpine-unreal/polyhaven_files.tsv` is a ready list of 221 free Poly Haven files (2.49 GB): trees, rocks, cliffs, ferns, stumps, ground textures and skies. Each line is `relative/path<TAB>url<TAB>bytes`.
- Asset shortlist with licences: the Google Sheet "Hollowpine asset sources" in the Google Drive folder "Hollowpine 3D assets": https://docs.google.com/spreadsheets/d/11vfRdXis56BnMIyMz0c-Gjl9-WfmePbS_4ytFQAPtqI/edit

The game: a 2 km island, mostly pine forest, with the abandoned town of Ashby, the harbor of Port Hallam with a freighter, a snow-capped mountain with a summit station, a lake, roads and 27 named places. Features to carry over:
- Survival: health, food, water, stamina, cold; swimming with diving and an oxygen bar; day and night; random weather (clear, overcast, rain, thunderstorm, fog, snow up high) that affects visibility, enemy sight, cold, crops and rain collectors.
- Gathering: fell trees and fallen logs, mine rock, iron and sulfur, pick berries, mushrooms and wild flax (tall blue-green stalks with blue flowers), hunt, loot crates, bodies and wrecks.
- Inventory like Rust: 24 stacking slots, an 8-slot belt (belt items are not in the grid), head, chest, legs, feet and back slots; cloth, hide, field and tactical armor sets; small, large and military backpacks (+6, +12, +18 slots); items dropped on the ground show their name when looked at and are picked up with E.
- Crafting and research: three research tables of rising scrap cost; weapons from stone tools, spear and bow through crossbow, flintlock and musket, war-era revolver, bolt-action, self-loading rifle, SMG and trench shotgun, to modern pistol, assault rifle, combat shotgun and scoped marksman rifle.
- Building like The Forest and Rust: place a blueprint, carry materials to it; foundations, floors, walls, doorways, windows, doors, stairs, roofs, high walls and ladders; everything starts in thatch and a building hammer upgrades it to wood, stone and metal; the piece under the crosshair is the one you build or upgrade.
- Containers like Rust: campfire and furnace with fuel, input and output slots (cooking, smelting, charcoal), chests, rain collector, garden plots and planter boxes with seven crops.
- Enemies: wolves, boars, bears, deer, scavengers, riflemen and a warlord in Bunker 7.
- Sleeping bags and beds; on death a map shows where and how you died and lets you pick which bag or bed to wake up at; a setting to keep the inventory on death; saving.

## Phase 0: check the Mac

1. Report macOS version, chip (`uname -m`; arm64 = Apple silicon), memory and free disk space. Unreal 5.8 plus assets needs a few hundred GB free; tell me if it is short.
2. Make the folder `~/Desktop/Hollowpine Unreal/` with subfolders `Installers`, `Assets`, `Project`.

## Phase 1: fix and install the Epic Games Launcher

I had trouble opening the Epic Games Launcher.
1. Look at what is installed (`/Applications/Epic Games Launcher.app`) and try opening it; read any error.
2. If it will not open: quit it, then move (do not delete) these into `~/Desktop/Hollowpine Unreal/Installers/old-launcher-cache/` and try again: `~/Library/Caches/com.epicgames.EpicGamesLauncher`, `~/Library/Application Support/Epic/EpicGamesLauncher/Saved/webcache*`.
3. If it still fails, download a fresh installer into `Installers/`: https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncher.dmg (this redirected to EpicInstaller-20.3.3.dmg, about 115 MB, on 17 Nov 2026), install it and open it.
4. I sign in. Then in the Unreal Engine tab → Library, install **Unreal Engine 5.8** (the current release; 5.8 came out on 17 June 2026). This is tens of GB; keep me posted on progress.

## Phase 2: other software

Download installers into `~/Desktop/Hollowpine Unreal/Installers/` and install them:
1. **Xcode** from the Mac App Store (needed to build Unreal C++ projects on a Mac; check the Xcode version the UE 5.8 release notes require). I may need to sign in with my Apple ID. Then run `xcode-select --install` for the command line tools and open Xcode once to accept its licence.
2. **Git LFS**: `brew install git-lfs` if Homebrew is installed (ask before installing Homebrew), otherwise the macOS zip from https://github.com/git-lfs/git-lfs/releases/latest. Run `git lfs install`.
3. **Blender 5.3.0** (free, for fixing models): https://download.blender.org/release/Blender5.3/blender-5.3.0-macos-arm64.dmg (Apple silicon).
4. **Unreal Engine Skills plugin for Claude** (official, by Epic Games, in the Anthropic plugin directory): it lets Claude Code drive the Unreal Editor through Unreal 5.8's built-in MCP server. I will install it from the plugin card if you show it (search the plugin catalog for "Unreal Engine Skills"). In Unreal: Edit → Plugins, enable "Unreal MCP" and "Editor Toolset" (reported names; check them), restart, then Editor Preferences → turn on "Auto Start Server".
5. Clone the repository into `~/Desktop/Hollowpine Unreal/Project/source`: `git clone -b claude/dreamy-fermi-6gljcz https://github.com/GavinLOrio/Fable-5.2-random-game.git source`.

## Phase 3: 3D assets

1. **Poly Haven starter set (CC0, no account):** download every line of `source/hollowpine-unreal/polyhaven_files.tsv` into `~/Desktop/Hollowpine Unreal/Assets/PolyHaven/<relative path>` with `curl -fL --retry 3 -C -`, then check the sizes match the third column. Models are FBX with 2K textures, textures are 2K with DirectX normal maps, skies are 2K HDR.
2. **Quixel Megascans and Megaplants (free on Fab since 5 November 2026, Fab Standard License):** in the editor's Fab window (or fab.com, seller "Quixel"), signed in as me, add to my library and import: pine and spruce trees, forest-floor and moss surfaces, mossy boulders and cliffs, coastal rocks and sand, snow and alpine rock, ferns, grasses and bushes, logs, stumps and branches, and ruined, concrete, brick, rust and wood surfaces for the town and harbor. Also the Megascans "Abandoned Factory" set and the "Derelict Corridor" sample if they show on Fab. I accept each licence myself.
3. **Epic samples (free):** Game Animation Sample Project (motion-matched first-person and third-person animation; listed as updated for 5.8) and MetaHuman for the people (scavengers, riflemen, warlord). Check each listing's terms.
4. **Placeholders while prototyping (CC0):** Quaternius survival props, guns (https://quaternius.itch.io/50-lowpoly-guns) and animated animals (https://quaternius.com), Kenney packs (https://kenney.nl). The Drive sheet lists more, including harbor and town kits to price-check on Fab.
5. Keep `Assets/LICENSES.md` with one line per pack: name, link, licence, date.

## Phase 4: the Unreal project

1. Create a **C++ First Person** project named `Hollowpine` in `~/Desktop/Hollowpine Unreal/Project/`, Maximum quality, with starter content off.
2. Set up Git with Git LFS (`.gitattributes` tracking `*.uasset`, `*.umap`, textures, FBX) and a `.gitignore` for `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`. Ask me before creating any new GitHub repository.
3. Enable: Enhanced Input, PCG, Water, Landscape tools, World Partition, Fab, and the Unreal MCP plugins above.
4. Turn the JSON in `source/hollowpine-godot/data/` into Unreal data tables with matching row structs (items, recipes, research, structures, tiers, loot, creatures, crops, weather, containers).

## Phase 5: port the game, milestone by milestone

Build each milestone, let me play it, and commit before moving on. Use the browser game's code as the reference for behaviour and numbers.
1. **Walk the island.** Landscape (2 km, World Partition) shaped like the browser map: forest everywhere, Ashby town in the east, Port Hallam harbor in the south, the mountain to the north-west, the lake in the west, roads between them (layout and heights in `world.js` and `places.js`). Megascans forest scattered with PCG, Lumen lighting, sky, volumetric clouds and fog, water and the sea. First-person player with sprint, crouch, jump, swimming and oxygen.
2. **Survive.** Health, food, water, stamina, cold, day and night, the weather cycle, sound.
3. **Gather and craft.** Harvestable trees, fallen logs, rocks, ores and plants; the inventory, belt, clothing and backpack slots; crafting and the three research tables; dropped items.
4. **Fight.** Melee, bow and gun handling (aim, recoil, reload) using the Game Animation Sample; wildlife and human enemies with State Trees.
5. **Build.** Blueprints, snapping, tiers and hammer upgrades, doors, ladders, high walls; containers (campfire, furnace, chests, collector, farming).
6. **Places and loot.** Ashby, Port Hallam and the freighter, the mountain stations, cabins, camps, stockades, the bunker, crates.
7. **Close the loop.** Saving, sleeping bags and beds, the death map and respawn choice, keep-inventory setting, menus, the island map.
8. **Ship.** Package a Mac build (and Windows if I ask).

Unreal cannot export to the browser, so the result is a downloadable game, not a claude.ai artifact. Keep the browser version as it is.

## Report back

After each phase, tell me what is installed or downloaded (with folder paths and sizes), what failed and why, and what you need from me next.
