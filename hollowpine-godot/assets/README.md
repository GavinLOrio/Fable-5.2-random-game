# Assets

| Folder | For |
| --- | --- |
| `models/` | Meshes in glTF (`.glb`), the format Godot imports best; FBX also works |
| `textures/`, `materials/` | PBR texture sets and the Godot materials built from them |
| `hdri/` | Sky and lighting HDRIs |
| `audio/`, `ui/` | Sound and interface art |
| `third_party/` | Full downloaded packs before they are trimmed; kept out of git because of size |

Keep a line per pack in `LICENSES.md` here: name, source link, licence and date downloaded. Use only CC0, MIT or Fab Standard License content, or packs bought with a licence that allows a game release. Avoid "non-commercial" and "no derivatives" licences.

Megascans from Fab download as FBX or glTF with texture sets; import the LOD you need and let Godot generate the mesh LODs.
