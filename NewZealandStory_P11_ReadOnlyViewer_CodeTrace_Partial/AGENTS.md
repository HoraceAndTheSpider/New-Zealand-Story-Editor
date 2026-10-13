# New Zealand Story (Amiga) — Project Instructions / AGENTS.md

**Consolidated handover baseline: P11, 13 October 2026.** This replaces accumulated P03–P10 prefatory instruction sections; technical evidence remains on the seven canonical Wiki pages. Do not add another cumulative `Pxx mandatory supplement` at the top. Update the relevant authoritative section instead.

## 1. Purpose and mandatory startup

Reverse-engineer original Amiga *The New Zealand Story* code/data in `whdload/Disk.1` and build a standalone HTML5 map/tile/object/sprite editor with faithful import, viewing and ultimately safe export for WHDLoad. Reuse appropriate UI/drawing components of `HoraceAndTheSpider/Indy-Heat-WHD`, not its game-specific data models.

Start each new thread/pass by (1) reading this file, (2) reading the **current Dropbox `wiki/`** and only relevant subject pages, (3) reading owning source in `app/` when implementing, (4) reading specific `research/` evidence scripts only as necessary to reproduce unresolved facts, and (5) checking owner-provided live Amiga/browser results. Never restart settled disk analysis without contradictory evidence. `Disk.1` and owner runtime observations are primary evidence. Prior research ZIPs are historical references, not current production authority.

**All Dropbox/GitHub work is read-only** unless separately and explicitly authorised. The user controls copying files and all GitHub pushes/commits. Always deliver complete replacement files in a **single ZIP**, not code fragments, patch notes, `-append`, `-merge` or duplicate Wiki pages.

## 2. The Wiki is the *only* durable technical source of truth

Canonical seven pages, no additional open-question logs:

- `wiki/01-disk-and-binary-layout.md` — file regions, encodings, relocation and source/runtime mapping.
- `wiki/02-maps-and-tiles.md` — map offsets, dimensions, native tiles, palette and tile semantics.
- `wiki/03-game-objects-and-entities.md` — actor records, generator scripts, pickup candidates, starts, goals, warps.
- `wiki/04-game-code-and-runtime.md` — source-matched 68000 routines, pointers and rendering logic.
- `wiki/05-further-investigations.md` — **one and only one** investigation queue, maintained continuously.
- `wiki/06-app-architecture.md` — editor components, data contracts, overlays and UI behaviour.
- `wiki/07-app-editing-and-export.md` — supported writers and safety/relocation constraints.

**Figures belong inside the Wiki**: place selected, comprehensible, original-source-linked PNGs in `wiki/images/` and embed relative Markdown links from relevant Wiki pages. `research/` and root `visuals/` are **temporary**, for debugging, testing and reproduction only; assume they will be deleted. A fact essential for future work may not depend solely on those temporary folders, unsaved chats or scripts. When deleting either temporary folder would break the Wiki, the migration is incomplete. Preserve code excerpts, source addresses/offsets, record fields, endianness, sample raw bytes, test results and confidence in Wiki prose; include a reproducible sketch or pseudocode when useful. Keep the Wiki human-readable, not a log of research passes.

**Replace/curate, do not accumulate.** Never create `*-append.md`, `*-merge.md`, `Pxx` research pages, redundant notes, `evidence/` or `passes/` folders as canonical sources. Rework existing pages into coherent *subject* sections as knowledge improves; remove/supersede obsolete claims. Research scripts and raw manifests may temporarily live outside the Wiki, but relevant specifications/results must be copied into the Wiki before the temporary directories are removed. Provide *complete files*, never textual diffs.

## 3. Immediate P11 priority — original moving sprites are mandatory

**Original sprite extraction remains the open acceptance gate even though P11 now includes a read-only entity viewer and native movement/control stream consumer at Disk `$8AB04/$8AB32` (see Wiki 04). Next pass must solve authentic moving graphics sufficiently to display recognisable Tiki, enemies and pre-placed pickup art. DO NOT defer graphics extraction again.** The P04/P10 stripe/fragment bitmap tests are **not validated**: likely wrong bitplane interleave, dimensions, frame offsets, masks and/or palette. Never label them as identified sprites or use them in the editor as artwork. Do not re-run arbitrary RAM scanning as the main strategy.

