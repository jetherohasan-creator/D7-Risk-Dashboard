# Tahap 2 · Rekayasa Ulang Inti — Dashboard CAK PRI PI Group v3

Tanggal: 9 Oktober 2026 · keluaran: `Dashboard_CAK_PRI_PIGroup_v3.html` (satu berkas mandiri, ±3,1 MB, luring)

## 1. Keputusan arsitektur yang perlu disetujui

**Mesin PKG dipertahankan utuh, entitas gas memakai mesin generik.**

Logika PKG di v2beta bukan sekadar "stok vs safety stock". Logikanya rantai berjenjang khusus fosfat-sulfat: belerang → asam sulfat → asam fosfat (basis P₂O₅ 54%, heel, sludge) → NPK. Rantai itu dihitung dari objek `D` yang disusun pembaca Dalops PKG (sheet `harian Sulfur`, `harian SA`, `harian PA`, dst.).

Memindahkan logika itu ke mesin graf generik hampir pasti mengubah angka di belakang koma. Itu melanggar uji regresi butir 7.6. Karena itu:

| Lapisan | PKG | PKT · PIM · PSP · PKC |
|---|---|---|
| Profil (`ENTITY_PROFILES`) | `engine:'pkg-v2'`; identitas & konteks di profil; angka (SS, rantai, sumber) dibaca dari `D` agar tidak ada dua sumber angka | `engine:'gas'`; identitas, bahan baku + SS/DS (Kesepakatan), unit, kontrak gas, preset, ambang siaga, adaptor |
| Adaptor Dalops | pembaca v2beta (`bacaMaster`) tanpa perubahan | `bacaWorkbookKontrak` → kontrak data 11.2, pemetaan sheet/kolom per entitas |
| Perender modul | kode v2beta tanpa perubahan logika | mesin generik (Tahap 3) ke wadah `.ent-gen` |

Akibatnya, aturan "modul tidak memuat nama entitas" berlaku penuh untuk mesin generik dan konsolidasi. Teks PKG tetap ada di dalam mesin `pkg-v2`, dan hanya tampil saat PKG dipilih.

## 2. Yang dibangun pada tahap ini

- **Build yang dapat diulang** — `src/build.py` merakit v3 dari HTML acuan. Setiap penyisipan diperiksa tepat satu kali, jadi kalau acuan berubah, build berhenti. Build tidak diam-diam menghasilkan berkas yang salah.
- **Pemilih entitas** di kepala halaman: `PI Group (Konsolidasi) · PKG · PKT · PIM · PSP · PKC`.
  - Lencana `DUMMY` muncul per entitas.
  - Pilihan diingat lewat `#ent=XXX` dan localStorage.
- **Kepala halaman per entitas** — mengikuti entitas yang dipilih:
  - nama dan unit kerja;
  - posisi data dan umurnya;
  - chip sumber, periode konsumsi, dan konteks (dari profil);
  - logo placeholder berisi kode entitas;
  - garis aksen tipis di atas kepala halaman. Aksen tidak dipakai di elemen status.
- **Pita merah DATA DUMMY** — tampil per entitas yang memakai data dummy. Pada Konsolidasi, pita menyebut entitas mana yang dummy dan mana yang asli. Pita hilang setelah data asli entitas itu dimuat.
- **Pemuat multi-berkas** — menerima `.xlsx`, `.xlsm`, dan `.json`, satu atau beberapa sekaligus.
  - Entitas dikenali dari isi sheet (`profil.kode`, atau sheet `harian Sulfur` untuk PKG), lalu dari nama berkas.
  - Hanya entitas yang bersangkutan yang diperbarui.
  - Berkas PKG diteruskan ke pembaca v2beta.
  - Gagal baca satu berkas tidak mengganggu berkas lain.
- **Kontrak data & peringatan** — sheet atau kolom yang hilang dicatat per modul pemakainya, lalu ditampilkan sebagai kotak peringatan di modul itu. Modul tidak diam-diam menampilkan nol.
  - Bila safety stock di berkas berbeda dari Kesepakatan, dashboard memberi peringatan dan tetap memakai angka Kesepakatan.
- **Modul 00 Peta Risiko PI Group** — tab sudah ada, hanya di tampilan Konsolidasi. Isinya baru status data per entitas.
- **Wadah generik** di 14 modul. Untuk entitas gas, modul 01 menampilkan tabel kontrak data yang terbaca; modul lain menunggu Tahap 3.

## 3. Hasil uji

`node tests/regresi_pkg.mjs` membandingkan `innerHTML` setiap modul PKG di v3 dengan v2beta. Cakupannya 14 modul ditambah 8 elemen kepala halaman, dalam 4 putaran:

| Putaran | Pembandingan | Berbeda |
|---|---:|---:|
| Mode terang | 22 | 0 |
| Mode gelap | 22 | 0 |
| Setelah tuas digeser (lama gangguan, impor belerang, beban NPK, slider proyeksi, waktu pengadaan ROP, preset simulator) | 22 | 0 |
| Setelah berpindah ke kelima entitas lain lalu kembali ke PKG | 22 | 0 |
| **Jumlah** | **88** | **0** |

Galat konsol: 0, di keenam tampilan dan semua tab.

Uji negatif juga sudah dijalankan: menggeser tuas dan mengubah `D` memang mengubah keluaran. Artinya, pembandingan di atas memang bisa menangkap selisih.

`node tests/pemuat.mjs` memuat keempat xlsx dummy sekaligus:
- posisi, stok, dan jumlah baris identik dengan data JSON bawaan;
- penanda DUMMY tetap aktif, karena berkasnya memang dummy;
- berkas bernama netral tanpa sheet `ringkasan_gas` tetap dikenali sebagai PIM dari sheet `profil`, dan kotak peringatan muncul di modul 01.

**Catatan regresi:** uji ini memakai data PKG yang tertanam di v2beta. Berkas Dalops PKG asli tidak dilampirkan, jadi jalur "muat berkas PKG" belum diuji ujung ke ujung. Kodenya sama persis dengan v2beta.

## 4. Berikutnya (Tahap 3)

Mesin generik entitas gas mengisi modul 01–14 dari profil dan kontrak data. Urutannya PKT → PSP → PKC → PIM, sesuai butir 8.

Keputusan yang dipakai, kecuali Bapak/Ibu menyatakan lain:
1. Hari penyangga amoniak dihitung terhadap defisit bersih.
2. Pemicu kargo tertunda > 14 hari mengikuti data.
3. "Hormuz" hanya tampil di kolom risiko jalur.
4. Aksen hanya di kepala halaman.
