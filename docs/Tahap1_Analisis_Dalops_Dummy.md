# Tahap 1 · Analisis Dalops — Dashboard CAK PRI PI Group v3

Posisi data: 8 Oktober 2026 · tanggal analisis: 9 Oktober 2026
Sumber: `DUMMY_Dalops_{PKT,PIM,PSP,PKC}_2026_posisi_8Okt.xlsx` dan `DUMMY_CAK_PRI_PIGroup_data.json` (semua angka **fiktif**).

> **Penghalang:** `Dashboard_CAK_PRI_v2beta_04Oktober2026.html` dan `Panduan_Fitur_CAK_PRI.pdf` **tidak ikut terlampir**, dan repo masih kosong.
> Akibatnya, struktur sheet Dalops PKG, data PKG, token desain, dan logika hitung acuan belum bisa dibaca. Uji regresi PKG (butir 7.6) juga belum bisa dijalankan.
> Bagian (a) di bawah hanya membandingkan dengan **kontrak data dummy**, belum dengan PKG.

---

## (a) Struktur sheet

Keempat berkas punya struktur **identik**: 16 sheet, header di baris 1, 0 rumus, tanpa sel kosong di sheet harian. Kolom `jenis` memisahkan `Realisasi` (1 Jan–8 Okt) dan `Rencana` (9 Okt–31 Des).

| Sheet | Baris data (PKT) | Kunci | Catatan |
|---|---:|---|---|
| `README` | 25 | — | Teks bebas, bukan tabel |
| `profil` | 15 | parameter → nilai | Kolom `nilai` bertipe campuran (teks/angka/tanggal) |
| `harian_gas` | 1.095 | tanggal × pemasok | Total = `ringkasan_gas.pasokan_total_bbtud` (selisih ≤ 0,08 BBTUD, pembulatan) |
| `ringkasan_gas` | 365 | tanggal | Ada kebutuhan rencana, pemakaian aktual, MMBTU/t NH3 & urea |
| `harian_bahan_baku` | 1.825 | tanggal × material | Neraca tutup (selisih ≤ 1 t, pembulatan); stok_awal(t) = stok_akhir(t−1) |
| `harian_produksi` | 4.015 | tanggal × unit | Ada kapasitas t/hari per unit |
| `rkap_bulanan` | 11 | unit | jan…des + total_2026 |
| `stok_produk_lini1` | 1.095 | tanggal × produk | Ada `curah_di_pabrik_t` |
| `jadwal_kapal` | 12 | kapal | ETA awal & terkini, status, jarak nm, waktu layar, `lewat_hormuz` |
| `perubahan_versi` | 1 | kapal | Versi 26 Sep → 9 Okt (PIM: kosong) |
| `status_unit` | 11 | unit | Mulai/selesai untuk unit berhenti |
| `parameter_kri` | 6 | kode_material | NH3, KCL, DAP, ZA, CLAY, GAS |
| `cons_rate` | 8 | produk × bahan | Sama persis di 4 entitas |
| `sumber_pasokan` | 9 | id | Untuk centang Simulator |
| `transfer_antar_entitas` | 16 | tanggal | PKG→semua (ZA), PKT→PKG (amoniak) |
| `ambang_siaga` | 3 | tingkat | Sama persis di 4 entitas |

**Beda dengan PKG:** belum bisa dipastikan (berkas acuan tidak ada). Yang pasti dari prompt: pembaca PKG menebak tanggal realisasi terakhir dari angka berkoma; struktur dummy tidak perlu itu karena kolom `jenis`. Lapisan adaptor tetap perlu dibuat agar PKG dipetakan ke kontrak data ini.

**JSON ↔ xlsx:** keempat entitas identik (semua sheet, semua kolom numerik). Format JSON: `entitas.{KODE}.{sheet} = {kolom:[…], baris:[[…]]}`.

---

## (b) Bahan baku, unit, dan produk per entitas

