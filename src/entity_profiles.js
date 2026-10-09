/* =====================================================================
   ENTITY_PROFILES — satu-satunya tempat perbedaan antar-entitas.
   Modul tidak boleh memuat nama entitas secara hard-code; semua yang
   berbeda per entitas dibaca dari objek di bawah ini.

   Asal angka:
   - PKG  : dibaca saat berjalan dari data tertanam v2beta 04 Oktober 2026
            (objek D). Mesin PKG dipertahankan apa adanya ('pkg-v2') agar
            angka modul PKG identik dengan versi acuan.
   - PKT, PIM, PSP, PKC : disalin dari berkas DUMMY Dalops posisi 8 Okt 2026
            (sheet profil, parameter_kri, harian_produksi, harian_gas).
            Safety stock & deadstock di sini mewakili Kesepakatan PI Group;
            nilai safety stock di berkas Dalops yang dimuat tidak menimpanya.
   Isian yang belum tersedia ditandai null + catatan [ISI].
   ===================================================================== */

/* Ambang pemicu bertingkat untuk entitas berbasis gas.
   Teks disalin dari sheet ambang_siaga dummy; aturan terstruktur di
   bawahnya adalah terjemahan mesin atas teks itu. Status: USULAN. */
const SIAGA_GAS_USULAN = {
  status: 'usulan',
  sumber: 'sheet ambang_siaga (dummy), usulan, belum ditetapkan',
  tingkat: [
    { lv: 1, nama: 'Siaga 1 · Pantau',
      aturan: [ {jenis:'gasBeruntun', batas:95, hari:3},
                {jenis:'ssDiBawah', material:['KCL','DAP'], batasPct:100} ] },
    { lv: 2, nama: 'Siaga 2 · Amankan',
      aturan: [ {jenis:'gasBeruntun', batas:90, hari:7},
                {jenis:'nh3HariPenyangga', batas:7},
                {jenis:'kargoTertunda', batasHari:14} ] },
    { lv: 3, nama: 'Siaga 3 · Realokasi',
      aturan: [ {jenis:'gasRata7', batas:80},
                {jenis:'nh3HariPenyangga', batas:3},
                {jenis:'diBawahDeadstock', material:['KCL','DAP']} ] }
  ]
};

/* Lapisan adaptor Dalops: nama sheet, baris header, dan nama kolom per
   entitas. Untuk berkas dummy semuanya identik dengan kontrak data.
   Saat data asli tiba, cukup ubah pemetaan ini per entitas. */
const ADAPTER_KONTRAK = {
  harian_gas:            {sheet:'harian_gas',            header:1},
  ringkasan_gas:         {sheet:'ringkasan_gas',         header:1},
  harian_bahan_baku:     {sheet:'harian_bahan_baku',     header:1},
  harian_produksi:       {sheet:'harian_produksi',       header:1},
  rkap_bulanan:          {sheet:'rkap_bulanan',          header:1},
  stok_produk_lini1:     {sheet:'stok_produk_lini1',     header:1},
  jadwal_kapal:          {sheet:'jadwal_kapal',          header:1},
  perubahan_versi:       {sheet:'perubahan_versi',       header:1},
  status_unit:           {sheet:'status_unit',           header:1},
  parameter_kri:         {sheet:'parameter_kri',         header:1},
  cons_rate:             {sheet:'cons_rate',             header:1},
  sumber_pasokan:        {sheet:'sumber_pasokan',        header:1},
  transfer_antar_entitas:{sheet:'transfer_antar_entitas',header:1},
  ambang_siaga:          {sheet:'ambang_siaga',          header:1},
  profil:                {sheet:'profil',                header:1}
  /* kolom:{namaKontrak:'namaDiBerkas'} dapat ditambahkan per sheet */
};

/* Asumsi waktu tunggu pengadaan per entitas belum tersedia. */
const ROP_ISI = { pengadaan:null, muat:null, aman:null,
  catatan:'[ISI] Asumsi waktu tunggu pengadaan entitas ini belum ditetapkan.' };

