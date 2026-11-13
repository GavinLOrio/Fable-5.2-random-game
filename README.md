# Three browser games

This repository holds three separate 3D games. Each is a single self-contained HTML file.

- **Aquila** (`rome/index.html`): an open-world action game set in the Roman civil war, 49-44 BC. See below.
- **Dawnward** (`index.html`): a smaller fantasy action game.
- **Hollowpine** (`hollowpine/index.html`): a first-person survival game on a forested island. See below.

# Aquila

You are a courier in Caesar's Thirteenth Legion. Follow the civil war from the Rubicon to the Ides of March across a
map built from real coastlines, from Britain to Upper Egypt and from Spain to Mesopotamia, with 103 places at their true positions.

- Main story in eight chapters with historical figures, plus ten side quests.
- World activities: 28 enemy outposts to clear, 20 watchtowers to climb and survey from, 18 sunken wrecks to dive for, 12 beast hunts and 16 bandit camps.
- Swimming, and one tabbed menu for map, gear, quests and system.
- Travel on foot, on horseback (faster on Roman roads) and by galley. Places you have visited can be reached again by fast travel from the map.
- Solid world: push against a wall to climb it, walk the rooftops, stairs and piers; enemies climb after you.
- Stealth: enemies only notice what is in their line of sight (or what they hear). Sneak up from behind, or drop from above, to assassinate.
- Hands-on combat: strike, block, parry and throw pila. Period weapons, shields, armour and helmets to buy, find and earn.
- Three save slots plus autosave, and settings for graphics, controls, difficulty and sound.

| Action | Keyboard and mouse / trackpad | Touch |
| --- | --- | --- |
| Move | WASD | Drag the left side |
| Look, zoom | Click once then move the pointer (or drag, set in Settings); scroll or pinch | Drag the right side, pinch |
| Climb | Keep pushing into a wall | Same |
| Sneak | C | Mask button |
| Strike | J or click | Sword button |
| Block (parry if timed) | K, Shift or right-click | Shield button |
| Jump | Space | Arrows button |
| Throw pilum, eat bread | F, R | Javelin and bread buttons |
| Talk, trade, sail | E | Tap the prompt |
| Horse | H | Horse button |
| Map, gear, quests, menu | M, I, L, Esc | Buttons at the top right |

Build with `node tools/build.mjs rome`. The coastline mask is generated from Natural Earth data by `node tools/genland.mjs`.

# Hollowpine

You wash ashore on a 2 km wide island: mostly pine forest, with the abandoned town of Ashby, the harbor of Port Hallam, a snow-capped mountain and 27 named places to find.

- Survive: health, food, water and stamina; day and night; weather on a random timer (clear, overcast, rain, thunderstorm, fog, snow up high) that changes visibility, enemy sight, cold, rain collectors and crops.
- Gather and craft: fell trees and fallen logs, mine rock and ore, pick plants (wild flax has blue flowers), hunt, search crates and wrecks.
- Inventory: slot grid, belt and clothing slot with drag and drop. Every item has its own 3D model, used for its inventory picture and when it lies on the ground. Drop items (or drag them out of the inventory) and they land in front of you; look at one to see its name and press E to pick it up. Anything that does not fit in a full inventory falls to the ground. Dropped items are saved.
- Build: pick a blueprint, place its ghost, then carry materials to it piece by piece. Foundations, floors, walls, doors, stairs and roofs snap together and go up in thatch; a building hammer upgrades each piece to wood, stone and metal. High walls and climbable ladders for the perimeter; enemies attack what you build.
- Research: three research tables, each dearer than the last, unlock blueprints for scrap: iron tools and black-powder guns, war-era firearms, then modern weapons and armor.
- Farm: garden plots on open ground and planter boxes inside your base, seven crops, watering and rain.
- Fight: wolves, boars, bears, scavengers, riflemen and a warlord in Bunker 7.
- Saving: autosaves to the browser every few seconds and, when opened as a Claude artifact, to a private cloud save.

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Move, look | WASD, mouse (click to capture) | Left stick, drag the right side |
| Sprint, jump, crouch | Shift, Space, C | Push the stick fully, Jump, Low |
| Swing, fire, place | Left click | Hit |
| Aim | Right click | Aim |
| Use, gather, add material | E (hold on blueprints) | Use |
| Reload, turn blueprint | R (or wheel) | Load, Turn |
| Dismantle | Hold X | |
| Hotbar | 1 to 8, wheel | Tap a slot |
| Pack and crafting, building, map | Tab, B, M | Pack, Build, Menu |

Build with `node tools/build.mjs hollowpine`.

# Dawnward

A 3D open-world action game that runs in any modern browser, on desktop or phone.

The isle is trapped in an endless night. Cross six regions, kindle the six ancient
beacons, grow stronger with every level, and face the Umbra Titan at the Crown to
bring back the sun.

## Play

Open `index.html` in a browser. It is a single self-contained file: no install, no
server and no network connection are needed. Progress saves automatically.

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Drag the left side of the screen |
| Look around | Drag the mouse, or Q / E | Drag the right side of the screen |
| Dash (brief invulnerability) | Space | Dash button |
| Zoom | Mouse wheel | Pinch |
| Pause | Esc or P | Pause button |
| Mute | M | Speaker button |

Your lantern attacks on its own, so the game is about movement: where you stand,
when you dash, and which boons you pick each time you level up.

## Develop

```
npm install
npm run build   # bundles src/ into index.html (Dawnward)
node tools/build.mjs rome   # bundles rome/src/ into rome/index.html (Aquila)
node tools/build.mjs hollowpine   # bundles hollowpine/src/ into hollowpine/index.html (Hollowpine)
```

Source lives in `src/` (three.js, bundled with esbuild).
