/* =====================================================================
   CAK PRI v3 · PI Group — inti
   - menyimpan data per entitas (STORE), dengan penanda dummy/asli
   - lapisan adaptor Dalops → kontrak data internal
   - pemuat multi-berkas (xlsx/json), mengenali entitas dari nama berkas
     atau isi sheet, lalu memperbarui entitas yang bersangkutan saja
   - pemilih entitas, pita DATA DUMMY, kepala halaman per entitas
   Mesin PKG ('pkg-v2') tidak disentuh: modulnya tetap dirender oleh kode
   v2beta. Entitas gas dan tampilan konsolidasi dirender ke wadah .ent-gen.
   ===================================================================== */
const CAK = (function(){
'use strict';
const ENT_URUT = ['PIG','PKG','PKT','PIM','PSP','PKC'];
const ANAK = ['PKG','PKT','PIM','PSP','PKC'];

/* ---------- kontrak data internal (butir 11.2) ---------- */
const KONTRAK = {
  profil:                {kolom:['parameter','nilai'], modul:['semua']},
  harian_gas:            {kolom:['tanggal','jenis','pemasok','kontrak_bbtud','pasokan_bbtud'], modul:['01','08','09']},
  ringkasan_gas:         {kolom:['tanggal','jenis','kontrak_total_bbtud','pasokan_total_bbtud','kebutuhan_rencana_bbtud','pemakaian_aktual_bbtud','gas_per_ton_amoniak_mmbtu','gas_per_ton_urea_mmbtu'], modul:['01','02','09']},
  harian_bahan_baku:     {kolom:['tanggal','jenis','kode_material','material','stok_awal_t','kedatangan_t','produksi_sendiri_t','pemakaian_t','dijual_transfer_t','stok_akhir_t'], modul:['01','05','06','08','09']},
  harian_produksi:       {kolom:['tanggal','jenis','unit','produk','kapasitas_t_per_hari','produksi_t'], modul:['02','08','09']},
  rkap_bulanan:          {kolom:['unit','produk','jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des','total_2026'], modul:['02']},
  stok_produk_lini1:     {kolom:['tanggal','jenis','produk','stok_awal_t','masuk_t','penyaluran_t','stok_akhir_t','curah_di_pabrik_t'], modul:['03']},
  jadwal_kapal:          {kolom:['material','negara_asal','pelabuhan_muat','nama_kapal','volume_t','eta_terkini','eta_awal','status','jarak_nm','waktu_layar_hari','lewat_hormuz','catatan'], modul:['01','04','05','06']},
  perubahan_versi:       {kolom:['versi_lama','versi_baru','material','nama_kapal','eta_lama','eta_baru','volume_lama_t','volume_baru_t','alasan'], modul:['07']},
  status_unit:           {kolom:['unit','status','mulai','selesai','keterangan'], modul:['01','02']},
  parameter_kri:         {kolom:['kode_material','material','sifat_pasokan','satuan','safety_stock','deadstock','ambang_aman_pct','ambang_bahaya_pct','nama_kri'], modul:['01','13']},
  cons_rate:             {kolom:['produk','bahan','rasio','satuan'], modul:['09','10','11','12']},
  sumber_pasokan:        {kolom:['id','nama','material','moda','volume_acuan','satuan_volume'], modul:['08']},
  transfer_antar_entitas:{kolom:['tanggal','jenis','dari','ke','material','volume_t'], modul:['11','00']},
  ambang_siaga:          {kolom:['tingkat','pemicu','tindakan'], modul:['13']}
};
const KOLOM_TANGGAL = ['tanggal','eta_terkini','eta_awal','versi_lama','versi_baru','eta_lama','eta_baru','mulai','selesai'];

const MODUL = {
  grup:['00','Peta Risiko PI Group'], stok:['01','Stok Bahan Baku'], produksi:['02','Produksi & Konsumsi'],
  produk:['03','Stok Produk Lini I'], peta:['04','Peta Pelayaran'], proyeksi:['05','Proyeksi Harian'],
  rop:['06','Reorder Point'], perubahan:['07','Perubahan Antar Versi'], sken:['08','Simulator Pasokan'],
  simulasi:['09','Berapa Lama Bisa Bertahan'], komposisi:['10','Komposisi NPK'], interkoneksi:['11','Interkoneksi Pabrik'],
  pangan:['12','Ketahanan Pangan'], keputusan:['13','Kesimpulan'], ringkasan:['14','Ringkasan Eksekutif']};

/* ---------- utilitas ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt  = n => n==null||!isFinite(n)?'—':Math.round(n).toLocaleString('id-ID');
const fmt1 = n => n==null||!isFinite(n)?'—':n.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1});
const pad2 = n => String(n).padStart(2,'0');
function isoDari(v){
  if(v==null||v==='') return null;
  if(v instanceof Date && !isNaN(v)) return v.getFullYear()+'-'+pad2(v.getMonth()+1)+'-'+pad2(v.getDate());
  if(typeof v==='number' && isFinite(v) && v>20000 && v<80000){           /* nomor seri Excel */
    const d=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5); return d.toISOString().slice(0,10); }
  const s=String(v); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0,10) : null;
}
const tglObj = iso => { const d=new Date(iso+'T00:00:00'); d.setHours(0,0,0,0); return d; };
const tglID  = (iso,bulan) => iso ? tglObj(iso).toLocaleDateString('id-ID',{day:'numeric',month:bulan||'long',year:'numeric'}) : '—';
const hariIni = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const umurHari = iso => iso ? Math.round((hariIni()-tglObj(iso))/864e5) : null;

