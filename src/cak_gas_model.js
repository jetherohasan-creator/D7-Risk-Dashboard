/* =====================================================================
   Mesin generik entitas gas — MODEL & SIMULASI
   Semua angka dihitung dari kontrak data (STORE[kode].sheets) dan profil
   entitas. Tidak ada angka yang ditambahkan di luar data.
   Konsumsi harian = rata-rata 30 hari realisasi sampai tanggal posisi.
   ===================================================================== */
const GASM = (function(){
'use strict';
const BLN_KEY = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
const tambahHari = (iso,n) => { const d=new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const selisihHari = (a,b) => Math.round((new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z'))/864e5);
const rata = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
const jumlah = a => a.reduce((x,y)=>x+(+y||0),0);
const kunciMat = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function statusPct(p, aman, bahaya){
  if(p==null||!isFinite(p)||aman==null||bahaya==null) return null;
  return p>=aman ? 'Aman' : p>=bahaya ? 'Waspada' : 'Bahaya';
}
const URUT_STATUS = {Bahaya:0, Waspada:1, Aman:2};

/* rasio dari sheet cons_rate; fallback null bila tidak ada */
function rasio(cons, produk, polaBahan){
  const r=(cons||[]).find(x=>kunciMat(x.produk).startsWith(kunciMat(produk)) && polaBahan.test(String(x.bahan)));
  return r ? +r.rasio : null;
}

function bangun(kode){
  const st = CAK.STORE[kode]; if(!st) return null;
  if(st._model) return st._model;
  const P = ENTITY_PROFILES[kode], S = st.sheets, pos = st.posisi;
  const awal30 = tambahHari(pos,-29), awal7 = tambahHari(pos,-6), awal45 = tambahHari(pos,-44);
  const M = {kode, P, pos, awal30, awal7, dummy:st.dummy, sumber:st.sumber, berkas:st.berkas, profil:st.profil||{}};
  const cons = S.cons_rate||[];
  M.cons = cons;
  M.r = {
    nh3PerUrea: rasio(cons,'Urea',/amoniak/i),
    gasPerUrea: rasio(cons,'Urea',/gas/i),
    gasPerNH3:  rasio(cons,'Amoniak',/gas/i)
  };
  const npkRows = cons.filter(x=>/^NPK/i.test(String(x.produk)));
  M.npk = {nama: npkRows.length ? npkRows[0].produk : (P.npk&&P.npk.nama)||'NPK', resep: npkRows.map(x=>({bahan:x.bahan, rasio:+x.rasio, satuan:x.satuan}))};
  const resepNPK = bahan => { const r=npkRows.find(x=>bahan.test(String(x.bahan))); return r? +r.rasio : null; };

  /* ---------- gas ---------- */
  const rg = (S.ringkasan_gas||[]).slice().sort((a,b)=>a.tanggal<b.tanggal?-1:1);
  const rgReal = rg.filter(r=>r.tanggal<=pos), rgPlan = rg.filter(r=>r.tanggal>pos);
  const pctHari = r => r.kebutuhan_rencana_bbtud>0 ? r.pasokan_total_bbtud/r.kebutuhan_rencana_bbtud*100 : null;
  const jendela = (a,dari) => a.filter(r=>r.tanggal>=dari);
  const pctJendela = a => { const k=jumlah(a.map(r=>r.kebutuhan_rencana_bbtud)); return k>0 ? jumlah(a.map(r=>r.pasokan_total_bbtud))/k*100 : null; };
  const kontrakJendela = a => { const k=jumlah(a.map(r=>r.kontrak_total_bbtud)); return k>0 ? jumlah(a.map(r=>r.pasokan_total_bbtud))/k*100 : null; };
  const gasB = (P.bahanBaku||[]).find(b=>b.k==='GAS')||{};
  const g = M.gas = {ada: rg.length>0, aman:gasB.aman, bahaya:gasB.bahaya, ambangStatus:gasB.ambangStatus||null, kri:gasB.kri};
  if(g.ada){
    const r7=jendela(rgReal,awal7), r30=jendela(rgReal,awal30);
    g.pct7=pctJendela(r7); g.pct30=pctJendela(r30);
    g.kontrakPct7=kontrakJendela(r7); g.kontrakPct30=kontrakJendela(r30);
    g.pasokan7=rata(r7.map(r=>r.pasokan_total_bbtud)); g.kebutuhan7=rata(r7.map(r=>r.kebutuhan_rencana_bbtud));
    g.pakai30=rata(r30.map(r=>r.pemakaian_aktual_bbtud)); g.pasokan30=rata(r30.map(r=>r.pasokan_total_bbtud));
    g.kontrak=(rgReal[rgReal.length-1]||{}).kontrak_total_bbtud;
    g.status = (g.aman!=null&&g.bahaya!=null) ? statusPct(g.pct7,g.aman,g.bahaya) : null;
    g.seri = rgReal.filter(r=>r.tanggal>=awal30).map(r=>({t:r.tanggal, pasokan:r.pasokan_total_bbtud, kebutuhan:r.kebutuhan_rencana_bbtud, kontrak:r.kontrak_total_bbtud, pct:pctHari(r)}));
    g.seri45 = rgReal.filter(r=>r.tanggal>=awal45).map(r=>({t:r.tanggal, pasokan:r.pasokan_total_bbtud, pct:pctHari(r)}));
    /* berapa hari terakhir berturut-turut di bawah suatu batas */
    g.beruntun = batas => { let n=0; for(let i=rgReal.length-1;i>=0;i--){ const p=pctHari(rgReal[i]); if(p!=null&&p<batas) n++; else break; } return n; };
    const bawah = g.aman!=null ? g.seri.filter(x=>x.pct<g.aman) : [];
    g.hariBawahAman30 = bawah.length;
    const nBer = g.aman!=null ? g.beruntun(g.aman) : 0;
    g.episodeMulai = nBer ? rgReal[rgReal.length-nBer].tanggal : null;
    g.spesifik = {nh3:rata(r30.map(r=>r.gas_per_ton_amoniak_mmbtu)), urea:rata(r30.map(r=>r.gas_per_ton_urea_mmbtu)),
                  acuanNh3:M.r.gasPerNH3, acuanUrea:M.r.gasPerUrea};
    /* per pemasok */
    const hg=(S.harian_gas||[]);
    const nama=[...new Set(hg.map(r=>r.pemasok))];
    g.pemasok = nama.map(n=>{
      const a=hg.filter(r=>r.pemasok===n && r.tanggal<=pos);
      const a7=a.filter(r=>r.tanggal>=awal7), a30=a.filter(r=>r.tanggal>=awal30);
      const pk=(x)=>{ const k=jumlah(x.map(r=>r.kontrak_bbtud)); return k>0? jumlah(x.map(r=>r.pasokan_bbtud))/k*100 : null; };
      return {nama:n, kontrak:(a[a.length-1]||{}).kontrak_bbtud, rata7:rata(a7.map(r=>r.pasokan_bbtud)), pct7:pk(a7), pct30:pk(a30)};
    });
    /* neraca gas bulanan (realisasi + rencana) */
    g.bulanan = BLN_KEY.map((k,i)=>{
      const a=rg.filter(r=>+r.tanggal.slice(5,7)===i+1); if(!a.length) return null;
      const nReal=a.filter(r=>r.tanggal<=pos).length;
      return {bulan:i+1, pasokan:rata(a.map(r=>r.pasokan_total_bbtud)), kebutuhan:rata(a.map(r=>r.kebutuhan_rencana_bbtud)),
        kontrak:rata(a.map(r=>r.kontrak_total_bbtud)), pct:pctJendela(a), jenis: nReal===a.length?'Realisasi':nReal===0?'Rencana':'Campuran'};
    }).filter(Boolean);
    g.pctHari = pctHari;
  }

  /* ---------- kapal ---------- */
  const kapal = (S.jadwal_kapal||[]).map(k=>Object.assign({}, k, {
    km: kunciMat(k.material),
    tunda: (k.eta_awal&&k.eta_terkini) ? selisihHari(k.eta_awal,k.eta_terkini) : 0,
    lewat: /^y/i.test(String(k.lewat_hormuz||''))
  })).sort((a,b)=>a.eta_terkini<b.eta_terkini?-1:1);
  M.kapal = kapal;
  const kodeDariMat = km => { const b=(P.bahanBaku||[]).find(x=>kunciMat(x.k)===km||kunciMat(x.nama)===km); return b? b.k : km; };
  kapal.forEach(k=>{ k.k = kodeDariMat(k.km); k.mendatang = k.status!=='Tiba' && k.eta_terkini>pos; });

  /* ---------- bahan baku ---------- */
  const bb = (S.harian_bahan_baku||[]);
  const perMat = {}; bb.forEach(r=>{ (perMat[r.kode_material]=perMat[r.kode_material]||[]).push(r); });
  Object.values(perMat).forEach(a=>a.sort((x,y)=>x.tanggal<y.tanggal?-1:1));
  M.mat = {};
  (P.bahanBaku||[]).filter(b=>b.k!=='GAS').forEach(b=>{
    const a = perMat[b.k];
    const m = M.mat[b.k] = Object.assign({}, b, {ada: !!(a&&a.length)});
    if(!m.ada) return;
    const real=a.filter(r=>r.tanggal<=pos), plan=a.filter(r=>r.tanggal>pos);
    const now=real[real.length-1];
    const r30=real.filter(r=>r.tanggal>=awal30), r7=real.filter(r=>r.tanggal>=awal7);
    m.stok = now.stok_akhir_t;
    m.pem = b.ss ? m.stok/b.ss*100 : null;
    m.status = statusPct(m.pem, b.aman, b.bahaya);
    m.pakai30 = rata(r30.map(r=>r.pemakaian_t));
    m.prod30 = rata(r30.map(r=>r.produksi_sendiri_t));
    m.jual30 = rata(r30.map(r=>r.dijual_transfer_t));
    m.datang30 = rata(r30.map(r=>r.kedatangan_t));
    m.net30 = m.pakai30 + m.jual30 - m.prod30 - m.datang30;          /* + = stok menipis */
    m.hariStok = m.pakai30>0 ? m.stok/m.pakai30 : null;              /* hari pemakaian kotor */
    /* defisit bersih 7 hari: pemakaian + jual − produksi − kedatangan */
    const def7 = rata(r7.map(r=>r.pemakaian_t + r.dijual_transfer_t - r.produksi_sendiri_t - r.kedatangan_t));
    m.defisit7 = def7;
    m.hariPenyangga = def7>0 ? Math.max(0,(m.stok-(b.dead||0)))/def7 : null;
    m.seri30 = real.filter(r=>r.tanggal>=awal30).map(r=>({t:r.tanggal, v:r.stok_akhir_t}));
    m.seri45 = real.filter(r=>r.tanggal>=awal45).map(r=>({t:r.tanggal, v:r.stok_akhir_t}));
    m.rencana = plan.map(r=>({t:r.tanggal, v:r.stok_akhir_t}));
    m.realisasi = real.map(r=>({t:r.tanggal, v:r.stok_akhir_t}));
    const tembus = batas => { if(batas==null) return null; if(m.stok<batas) return 'sudah'; const x=plan.find(r=>r.stok_akhir_t<batas); return x? x.tanggal : null; };
    m.temSS = tembus(b.ss);
    m.temBahaya = b.ss ? tembus(b.ss*b.bahaya/100) : null;
    m.temDead = tembus(b.dead);
    if(plan.length){ const mn=plan.reduce((x,y)=>y.stok_akhir_t<x.stok_akhir_t?y:x); m.min={v:mn.stok_akhir_t, t:mn.tanggal, pem:b.ss?mn.stok_akhir_t/b.ss*100:null}; }
    m.kapal = kapal.filter(k=>k.k===b.k && k.mendatang);
    m.kapalBerikut = m.kapal[0]||null;
    m.tertunda = kapal.filter(k=>k.k===b.k && k.mendatang && k.tunda>0);
    m.trenNaik = m.seri30.length>1 ? m.seri30[m.seri30.length-1].v >= m.seri30[0].v : null;
  });

  /* ---------- produksi ---------- */
  const hp = (S.harian_produksi||[]);
  const bulan = +pos.slice(5,7), hariBln = +pos.slice(8,10);
  const hariDlmBln = new Date(Date.UTC(+pos.slice(0,4), bulan, 0)).getUTCDate();
  const rkap = {}; (S.rkap_bulanan||[]).forEach(r=>rkap[r.unit]=r);
  const stUnit = {}; (S.status_unit||[]).forEach(r=>stUnit[r.unit]=r);
  const unitNama = [...new Set(hp.map(r=>r.unit))];
  const tahunMulai = pos.slice(0,4)+'-01-01', blnMulai = pos.slice(0,8)+'01';
  M.unit = unitNama.map(u=>{
    const a=hp.filter(r=>r.unit===u).sort((x,y)=>x.tanggal<y.tanggal?-1:1);
    const real=a.filter(r=>r.tanggal<=pos), plan=a.filter(r=>r.tanggal>pos);
    const rk=rkap[u]||null;
    const ytd=jumlah(real.map(r=>r.produksi_t)), mtd=jumlah(real.filter(r=>r.tanggal>=blnMulai).map(r=>r.produksi_t));
    const rkBln = rk? +rk[BLN_KEY[bulan-1]] : null, rkThn = rk? +rk.total_2026 : null;
    const rkYtd = rk? jumlah(BLN_KEY.slice(0,bulan-1).map(k=>+rk[k])) + rkBln*hariBln/hariDlmBln : null;
    const hYtd = real.filter(r=>r.tanggal>=tahunMulai).length, hMtd=real.filter(r=>r.tanggal>=blnMulai).length;
    return {unit:u, produk:(a[0]||{}).produk, kap:Math.max(...a.map(r=>+r.kapasitas_t_per_hari||0)),
      hari:(real[real.length-1]||{}).produksi_t, mtd, ytd, rkBln, rkThn, rkYtd,
      pctBln: rkBln? mtd/rkBln*100 : null, pctThn: rkThn? ytd/rkThn*100 : null, pctProrata: rkYtd? ytd/rkYtd*100 : null,
      onMtd: real.filter(r=>r.tanggal>=blnMulai && r.produksi_t>0).length, hMtd,
      onYtd: real.filter(r=>r.produksi_t>0).length, hYtd,
      avg30: rata(real.filter(r=>r.tanggal>=awal30).map(r=>r.produksi_t)),
      prognosa: ytd + jumlah(plan.map(r=>r.produksi_t)),
      status: stUnit[u]||null, plan};
  });
  const produkList = [...new Set(M.unit.map(u=>u.produk))];
  M.produk = {};
  produkList.forEach(p=>{
    const us=M.unit.filter(u=>u.produk===p);
    const o={produk:p, ytd:jumlah(us.map(u=>u.ytd)), mtd:jumlah(us.map(u=>u.mtd)), rkThn:jumlah(us.map(u=>u.rkThn||0)),
      rkBln:jumlah(us.map(u=>u.rkBln||0)), rkYtd:jumlah(us.map(u=>u.rkYtd||0)), hari:jumlah(us.map(u=>u.hari||0)),
      avg30:jumlah(us.map(u=>u.avg30||0)), prognosa:jumlah(us.map(u=>u.prognosa))};
    o.pctProrata = o.rkYtd? o.ytd/o.rkYtd*100 : null; o.pctThn = o.rkThn? o.ytd/o.rkThn*100 : null; o.pctBln = o.rkBln? o.mtd/o.rkBln*100 : null;
    M.produk[p]=o;
  });
  M.statusUnit = (S.status_unit||[]);
  M.unitBerhenti = M.statusUnit.filter(r=>/berhenti|trip|turnaround/i.test(String(r.status)+' '+String(r.keterangan)) && !/beroperasi/i.test(String(r.status)));

  /* ---------- produk Lini I ---------- */
  const l1=(S.stok_produk_lini1||[]); const perP={}; l1.forEach(r=>{(perP[r.produk]=perP[r.produk]||[]).push(r);});
  M.lini1 = Object.entries(perP).map(([p,a])=>{
    a.sort((x,y)=>x.tanggal<y.tanggal?-1:1);
    const real=a.filter(r=>r.tanggal<=pos), r30=real.filter(r=>r.tanggal>=awal30);
    const now=real[real.length-1]||{}, lalu=real.find(r=>r.tanggal>=tambahHari(pos,-30))||real[0]||{};
    const salur=rata(r30.map(r=>r.penyaluran_t));
    const masuk=rata(r30.map(r=>r.masuk_t));
    const n=selisihHari(lalu.tanggal||pos,pos)||1;
    return {produk:p, stok:now.stok_akhir_t, salur30:salur, masuk30:masuk, tren:(now.stok_akhir_t-lalu.stok_akhir_t)/n,
      hari: salur>0 ? now.stok_akhir_t/salur : null, curah: now.curah_di_pabrik_t,
      seri30: r30.map(r=>({t:r.tanggal, v:r.stok_akhir_t})), rencana:a.filter(r=>r.tanggal>pos).map(r=>({t:r.tanggal,v:r.stok_akhir_t}))};
  });

  M.perubahan = S.perubahan_versi||[];
  M.sumberPasokan = S.sumber_pasokan||[];
  M.transfer = S.transfer_antar_entitas||[];
  M.siagaTeks = S.ambang_siaga||[];
  M.resepNPK = resepNPK;

  /* ---------- KRI produksi (ambang usulan) & siaga ---------- */
  M.siaga = evaluasiSiaga(M);
  st._model = M;
  return M;
}

/* ---------- evaluasi ambang Siaga 1–3 (aturan terstruktur di profil) ---------- */
function evaluasiSiaga(M){
  const def = M.P.siaga; if(!def) return {lv:0, pemicu:[], def:null};
  const pemicu=[]; let lv=0;
  const nm = k => (M.mat[k]||{}).nama||k;
  def.tingkat.forEach(t=>{
    t.aturan.forEach(a=>{
      let kena=null;
      if(a.jenis==='gasBeruntun' && M.gas.ada){ const n=M.gas.beruntun(a.batas);
        if(n>=a.hari) kena=`Pasokan gas di bawah ${a.batas}% kebutuhan ${n} hari berturut-turut`; }
      if(a.jenis==='gasRata7' && M.gas.ada && M.gas.pct7<a.batas) kena=`Pasokan gas 7 hari terakhir ${GASM.f1(M.gas.pct7)}% dari kebutuhan, di bawah ${a.batas}%`;
      if(a.jenis==='ssDiBawah') a.material.forEach(k=>{ const m=M.mat[k]; if(m&&m.ada&&m.pem<a.batasPct)
        pemicu.push({lv:t.lv, teks:`${nm(k)} ${GASM.f1(m.pem)}% dari safety stock, di bawah ${a.batasPct}%`}); });
      if(a.jenis==='diBawahDeadstock') a.material.forEach(k=>{ const m=M.mat[k]; if(m&&m.ada&&m.stok<m.dead)
        pemicu.push({lv:t.lv, teks:`${nm(k)} ${GASM.f0(m.stok)} t, di bawah deadstock ${GASM.f0(m.dead)} t`}); });
      if(a.jenis==='nh3HariPenyangga'){ const m=M.mat.NH3; if(m&&m.ada&&m.hariPenyangga!=null&&m.hariPenyangga<a.batas)
        kena=`Penyangga amoniak tinggal ${GASM.f1(m.hariPenyangga)} hari terhadap defisit bersih 7 hari terakhir, di bawah ${a.batas} hari`; }
      if(a.jenis==='kargoTertunda') M.kapal.filter(k=>k.mendatang&&k.tunda>a.batasHari).forEach(k=>
        pemicu.push({lv:t.lv, teks:`Kargo ${k.material} ${k.nama_kapal} tertunda ${k.tunda} hari (ETA ${CAK._util.tglID(k.eta_awal,'short')} → ${CAK._util.tglID(k.eta_terkini,'short')})`}));
      if(kena) pemicu.push({lv:t.lv, teks:kena});
    });
  });
  pemicu.forEach(p=>{ if(p.lv>lv) lv=p.lv; });
  return {lv, pemicu, def};
}

/* =====================================================================
   SIMULASI HARIAN (modul 08 & 09)
   Rentang: hari sesudah posisi data sampai akhir rencana. Basis = rencana
   Dalops apa adanya; skenario hanya mengubah rencana itu:
   - gas: pasokan rencana per pemasok × faktor; kekurangan gas memotong
     produksi amoniak lebih dulu (34 MMBTU/t menurut cons-rate), sisanya
     memotong urea (utilitas);
   - amoniak: produksi & pemakaian rencana diskalakan mengikuti produksi
     amoniak dan urea simulasi; bila stok menyentuh deadstock, penjualan/
     transfer dihentikan dulu, lalu produksi urea dibatasi;
   - bahan NPK: kedatangan rencana dikurangi kargo yang dimatikan atau
     digeser; produksi NPK dibatasi bahan yang paling dulu menyentuh
     deadstock.
   Indikatif untuk penyaringan awal, bukan pengganti balans resmi.
   ===================================================================== */
function siapkanSim(M){
  if(M._sim) return M._sim;
  const S=CAK.STORE[M.kode].sheets, pos=M.pos;
  const hari=[...new Set((S.harian_bahan_baku||[]).filter(r=>r.tanggal>pos).map(r=>r.tanggal))].sort();
  const idx={}; hari.forEach((t,i)=>idx[t]=i);
  const N=hari.length, nol=()=>new Array(N).fill(0);
  const gas={}; (S.harian_gas||[]).filter(r=>r.tanggal>pos).forEach(r=>{ const i=idx[r.tanggal]; if(i==null) return; (gas[r.pemasok]=gas[r.pemasok]||nol())[i]+= +r.pasokan_bbtud||0; });
  const unit={}; (S.harian_produksi||[]).filter(r=>r.tanggal>pos).forEach(r=>{ const i=idx[r.tanggal]; if(i==null) return; (unit[r.unit]=unit[r.unit]||{produk:r.produk,v:nol()}).v[i]+= +r.produksi_t||0; });
  const bb={}; (S.harian_bahan_baku||[]).filter(r=>r.tanggal>pos).forEach(r=>{ const i=idx[r.tanggal]; if(i==null) return;
    const o=bb[r.kode_material]=bb[r.kode_material]||{datang:nol(),prod:nol(),pakai:nol(),jual:nol()};
    o.datang[i]+=+r.kedatangan_t||0; o.prod[i]+=+r.produksi_sendiri_t||0; o.pakai[i]+=+r.pemakaian_t||0; o.jual[i]+=+r.dijual_transfer_t||0;
    o.akhir=o.akhir||nol(); o.akhir[i]=+r.stok_akhir_t||0; });
  /* koreksi pembulatan neraca Dalops (±1 t per baris) agar skenario dasar
     tepat sama dengan rencana; nilainya kecil dan ikut setiap skenario */
  Object.entries(bb).forEach(([k,o])=>{ let s=(M.mat[k]&&M.mat[k].ada)?M.mat[k].stok:0;
    o.koreksi=o.akhir.map((a,i)=>{ const c=a-(s+o.datang[i]+o.prod[i]-o.pakai[i]-o.jual[i]); s=a; return c; }); });
  const tot=p=>{ const a=nol(); Object.values(unit).filter(u=>u.produk===p).forEach(u=>u.v.forEach((v,i)=>a[i]+=v)); return a; };
  /* alokasi kargo mendatang ke hari kedatangan rencana (mulai ETA, paling lama 5 hari) */
  const sisa={}; Object.entries(bb).forEach(([k,o])=>sisa[k]=o.datang.slice());
  const kargo=M.kapal.filter(k=>k.mendatang).map((k,j)=>{
    const a=sisa[k.k], alok=[]; let butuh=+k.volume_t||0;
    if(a && idx[k.eta_terkini]!=null){
      for(let i=idx[k.eta_terkini]; i<Math.min(N,idx[k.eta_terkini]+5) && butuh>0.5; i++){
        const q=Math.min(a[i],butuh); if(q>0){ alok.push([i,q]); a[i]-=q; butuh-=q; } }
    }
    return Object.assign({}, k, {j, alok});
  });
  M._sim = {hari, N, gas, unit, bb, kargo, tot:{Amoniak:tot('Amoniak'), Urea:tot('Urea'), NPK:tot('NPK')}};
  return M._sim;
}

function simulasi(M, o){
  o=o||{};
  const Z=siapkanSim(M), N=Z.N;
  const rN=M.r.gasPerNH3||34, rU=M.r.gasPerUrea||0, nU=M.r.nh3PerUrea||0.57;
  const dalam = i => o.durasi==null ? true : i < o.durasi;
  /* kedatangan bahan setelah kargo dimatikan/digeser */
  const datang={};
  Object.entries(Z.bb).forEach(([k,b])=>{ datang[k]=b.datang.slice(); });
  Z.kargo.forEach(k=>{
    const mati = (o.kargoMati&&o.kargoMati.has(k.j)) || (o.materialMati&&o.materialMati.has(k.k));
    const geser = (o.tunda&&o.tunda[k.k])||0;
    if(!mati && !geser) return;
    k.alok.forEach(([i,q])=>{ datang[k.k][i]-=q; if(!mati && i+geser<N) datang[k.k][i+geser]+=q; });
  });
  if(o.materialMati) o.materialMati.forEach(k=>{ /* pasokan tanpa kapal (mis. clay darat) */
    if(!Z.kargo.some(x=>x.k===k) && datang[k]) datang[k]=datang[k].map(()=>0); });
  const mats=Object.keys(Z.bb), npkMat=mats.filter(k=>k!=='NH3');
  const stok={}; mats.forEach(k=>stok[k]=(M.mat[k]&&M.mat[k].ada)?M.mat[k].stok:0);
  const dead=k=>(M.mat[k]&&M.mat[k].dead)||0;
  const seri={}; mats.forEach(k=>seri[k]=[]);
  const prod={Amoniak:{plan:[],sim:[]}, Urea:{plan:[],sim:[]}, NPK:{plan:[],sim:[]}};
  const unitSim={}; Object.keys(Z.unit).forEach(u=>unitSim[u]=[]);
  const gasPct=[];
  for(let i=0;i<N;i++){
    /* gas */
    let gPlan=0, gSim=0;
    Object.entries(Z.gas).forEach(([p,a])=>{ const f=(o.gasFaktor&&o.gasFaktor[p]!=null)?o.gasFaktor[p]:1; gPlan+=a[i]; gSim+=a[i]*f; });
    if(o.curtail && dalam(i)) gSim*=Math.max(0,1-o.curtail/100);
    if(o.gasTurun) gSim*=Math.max(0,1-o.gasTurun/100);
    gasPct.push(gPlan>0?gSim/gPlan*100:100);
    let potong=Math.max(0,gPlan-gSim)*1000;                /* MMBTU/hari */
    /* rencana unit, setelah trip */
    const trip = u => o.trip && o.trip[u] && (o.tripDurasi==null || i<o.tripDurasi);
    const uPlan={}; let nh3U=0, ureaU=0, npkU=0;
    Object.entries(Z.unit).forEach(([u,x])=>{ let v=trip(u)?0:x.v[i]; if(x.produk==='NPK') v*= (o.npkBeban!=null?o.npkBeban/100:1);
      uPlan[u]=v; if(x.produk==='Amoniak') nh3U+=v; if(x.produk==='Urea') ureaU+=v; if(x.produk==='NPK') npkU+=v; });
    let nh3S=Math.max(0, nh3U - potong/rN);
    potong=Math.max(0, potong - nh3U*rN);
    let ureaS=rU>0? Math.max(0, ureaU - potong/rU) : ureaU;
    /* amoniak */
    const pl=Z.tot, b=Z.bb.NH3;
    if(b){
      const prodN = pl.Amoniak[i]>0 ? b.prod[i]*nh3S/pl.Amoniak[i] : b.prod[i];
      let butuh = pl.Urea[i]>0 ? b.pakai[i]*ureaS/pl.Urea[i] : b.pakai[i];
      let jual = o.hentikanJual ? 0 : b.jual[i];
      const ada = stok.NH3 + prodN + datang.NH3[i] - dead('NH3');
      if(ada < butuh + jual){ jual=Math.max(0, ada-butuh); if(ada<butuh){ const b0=butuh; butuh=Math.max(0,ada); ureaS = b0>0? ureaS*butuh/b0 : ureaS; } }
      stok.NH3 += prodN + datang.NH3[i] - butuh - jual + b.koreksi[i];
    }
    /* bahan NPK */
    let f=1;
    npkMat.forEach(k=>{ const x=Z.bb[k]; const perlu = pl.NPK[i]>0 ? x.pakai[i]*npkU/pl.NPK[i] : x.pakai[i]*(o.npkBeban!=null?o.npkBeban/100:1);
      if(perlu>0){ const ada=stok[k]+datang[k][i]+x.prod[i]-x.jual[i]-dead(k); f=Math.min(f, Math.max(0, ada/perlu)); } });
    f=Math.min(1,f);
    npkMat.forEach(k=>{ const x=Z.bb[k]; const perlu = pl.NPK[i]>0 ? x.pakai[i]*npkU/pl.NPK[i] : x.pakai[i]*(o.npkBeban!=null?o.npkBeban/100:1);
      stok[k] += datang[k][i] + x.prod[i] - x.jual[i] - perlu*f + x.koreksi[i]; });
    const npkS=npkU*f;
    mats.forEach(k=>seri[k].push(stok[k]));
    prod.Amoniak.plan.push(pl.Amoniak[i]); prod.Amoniak.sim.push(nh3S);
    prod.Urea.plan.push(pl.Urea[i]); prod.Urea.sim.push(ureaS);
    prod.NPK.plan.push(pl.NPK[i]); prod.NPK.sim.push(npkS);
    Object.entries(Z.unit).forEach(([u,x])=>{
      const tot=x.produk==='Amoniak'?[nh3U,nh3S]:x.produk==='Urea'?[ureaU,ureaS]:[npkU,npkS];
      unitSim[u].push(tot[0]>0 ? uPlan[u]*tot[1]/tot[0] : 0); });
  }
  /* ringkasan */
  const ringkas={};
  mats.forEach(k=>{ const m=M.mat[k]||{}; const s=seri[k];
    const pertama=b=>{ const i=s.findIndex(v=>v<b-0.5); return i<0?null:i; };
    /* simulasi menahan stok tepat di deadstock: "habis" = stok siap pakai ≤ 0,5 t */
    const iHabis=s.findIndex(v=>v<=dead(k)+0.5);
    ringkas[k]={k, nama:m.nama||k, akhir:s[N-1], min:Math.min(...s), iSS:m.ss!=null?pertama(m.ss):null, iDead:iHabis<0?null:iHabis,
      hariHabis:s.filter(v=>v<=dead(k)+0.5).length, ss:m.ss, dead:dead(k)}; });
  const hilang={};
  Object.entries(prod).forEach(([p,x])=>{ const plan=x.plan.reduce((a,b)=>a+b,0), sim=x.sim.reduce((a,b)=>a+b,0);
    const laju=plan/N; hilang[p]={plan, sim, hilang:plan-sim, pct:plan>0?sim/plan*100:100, hariSetara:laju>0?(plan-sim)/laju:0,
      iTurun:x.sim.findIndex((v,i)=>v<x.plan[i]*0.995-0.5)}; });
  const unitRingkas=Object.entries(Z.unit).map(([u,x])=>{
    const plan=x.v.reduce((a,b)=>a+b,0), sim=unitSim[u].reduce((a,b)=>a+b,0);
    const hariOp=x.v.filter(v=>v>0).length, laju=hariOp?plan/hariOp:0;
    return {unit:u, produk:x.produk, laju, hariOp, hariSetara:laju>0?(plan-sim)/laju:0,
      hariPenuh: x.v.filter((v,i)=>v>0 && unitSim[u][i]<v*0.01).length, hilang:plan-sim}; });
  return {hari:Z.hari, N, seri, prod, ringkas, hilang, unit:unitRingkas, gasPct, kargo:Z.kargo};
}

/* format angka Indonesia */
const f0 = n => n==null||!isFinite(n)?'—':Math.round(n).toLocaleString('id-ID');
const f1 = n => n==null||!isFinite(n)?'—':n.toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1});
const f2 = n => n==null||!isFinite(n)?'—':n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});

return {bangun, simulasi, siapkanSim, statusPct, URUT_STATUS, tambahHari, selisihHari, rata, jumlah, kunciMat, f0, f1, f2, BLN_KEY};
})();
