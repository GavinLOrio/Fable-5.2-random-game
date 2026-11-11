# Two browser games

This repository holds two separate 3D games. Each is a single self-contained HTML file.

- **Aquila** (`rome/index.html`): an open-world action game set in the Roman civil war, 49-44 BC. See below.
- **Dawnward** (`index.html`): a smaller fantasy action game.

# Aquila

You are a courier in Caesar's Thirteenth Legion. Follow the civil war from the Rubicon to the Ides of March across a
map built from the real coastline of the Mediterranean, with 43 places at their true positions.

- Main story in eight chapters with historical figures, plus ten side quests and sixteen bandit camps.
- Travel on foot, on horseback (faster on Roman roads) and by galley. Places you have visited can be reached again by fast travel from the map.
- Solid world: push against a wall to climb it, walk the rooftops, stairs and piers; enemies climb after you.
- Stealth: enemies only notice what is in their line of sight (or what they hear). Sneak up from behind, or drop from above, to assassinate.
- Hands-on combat: strike, block, parry, dodge and throw pila. Period weapons, shields, armour and helmets to buy, find and earn.
- Three save slots plus autosave, and settings for graphics, controls, difficulty and sound.

| Action | Keyboard and mouse / trackpad | Touch |
| --- | --- | --- |
| Move | WASD | Drag the left side |
| Look, zoom | Click once then move the pointer (or drag, set in Settings); scroll or pinch | Drag the right side, pinch |
| Climb | Keep pushing into a wall | Same |
| Sneak | C | Mask button |
| Strike | J or click | Sword button |
| Block (parry if timed) | K, Shift or right-click | Shield button |
| Dodge | Space | Arrows button |
| Throw pilum, eat bread | F, R | Javelin and bread buttons |
| Talk, trade, sail | E | Tap the prompt |
| Horse | H | Horse button |
| Map, gear, quests, menu | M, I, L, Esc | Buttons at the top right |

Build with `node tools/build.mjs rome`. The coastline mask is generated from Natural Earth data by `node tools/genland.mjs`.

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
```

Source lives in `src/` (three.js, bundled with esbuild).