/* ---------- STORE ---------- */
const STORE = {};
function dariKolomBaris(t){
  if(!t||!Array.isArray(t.kolom)||!Array.isArray(t.baris)) return null;
  return t.baris.map(r=>{ const o={}; t.kolom.forEach((k,i)=>o[k]=r[i]); return o; });
}
/* Menyusun entri STORE dari sheet-sheet kontrak; mengisi peringatan bila
   sheet atau kolom tidak lengkap, agar modul tidak diam-diam menampilkan nol. */
function simpanKontrak(kode, sheets, meta){
  const P = ENTITY_PROFILES[kode]; const warn = [...(meta.warn||[])];
  Object.entries(KONTRAK).forEach(([nm,def])=>{
    const rows = sheets[nm];
    if(!rows){ warn.push({sheet:nm, modul:def.modul, pesan:`Sheet "${nm}" tidak ditemukan`}); return; }
    const ada = rows.length ? Object.keys(rows[0]) : [];
    const hilang = def.kolom.filter(k=>rows.length && !ada.includes(k));
    if(hilang.length) warn.push({sheet:nm, modul:def.modul, pesan:`Sheet "${nm}" tanpa kolom ${hilang.join(', ')}`});
    rows.forEach(r=>KOLOM_TANGGAL.forEach(k=>{ if(k in r) r[k]=isoDari(r[k]); }));
  });
  const profil = {}; (sheets.profil||[]).forEach(r=>{ if(r.parameter) profil[r.parameter]=r.nilai; });
  if(profil.kode && profil.kode!==kode)
    warn.push({sheet:'profil', modul:['semua'], pesan:`Kode di sheet profil (${profil.kode}) berbeda dengan entitas yang dikenali (${kode})`});
  /* safety stock & deadstock tetap dari Kesepakatan PI Group (profil entitas) */
  (sheets.parameter_kri||[]).forEach(r=>{
    const b=(P.bahanBaku||[]).find(x=>x.k===r.kode_material);
    if(b && b.ss!=null && r.safety_stock!=null && +r.safety_stock!==b.ss)
      warn.push({sheet:'parameter_kri', modul:['01','13'], pesan:`Safety stock ${b.nama} di berkas (${fmt(r.safety_stock)} t) berbeda dari Kesepakatan PI Group (${fmt(b.ss)} t); yang dipakai Kesepakatan`});
  });
  const real = (sheets.harian_bahan_baku||[]).filter(r=>r.jenis==='Realisasi').map(r=>r.tanggal).filter(Boolean).sort();
  const posisi = real.length ? real[real.length-1] : isoDari(profil.posisi_data);
  if(!real.length) warn.push({sheet:'harian_bahan_baku', modul:['01','05'], pesan:'Tanggal realisasi terakhir tidak terbaca dari kolom jenis'});
  const dummy = meta.dummy!=null ? meta.dummy : /DUMMY/i.test(String(profil.status_data||''));
  STORE[kode] = {kode, engine:'gas', sheets, profil, posisi, update:isoDari(profil.tanggal_update),
    dummy, sumber:meta.sumber, berkas:meta.berkas||null, warn, dimuat:new Date()};
  return STORE[kode];
}
function muatDummyBawaan(){
  const J = (typeof CAK_DUMMY!=='undefined') ? CAK_DUMMY : null;
  if(!J||!J.entitas) return;
  Object.entries(J.entitas).forEach(([kode,sh])=>{
    if(!ENTITY_PROFILES[kode]) return;
    const sheets={}; Object.entries(sh).forEach(([nm,t])=>{ sheets[nm]=dariKolomBaris(t); });
    simpanKontrak(kode, sheets, {sumber:'Data dummy bawaan', berkas:'DUMMY_CAK_PRI_PIGroup_data.json', dummy:true});
  });
}
function simpanPKG(meta){
  STORE.PKG = {kode:'PKG', engine:'pkg-v2', posisi:D.tglData, dummy:false,
    sumber: meta&&meta.berkas ? 'Dalops dimuat' : 'Data tertanam v2beta 04 Oktober 2026',
    berkas: meta&&meta.berkas||null, warn:[], dimuat:new Date()};
}

