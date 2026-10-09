#!/usr/bin/env python3
"""Rakit Dashboard_CAK_PRI_PIGroup_v3.html dari HTML acuan v2beta + modul v3.

Prinsip: kode mesin PKG (v2beta) tidak diubah logikanya. Build hanya
- membungkus isi tiap <section id="sec-*"> ke .ent-pkg dan menambah wadah
  .ent-gen untuk entitas gas & konsolidasi,
- memasang kait (hook) kecil di navigasi tab, paintAll, dan pemuat berkas,
- menyematkan data dummy, ENTITY_PROFILES, dan mesin v3.
Setiap penggantian teks diperiksa tepat satu kali; bila acuan berubah,
build berhenti alih-alih menghasilkan berkas yang diam-diam salah.

Pakai:  python3 src/build.py  (dari akar repo)
"""
import json, re, sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
ACUAN = AKAR / 'ref' / 'Dashboard_CAK_PRI_v2beta_04Oktober2026.html'
DUMMY = AKAR / 'data' / 'DUMMY_CAK_PRI_PIGroup_data.json'
KELUAR = AKAR / 'Dashboard_CAK_PRI_PIGroup_v3.html'
SRC = AKAR / 'src'
JS_V3 = ['entity_profiles.js', 'cak_core.js']   # urutan penting


def ganti(s, lama, baru, n=1):
    k = s.count(lama)
    if k != n:
        sys.exit(f'build: pola ditemukan {k}x (harus {n}x): {lama[:90]!r}')
    return s.replace(lama, baru)


