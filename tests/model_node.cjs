/* Uji cepat mesin model di Node (tanpa peramban):
   - simulasi tanpa gangguan harus mereproduksi stok rencana Dalops
   - status skenario 11.3 */
const fs=require('fs'), path=require('path'), vm=require('vm');
const A=path.resolve(__dirname,'..');
const ctx={console}; vm.createContext(ctx);
const J=JSON.parse(fs.readFileSync(A+'/data/DUMMY_CAK_PRI_PIGroup_data.json','utf8'));
vm.runInContext(fs.readFileSync(A+'/src/entity_profiles.js','utf8')+'\nthis.ENTITY_PROFILES=ENTITY_PROFILES;',ctx);
const STORE={};
for(const [k,sh] of Object.entries(J.entitas)){ const sheets={};
  for(const [n,t] of Object.entries(sh)) sheets[n]=t.baris.map(r=>Object.fromEntries(t.kolom.map((c,i)=>[c,r[i]])));
  const real=sheets.harian_bahan_baku.filter(r=>r.jenis==='Realisasi').map(r=>r.tanggal).sort();
  STORE[k]={sheets,posisi:real[real.length-1],dummy:true}; }
ctx.CAK={STORE,_util:{tglID:(s)=>s}};
vm.runInContext(fs.readFileSync(A+'/src/cak_gas_model.js','utf8')+'\nthis.GASM=GASM;',ctx);
const G=ctx.GASM; let gagal=0;
for(const k of ['PKT','PIM','PSP','PKC']){
  const M=G.bangun(k); const s=G.simulasi(M,{});
  let maks=0; for(const [m,seri] of Object.entries(s.seri)){ M.mat[m].rencana.forEach((r,i)=>{ maks=Math.max(maks,Math.abs(r.v-seri[i])); }); }
  const hil=Object.values(s.hilang).map(h=>Math.abs(h.hilang)).reduce((a,b)=>Math.max(a,b),0);
  console.log(`${k} baseline: selisih stok maks ${maks.toFixed(1)} t, kehilangan produksi maks ${hil.toFixed(1)} t`);
  if(maks>5||hil>1) gagal++;
  const st=Object.values(M.mat).map(m=>`${m.k} ${m.pem.toFixed(1)}% ${m.status}`).join(' | ');
  console.log(`   gas7 ${M.gas.pct7.toFixed(1)}% ${M.gas.status} · ${st}`);
  console.log(`   NH3 hari kotor ${M.mat.NH3.hariStok.toFixed(1)} · defisit7 ${M.mat.NH3.defisit7.toFixed(0)} t/hari · penyangga ${M.mat.NH3.hariPenyangga==null?'tidak menipis':M.mat.NH3.hariPenyangga.toFixed(1)}`);
  console.log(`   siaga ${M.siaga.lv}: ${M.siaga.pemicu.map(p=>p.lv+':'+p.teks).join(' ; ')}`);
  console.log(`   produksi % RKAP pro-rata: ${Object.values(M.produk).map(p=>p.produk+' '+p.pctProrata.toFixed(1)).join(', ')}`);
  const c=G.simulasi(M,{curtail:30,durasi:30});
  console.log(`   curtail 30%/30h: NH3 min ${c.ringkas.NH3.min.toFixed(0)} t, urea hilang ${c.hilang.Urea.hilang.toFixed(0)} t, NH3 hilang ${c.hilang.Amoniak.hilang.toFixed(0)} t`);
}


/* gas dimatikan seluruhnya: amoniak berhenti, urea bertahan dari stok tangki lalu berhenti */
for(const k of ['PKT','PIM']){ const M=G.bangun(k); const f={}; M.gas.pemasok.forEach(p=>f[p.nama]=0);
  const r=G.simulasi(M,{gasFaktor:f});
  console.log(`${k} gas mati: amoniak ${r.hilang.Amoniak.pct.toFixed(1)}% rencana, urea ${r.hilang.Urea.pct.toFixed(1)}%, NH3 habis hari ke-${r.ringkas.NH3.iDead+1}, NPK ${r.hilang.NPK.pct.toFixed(1)}%`); }
process.exit(gagal?1:0);