/* ---------- adaptor workbook → kontrak ---------- */
function bacaWorkbookKontrak(wb, kode){
  const A = (ENTITY_PROFILES[kode]||{}).adaptor || {};
  const sheets = {}, warn = [];
  Object.keys(KONTRAK).forEach(nm=>{
    const m = A[nm] || {sheet:nm, header:1};
    const ws = wb.Sheets[m.sheet];
    if(!ws) return;                                   /* dicatat di simpanKontrak */
    const a = XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
    const h = (a[(m.header||1)-1]||[]).map(x=>x==null?'':String(x).trim());
    const peta = m.kolom || {};
    const idx = {}; h.forEach((k,i)=>{ idx[k]=i; });
    const kolomKontrak = KONTRAK[nm].kolom;
    sheets[nm] = a.slice(m.header||1).filter(r=>r.some(v=>v!=null&&v!=='')).map(r=>{
      const o={};
      kolomKontrak.forEach(k=>{ const asal=peta[k]||k; if(asal in idx) o[k]=r[idx[asal]]; });
      if(nm==='profil'){ o.parameter=r[0]; o.nilai=r[1]; }
      return o;
    });
    const tanpa = kolomKontrak.filter(k=>!((peta[k]||k) in idx));
    if(tanpa.length && nm!=='profil') warn.push({sheet:nm, modul:KONTRAK[nm].modul, pesan:`Sheet "${m.sheet}" tanpa kolom ${tanpa.join(', ')}`});
    if(tanpa.length) sheets[nm].forEach(o=>tanpa.forEach(k=>{ delete o[k]; }));
  });
  return {sheets, warn};
}
const POLA_NAMA = [
  ['PKG',/\bPKG\b|petrokimia|gresik/i], ['PKT',/\bPKT\b|kaltim|kalimantan|bontang/i],
  ['PIM',/\bPIM\b|iskandar|lhokseumawe/i], ['PSP',/\bPSP\b|pusri|sriwidjaja|palembang/i],
  ['PKC',/\bPKC\b|kujang|cikampek/i]];
function kenaliEntitas(nama, wb){
  const bersih = String(nama||'').replace(/[_\-.]+/g,' ');
  const dariNama = (POLA_NAMA.find(([,re])=>re.test(bersih))||[])[0] || null;
  let dariIsi = null;
  if(wb){
    if(wb.Sheets['harian Sulfur']) dariIsi='PKG';
    else if(wb.Sheets.profil){
      const a=XLSX.utils.sheet_to_json(wb.Sheets.profil,{header:1,raw:true,defval:null});
      const r=a.find(x=>x&&x[0]==='kode'); if(r&&ENTITY_PROFILES[r[1]]) dariIsi=r[1];
    }
  }
  return {kode: dariIsi||dariNama, dariNama, dariIsi};
}