| | PKT | PIM | PSP | PKC |
|---|---|---|---|---|
| Lokasi | Bontang, Kaltim | Lhokseumawe, Aceh | Palembang, Sumsel | Cikampek, Jabar |
| Pelabuhan bongkar | Pelsus PKT Bontang (0,10; 117,48) | Krueng Geukueh (5,25; 97,03) | Dermaga Pusri, S. Musi (−2,98; 104,79) | Tanjung Priok, lalu darat (−6,10; 106,88) |
| Aksen | #F5A623 | #2E86C1 | #C0392B | #27AE60 |
| Pemasok gas (kontrak BBTUD) | A 150 · B 90 · C 70 = 310 | A 26 · B (LNG regas) 20 = 46 | A 120 · B 80 · C 35 = 235 | A 45 · B 40 = 85 |
| Unit amoniak (t/hari) | 1.100 · 1.500 · 1.500 · 1.500 · 2.500 | 1.200 | 1.100 · 1.000 · 1.000 · 2.000 | 1A 1.000 · 1B 1.000 |
| Unit urea (t/hari) | 1.700 ×4 · 3.500 | 1.725 | 1.725 ×3 · 2.750 | 1A 1.725 · 1B 1.725 |
| Unit NPK (t/hari) | NPK-1 1.000 | NPK-1 350 | NPK-1 800 | NPK-1 500 · NPK-2 500 |
| Produk Lini I | Urea, NPK, Amoniak curah (niaga) | Urea, NPK | Urea, NPK | Urea, NPK |
| Material non-gas | KCl, DAP, ZA, Clay | sama | sama | sama |
| Asal impor (pelabuhan muat) | KCl Kanada (Vancouver), Belarus (Klaipeda); DAP Tiongkok (Fangchenggang), Arab Saudi (Ras Al-Khair) | KCl Rusia (Ust-Luga); DAP Tiongkok | KCl Kanada, Rusia; DAP Maroko (Jorf Lasfar), Arab Saudi | KCl Kanada, Belarus; DAP Tiongkok, Yordania (Aqaba) |
| Produk NPK | NPK 15-15-15 (dummy) | sama | sama | sama |
| Dosis/ha | Urea 250 kg · NPK 300 kg | sama | sama | sama |

Cons-rate (keempat entitas): urea 0,57 t NH3/t + 4,2 MMBTU/t; amoniak 34 MMBTU/t; NPK 15-15-15 = DAP 0,290 · KCl 0,255 · urea 0,205 · ZA 0,140 · clay 0,130 (jumlah 1,02 t/t).

### Uji skenario 11.3 (dihitung ulang dari berkas)

Konsumsi = rata-rata 30 hari realisasi (9 Sep–8 Okt). Gas = Σ pasokan ÷ Σ kebutuhan rencana.

| Entitas | Yang diminta | Hasil hitung | Cocok |
|---|---|---|:-:|
| PKT | KCl Waspada 95% SS | KCl 14.250 t / SS 15.000 = **95,0%** | ✓ |
| | Gas Aman ±101% | 7 hari **101,3%** · 30 hari 101,4% | ✓ |
| | Amoniak Aman | 43.500 t = **145% SS** | ✓ |
| PIM | Gas Bahaya ±82% (7 hari) | **82,5%** (30 hari 89,8%) | ✓ |
| | Amoniak Bahaya 88% SS, ±8 hari | 7.040 t = **88,0% SS**, **8,6 hari** | ✓ |
| | Produksi di bawah RKAP | YTD vs RKAP pro-rata: amoniak **94,5%**, urea **94,0%** (entitas lain 96–98%) | ✓ |
| PSP | DAP Waspada 97% SS | 9.700 t / 10.000 = **97,0%** | ✓ |
| | Urea Lini I tinggi | 131.923 t = **23,7 hari** penyaluran (entitas lain 13–17 hari) | ✓ |
| PKC | KCl Bahaya 86% SS | 8.600 t / 10.000 = **86,0%** | ✓ |
| | Lainnya Aman | NH3 120%, DAP 105%, ZA 110%, Clay 140%, gas 101,8% | ✓ |

### Temuan yang perlu diputuskan sebelum Tahap 2