Follow the **original actor animation/control stream → image-index resolver → bitmap pointer/record → plane/mask layout → native palette → rendering/blitter code**, and then backwards to `Disk.1` source/decompression. Proven sequence anchors (RAM → Disk): actor `$04` `$080D8` → `$8804E`; `$05` `$08DD8` → `$88D50`; `$06` `$0832A` → `$882A2`; `$1F` `$07558` → `$874CE`; `$20` `$075A6` → `$87518`. `$1F` sequences include `$B0`-range control words; `$20` begins `$CA–$CF`. **Do not assume these positive words are image IDs**: native source `$8AB04/$8AB32` proves that at least one routine uses high/low control words as movement countdown and position increments. The image-ID consumer is not yet isolated. Use native source plus the supplied savestate, seek code-level connection to Tiki's player sprite frames. Verify bitmap size, stride, plane order, masks, transparency and palette (do not assume the background tile palette applies).

**Delivery acceptance:** recognisable, pixel-exact native-colour PNG contact sheets including at least one *proved* player/Tiki frame, one enemy actor/generator frame and one pickup; every sample labelled by source offset, loaded address, index, dimensions, decoded format and evidence/confidence. If full extraction remains blocked, show the exact debugger/code blocker and provide whatever authentically proven subset and viewer work has succeeded; do not again substitute wrong-looking art probes for results. Add the confirmed graphics to `wiki/images/` with subject-page explanations.

## 4. Next implementation — mostly read-only entity viewer

The production P03 editor supports 21 native maps and tiles, disk-derived palettes, zoom, drawing and map-only byte-preserving export. P11 adds **read-only** `nzs-entities.js` and an updated `index.html` on top of it; P04–P10 did not ship editor changes. The P11 viewer passes tests using the unmodified original disk, but **does not yet render authentic moving sprites**. Build on P03; don't regress its tests or file:// usability. Integrate **read-only overlays**, with visibility groups: player-entry candidate, normal/boss objective, ordinary warp sources and incoming destination, independent header fields, `$03` generators with 19 variants, direct actors and bonus/pickup candidates `$1F/$20`. Mark hypotheses as such. Use authenticated native sprite images where traced. Place/edit controls for unverified structures remain clearly disabled.

**User-reported display bug — mandatory:** earlier placement markers, most obviously collectibles, all appear approximately **one full 16px tile too low**. DO NOT change stored binary coordinates to fix a presentation issue. Trace top-down placement Y versus bottom-up 64×64 map rows versus sprite top/bottom/feet anchor and image dimensions. Use genuine sprites to prove pixel-exact X/Y projection and produce before/after annotated 1-1, 1-2, 2-2 and 3-4 PNGs. Applies across object/warp previews only after their distinct coordinate conventions are understood.

**UI contract:** top toolbar (load/import/export/Undo/Redo), left navigation/level list/overview/overlay visibility, central primary canvas, right compact tiles, items, brushes and eventual tile editor. Intuitive controls and tooltips, **no explanatory paragraphs/test prose in the UI**; put all underlying technical detail in the Wiki. British English. Reuse Indy Heat's generic `layer-tools.js` raster geometry/painting approaches, palette/brush concepts, not race-dependent code. Only one edit mode active; overlay visibility independent. Support mobile review by delivering labelled PNGs rather than requiring desktop demos.

## 5. Accepted data and code — don't rediscover in targeted tasks