/* ---------- pemuat multi-berkas ---------- */
const bacaBuffer = f => new Promise((ok,gagal)=>{ const fr=new FileReader();
  fr.onerror=()=>gagal(new Error('Berkas tidak dapat dibaca')); fr.onload=()=>ok(fr.result); fr.readAsArrayBuffer(f); });
const bacaTeks = f => new Promise((ok,gagal)=>{ const fr=new FileReader();
  fr.onerror=()=>gagal(new Error('Berkas tidak dapat dibaca')); fr.onload=()=>ok(fr.result); fr.readAsText(f); });
async function muatBerkas(files){
  const hasil=[];
  for(const f of files){
    try{
      if(/\.json$/i.test(f.name)){
        const J=JSON.parse(await bacaTeks(f));
        if(!J.entitas) throw new Error('JSON tanpa kunci "entitas"');
        Object.entries(J.entitas).forEach(([kode,sh])=>{
          if(!ENTITY_PROFILES[kode]||kode==='PKG'){ hasil.push({ok:false,pesan:`${f.name}: entitas ${kode} dilewati`}); return; }
          const sheets={}; Object.entries(sh).forEach(([nm,t])=>{ sheets[nm]=dariKolomBaris(t); });
          const s=simpanKontrak(kode, sheets, {sumber:'Berkas dimuat', berkas:f.name,
            dummy:/DUMMY/i.test(String(J._catatan||''))||undefined});
          hasil.push({ok:true,kode,pesan:`${kode} dari ${f.name} · posisi ${tglID(s.posisi,'short')}${s.dummy?' · DUMMY':''}`});
        });
        continue;
      }
      if(typeof XLSX==='undefined') throw new Error('Pustaka pembaca Excel tidak tersedia');
      const buf=new Uint8Array(await bacaBuffer(f));
      const wb=XLSX.read(buf,{type:'array',cellDates:true});
      const id=kenaliEntitas(f.name, wb);
      if(!id.kode) throw new Error('entitas tidak dikenali dari nama berkas maupun isi sheet');
      const catat = (id.dariNama&&id.dariIsi&&id.dariNama!==id.dariIsi)
        ? [{sheet:'profil',modul:['semua'],pesan:`Nama berkas menunjuk ${id.dariNama}, isi berkas menunjuk ${id.dariIsi}; dipakai ${id.dariIsi}`}] : [];
      if(id.kode==='PKG'){
        const r=terapkanMaster(bacaMaster(buf), f.name);       /* pembaca asli v2beta */
        if(r.ok) simpanPKG({berkas:f.name});
        hasil.push({ok:r.ok,kode:'PKG',pesan:'PKG: '+r.pesan});
        continue;
      }
      const {sheets,warn}=bacaWorkbookKontrak(wb, id.kode);
      const s=simpanKontrak(id.kode, sheets, {sumber:'Berkas dimuat', berkas:f.name, warn:catat.concat(warn)});
      hasil.push({ok:true,kode:id.kode,pesan:`${id.kode} dari ${f.name} · posisi ${tglID(s.posisi,'short')}`
        +(s.dummy?' · DUMMY':'')+(s.warn.length?` · ${s.warn.length} peringatan`:'')});
    }catch(err){
      hasil.push({ok:false,pesan:`${f.name}: gagal (${err.message}). Data sebelumnya dipertahankan.`});
    }
  }
  return hasil;
}
function pasangPemuat(){
  const btn=$('btnUnggah'), inp=$('fileMaster'), stat=$('statUnggah');
  if(!btn||!inp) return;
  btn.addEventListener('click',()=>inp.click());
  inp.addEventListener('change',async ev=>{
    const fs=[...(ev.target.files||[])]; if(!fs.length) return;
    stat.hidden=false; stat.style.color=''; stat.style.borderColor='';
    stat.textContent='Membaca '+fs.map(f=>f.name).join(', ')+'…';
    await new Promise(r=>setTimeout(r,30));
    const h=await muatBerkas(fs);
    const gagal=h.some(x=>!x.ok);
    stat.innerHTML=h.map(x=>esc(x.pesan)).join('<br>');
    stat.style.color=gagal?'var(--red)':'var(--pkg)'; stat.style.borderColor=stat.style.color;
    inp.value='';
    terapkanTampilan();
  });
}