def main():
    h = ACUAN.read_text(encoding='utf-8')

    # ---- kepala dokumen ----
    h = ganti(h, '<title>CAK PRI v2 beta · Stok Bahan Baku &amp; Produk · Petrokimia Gresik</title>',
              '<title>CAK PRI v3 · PI Group</title>')
    css = (SRC / 'cak_core.css').read_text(encoding='utf-8')
    h = ganti(h, '<script>/* SheetJS mini', f'<style>\n{css}</style>\n<script>/* SheetJS mini')
    h = ganti(h, '</head>\n<body>', '</head>\n<body data-ent="PKG">')

    # ---- kepala halaman ----
    h = ganti(h, '<img id="logo" alt="Petrokimia Gresik">',
              '<img id="logo" class="pkgonly" alt="Petrokimia Gresik"><span id="logoPh" class="logoph genonly"></span>')
    h = ganti(h, '<div class="unit"><b>Direktorat Manajemen Risiko</b>',
              '<div class="unit" id="brandUnit"><b>Direktorat Manajemen Risiko</b>')
    h = ganti(h, '<div class="titlerow">\n    <img src=', '<div class="titlerow">\n    <img class="pkgonly" src=')
    h = ganti(h, '<span class="chip" id="chipSumber">', '<span class="chip pkgonly" id="chipSumber">')
    h = ganti(h, '<span id="umur"></span>', '<span id="umur" class="pkgonly"></span>')
    h = ganti(h, '<span class="chip" id="chipKonsumsi">', '<span class="chip pkgonly" id="chipKonsumsi">')
    h = ganti(h, '<span class="chip hot">Konteks <b>Selat Hormuz</b></span>',
              '<span class="chip hot pkgonly">Konteks <b>Selat Hormuz</b></span>'
              '<span id="chipGen" class="genonly" style="display:contents"></span>')
    h = ganti(h, '<span class="chip">Versi <b>v2 beta</b></span>', '<span class="chip">Versi <b>v3 · PI Group</b></span>')
    h = ganti(h, '<input type="file" id="fileMaster" accept=".xlsx,.xlsm" style="display:none">',
              '<input type="file" id="fileMaster" accept=".xlsx,.xlsm,.json" multiple style="display:none">')
    h = ganti(h, 'title="Baca berkas data Dalops terbaru">', 'title="Baca satu atau beberapa berkas Dalops (PKG, PKT, PIM, PSP, PKC)">')
    h = ganti(h, '</header>',
              '''  <div class="entbar" role="group" aria-label="Pilih entitas">
    <span class="entlab">Entitas</span><div class="entbtns" id="entbtns"></div>
    <div class="entstat" id="entstat"></div>
  </div>
  <div class="dummyribbon" id="dummyRibbon" role="note" hidden></div>
</header>''')
    h = ganti(h, '<div class="alert" id="alert" role="status"></div>',
              '<div class="alert pkgonly" id="alert" role="status"></div>')
    h = ganti(h, '<footer id="foot"></footer>',
              '<footer id="foot" class="pkgonly"></footer>\n<footer id="gfoot" class="genonly"></footer>')

    # ---- bungkus modul ----
    pola = re.compile(r'<section id="sec-([a-z]+)">(.*?)</section>', re.S)
    jumlah = len(pola.findall(h))
    if jumlah != 14:
        sys.exit(f'build: jumlah section {jumlah}, harus 14')
    h = pola.sub(lambda m: f'<section id="sec-{m.group(1)}"><div class="ent-pkg">{m.group(2)}</div>'
                           f'<div class="ent-gen" id="gen-{m.group(1)}"></div></section>', h)
    h = ganti(h, '<!-- ============ 01 STOK BAHAN BAKU ============ -->',
              '<!-- ============ 00 PETA RISIKO PI GROUP (konsolidasi) ============ -->\n'
              '<section id="sec-grup" hidden><div class="ent-gen" id="gen-grup"></div></section>\n\n'
              '<!-- ============ 01 STOK BAHAN BAKU ============ -->')

    # ---- kait di mesin PKG ----
    h = ganti(h, " monitor:[['stok','Bahan Baku'],", " monitor:[['grup','Peta Risiko PI Group'],['stok','Bahan Baku'],")
    h = ganti(h, "const bawah = (ISI_KELOMPOK[kelAktif]||[]).map(([id,label])=>",
              "const bawah = (ISI_KELOMPOK[kelAktif]||[]).filter(t=>CAK_TABOK(t[0])).map(([id,label])=>")
    h = ganti(h, "const pertama=(ISI_KELOMPOK[kelAktif]||[])[0];",
              "const pertama=(ISI_KELOMPOK[kelAktif]||[]).filter(t=>CAK_TABOK(t[0]))[0];")
    h = ganti(h, "  bawaKeModul(id);\n}", "  bawaKeModul(id);\n  CAK_HOOK('tab',id);\n}")
    h = ganti(h, "paintPeringatan(); setTab(tabAktif);}", "paintPeringatan(); setTab(tabAktif); CAK_HOOK('paintAll');}")
    h = ganti(h, "  const i=TABS.findIndex(t=>t[0]===tabAktif);\n"
                 "  if(e.key==='ArrowRight'){e.preventDefault(); setTab(TABS[(i+1)%TABS.length][0],true);}\n"
                 "  if(e.key==='ArrowLeft'){e.preventDefault(); setTab(TABS[(i-1+TABS.length)%TABS.length][0],true);}\n"
                 "  if(e.key==='Home'){e.preventDefault(); setTab(TABS[0][0],true);}\n"
                 "  if(e.key==='End'){e.preventDefault(); setTab(TABS[TABS.length-1][0],true);}",
              "  const TB=TABS.filter(t=>CAK_TABOK(t[0]));\n"
              "  const i=TB.findIndex(t=>t[0]===tabAktif);\n"
              "  if(e.key==='ArrowRight'){e.preventDefault(); setTab(TB[(i+1)%TB.length][0],true);}\n"
              "  if(e.key==='ArrowLeft'){e.preventDefault(); setTab(TB[(i-1+TB.length)%TB.length][0],true);}\n"
              "  if(e.key==='Home'){e.preventDefault(); setTab(TB[0][0],true);}\n"
              "  if(e.key==='End'){e.preventDefault(); setTab(TB[TB.length-1][0],true);}")
    # pemuat satu berkas v2beta diganti pemuat multi-berkas v3 (cak_core.js)
    awal = h.index("/* muat data Dalops terbaru langsung dari peramban */\n(function(){")
    akhir = h.index("    fr.readAsArrayBuffer(f);\n  });\n})();", awal) + len("    fr.readAsArrayBuffer(f);\n  });\n})();")
    h = h[:awal] + "/* muat data Dalops: diganti pemuat multi-berkas v3 (CAK.init) */" + h[akhir:]

    # stub sebelum mesin PKG berjalan (setTheme di akhir skripnya memanggil paintAll)
    h = ganti(h, '<script>\nconst D = ', "<script>window.CAK_TABOK=function(id){return id!=='grup'};"
                                            "window.CAK_HOOK=function(){};</script>\n<script>\nconst D = ")

    # ---- sematkan data dummy + mesin v3 setelah skrip PKG ----
    dummy = json.loads(DUMMY.read_text(encoding='utf-8'))
    dj = json.dumps(dummy, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    js = '\n'.join((SRC / f).read_text(encoding='utf-8') for f in JS_V3)
    sisip = (f'<script>/* data dummy PKT, PIM, PSP, PKC (fiktif) */\nconst CAK_DUMMY={dj};</script>\n'
             f'<script>\n{js}\n</script>\n')
    # skrip utama PKG ditutup tepat sebelum skrip pembungkus tabel
    tanda = "</script>\n<script>\n(function(){function bungkus(){"
    h = ganti(h, tanda, "</script>\n" + sisip + "<script>\n(function(){function bungkus(){")

    KELUAR.write_text(h, encoding='utf-8')
    print(f'build: {KELUAR.name} {KELUAR.stat().st_size/1e6:.2f} MB')


if __name__ == '__main__':
    main()