- Original `Disk.1` 901,120 bytes; SHA256 `fec7ce66934497b65745aa658599bdc697cf0ea0111d77d211fce3f48e27b416`; snapshot `Stage 1_1.uss` SHA256 `4656b4af4322ce946cd8cf0decf843ffb5a8cf7e80fbf153df5c0a2fe317cadb`. Savestate mappings are snapshot-specific. Raw DOS\0 disk header does not imply ordinary filesystem access.
- 21 source maps stored 64×64 bytes and a `$80` header directly preceding each `$1000` grid. Width `+$02`=64, height `+$04`=14/32/48/64. Coordinate-like words `+$0E/+10` are **not proved to be warp arrivals**. Native map stored bottom-up. **Correct 3-4 map `$46280` (not obsolete AMOS `$4BA80`); 5-3 map `$79080`.** Legacy AMOS is a clue, not authority for overrides.
- 16 compressed native tile-graphics banks, 16×16px × 4 bitplanes; 16 native 3-bit-channel palette words per bank; tile decode in `app/nzs-graphics.js`. Some out-of-bank tile references in 1-1,1-2,1-3,4-4 occur only outside header-declared height; preserve stored bytes. The tile palette was checked against saved chipset colours; not a proven moving-actor palette.
- 599 original four-byte placement records across 21 levels, Disk `$8CFE4–$8D992`, packed with no growth room. Field order `{type, X, Y, parameter}`. Special first type `$00`, normal objective candidate `$01`, boss candidate `$02`. Do not call `$00`, header pair and warp arrival the same thing.
- Type `$03` = original code's **door/actor generator**, not proven teleport door. 298 placements; 32 runtime generator slots (16 bytes each), 19 indexed descriptors (stock uses 0–17), proximity thresholds and control scripts via RAM `$060B4`; scripted factory requests share actor factory RAM `$05872`. Separate generator-child actor allocation scans five live slots of `$3A` bytes, not global on-screen creature cap.
- Factory RAM `$05872` indexes 46 documented 12-byte actor descriptors at RAM `$058D2`, with source/runtime pointers not necessarily directly interchangeable. Direct pre-placed actors include `$1F` (29 entries, handler RAM `$0767A`) and `$20` (30, parameters 0–5; contact RAM `$075D8` → `$066EC`, loads 1000, calls numeric updater `$05452`). `$20` likely bonus/pickup; exact identity/reward remains unproved.
- Native **ordinary** transition table: 20 × 8-byte loaded records at RAM `$04B02`, 12 configured, 8 empty; `Disk.1` `$84B14–$84B7F` is a 108-byte `$95`-RLE source adjacent to executable; do not expand in place or assume every warp is represented. P09 maps all configured transitions, including 1-1..1-4 source warps. Source points and approximate incoming pixel coordinates are different units. User remembers arrival to 1-3, not found in this table.
- User confirms rescuing trapped kiwi on **4-4 enters alternate 4-4b instead of normal boss**. Alternate mode flag `+$26(A6)` set RAM `$04632`, changes actor list and tile classification; real trigger/arrival yet untraced.
- 4-4 and 4-4b tile classification contains 20 and 56 16-bit entries respectively; gameplay meaning of nibbles remains unverified. Level `$580` trailers unidentified.

## 6. Edit/export safety and relocation

- Original `Disk.1` must be immutable on load; unchanged export must be **byte-for-byte identical** to stock. Map-only edits modify only named, verified 4096-byte map ranges. Preserve rest of raw 901,120-byte image exactly.
- **Do not enable writing actors, `$03` scripts, warps, sprite graphics, tile bank compression or palette editing** from the viewer until native encoder/loader/relocation are implemented, checksummed, source pointers repaired, original capacity validated and owner tests on Amiga/WHDLoad. No speculative repacking.
- Placement lists tightly packed, special 4-4b hard-coded pointers, 20-row transition source compressed from 160 to 108 bytes, actor pointers rebased on load; increasing content requires a deliberate sidecar/relocation or verified repacker and all real-time references/capacity checks. Adding zero-entry warps in-place may overwrite adjacent code. Treat alternative runtime resource arrangements as proposals until tested.
- Every new decoder or writer needs focused reproducible tests; Amiga results from user override preview assertions.

## 7. Pass workflow, stop rules and deliveries

**Research mode (only for genuine unknowns):** inspect relevant Wiki, choose specific code branch and evidence target, trace at source, verify on original bytes and optionally a save state, deliver full updated Wiki replacement pages, curated `wiki/images` PNG proof, updated sole investigation queue and required reproduction data. Stop when acceptance evidence exists; don't run unrelated scans or regenerate 146 old pictures. Never return only a progress report after substantial research.

**Implementation mode (local fix):** owning source → minimal change → one focused syntax/round-trip/browser check → complete ZIP. Never re-audit settled Disk/waypoints/graphics unless the owning file reveals contradiction. For the specific P11 graphics task the trace is mandatory and should not be treated as optional background work.

**Package format:** `AGENTS.md` at root if changed; whole replacement `wiki/*.md`, selected `wiki/images/*.png`; whole replacement changed `app/*` when implemented; optional reproducibility artefacts only if needed. Temporary handover text can be included at the ZIP root but is **not** a new Wiki page. Explicitly label any unconfirmed PNGs as diagnostics, not game art. Verify all internal Wiki links and ZIP paths. User installs/copies/pushes; never mutate Dropbox/GitHub without approval.