/* ---------- tampilan ---------- */
let ENT = 'PKG';
let UNIT_PKG = null;
const P = k => ENTITY_PROFILES[k];
const pakaiDummy = k => k==='PIG' ? ANAK.filter(a=>STORE[a]&&STORE[a].dummy) : (STORE[k]&&STORE[k].dummy ? [k] : []);

function tabBoleh(id){
  if(id==='grup') return ENT==='PIG';
  return true;
}
function paintEntbar(){
  const el=$('entbtns'); if(!el) return;
  el.innerHTML = ENT_URUT.map(k=>{
    const p=P(k), s=STORE[k], dm=k!=='PIG'&&s&&s.dummy;
    const label = k==='PIG' ? 'PI Group <small class="sub2">Konsolidasi</small>' : k;
    const judul = k==='PIG' ? 'PI Group — konsolidasi lima entitas' : `${p.nama} · ${p.lokasi}`+(s?` · posisi ${tglID(s.posisi,'short')}`:'');
    return `<button type="button" data-ent="${k}" aria-pressed="${k===ENT}" style="--a:${p.aksen}" title="${esc(judul)}">
      <i aria-hidden="true"></i>${label}${dm?'<small class="dmy">DUMMY</small>':''}</button>`;
  }).join('');
  const st=$('entstat');
  if(st){
    if(ENT==='PIG'){
      st.innerHTML = ANAK.map(k=>{ const s=STORE[k]; if(!s) return `<span class="entpos"><b>${k}</b> belum ada data</span>`;
        const u=umurHari(s.posisi);
        return `<span class="entpos${u>=3?' tua':''}"><b>${k}</b> ${tglID(s.posisi,'short')} · ${u<=0?'terkini':u+' hari'}${s.dummy?' · dummy':''}</span>`; }).join('');
    } else {
      const p=P(ENT), s=STORE[ENT]||{}, u=umurHari(s.posisi);
      st.innerHTML = `<span class="entpos"><b>${esc(p.nama)}</b> ${esc(p.lokasi)}</span>`
        + `<span class="entpos${u>=3?' tua':''}">Posisi data <b>${tglID(s.posisi)}</b> · umur ${u==null?'—':(u<=0?'terkini':u+' hari')}</span>`
        + `<span class="entpos">${esc(s.sumber||'—')}${s.berkas?' · '+esc(s.berkas):''}</span>`;
    }
  }
}
function paintRibbon(){
  const el=$('dummyRibbon'); if(!el) return;
  const dm=pakaiDummy(ENT);
  if(!dm.length){ el.hidden=true; el.innerHTML=''; return; }
  el.hidden=false;
  const asli = ENT==='PIG' ? ANAK.filter(a=>STORE[a]&&!STORE[a].dummy) : [];
  el.innerHTML = `<b>DATA DUMMY</b> — angka fiktif untuk pengembangan, bukan untuk pelaporan`
    + (ENT==='PIG' ? `<span class="rb2">Sebagian data dummy: ${dm.join(', ')}${asli.length?' · data asli: '+asli.join(', '):''}</span>` : '');
}
function paintKepala(){
  document.body.dataset.ent = ENT;
  const p=P(ENT);
  document.documentElement.style.setProperty('--acc', p.aksen);
  const bu=$('brandUnit');
  if(bu){ if(UNIT_PKG==null) UNIT_PKG=bu.innerHTML;
    bu.innerHTML = ENT==='PKG' ? UNIT_PKG
      : `<b>${esc(p.unitKerja||'Manajemen Risiko')}</b>${esc(ENT==='PIG'?p.nama+' · Monitoring Rantai Pasok PI Group':p.nama+' · Monitoring Rantai Pasok Bahan Baku')}`; }
  const ph=$('logoPh'); if(ph){ ph.textContent = ENT==='PIG' ? 'PI' : ENT; ph.style.setProperty('--a',p.aksen);
    ph.title = 'Logo belum dilampirkan · placeholder '+(ENT==='PIG'?'PI Group':ENT); }
  document.title = `CAK PRI v3 · ${ENT==='PIG'?'PI Group (Konsolidasi)':p.nama}`;
  if(ENT==='PKG') return;
  const s=STORE[ENT];
  const ey=$('eyeTgl');
  if(ey) ey.textContent = ENT==='PIG' ? 'Konsolidasi PI Group · posisi data per entitas'
    : `Posisi data ${s?tglID(s.posisi):'—'}`;
  const cg=$('chipGen');
  if(cg){
    if(ENT==='PIG'){
      cg.innerHTML = `<span class="chip">Cakupan <b>PKG · PKT · PIM · PSP · PKC</b></span>`
        + `<span class="chip">Aturan <b>besaran setara dijumlahkan, status diambil terburuk</b></span>`;
    } else if(s){
      const u=umurHari(s.posisi);
      cg.innerHTML = `<span class="chip">Sumber <b>${esc(s.sumber)}${s.berkas?' · '+esc(s.berkas):''}</b></span>`
        + `<span class="chip${u>=3?' hot':''}">Umur data <b>${u<=0?'terkini':u+' hari'}</b></span>`
        + (s.profil&&s.profil.periode_konsumsi?`<span class="chip">Konsumsi <b>${esc(s.profil.periode_konsumsi)}</b></span>`:'')
        + `<span class="chip hot">Konteks <b>${esc(p.konteks||'[ISI]')}</b></span>`;
    }
  }
  const bi=$('btnInfo');
  if(bi){ const u=s?umurHari(s.posisi):null; const perlu=u!=null&&u>=3;
    bi.classList.toggle('perlu',perlu); bi.title=perlu?`Perlu diperhatikan: data berumur ${u} hari`:'Keterangan data dan legenda warna'; }
}