/* Preset Simulator untuk entitas gas (modul 08). */
const PRESET_GAS = [
  {id:'semua',   label:'Semua berjalan'},
  {id:'gasTurun',label:'Gas turun 20%', gasTurun:20},
  {id:'tanpaKcl',label:'Tanpa impor KCl', matikanMaterial:['KCl']},
  {id:'nh3Trip', label:'Unit amoniak terbesar trip', tripTerbesar:'Amoniak'},
  {id:'stok',    label:'Hanya stok', matikanSemua:true}
];


/* Koordinat geografis perkiraan pelabuhan muat (data publik), hanya untuk
   menggambar peta. Rute laut memakai lintasan peta versi PKG (id rute v2beta)
   yang kemudian disambung ke jalur masuk pelabuhan bongkar tiap entitas.
   Jarak dan waktu layar yang ditampilkan tetap dibaca dari jadwal kapal. */
const PELABUHAN_MUAT = {
  'Vancouver':                  {lat:49.29, lon:-123.11, rute:'kcl-canada'},
  'Klaipeda (Lituania)':        {lat:55.71, lon:21.13,   rute:'kcl-belarus'},
  'Ust-Luga':                   {lat:59.68, lon:28.40,   rute:'kcl-rusia'},
  'Fangchenggang':              {lat:21.60, lon:108.35,  rute:'dap-china'},
  'Ras Al-Khair':               {lat:27.48, lon:49.27,   rute:'sul-me'},
  'Jorf Lasfar':                {lat:33.12, lon:-8.63,   rute:'pr-maroc'},
  'Aqaba':                      {lat:29.52, lon:35.00,   rute:'pr-jordan'},
  'Pelabuhan Petrokimia Gresik':{domestik:true}
};

/* KRI produksi terhadap RKAP pro-rata — belum ada ambang resmi; USULAN. */
const KRI_PRODUKSI_USULAN = {aman:95, bahaya:90, status:'usulan'};