1. **Pemicu Siaga 2 "stok amoniak < 7 hari pemakaian" akan menyala di entitas yang skenarionya "Aman".** Hari stok amoniak = stok ÷ pemakaian 30 hari: PKT 8,9 · PIM 8,6 · **PSP 6,5** · **PKC 6,6**. Amoniak memang disangga dalam hitungan hari karena terus diproduksi. Pilihan: (a) ambang diturunkan, mis. < 5 hari; (b) dihitung terhadap *defisit bersih* (pemakaian − produksi) saat gangguan, bukan pemakaian kotor; (c) dibiarkan dan PSP/PKC masuk Siaga 2. Usulan: (b) untuk modul 09, ambang hari diberi label "usulan".
2. **Pemicu Siaga 2 "kargo tertunda > 14 hari"** menyala di PKT (KCl 3→19 Okt, 16 hari) dan PKC (KCl 28 Sep→22 Okt, 24 hari). Ini konsisten dengan data, tetapi berarti PKT naik ke Siaga 2 walau KCl "hanya" Waspada. Perlu dikonfirmasi bahwa itu memang maksudnya.
3. **"Hormuz" muncul di data entitas gas.** Kargo DAP dari Ras Al-Khair (PKT, PSP) bertanda `lewat_hormuz = Ya`. Ini benar secara geografis, tetapi bertentangan dengan pemeriksaan akhir ("tidak ada teks Hormuz di entitas lain"). Usulan: kolom risiko jalur tetap menampilkan selat yang dilalui bila datanya "Ya"; yang dilarang hanya *narasi konteks* PKG. Perlu persetujuan.
4. **Warna aksen PSP (#C0392B) hampir sama dengan merah Bahaya, dan PKC (#27AE60) hampir sama dengan hijau Aman.** Ini melanggar prinsip "warna status tidak boleh berubah/dikacaukan". Usulan: aksen hanya dipakai di kepala halaman dan garis tepi pemilih, tidak pernah di kartu/grafik status; atau pakai aksen PI Group.
5. **% terhadap kontrak jauh di bawah % terhadap kebutuhan** (PKT 77%, PSP 80% vs kebutuhan 101%). Kontrak > kebutuhan. KRI status memakai *kebutuhan*; % kontrak tampil sebagai informasi saja, agar tidak terbaca sebagai gangguan.
6. **Proyeksi rencana sudah menembus ambang sebelum kapal tiba** (baru terlihat di modul 05): PKT KCl turun ke 12.083 t (81% SS) pada 18 Okt; PSP DAP 8.122 t (81%) pada 16 Okt; PKC KCl 5.815 t (58%) pada 21 Okt. Semua masih di atas deadstock. Status saat ini tetap seperti skenario; status proyeksi akan tampil sebagai peringatan dini.

---

## (c) Data yang tidak ada di dummy → [ISI]

Diurutkan menurut dampaknya pada modul.

| # | Isian | Modul terdampak | Perlakuan sementara |
|---|---|---|---|
| 1 | **HTML acuan PKG + Panduan PDF** (termasuk data PKG, struktur Dalops PKG, token desain) | Semua, uji regresi | **Menghalangi Tahap 2** |
| 2 | Asumsi waktu tunggu pengadaan per entitas | 06 ROP | "data belum tersedia"; waktu layar di `jadwal_kapal` hanya bagian dari waktu tunggu |
| 3 | Angkutan darat Priok → Cikampek (PKC): jarak/hari | 04, 06 | Ditampilkan sebagai catatan, tanpa angka |
| 4 | Koordinat pelabuhan muat (Vancouver, Klaipeda, Ust-Luga, Fangchenggang, Ras Al-Khair, Jorf Lasfar, Aqaba, Gresik) | 04 Peta | Pakai tabel koordinat di HTML PKG bila ada; selebihnya koordinat geografis publik (bukan angka operasional) — perlu persetujuan |
| 5 | Konsumsi gas spesifik **desain** per unit (MMBTU/t) | 02, 01 | `cons_rate` (34 & 4,2) dipakai sebagai acuan RKAP; pembanding desain "belum tersedia" |
| 6 | Ambang resmi KRI gas | 01, 13, 00 | Dummy memberi ambang **usulan** 95%/90% → status tampil dengan label "ambang usulan, belum resmi" |
| 7 | Parameter tambahan hasil panen (t gabah/ha) per produk | 12 | Luas terpupuk bisa dihitung dari dosis; tambahan panen "belum tersedia" kecuali ada di HTML PKG yang relevan untuk urea/NPK |
| 8 | Formula & nama NPK nyata; sistem produksi (granulasi/steam/fusion) | 10 | Pakai "NPK 15-15-15 (dummy)"; sistem produksi "belum tersedia" |
| 9 | Sumber "amoniak beli" | 08 | Tidak ada di `sumber_pasokan`; preset hanya memakai trip unit amoniak |
| 10 | Data transfer di sisi PKG (amoniak masuk dari PKT, ZA keluar ke 4 entitas) | 11 konsolidasi, 00 | Dibaca dari sisi entitas pengirim/penerima dummy; perlu dicocokkan dengan Dalops PKG |
| 11 | Logo tiap entitas | Kepala halaman | Kotak placeholder berisi kode entitas |
| 12 | Ambang Siaga 1–3 per entitas | 13 | Keempat entitas memakai set yang sama, berlabel "usulan" (lihat temuan 1–2) |
| 13 | Rantai hulu turnaround (jadwal TA 2026 lengkap, bukan hanya status pada posisi data) | 05, 09 | Hanya dari `status_unit` + kapasitas `Rencana` |
