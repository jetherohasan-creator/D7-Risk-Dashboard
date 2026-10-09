# Tahap 3 · Entitas Gas (PKT → PSP → PKC → PIM)

Tanggal: 9 Oktober 2026 · data: DUMMY posisi 8 Oktober 2026

## 1. Yang dibangun

Ada satu mesin generik untuk entitas berbasis gas. Keempat entitas ditambahkan **hanya lewat `ENTITY_PROFILES` dan adaptor Dalops**; tidak ada nama entitas yang ditulis langsung di kode modul.

| Berkas | Isi |
|---|---|
| `src/cak_gas_model.js` | Model data per entitas: KRI gas, bahan baku, produksi, Lini I, kapal, evaluasi Siaga; simulasi harian untuk modul 08 & 09 |
| `src/cak_gas_ui1.js` | Alat bantu tampilan, modul 01, 02, 03, 05, 06, 07 |
| `src/cak_gas_ui2.js` | Modul 04, 08–14, pengendali kejadian |
| `src/entity_profiles.js` | Ditambah koordinat pelabuhan muat (perkiraan, untuk gambar), jalur masuk pelabuhan bongkar, KRI produksi usulan, graf rantai proses |

### Aturan hitung utama

**Gas**
- Diukur sebagai aliran: Σ pasokan dibagi Σ kebutuhan rencana, 7 hari terakhir. Status memakai ambang usulan 95% / 90% dan diberi label "usulan".
- % kontrak (PJBG) ditampilkan sebagai informasi, bukan status.

**Amoniak**
- KRI-nya safety stock, sama seperti bahan lain.
- Ditambah "hari penyangga" = (stok − deadstock) ÷ defisit bersih 7 hari (pemakaian + penjualan − produksi − kedatangan).
- Bila defisit ≤ 0, ditulis "tidak menipis".

**Non-gas**
- KRI Pemenuhan Safety Stock Bahan Baku Non-Gas: Aman ≥ 100%, Waspada 92,25% s.d. < 100%, Bahaya < 92,25%.
- Konsumsi harian = rata-rata 30 hari realisasi.

**Simulasi (08 & 09)**
- Basisnya rencana Dalops.
- Skenario dasar sudah diuji: mereproduksi stok rencana dengan selisih 0 t. Koreksi pembulatan neraca Dalops (±1 t per baris) sudah dimasukkan.
- Bila gas kurang, produksi amoniak dipotong lebih dulu (34 MMBTU/t menurut cons-rate), sisanya memotong urea.
- Bila amoniak menyentuh deadstock, penjualan/transfer berhenti lebih dulu, baru produksi urea dibatasi.
- Produksi NPK dibatasi oleh bahan yang paling dulu menyentuh deadstock.
- Hasilnya diberi label indikatif.

**KRI produksi**
- Dihitung terhadap RKAP pro-rata sampai tanggal posisi.
- Ambangnya usulan: Aman ≥ 95%, Waspada 90–95%.

## 2. Uji skenario 11.3 di dashboard

| Entitas | Diminta | Tampil | Siaga (usulan) |
|---|---|---|---|
| PKT | KCl Waspada 95%; gas Aman ±101%; amoniak Aman | KCl **95,0% Waspada** · gas **101,3% Aman** · amoniak **145,0% Aman** | 2 (kargo KCl mundur 16 hari) |
| PIM | Gas Bahaya ±82%; amoniak Bahaya 88%, ±8 hari; produksi < RKAP | gas **82,5% Bahaya** · amoniak **88,0% Bahaya**, 8,6 hari pemakaian · urea **94,0%**, amoniak **94,5%** RKAP pro-rata (Waspada) | 2 (gas < 90% 17 hari berturut) |
| PSP | DAP Waspada 97%; urea Lini I tinggi | DAP **97,0% Waspada** · urea Lini I **23,7 hari** penyaluran, naik 1.264 t/hari | 1 (DAP < SS) |
| PKC | KCl Bahaya 86%; lainnya Aman | KCl **86,0% Bahaya** · lainnya Aman | 2 (kargo KCl mundur 24 hari) |

## 3. Kelengkapan modul per entitas

Berlaku sama untuk PKT, PIM, PSP, PKC karena struktur dummy-nya identik.

| # | Modul | Status | Yang belum |
|---|---|---|---|
| 01 | Stok Bahan Baku | Penuh | — |
| 02 | Produksi & Konsumsi | Sebagian | konsumsi gas spesifik **desain** per unit [ISI]; pembanding sementara = cons-rate |
| 03 | Stok Produk Lini I | Penuh | ambang stok produk belum ada (ditampilkan Netral) |
| 04 | Peta Pelayaran | Sebagian | lintasan = gambar perkiraan; PKC: waktu angkut darat Priok → Cikampek [ISI] |
| 05 | Proyeksi Harian | Penuh | — |
| 06 | Reorder Point | Sebagian | waktu tunggu pengadaan per entitas [ISI]; sementara memakai asumsi PKG (14 / 5 / 10 hari), diberi label |
| 07 | Perubahan Antar Versi | Penuh | PIM: tidak ada perubahan di dummy |
| 08 | Simulator Pasokan | Penuh (indikatif) | sumber "amoniak beli" tidak ada di data |
| 09 | Berapa Lama Bisa Bertahan | Penuh (indikatif) | horizon hanya sampai 31 Des (sesuai rencana Dalops) |
| 10 | Komposisi NPK | Sebagian | sistem produksi NPK [ISI]; formula masih dummy 15-15-15 |
| 11 | Interkoneksi Pabrik | Penuh | — |
| 12 | Ketahanan Pangan | Sebagian | tambahan hasil panen per ha [ISI]; dosis masih dummy |
| 13 | Kesimpulan | Penuh | ambang Siaga masih usulan |
| 14 | Ringkasan Eksekutif | Penuh | — |

## 4. Uji

| Uji | Hasil |
|---|---|
| `tests/regresi_pkg.mjs` — PKG v3 vs v2beta (terang, gelap, tuas digeser, setelah pindah entitas) | 88 pembandingan, **0 berbeda** |
| `tests/model_node.cjs` — skenario dasar = rencana Dalops | selisih stok maks **0,0 t** di 4 entitas |
| `tests/interaksi.mjs` — preset, tuas, centang sumber, konversi, salin teks | 32/32 OK, 0 galat |
| `tests/tampilan.mjs` — semua tab, 4 entitas, mode gelap, lebar 390 px | 0 galat konsol, tanpa gulir horizontal halaman |
| `tests/teks_pkg.mjs` — teks khas PKG di entitas lain | 0 teks naratif. Yang muncul hanya dari data: asal kiriman ZA "Pelabuhan Petrokimia Gresik" (keempat entitas) dan "Lewat Selat Hormuz" di kolom risiko jalur (PKT & PSP, kargo DAP Ras Al-Khair) |
| `tests/pemuat.mjs` — muat 4 xlsx sekaligus | identik dengan data bawaan |

## 5. Tahap berikutnya (Tahap 4)

Tampilan Konsolidasi dan modul 00 Peta Risiko PI Group:
- heatmap entitas × bahan baku;
- produksi gabungan;
- Lini I gabungan;
- peta semua pelabuhan;
- daftar "perlu pesan";
- skenario bersama;
- transfer antar-entitas;
- setara luas sawah;
- daftar Siaga;
- memo PI Group.
