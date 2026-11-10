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
npm run build   # bundles src/ into index.html
```

Source lives in `src/` (three.js, bundled with esbuild).
