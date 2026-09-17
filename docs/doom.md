# DOOM — provenance & licensing

The Doom app (`components/os/apps/doom-app.tsx`) embeds `public/doom/index.html` in an `<iframe>`
once the user presses play. That page runs **js-dos v7** (DOSBox compiled to WebAssembly) and
loads `doom.jsdos`, a zip bundle with the game files and a DOSBox config.

| File                          | What it is                                                              | Licence           |
| ----------------------------- | ----------------------------------------------------------------------- | ----------------- |
| `public/doom/js-dos/*`        | js-dos 7.x runtime: `js-dos.js/css` + `wdosbox.js/.wasm` (DOSBox)      | GPL-2.0 (js-dos)  |
| `public/doom/doom.jsdos`      | id Software's **DOOM 1.9 shareware** release (`DOOM.EXE`, `DOOM1.WAD`)  | shareware — freely redistributable |
| `doom.jsdos:.jsdos/*`         | `dosbox.conf` (autoexec runs `DOOM.EXE`) + `jsdos.json` (touch layers) | config            |

The shareware files came from id's official `doom19s.zip` (a DEICE self-extracting archive; the
two volumes concatenate into a plain zip). **Do not** replace `DOOM1.WAD` with `DOOM.WAD` — the
registered game is not redistributable.

To rebuild the bundle: unzip the shareware release, add `.jsdos/dosbox.conf` with
`[autoexec] mount c . / c: / DOOM.EXE`, and `zip -r doom.jsdos .` from inside that folder.