/* ---------- isi modul (Tahap 2: kerangka) ---------- */
const kepalaModul = (tab, ket) => { const m=MODUL[tab]||['',''];
  return `<div class="shead"><span class="snum">${m[0]}</span><h2>${esc(m[1])}</h2>${ket?`<p>${ket}</p>`:''}</div>`; };
function peringatanModul(kode, no){
  const s=STORE[kode]; if(!s) return [];
  return s.warn.filter(w=>w.modul.includes(no)||w.modul.includes('semua'));
}
function kotakPeringatan(kode, no){
  const w=peringatanModul(kode,no); if(!w.length) return '';
  return `<div class="cakwarn"><b>Data untuk modul ini tidak lengkap</b>${w.map(x=>`<div>${esc(x.pesan)}</div>`).join('')}</div>`;
}
function tabelKontrak(kode){
  const s=STORE[kode]; if(!s) return '<p class="note-p">Belum ada data.</p>';
  return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Sheet kontrak</th><th>Baris</th><th>Rentang tanggal</th><th>Modul pemakai</th><th>Keadaan</th></tr></thead><tbody>`
    + Object.entries(KONTRAK).map(([nm,def])=>{
      const rows=s.sheets[nm]; const t=(rows||[]).map(r=>r.tanggal).filter(Boolean).sort();
      const w=s.warn.filter(x=>x.sheet===nm);
      return `<tr><td>${nm}</td><td>${rows?fmt(rows.length):'—'}</td><td>${t.length?tglID(t[0],'short')+' – '+tglID(t[t.length-1],'short'):'—'}</td>
        <td style="color:var(--ink2)">${def.modul.join(', ')}</td>
        <td>${w.length?`<span class="pill p-warn">${esc(w.map(x=>x.pesan).join('; '))}</span>`:'<span class="pill p-ok">terbaca</span>'}</td></tr>`;
    }).join('') + `</tbody></table></div>`;
}
function isiKerangka(tab){
  const p=P(ENT);
  if(ENT==='PIG'){
    if(tab==='grup'){
      return kepalaModul('grup','Matriks risiko lintas entitas. Pada Tahap 2 baru berisi status data per entitas; matriks KRI, tiga entitas paling mendesak, dan peluang mitigasi lintas-entitas ditambahkan pada Tahap 4.')
        + `<div class="box"><h3>Status data per entitas</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Entitas</th><th>Basis proses</th><th>Mesin</th><th>Posisi data</th><th>Umur</th><th>Sumber</th><th>Status data</th></tr></thead><tbody>`
        + ANAK.map(k=>{ const q=P(k), s=STORE[k]||{}; const u=umurHari(s.posisi);
            return `<tr><td><b>${k}</b> · ${esc(q.nama)}</td><td>${esc(q.basis||'—')}</td><td>${esc(q.engine)}</td>
              <td>${tglID(s.posisi,'short')}</td><td>${u==null?'—':(u<=0?'terkini':u+' hari')}</td><td style="color:var(--ink2)">${esc(s.sumber||'—')}</td>
              <td>${s.dummy?'<span class="pill p-crit">dummy</span>':'<span class="pill p-ok">asli</span>'}</td></tr>`; }).join('')
        + `</tbody></table></div><p class="note-p" style="margin-top:12px">${esc(p.aturanKonsolidasi)}</p></div>`;
    }
    return kepalaModul(tab) + `<div class="box cakkosong"><b>Tampilan konsolidasi modul ini dibangun pada Tahap 4.</b>
      Pilih satu entitas di atas untuk melihat modulnya.</div>`;
  }
  const s=STORE[ENT];
  const no=(MODUL[tab]||[''])[0];
  if(tab==='stok'){
    return kepalaModul(tab,`${esc(p.nama)} · basis ${esc(p.basis)}. Tahap 2: data sudah terbaca lewat lapisan adaptor; kartu KRI gas, amoniak, dan bahan non-gas ditambahkan pada Tahap 3.`)
      + kotakPeringatan(ENT,no)
      + `<div class="box"><h3>Kontrak data yang terbaca</h3>${tabelKontrak(ENT)}</div>`;
  }
  return kepalaModul(tab) + kotakPeringatan(ENT,no)
    + `<div class="box cakkosong"><b>Modul ini diisi pada Tahap 3</b> lewat mesin generik entitas gas, dari profil ${ENT} dan data posisi ${s?tglID(s.posisi):'—'}.</div>`;
}
function paintModul(tab){
  if(ENT==='PKG') return;
  const el=$('gen-'+tab); if(!el) return;
  el.innerHTML = isiKerangka(tab);
}
function paintSemuaGen(){ Object.keys(MODUL).forEach(paintModul); }

/* ---------- pindah entitas ---------- */
function terapkanTampilan(){
  if(!tabBoleh(tabAktif)) tabAktif='stok';
  paintKepala(); paintEntbar(); paintRibbon();
  if(ENT==='PKG'){ paintAll(); return; }          /* mesin pkg-v2 menggambar ulang modulnya sendiri */
  paintTabs();
  let t=tabAktif;
  if(!tabBoleh(t)) t='stok';
  setTab(t);
  paintSemuaGen();
}
function setEntitas(k, opsi){
  if(!ENTITY_PROFILES[k]) return;
  const dari=ENT; ENT=k;
  try{ localStorage.setItem('cakEnt',k); }catch(e){}
  if(!(opsi&&opsi.tanpaHash)){ try{ history.replaceState(null,'','#ent='+k); }catch(e){} }
  if(k==='PIG' && dari!=='PIG'){ tabAktif='grup'; }
  terapkanTampilan();
}
function hook(jenis, arg){
  if(jenis==='tab'){ paintModul(arg); }
  if(jenis==='paintAll' && ENT!=='PKG'){ paintKepala(); paintSemuaGen(); }
}
function init(){
  simpanPKG(); muatDummyBawaan();
  const bar=$('entbtns');
  if(bar) bar.addEventListener('click',e=>{ const b=e.target.closest('button[data-ent]'); if(b) setEntitas(b.dataset.ent); });
  pasangPemuat();
  let awal=null;
  const m=/ent=([A-Z]{3})/.exec(location.hash||''); if(m&&ENTITY_PROFILES[m[1]]) awal=m[1];
  if(!awal){ try{ const v=localStorage.getItem('cakEnt'); if(v&&ENTITY_PROFILES[v]) awal=v; }catch(e){} }
  ENT = awal || 'PKG';
  if(ENT==='PIG') tabAktif='grup';
  terapkanTampilan();
}
return {init, hook, tabBoleh, setEntitas, muatBerkas, STORE, KONTRAK, MODUL, get ent(){return ENT;},
        _util:{isoDari,tglID,umurHari,fmt,fmt1,esc,kenaliEntitas}};
})();
window.CAK_TABOK = id => CAK.tabBoleh(id);
window.CAK_HOOK  = (j,a) => CAK.hook(j,a);
CAK.init();