const ENTITY_PROFILES = {
  PIG:{
    kode:'PIG', label:'PI Group', nama:'PT Pupuk Indonesia (Persero)', lokasi:'Konsolidasi lima anak perusahaan produsen',
    aksen:'#009D3C', logo:null, engine:'konsolidasi',
    unitKerja:'Dept. Perencanaan & Pelaporan Manajemen Risiko',
    /* aturan konsolidasi: hanya besaran setara yang dijumlahkan */
    kriProduksi:KRI_PRODUKSI_USULAN,
    aturanKonsolidasi:'Ton produk sejenis dan hari setara dijumlahkan. Persentase dan status tidak dijumlahkan: ditampilkan per entitas atau diambil yang terburuk.'
  },
  PKG:{
    kode:'PKG', nama:'PT Petrokimia Gresik', lokasi:'Gresik, Jawa Timur', aksen:'#009D3C',
    logo:'tertanam', engine:'pkg-v2', basis:'Fosfat-sulfat',
    unitKerja:'Direktorat Manajemen Risiko',
    /* identitas lain (pelabuhan, bahan baku, safety stock, rantai proses,
       sumber pasokan, preset, ambang siaga) dibaca dari objek D milik
       mesin pkg-v2, tidak disalin ulang agar tidak ada dua sumber angka */
    dariD:true,
    konteks:'Selat Hormuz'
  },
  PKT:{
    kode:'PKT', nama:"PT Pupuk Kalimantan Timur", lokasi:"Bontang, Kalimantan Timur", aksen:'#F5A623', logo:null,
    engine:'gas', basis:'Gas alam',
    pelabuhan:{nama:"Pelabuhan Khusus PKT Bontang", lat:0.1, lon:117.48,
      pendekatan:[[[-5.6,114.6],[-3.6,116.9],[-1.0,117.9],[0.0,117.7]], [[2.5,119.5],[1.0,118.6],[0.2,117.8]]],
      dariGresik:[[-6.6,112.7],[-5.6,114.6],[-3.6,116.9],[-1.0,117.9],[0.0,117.7]]},
    konteks:"Pasokan gas relatif stabil; perhatian utama pada keterlambatan kargo KCl dan turnaround satu pabrik amoniak.",
    npk:{nama:"NPK 15-15-15 (dummy)", sistem:null}, dosis:{urea:250, npk:300},
    bahanBaku:[
      {k:"NH3", nama:"Amoniak", sifat:"Produksi sendiri (gas alam)", satuan:"ton", ss:30000, dead:8000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Amoniak (penyangga gas)"},
      {k:"KCL", nama:"KCl", sifat:"Impor", satuan:"ton", ss:15000, dead:2000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"DAP", nama:"DAP", sifat:"Impor", satuan:"ton", ss:15000, dead:2000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"ZA", nama:"ZA", sifat:"Domestik (antar-entitas PI Group)", satuan:"ton", ss:8000, dead:1000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"CLAY", nama:"Clay / filler", sifat:"Domestik", satuan:"ton", ss:6000, dead:1000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"GAS", nama:"Gas alam", sifat:"Pipa (kontrak PJBG)", satuan:"BBTUD", aman:95, bahaya:90, ambangStatus:'usulan', kri:"Pemenuhan Pasokan Gas terhadap Kebutuhan Operasi"}
    ],
    unit:[{unit:"Amoniak-1",produk:"Amoniak",kapasitas:1100},{unit:"Amoniak-2",produk:"Amoniak",kapasitas:1500},{unit:"Amoniak-3",produk:"Amoniak",kapasitas:1500},{unit:"Amoniak-4",produk:"Amoniak",kapasitas:1500},{unit:"Amoniak-5",produk:"Amoniak",kapasitas:2500},{unit:"Urea-1",produk:"Urea",kapasitas:1700},{unit:"Urea-2",produk:"Urea",kapasitas:1700},{unit:"Urea-3",produk:"Urea",kapasitas:1700},{unit:"Urea-4",produk:"Urea",kapasitas:1700},{unit:"Urea-5",produk:"Urea",kapasitas:3500},{unit:"NPK-1",produk:"NPK",kapasitas:1000}],
    gasKontrak:[{pemasok:"Pemasok Gas A · Blok Hulu 1",bbtud:150},{pemasok:"Pemasok Gas B · Blok Hulu 2",bbtud:90},{pemasok:"Pemasok Gas C · Blok Hulu 3",bbtud:70}],
    rop:ROP_ISI, preset:PRESET_GAS, siaga:SIAGA_GAS_USULAN, adaptor:ADAPTER_KONTRAK
  },
  PIM:{
    kode:'PIM', nama:"PT Pupuk Iskandar Muda", lokasi:"Lhokseumawe, Aceh", aksen:'#2E86C1', logo:null,
    engine:'gas', basis:'Gas alam',
    pelabuhan:{nama:"Pelabuhan Krueng Geukueh", lat:5.25, lon:97.03,
      pendekatan:[[[6.2,94.6],[5.9,95.8],[5.5,96.6]], [[1.2,104.0],[2.0,102.0],[3.3,100.4],[4.6,98.4]]],
      dariGresik:[[-6.6,112.7],[-4.5,109.8],[-1.5,108.6],[0.8,105.6],[1.2,104.0],[2.0,102.0],[3.3,100.4],[4.6,98.4]]},
    konteks:"Pasokan gas sedang dibatasi (curtailment) sejak akhir September; stok amoniak di tangki menjadi penyangga utama.",
    npk:{nama:"NPK 15-15-15 (dummy)", sistem:null}, dosis:{urea:250, npk:300},
    bahanBaku:[
      {k:"NH3", nama:"Amoniak", sifat:"Produksi sendiri (gas alam)", satuan:"ton", ss:8000, dead:2500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Amoniak (penyangga gas)"},
      {k:"KCL", nama:"KCl", sifat:"Impor", satuan:"ton", ss:5000, dead:800, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"DAP", nama:"DAP", sifat:"Impor", satuan:"ton", ss:5000, dead:800, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"ZA", nama:"ZA", sifat:"Domestik (antar-entitas PI Group)", satuan:"ton", ss:3000, dead:500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"CLAY", nama:"Clay / filler", sifat:"Domestik", satuan:"ton", ss:2000, dead:300, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"GAS", nama:"Gas alam", sifat:"Pipa (kontrak PJBG)", satuan:"BBTUD", aman:95, bahaya:90, ambangStatus:'usulan', kri:"Pemenuhan Pasokan Gas terhadap Kebutuhan Operasi"}
    ],
    unit:[{unit:"Amoniak-1",produk:"Amoniak",kapasitas:1200},{unit:"Urea-1",produk:"Urea",kapasitas:1725},{unit:"NPK-1",produk:"NPK",kapasitas:350}],
    gasKontrak:[{pemasok:"Pemasok Gas A · Blok Hulu 4",bbtud:26},{pemasok:"Pemasok Gas B · LNG Regasifikasi",bbtud:20}],
    rop:ROP_ISI, preset:PRESET_GAS, siaga:SIAGA_GAS_USULAN, adaptor:ADAPTER_KONTRAK
  },
  PSP:{
    kode:'PSP', nama:"PT Pupuk Sriwidjaja Palembang", lokasi:"Palembang, Sumatera Selatan", aksen:'#C0392B', logo:null,
    engine:'gas', basis:'Gas alam',
    pelabuhan:{nama:"Dermaga Pusri, Sungai Musi", lat:-2.98, lon:104.79,
      pendekatan:[[[-3.0,106.6],[-2.3,105.9],[-2.2,105.2],[-2.35,104.9]], [[-0.5,106.2],[-1.6,105.6],[-2.2,105.2],[-2.35,104.9]]],
      dariGresik:[[-6.6,112.7],[-5.6,110.0],[-4.3,107.5],[-3.0,106.6],[-2.3,105.9],[-2.2,105.2],[-2.35,104.9]]},
    konteks:"Pasokan gas cukup; risiko utama pada keandalan pabrik berumur dan alur Sungai Musi untuk kapal impor.",
    npk:{nama:"NPK 15-15-15 (dummy)", sistem:null}, dosis:{urea:250, npk:300},
    bahanBaku:[
      {k:"NH3", nama:"Amoniak", sifat:"Produksi sendiri (gas alam)", satuan:"ton", ss:20000, dead:5000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Amoniak (penyangga gas)"},
      {k:"KCL", nama:"KCl", sifat:"Impor", satuan:"ton", ss:12000, dead:1500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"DAP", nama:"DAP", sifat:"Impor", satuan:"ton", ss:10000, dead:1500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"ZA", nama:"ZA", sifat:"Domestik (antar-entitas PI Group)", satuan:"ton", ss:5000, dead:800, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"CLAY", nama:"Clay / filler", sifat:"Domestik", satuan:"ton", ss:4000, dead:600, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"GAS", nama:"Gas alam", sifat:"Pipa (kontrak PJBG)", satuan:"BBTUD", aman:95, bahaya:90, ambangStatus:'usulan', kri:"Pemenuhan Pasokan Gas terhadap Kebutuhan Operasi"}
    ],
    unit:[{unit:"Amoniak-1",produk:"Amoniak",kapasitas:1100},{unit:"Amoniak-2",produk:"Amoniak",kapasitas:1000},{unit:"Amoniak-3",produk:"Amoniak",kapasitas:1000},{unit:"Amoniak-4",produk:"Amoniak",kapasitas:2000},{unit:"Urea-1",produk:"Urea",kapasitas:1725},{unit:"Urea-2",produk:"Urea",kapasitas:1725},{unit:"Urea-3",produk:"Urea",kapasitas:1725},{unit:"Urea-4",produk:"Urea",kapasitas:2750},{unit:"NPK-1",produk:"NPK",kapasitas:800}],
    gasKontrak:[{pemasok:"Pemasok Gas A · Blok Hulu 5",bbtud:120},{pemasok:"Pemasok Gas B · Blok Hulu 6",bbtud:80},{pemasok:"Pemasok Gas C · Blok Hulu 7",bbtud:35}],
    rop:ROP_ISI, preset:PRESET_GAS, siaga:SIAGA_GAS_USULAN, adaptor:ADAPTER_KONTRAK
  },
  PKC:{
    kode:'PKC', nama:"PT Pupuk Kujang", lokasi:"Cikampek, Jawa Barat", aksen:'#27AE60', logo:null,
    engine:'gas', basis:'Gas alam',
    pelabuhan:{nama:"Pelabuhan Tanjung Priok (bongkar impor)", lat:-6.1, lon:106.88,
      pendekatan:[[[-5.6,107.0],[-5.95,106.9]]],
      dariGresik:[[-6.6,112.7],[-5.7,110.0],[-5.6,107.0],[-5.95,106.9]], darat:'Diangkut darat ke pabrik Cikampek; jarak dan waktu angkut darat [ISI]'},
    konteks:"Pabrik di darat; impor KCl dan DAP dibongkar di Tanjung Priok lalu diangkut darat. Stok KCl di bawah ambang waspada.",
    npk:{nama:"NPK 15-15-15 (dummy)", sistem:null}, dosis:{urea:250, npk:300},
    bahanBaku:[
      {k:"NH3", nama:"Amoniak", sifat:"Produksi sendiri (gas alam)", satuan:"ton", ss:10000, dead:3000, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Amoniak (penyangga gas)"},
      {k:"KCL", nama:"KCl", sifat:"Impor", satuan:"ton", ss:10000, dead:1500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"DAP", nama:"DAP", sifat:"Impor", satuan:"ton", ss:8000, dead:1200, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"ZA", nama:"ZA", sifat:"Domestik (antar-entitas PI Group)", satuan:"ton", ss:4000, dead:600, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"CLAY", nama:"Clay / filler", sifat:"Domestik", satuan:"ton", ss:3000, dead:500, aman:100, bahaya:92.25, kri:"Pemenuhan Safety Stock Bahan Baku Non-Gas"},
      {k:"GAS", nama:"Gas alam", sifat:"Pipa (kontrak PJBG)", satuan:"BBTUD", aman:95, bahaya:90, ambangStatus:'usulan', kri:"Pemenuhan Pasokan Gas terhadap Kebutuhan Operasi"}
    ],
    unit:[{unit:"Amoniak-1A",produk:"Amoniak",kapasitas:1000},{unit:"Amoniak-1B",produk:"Amoniak",kapasitas:1000},{unit:"Urea-1A",produk:"Urea",kapasitas:1725},{unit:"Urea-1B",produk:"Urea",kapasitas:1725},{unit:"NPK-1",produk:"NPK",kapasitas:500},{unit:"NPK-2",produk:"NPK",kapasitas:500}],
    gasKontrak:[{pemasok:"Pemasok Gas A · Blok Hulu 8",bbtud:45},{pemasok:"Pemasok Gas B · Pipa Transmisi",bbtud:40}],
    rop:ROP_ISI, preset:PRESET_GAS, siaga:SIAGA_GAS_USULAN, adaptor:ADAPTER_KONTRAK
  }
};

/* Rantai proses entitas gas sebagai graf node–edge (modul 09 & 11).
   Dibangun dari profil: pemasok gas → gas → unit amoniak → amoniak →
   unit urea → urea; urea + KCl + DAP + ZA + clay → unit NPK → NPK. */
function rantaiGas(P){
  const N=[], E=[];
  const add=(id,label,kol,jenis)=>N.push({id,label,kol,jenis});
  (P.gasKontrak||[]).forEach((g,i)=>{ add('src-gas-'+i, g.pemasok, 0, 'asal'); E.push(['src-gas-'+i,'GAS']); });
  add('GAS','Gas alam',1,'bahan'); add('NH3','Amoniak',1,'bahan');
  if((P.unit||[]).some(u=>u.produk==='NPK')) add('UREA-INT','Urea internal',1,'bahan');
  ['KCL','DAP','ZA','CLAY'].forEach(k=>{ const b=(P.bahanBaku||[]).find(x=>x.k===k); if(b) add(k,b.nama,1,'bahan'); });
  (P.unit||[]).forEach(u=>{
    add('u-'+u.unit, u.unit, 2, 'unit');
    if(u.produk==='Amoniak'){ E.push(['GAS','u-'+u.unit]); E.push(['u-'+u.unit,'NH3']); }
    if(u.produk==='Urea'){ E.push(['NH3','u-'+u.unit]); E.push(['GAS','u-'+u.unit]); E.push(['u-'+u.unit,'P-Urea']); }
    if(u.produk==='NPK'){ ['KCL','DAP','ZA','CLAY'].forEach(k=>E.push([k,'u-'+u.unit])); E.push(['UREA-INT','u-'+u.unit]); E.push(['u-'+u.unit,'P-NPK']); }
  });
  add('P-Urea','Urea',3,'produk'); add('P-NPK',(P.npk&&P.npk.nama)||'NPK',3,'produk'); add('P-NH3','Amoniak niaga / transfer',3,'produk');
  E.push(['NH3','P-NH3']);
  return {node:N, edge:E};
}
