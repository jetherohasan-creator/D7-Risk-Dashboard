/* Uji templat Excel: berkas templat yang diisi angka dummy (tests/isi_templat.py
   + hitung ulang) dimuat lewat tombol Muat Data, lalu angka KRI-nya dibandingkan
   dengan data dummy bawaan. Pakai: node tests/templat.mjs PKT */
import { createRequire } from 'module'; import path from 'path'; import { execSync } from 'child_process';
const require=createRequire(import.meta.url); const {chromium}=require(path.join(execSync('npm root -g').toString().trim(),'playwright'));
const AKAR=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const kode=process.argv[2]||'PKT';
const b=await chromium.launch(); const p=await b.newPage(); const galat=[]; p.on('pageerror',e=>galat.push(e.message));
await p.goto('file://'+path.join(AKAR,'Dashboard_CAK_PRI_PIGroup_v3.html')+'#ent='+kode); await p.waitForTimeout(500);
const ringkas=()=>p.evaluate(k=>{ CAK.STORE[k]._model=null; const M=GASM.bangun(k);
  return {posisi:M.pos, dummy:M.dummy, gas7:+M.gas.pct7.toFixed(2), kontrak7:+M.gas.kontrakPct7.toFixed(2), siaga:M.siaga.lv,
    mat:Object.values(M.mat).map(m=>`${m.k}:${m.stok}/${m.pem.toFixed(1)}%/${m.status}/${m.temSS}`).join(' '),
    prod:Object.values(M.produk).map(x=>`${x.produk}:${x.pctProrata.toFixed(2)}`).join(' '),
    lini1:M.lini1.map(x=>`${x.produk}:${Math.round(x.stok)}/${x.hari.toFixed(1)}`).join(' '),
    kapal:M.kapal.length, spesifik:M.gas.spesifik.nh3.toFixed(2), warn:CAK.STORE[k].warn.map(w=>w.pesan)}; }, kode);
const awal=await ringkas();
await p.setInputFiles('#fileMaster', path.join(AKAR,`tests/_tangkapan/TERISI_${kode}.xlsx`));
await p.waitForFunction(()=>!/^Membaca/.test(document.getElementById('statUnggah').textContent), null, {timeout:60000});
console.log(await p.evaluate(()=>document.getElementById('statUnggah').innerText));
const akhir=await ringkas();
let beda=0;
for(const k of Object.keys(awal)){ if(k==='dummy'||k==='warn') continue; /* total gas di templat = jumlah per pemasok (rumus); total di dummy dibulatkan terpisah → toleransi 0,05 poin */
  const ok=(k==='gas7'||k==='kontrak7')?Math.abs(awal[k]-akhir[k])<=0.05:JSON.stringify(awal[k])===JSON.stringify(akhir[k]);
  if(!ok) beda++; console.log(`${ok?'OK  ':'BEDA'} ${k}: ${JSON.stringify(akhir[k])}${ok?'':'  (bawaan: '+JSON.stringify(awal[k])+')'}`); }
console.log(`dummy sesudah dimuat: ${akhir.dummy} (harus false: templat berstatus ASLI) · peringatan: ${JSON.stringify(akhir.warn)}`);
const pita=await p.evaluate(()=>document.getElementById('dummyRibbon').hidden);
console.log(`pita DATA DUMMY tersembunyi: ${pita}`);
await b.close(); process.exit(beda||akhir.dummy||!pita||galat.length?1:0);
