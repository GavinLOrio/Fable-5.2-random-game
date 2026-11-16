# Hollowpine (Godot 4.7)

The start of a Godot 4 version of Hollowpine, the browser survival game in `../hollowpine/`. The goal is the same game with much better graphics: photoscanned forest, rock and building assets, real-time global illumination, volumetric fog and proper shadows.

Nothing of the game has been ported yet. This folder is the set-up: project settings, input map, folder layout, the game data, and a test scene you can walk around in.

## Open it

1. Install Godot 4.7 (the standard build, not .NET) from godotengine.org/download.
2. In the Project Manager choose **Import**, pick this folder's `project.godot`, then **Import & Edit**.
3. Press F5 to run. You start on a flat test ground under a physical sky. WASD to move, mouse to look, Shift to sprint, Space to jump, C to crouch, Esc to free the mouse.

The first import takes a minute while Godot builds its cache in `.godot/` (not committed).

## What is here

| Path | What it is |
| --- | --- |
| `project.godot` | Forward+ renderer (Vulkan, Metal on macOS), Jolt physics, TAA and MSAA, 8K soft sun shadows, named physics layers, and the full input map |
| `data/*.json` | Every table from the browser game: 89 items, 56 recipes, research, 25 structures, building tiers, loot, creatures, crops, weather, fuel/cooking/smelting and container layouts |
| `scripts/autoload/game_data.gd` | Loads the data at start-up. Use `GameData.item("log")` or `GameData.table("recipes")` |
| `scripts/player.gd`, `scenes/player.tscn` | A plain first-person walker for testing |
| `scenes/main.tscn` | Test scene: physical sky, SDFGI global illumination, SSAO, SSIL, glow, volumetric fog, shadowed sun, 400 m ground |
| `assets/` | Where imported models, textures, materials, HDRIs, audio and UI go; see `assets/README.md` |
| `tools/export_data.mjs` | Re-exports `data/` from `../hollowpine/src/data.js` (run from the repository root with Node) |
| `tools/bootstrap.gd` | Rebuilds the input map and the two scenes (`godot --headless --path . --script res://tools/bootstrap.gd`) |
| `tools/smoke_test.gd` | Headless check that the project loads and runs |

## Plan for the port

1. Island terrain with the Terrain3D add-on (MIT, Godot Asset Library), shaped like the browser map: forest, Ashby town, Port Hallam harbor, the mountain and the lake.
2. Forest, rock and ground from Quixel Megascans (free on Fab) and Poly Haven, scattered with MultiMesh instancing.
3. Player: movement, swimming and oxygen, combat, gathering, inventory with belt and clothing slots.
4. Building with tiers and upgrades, containers (campfire, furnace, chests), crafting and research, driven by `data/`.
5. Creatures and scavengers, weather, day and night, saving, death and respawn.

The asset shortlist with licences is the "Hollowpine asset sources" sheet in the "Hollowpine 3D assets" folder on Google Drive.
