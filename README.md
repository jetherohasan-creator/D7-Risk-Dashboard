# Dashboard CAK PRI · PI Group v3

Satu berkas HTML mandiri (luring, tanpa server): `Dashboard_CAK_PRI_PIGroup_v3.html`.

- `ref/` — acuan: dashboard PKG v2beta 04 Oktober 2026 dan Panduan Fitur.
- `data/` — berkas Dalops **DUMMY** PKT, PIM, PSP, PKC (angka fiktif) dan JSON gabungannya.
- `src/` — `entity_profiles.js` (ENTITY_PROFILES), `cak_core.js` (store, adaptor, pemuat, pemilih entitas), `cak_gas_model.js` (model & simulasi entitas gas), `cak_gas_ui1.js`/`cak_gas_ui2.js` (modul generik), `cak_core.css`, `build.py`.
- `tests/` — `regresi_pkg.mjs` (uji regresi wajib PKG vs v2beta), `pemuat.mjs` (pemuat multi-berkas).
- `docs/` — laporan per tahap.

```bash
python3 src/build.py          # rakit HTML v3
node tests/regresi_pkg.mjs    # PKG harus identik dengan v2beta
node tests/pemuat.mjs
node tests/model_node.cjs     # skenario dasar = rencana Dalops
node tests/interaksi.mjs
node tests/teks_pkg.mjs       # teks khas PKG tidak bocor
node tests/tampilan.mjs PKT [dark] [390]
```
