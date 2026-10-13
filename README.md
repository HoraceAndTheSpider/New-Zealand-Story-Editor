# New Zealand Story Amiga Editor — P02

Open **`app/index.html`** in your browser. All 21 maps and scenery tiles are displayed from graphics **extracted from the supplied original Disk.1**, not from the older `Tiles PNG.zip`. The app includes disk-derived previews, so it works immediately offline. Click **Open Disk.1** to load your 901,120-byte game image; the app will decode all 16 graphics banks anew and allow the full disk to be exported after tile-map edits.

**Corrected:** 3_4 map offset `$46280` (P01 used the wrong `$4BA80`); 5_3 visuals now use the correct original tile order from native bank 14.

**Binary safety:** Only existing 64×64 map byte grids can be edited/exported. Full disk export preserves all other game data, and the original disk is not included here. Pixel-tile editing/recompression, native palette recovery, sprite banks and object/warp editing remain future investigations. The RGB indexed palette is currently reference-derived, not yet proven from 68000 colour setup.

The seven compact Wiki pages and `AGENTS.md` record established research and project guidance. Tests are optional and require Node: `node tests/test-core.js /path/to/Disk.1`.
